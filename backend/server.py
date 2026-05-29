import eventlet
eventlet.monkey_patch()

import json
import time
import threading
from dataclasses import dataclass
from typing import Any, Dict, Optional

import joblib
import pandas as pd
import requests

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from pymongo import MongoClient

from config import (
    MODELS_DIR, STREAM_BASE_URL, ALERT_COOLDOWN_SECONDS,
    TURN_AROUND_TIME_SECONDS, FLASK_SECRET_KEY, FLASK_DEBUG,
    FLASK_HOST, FLASK_PORT, MONGO_URI, MONGO_DB,
)

app = Flask(__name__)
app.config['SECRET_KEY'] = FLASK_SECRET_KEY

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

mongo_available = False
orders_coll = None
schedule_coll = None
history_coll = None

try:
    mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    mongo.admin.command("ping")
    db = mongo[MONGO_DB]
    orders_coll = db["maintenance_orders"]
    schedule_coll = db["maintenance_schedule"]
    history_coll = db["maintenance_history"]
    orders_coll.create_index("id", unique=True)
    schedule_coll.create_index("id", unique=True)
    history_coll.create_index("id", unique=True)
    mongo_available = True
    print("✅ MongoDB connected")
except Exception as exc:
    print(f"⚠️ MongoDB unavailable: {exc}")


def mongo_save(coll, doc):
    if mongo_available and coll is not None:
        try:
            coll.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
        except Exception as exc:
            print(f"⚠️ MongoDB save failed: {exc}")


def mongo_delete(coll, doc_id):
    if mongo_available and coll is not None:
        try:
            coll.delete_one({"id": doc_id})
        except Exception as exc:
            print(f"⚠️ MongoDB delete failed: {exc}")


def mongo_delete_many(coll, query):
    if mongo_available and coll is not None:
        try:
            coll.delete_many(query)
        except Exception as exc:
            print(f"⚠️ MongoDB delete_many failed: {exc}")


def mongo_find(coll, query=None, sort=None, limit=0):
    if mongo_available and coll is not None:
        try:
            cursor = coll.find(query or {}, {"_id": 0})
            if sort:
                cursor = cursor.sort(*sort)
            if limit:
                cursor = cursor.limit(limit)
            return list(cursor)
        except Exception as exc:
            print(f"⚠️ MongoDB find failed: {exc}")
    return []


def mongo_find_one(coll, query):
    if mongo_available and coll is not None:
        try:
            return coll.find_one(query, {"_id": 0})
        except Exception as exc:
            print(f"⚠️ MongoDB find_one failed: {exc}")
    return None


latest_by_machine: Dict[str, Dict[str, Any]] = {}
alerts = []
maintenance_orders = []
maintenance_schedules = []
maintenance_history = []
worker_threads = {}
last_alert_by_machine_failure: Dict[str, float] = {}

SEVERITY_MAP = {
    "Critical Thermal Stress": 100,
    "Critical Thermal/Electrical Failure": 100,
    "CRITICAL: Total Mechanical Jam": 100,
    "CRITICAL: Belt Snapped / Disconnected": 100,
    "EMERGENCY: Extreme Thermal Runaway": 100,
    "Severe Bearing Wear": 90,
    "Bearing Wear/Misalignment": 80,
    "Motor Overload Risk": 75,
    "Thermal Stress Detected": 70,
    "Mechanical Drift": 60,
    "Uncertain Condition": 40,
    "Uncertain Pattern": 40,
}

MACHINE_IMPORTANCE = {
    "CNC_01": 90, "CNC_02": 85,
    "CONVEYOR_04": 80, "PUMP_03": 70,
}


def get_required_role(failure: str) -> str:
    if not failure or not isinstance(failure, str):
        return "technician"
    low = normalize_prediction(failure)
    electrical = ("motor overload", "overload", "cutting overload",
                  "cutting_overload", "electrical", "power")
    if any(kw in low for kw in electrical):
        return "electrician"
    mechanical = ("bearing", "wear", "misalignment", "jam", "snapped",
                  "belt", "tool", "impeller", "chatter", "mechanical",
                  "spindle", "roller", "drift")
    if any(kw in low for kw in mechanical):
        return "mechanic"
    return "technician"


def calculate_priority_score(machine_id, failure, reading):
    severity = SEVERITY_MAP.get(failure, 50)
    importance = MACHINE_IMPORTANCE.get(machine_id, 50)
    temp = float(reading.get("temperature_C", 0) or 0)
    vib = float(reading.get("vibration_mm_s", 0) or 0)
    risk = min((temp / 120) * 50 + (vib / 10) * 50, 100)
    return round(0.5 * severity + 0.3 * risk + 0.2 * importance)


def get_priority_label(score):
    if score >= 85: return "critical"
    if score >= 70: return "high"
    if score >= 50: return "medium"
    return "low"


def load_model_artifact(path: str):
    try:
        artifact = joblib.load(path)
        return artifact if isinstance(artifact, dict) else {"model": artifact, "label_encoder": None}
    except Exception as exc:
        print(f'⚠️ Failed to load {path}: {exc}')
        return None


MODEL_CONFIGS = {
    "CNC_01": {"path": f"{MODELS_DIR}/CNC_01/CNC_01_failure_model.pkl"},
    "CNC_02": {"path": f"{MODELS_DIR}/CNC_02/CNC_02_failure_model.pkl"},
    "PUMP_03": {"path": f"{MODELS_DIR}/PUMP/PUMP_failure_model.pkl"},
    "CONVEYOR_04": {"path": f"{MODELS_DIR}/CONVEYOR/CONVEYOR_failure_model.pkl"},
}

MODEL_CONFIDENCE_THRESHOLDS = {"CONVEYOR_04": 0.55, "PUMP_03": 0.60}
MODEL_ARTIFACTS: Dict[str, dict] = {}

for mid, cfg in MODEL_CONFIGS.items():
    artifact = load_model_artifact(cfg["path"])
    if artifact:
        artifact["confidence_threshold"] = MODEL_CONFIDENCE_THRESHOLDS.get(mid, 0.0)
        MODEL_ARTIFACTS[mid] = artifact
        print(f'✅ {mid} model loaded | Features: {artifact.get("feature_cols", [])}')
    else:
        MODEL_ARTIFACTS[mid] = {"model": None, "label_encoder": None, "feature_cols": [], "confidence_threshold": 0.0}
        print(f'⚠️ {mid} model failed to load')


def preprocess_for_model(raw_data: Dict[str, Any], feature_cols: list) -> pd.DataFrame:
    vib = float(raw_data.get('vibration_mm_s', 0) or 0)
    temp = float(raw_data.get('temperature_C', 0) or 0)
    curr = float(raw_data.get('current_A', 0) or 0)
    rpm = float(raw_data.get('rpm', 0) or 0)
    feature_data = {}
    for feature in feature_cols:
        if feature == 'vibration_mm_s':
            feature_data[feature] = vib
        elif feature == 'spindle_current_percent':
            feature_data[feature] = max(0, min(100, curr * 2.5))
        elif feature == 'spindle_temperature_C':
            feature_data[feature] = temp
        elif feature == 'acoustic_dba':
            feature_data[feature] = 70 + (vib * 10) + (curr * 2)
        elif feature == 'lubrication_pressure_bar':
            feature_data[feature] = 2.0 + max(0, (rpm - 500) / 5000)
        elif feature == 'coolant_temperature_C':
            feature_data[feature] = temp - 2 if temp > 2 else 24
        elif feature == 'motor_current_A':
            feature_data[feature] = curr
        elif feature == 'bearing_temperature_C':
            feature_data[feature] = temp
        elif feature == 'suction_pressure_bar':
            feature_data[feature] = 1.0 + (curr / 20)
        elif feature == 'discharge_pressure_bar':
            feature_data[feature] = 4.0 + (curr / 10)
        elif feature == 'flow_rate_lpm':
            feature_data[feature] = 200 + (rpm / 5)
        elif feature == 'gearbox_temperature_C':
            feature_data[feature] = temp
        elif feature == 'belt_speed_mps':
            feature_data[feature] = rpm / 500
        elif feature == 'load_kg':
            feature_data[feature] = 150 + (curr * 10)
        elif feature == 'belt_alignment_mm':
            feature_data[feature] = 2.0 + min(2, vib * 0.5)
        else:
            feature_data[feature] = raw_data.get(feature, 0)
    return pd.DataFrame([feature_data])


def predict(machine_id: str, raw_data: Dict[str, Any]) -> str:
    artifact = MODEL_ARTIFACTS.get(machine_id)
    if not artifact:
        return "Model Unavailable"
    model = artifact.get("model")
    le = artifact.get("label_encoder")
    if model is None or le is None:
        return "Model Unavailable"
    try:
        input_df = preprocess_for_model(raw_data, artifact.get("feature_cols", []))
        pred_id = model.predict(input_df)[0]
        prediction = le.inverse_transform([pred_id])[0]
        probs = model.predict_proba(input_df)[0]
        threshold = artifact.get("confidence_threshold", 0.0)
        if threshold > 0 and max(probs) < threshold:
            return f"Uncertain Pattern (Probable {prediction})"
        return prediction
    except Exception as exc:
        print(f'⚠️ Prediction error for {machine_id}: {exc}')
        return "Unknown Error"


@dataclass
class AgentConfig:
    machine_id: str
    stream_url: str
    room: str


AGENTS = [
    AgentConfig('CNC_01', f'{STREAM_BASE_URL}/CNC_01', 'machines:CNC_01'),
    AgentConfig('CNC_02', f'{STREAM_BASE_URL}/CNC_02', 'machines:CNC_02'),
    AgentConfig('CONVEYOR_04', f'{STREAM_BASE_URL}/CONVEYOR_04', 'machines:CONVEYOR_04'),
    AgentConfig('PUMP_03', f'{STREAM_BASE_URL}/PUMP_03', 'machines:PUMP_03'),
]

HEALTHY_STATES = {
    'healthy', 'healthy - no issues', 'no fault', 'no fault detected',
    'no failure', 'no failure detected', 'none', 'nil', 'null', 'normal',
    'good condition', 'operational', 'running normally', 'ok', 'okay', 'nominal',
}


def normalize_prediction(prediction: Any) -> str:
    if prediction is None: return ''
    return str(prediction).strip().lower().replace('_', ' ').replace('-', ' ')


def is_healthy_status(prediction: str) -> bool:
    compact = ' '.join(normalize_prediction(prediction).split())
    if not compact: return True
    if compact in HEALTHY_STATES: return True
    healthy_tokens = ('healthy', 'no fault', 'no failure', 'none detected',
                      'normal operation', 'normal condition', 'running normally')
    if any(token in compact for token in healthy_tokens): return True
    if compact == 'none' or compact.endswith(': none') or compact.endswith('= none'): return True
    return False


def is_ignorable_prediction(prediction: str) -> bool:
    if is_healthy_status(prediction): return True
    low = normalize_prediction(prediction)
    return any(token in low for token in ('uncertain', 'model unavailable', 'unknown', 'invalid', 'not available', 'n/a'))


def should_emit_alert(machine_id: str, failure: str) -> bool:
    key = f'{machine_id}::{failure.strip().lower()}'
    now = time.time()
    last = last_alert_by_machine_failure.get(key)
    if last is not None and (now - last) < ALERT_COOLDOWN_SECONDS:
        return False
    last_alert_by_machine_failure[key] = now
    return True


def build_alert(machine_id: str, reason: str, reading: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'id': f'ALERT-{int(time.time() * 1000)}',
        'machine_id': machine_id, 'reason': reason, 'reading': reading,
        'triggered_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }


def active_order_exists(machine_id: str, failure: str) -> bool:
    normalized = normalize_prediction(failure)
    for order in maintenance_orders:
        if (order.get("machine_id") == machine_id
            and normalize_prediction(order.get("failure", "")) == normalized
            and order.get("status") == "open"):
            return True
    if mongo_available:
        doc = mongo_find_one(orders_coll, {"machine_id": machine_id, "failure": failure, "status": "open"})
        if doc:
            return True
    return False


def schedule_exists(machine_id: str, failure: str) -> bool:
    for item in maintenance_schedules:
        if (item.get("machine_id") == machine_id
            and normalize_prediction(item.get("failure", "")) == normalize_prediction(failure)
            and item.get("schedule_status") == "scheduled"):
            return True
    if mongo_available:
        doc = mongo_find_one(schedule_coll, {"machine_id": machine_id, "failure": failure, "schedule_status": "scheduled"})
        if doc:
            return True
    return False


def should_create_maintenance_order(machine_id: str, failure: str) -> bool:
    if is_ignorable_prediction(failure): return False
    if active_order_exists(machine_id, failure): return False
    if schedule_exists(machine_id, failure): return False
    return True


def build_maintenance_order(machine_id: str, failure: str, reading: Dict[str, Any], created_by: str = 'system') -> Dict[str, Any]:
    score = calculate_priority_score(machine_id, failure, reading)
    return {
        'id': f'WO-{int(time.time() * 1000)}',
        'machine_id': machine_id, 'failure': failure,
        'created_by': created_by, 'priority': get_priority_label(score),
        'priority_score': score, 'required_role': get_required_role(failure),
        'notes': f'Auto-diagnosis: {failure} detected.', 'status': 'open',
        'created_at': time.time(),
    }


def build_schedule(order: Dict[str, Any]) -> Dict[str, Any]:
    now = time.time()
    return {
        "id": f"SCH-{int(time.time() * 1000)}",
        "order_id": order["id"], "machine_id": order["machine_id"],
        "failure": order["failure"],
        "scheduled_start": now + 60,
        "scheduled_end": now + 60 + TURN_AROUND_TIME_SECONDS,
        "assigned_to": "auto-system", "schedule_status": "scheduled",
        "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }


def emit_alert(alert: Dict[str, Any]) -> None:
    alerts.append(alert)
    socketio.emit('alert', alert)


def emit_maintenance_order(order: Dict[str, Any]) -> None:
    maintenance_orders.append(order)
    maintenance_orders.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
    socketio.emit('maintenance_order', order)
    mongo_save(orders_coll, order)


def emit_maintenance_schedule(schedule: Dict[str, Any]) -> None:
    maintenance_schedules.append(schedule)
    socketio.emit('maintenance_schedule', schedule)
    mongo_save(schedule_coll, schedule)


def emit_maintenance_history(history_item: Dict[str, Any]) -> None:
    maintenance_history.append(history_item)
    socketio.emit('maintenance_history', history_item)
    mongo_save(history_coll, history_item)


def create_schedule(order: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    machine_id = order.get("machine_id")
    failure = order.get("failure")
    if not failure or not isinstance(failure, str) or is_ignorable_prediction(failure):
        print(f"⛔ Schedule blocked | {machine_id} | invalid failure: {failure!r}")
        return None
    if schedule_exists(machine_id, failure):
        print(f"⏭️ Already scheduled for {machine_id} | {failure}")
        return None
    return build_schedule(order)


def find_schedule_by_order(order_id: str) -> Optional[Dict[str, Any]]:
    for schedule in maintenance_schedules:
        if schedule.get("order_id") == order_id:
            return schedule
    return None


def maybe_create_maintenance_order(machine_id: str, failure: str, created_by: str = 'system') -> Optional[Dict[str, Any]]:
    if not should_create_maintenance_order(machine_id, failure):
        return None
    latest = latest_by_machine.get(machine_id)
    reading = latest.get("reading", {}) if latest else {}
    order = build_maintenance_order(machine_id, failure, reading, created_by)
    emit_maintenance_order(order)
    schedule = create_schedule(order)
    if schedule:
        emit_maintenance_schedule(schedule)
    return order


def process_message(config: AgentConfig, raw_data: Dict[str, Any]) -> None:
    machine_id = raw_data.get('machine_id', config.machine_id)
    prediction = predict(machine_id, raw_data)
    if not prediction or not isinstance(prediction, str):
        print(f"⚠️ SKIP | {machine_id} | invalid prediction: {prediction!r}")
        return
    healthy = is_healthy_status(prediction)
    payload = {
        'machine_id': machine_id, 'stream': config.stream_url,
        'room': config.room, 'timestamp': raw_data.get('timestamp'),
        'reading': raw_data, 'prediction': prediction, 'healthy': healthy,
    }
    latest_by_machine[machine_id] = payload
    socketio.emit('machine_update', payload)
    socketio.emit('machine_update', payload, to=config.room)
    icon = '🟢' if healthy else '🔴'
    print(f"{icon} {machine_id} | {raw_data.get('timestamp')} | {prediction}")
    if is_ignorable_prediction(prediction):
        if not healthy:
            print(f"⚠️ IGNORED | {machine_id} | {prediction}")
        return
    if should_emit_alert(machine_id, prediction):
        alert = build_alert(machine_id, prediction, raw_data)
        emit_alert(alert)
        print(f"🚨 ALERT | {machine_id} | {prediction}")
    order = maybe_create_maintenance_order(machine_id, prediction)
    if order:
        print(f"🛠️ ORDER | {machine_id} | {prediction}")


def stream_worker(config: AgentConfig) -> None:
    print(f'🤖 Starting worker for {config.machine_id} -> {config.stream_url}')
    while True:
        try:
            with requests.get(config.stream_url, stream=True, timeout=None) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line:
                        continue
                    decoded = line.decode('utf-8')
                    if not decoded.startswith('data: '):
                        continue
                    try:
                        raw_data = json.loads(decoded.replace('data: ', '', 1).strip())
                        process_message(config, raw_data)
                    except json.JSONDecodeError:
                        continue
                    except Exception as exc:
                        print(f'⚠️ Processing error for {config.machine_id}: {exc}')
        except requests.RequestException as exc:
            print(f'❌ Stream connection error for {config.machine_id}: {exc}')
            time.sleep(3)
        except Exception as exc:
            print(f'❌ Unexpected worker error for {config.machine_id}: {exc}')
            time.sleep(3)


def start_workers() -> None:
    for config in AGENTS:
        if config.machine_id not in worker_threads:
            thread = threading.Thread(target=stream_worker, args=(config,), daemon=True)
            worker_threads[config.machine_id] = thread
            thread.start()


@app.get('/')
def root():
    return jsonify({
        'service': 'Predictive Maintenance Server',
        'machines': [cfg.machine_id for cfg in AGENTS],
        'socket_events': ['machine_update', 'alert', 'snapshot', 'maintenance_order',
                          'maintenance_order_update', 'maintenance_order_removed',
                          'maintenance_schedule', 'maintenance_history'],
    })


@app.post('/maintenance-orders')
def create_maintenance_order():
    data = request.get_json(silent=True) or {}
    machine_id = data.get('machine_id')
    failure = data.get('failure')
    created_by = data.get('created_by', 'system')
    if not machine_id:
        return jsonify({'ok': False, 'error': 'machine_id is required'}), 400
    latest = latest_by_machine.get(machine_id)
    if not failure:
        if not latest:
            return jsonify({'ok': False, 'error': 'No latest prediction found; provide failure.'}), 400
        failure = latest.get('prediction')
    if is_ignorable_prediction(failure):
        return jsonify({'ok': False, 'error': f'Cannot create order for: {failure}'}), 400
    if not should_create_maintenance_order(machine_id, failure):
        return jsonify({'ok': False, 'error': 'Open order or schedule already exists.'}), 200
    reading = latest.get("reading", {}) if latest else {}
    order = build_maintenance_order(machine_id, failure, reading, created_by)
    emit_maintenance_order(order)
    schedule = create_schedule(order)
    if schedule:
        emit_maintenance_schedule(schedule)
    return jsonify({'ok': True, 'order': order}), 201


@app.route("/maintenance-orders/close", methods=["POST", "OPTIONS"])
def close_order():
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200
    data = request.get_json(silent=True) or {}
    order_id = data.get("id")
    if not order_id:
        return jsonify({"ok": False, "error": "id required"}), 400
    closed_at = time.time()
    closed_order = None
    for i, order in enumerate(maintenance_orders):
        if order["id"] == order_id:
            order["status"] = "closed"
            order["closed_at"] = closed_at
            closed_order = maintenance_orders.pop(i)
            break
    if not closed_order:
        return jsonify({"ok": False, "error": "order not found"}), 404
    removed_schedule_ids = []
    kept = []
    for schedule in maintenance_schedules:
        if schedule.get("order_id") == order_id:
            removed_schedule_ids.append(schedule.get("id"))
        else:
            kept.append(schedule)
    maintenance_schedules[:] = kept
    mongo_save(history_coll, closed_order)
    mongo_delete(orders_coll, order_id)
    mongo_delete_many(schedule_coll, {"order_id": order_id})
    maintenance_history.append(closed_order)
    socketio.emit("maintenance_order_removed", {"id": order_id})
    socketio.emit("maintenance_history", closed_order)
    for sid in removed_schedule_ids:
        socketio.emit("maintenance_schedule_removed", {"id": sid, "order_id": order_id})
    return jsonify({"ok": True, "closed_order_id": order_id, "removed_schedule_ids": removed_schedule_ids})


@app.post('/maintenance-orders/cleanup-ignorable')
def cleanup_ignorable_orders():
    removed_order_ids = []
    removed_schedule_ids = []
    kept_orders = [o for o in maintenance_orders if not is_ignorable_prediction(o.get('failure', ''))]
    removed_order_ids = [o['id'] for o in maintenance_orders if o not in kept_orders]
    maintenance_orders[:] = kept_orders
    kept_schedules = []
    for s in maintenance_schedules:
        if s.get('order_id') in removed_order_ids or is_ignorable_prediction(s.get('failure', '')):
            removed_schedule_ids.append(s.get('id'))
        else:
            kept_schedules.append(s)
    maintenance_schedules[:] = kept_schedules
    if mongo_available:
        for oid in removed_order_ids:
            mongo_delete(orders_coll, oid)
            mongo_delete_many(schedule_coll, {"order_id": oid})
        for sid in removed_schedule_ids:
            mongo_delete(schedule_coll, sid)
    for oid in removed_order_ids:
        socketio.emit('maintenance_order_removed', {'id': oid})
    for sid in removed_schedule_ids:
        socketio.emit('maintenance_schedule_removed', {'id': sid})
    return jsonify({'ok': True, 'removed_order_ids': removed_order_ids, 'removed_schedule_ids': removed_schedule_ids})


@app.get('/maintenance-orders')
def get_maintenance_orders():
    return jsonify({'count': len(maintenance_orders), 'orders': maintenance_orders[-100:]})


@app.get('/maintenance-schedules')
def get_maintenance_schedules():
    return jsonify({'count': len(maintenance_schedules), 'schedules': maintenance_schedules[-100:]})


@app.get('/maintenance-history')
def get_history():
    return jsonify({"count": len(maintenance_history), "history": maintenance_history[-100:]})


@app.get('/health')
def health():
    return jsonify({
        'ok': True,
        'active_workers': list(worker_threads.keys()),
        'machines': list(latest_by_machine.keys()),
    })


@app.get('/machines')
def machines():
    return jsonify({'machines': list(latest_by_machine.values())})


@app.get('/alerts')
def get_alerts():
    return jsonify({'count': len(alerts), 'alerts': alerts[-100:]})


@socketio.on('connect')
def on_connect():
    print('🔌 Frontend connected')
    orders = mongo_find(orders_coll, sort=("priority_score", -1), limit=50) if mongo_available else maintenance_orders[-50:]
    schedules = mongo_find(schedule_coll, sort=("created_at", -1), limit=50) if mongo_available else maintenance_schedules[-50:]
    hist = mongo_find(history_coll, sort=("closed_at", -1), limit=50) if mongo_available else maintenance_history[-50:]
    emit('snapshot', {
        'machines': list(latest_by_machine.values()),
        'alerts': alerts[-50:],
        'maintenance_orders': orders,
        'maintenance_schedules': schedules,
        'maintenance_history': hist,
    })


@socketio.on('subscribe')
def on_subscribe(data):
    machine_id = (data or {}).get('machine_id')
    role = (data or {}).get('role')
    if machine_id:
        room = f'machines:{machine_id}'
        join_room(room)
        emit('subscribed', {'room': room, 'machine_id': machine_id})
    if role:
        role_room = f'roles:{role}'
        join_room(role_room)
        emit('subscribed', {'room': role_room, 'role': role})


@socketio.on('disconnect')
def on_disconnect():
    print('❌ Frontend disconnected')


def seed_test_orders():
    if maintenance_orders:
        return
    samples = [
        ("CNC_01", "Bearing Wear", {"vibration_mm_s": 4.2, "temperature_C": 62}),
        ("CNC_01", "Spindle Misalignment", {"vibration_mm_s": 3.8, "temperature_C": 55}),
        ("CNC_02", "Coolant Failure", {"temperature_C": 58, "current_A": 45}),
        ("CNC_02", "Lubrication Failure", {"vibration_mm_s": 2.9, "temperature_C": 52}),
        ("PUMP_03", "Motor Overload", {"current_A": 22, "temperature_C": 68}),
        ("PUMP_03", "Cavitation", {"vibration_mm_s": 4.5, "discharge_pressure_bar": 2.1}),
        ("CONVEYOR_04", "Belt Misalignment", {"vibration_mm_s": 3.2, "belt_alignment_mm": 11}),
        ("CONVEYOR_04", "Gearbox Overheating", {"gearbox_temperature_C": 82, "vibration_mm_s": 2.8}),
    ]
    for mid, fail, reading in samples:
        order = build_maintenance_order(mid, fail, reading, created_by='system')
        order['notes'] = f'Sample: {fail} detected on {mid}. Schedule inspection.'
        maintenance_orders.append(order)
    maintenance_orders.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
    print(f"✅ Seeded {len(samples)} test orders")


existing = mongo_find(orders_coll, limit=1)
if existing:
    maintenance_orders.extend(mongo_find(orders_coll, sort=("priority_score", -1)))
    maintenance_schedules.extend(mongo_find(schedule_coll, sort=("created_at", -1)))
    maintenance_history.extend(mongo_find(history_coll, sort=("closed_at", -1)))
    print(f"✅ Loaded {len(maintenance_orders)} orders, {len(maintenance_schedules)} schedules, {len(maintenance_history)} history from MongoDB")
else:
    seed_test_orders()
start_workers()

if __name__ == '__main__':
    socketio.run(app, host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG, use_reloader=False)
