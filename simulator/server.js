/**
 *  Predictive Maintenance Simulation Server
 * Updated with:
 * - CNC-specific sensors
 * - Pump-specific sensors
 * - Conveyor-specific sensors
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { generateAllHistory, MACHINES, BASELINES } = require("./generate-history");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

console.log("⚙️  Generating sensor history...");
const HISTORY = generateAllHistory();
console.log(
  `✅  History ready: ${Object.keys(HISTORY).length} machines × ${HISTORY[MACHINES[0]].length} readings each.`
);

const alerts = [];
const maintenances = [];
const liveState = {};

for (const m of MACHINES) {
  const b = BASELINES[m];

  if (m.startsWith("CNC")) {
    liveState[m] = {
      vibration_mm_s: b.vibration_mm_s,
      spindle_current_percent: b.spindle_current_percent,
      spindle_temperature_C: b.spindle_temperature_C,
      acoustic_dba: b.acoustic_dba,
      lubrication_pressure_bar: b.lubrication_pressure_bar,
      coolant_temperature_C: b.coolant_temperature_C,
      tick: 0,
      active_failure: "none",
    };
  } else if (m.startsWith("PUMP")) {
    liveState[m] = {
      vibration_mm_s: b.vibration_mm_s,
      motor_current_A: b.motor_current_A,
      bearing_temperature_C: b.bearing_temperature_C,
      suction_pressure_bar: b.suction_pressure_bar,
      discharge_pressure_bar: b.discharge_pressure_bar,
      flow_rate_lpm: b.flow_rate_lpm,
      tick: 0,
      active_failure: "none",
    };
  } else if (m.startsWith("CONVEYOR")) {
    liveState[m] = {
      vibration_mm_s: b.vibration_mm_s,
      motor_current_A: b.motor_current_A,
      gearbox_temperature_C: b.gearbox_temperature_C,
      belt_speed_mps: b.belt_speed_mps,
      load_kg: b.load_kg,
      belt_alignment_mm: b.belt_alignment_mm,
      tick: 0,
      active_failure: "none",
    };
  }
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function fix(n, d = 2) {
  return parseFloat(n.toFixed(d));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* ----------------------------- CNC SIMULATION ----------------------------- */

function getCncFailureByTick(tick, machineId) {
  if (machineId === "CNC_01") {
    if (tick < 60) return "none";
    if (tick < 120) return "tool_wear";
    if (tick < 180) return "spindle_bearing_failure";
    if (tick < 240) return "chatter";
    if (tick < 300) return "spindle_misalignment";
    if (tick < 360) return "cutting_overload";
    if (tick < 420) return "lubrication_failure";
    if (tick < 480) return "coolant_failure";
    if (tick < 500) return "tool_breakage";
    return "none";
  }

  if (machineId === "CNC_02") {
    if (tick < 90) return "none";
    if (tick < 150) return "cutting_overload";
    if (tick < 210) return "chatter";
    if (tick < 270) return "tool_wear";
    if (tick < 330) return "coolant_failure";
    if (tick < 390) return "spindle_bearing_failure";
    return "none";
  }

  return "none";
}

function getCncStatus(reading) {
  if (
    reading.vibration_mm_s > 4.5 ||
    reading.spindle_temperature_C > 70 ||
    reading.spindle_current_percent > 120 ||
    reading.lubrication_pressure_bar < 0.8 ||
    reading.coolant_temperature_C > 40
  ) {
    return "fault";
  }

  if (
    reading.vibration_mm_s > 2.0 ||
    reading.spindle_temperature_C > 58 ||
    reading.spindle_current_percent > 85 ||
    reading.lubrication_pressure_bar < 1.2 ||
    reading.coolant_temperature_C > 34 ||
    reading.acoustic_dba > 92
  ) {
    return "warning";
  }

  return "running";
}

function nextCncReading(machineId) {
  const s = liveState[machineId];
  const b = BASELINES[machineId];
  s.tick += 1;

  let vibration = s.vibration_mm_s;
  let spindleCurrent = s.spindle_current_percent;
  let spindleTemp = s.spindle_temperature_C;
  let acoustic = s.acoustic_dba;
  let lubricationPressure = s.lubrication_pressure_bar;
  let coolantTemp = s.coolant_temperature_C;

  const failure = getCncFailureByTick(s.tick, machineId);
  s.active_failure = failure;

  vibration += (b.vibration_mm_s - vibration) * 0.03 + rand(-0.08, 0.08);
  spindleCurrent += (b.spindle_current_percent - spindleCurrent) * 0.03 + rand(-1.5, 1.5);
  spindleTemp += (b.spindle_temperature_C - spindleTemp) * 0.03 + rand(-0.5, 0.5);
  acoustic += (b.acoustic_dba - acoustic) * 0.03 + rand(-1.2, 1.2);
  lubricationPressure += (b.lubrication_pressure_bar - lubricationPressure) * 0.03 + rand(-0.05, 0.05);
  coolantTemp += (b.coolant_temperature_C - coolantTemp) * 0.03 + rand(-0.4, 0.4);

  switch (failure) {
    case "tool_wear":
      vibration += rand(0.2, 0.5);
      spindleCurrent += rand(4, 10);
      spindleTemp += rand(1, 3);
      acoustic += rand(2, 5);
      break;
    case "tool_breakage":
      vibration += rand(2.0, 4.5);
      spindleCurrent += rand(25, 45);
      acoustic += rand(8, 15);
      spindleTemp += rand(2, 5);
      break;
    case "spindle_bearing_failure":
      vibration += rand(0.6, 1.4);
      spindleTemp += rand(3, 8);
      acoustic += rand(3, 7);
      spindleCurrent += rand(2, 6);
      break;
    case "chatter":
      vibration += rand(1.0, 2.5);
      acoustic += rand(6, 12);
      spindleCurrent += rand(4, 9);
      break;
    case "coolant_failure":
      coolantTemp += rand(4, 10);
      spindleTemp += rand(3, 8);
      spindleCurrent += rand(2, 5);
      break;
    case "lubrication_failure":
      lubricationPressure -= rand(0.2, 0.8);
      vibration += rand(0.5, 1.3);
      spindleTemp += rand(3, 9);
      acoustic += rand(2, 5);
      break;
    case "spindle_misalignment":
      vibration += rand(0.8, 1.8);
      spindleCurrent += rand(3, 7);
      spindleTemp += rand(2, 5);
      acoustic += rand(2, 4);
      break;
    case "cutting_overload":
      spindleCurrent += rand(15, 35);
      spindleTemp += rand(4, 8);
      vibration += rand(0.5, 1.2);
      acoustic += rand(2, 5);
      coolantTemp += rand(1, 3);
      break;
  }

  vibration = clamp(vibration, 0.1, 8.0);
  spindleCurrent = clamp(spindleCurrent, 0, 160);
  spindleTemp = clamp(spindleTemp, 20, 90);
  acoustic = clamp(acoustic, 55, 110);
  lubricationPressure = clamp(lubricationPressure, 0.0, 4.0);
  coolantTemp = clamp(coolantTemp, 18, 50);

  Object.assign(s, {
    vibration_mm_s: vibration,
    spindle_current_percent: spindleCurrent,
    spindle_temperature_C: spindleTemp,
    acoustic_dba: acoustic,
    lubrication_pressure_bar: lubricationPressure,
    coolant_temperature_C: coolantTemp,
  });

  const reading = {
    machine_id: machineId,
    machine_type: "cnc",
    timestamp: new Date().toISOString(),
    vibration_mm_s: fix(vibration),
    spindle_current_percent: fix(spindleCurrent),
    spindle_temperature_C: fix(spindleTemp),
    acoustic_dba: fix(acoustic),
    lubrication_pressure_bar: fix(lubricationPressure),
    coolant_temperature_C: fix(coolantTemp),
    active_failure: failure,
  };

  reading.status = getCncStatus(reading);
  return reading;
}

/* ---------------------------- PUMP SIMULATION ---------------------------- */

function getPumpFailureByTick(tick, machineId) {
  if (machineId === "PUMP_03") {
    if (tick < 60) return "none";
    if (tick < 140) return "bearing_failure";
    if (tick < 220) return "cavitation";
    if (tick < 300) return "seal_leakage";
    if (tick < 380) return "impeller_damage";
    if (tick < 460) return "clogging";
    if (tick < 520) return "dry_run";
    return "none";
  }

  return "none";
}

function getPumpStatus(reading) {
  if (
    reading.vibration_mm_s > 3.5 ||
    reading.motor_current_A > 20 ||
    reading.bearing_temperature_C > 75 ||
    reading.suction_pressure_bar < 0.5 ||
    reading.discharge_pressure_bar < 1.8 ||
    reading.flow_rate_lpm < 80
  ) {
    return "fault";
  }

  if (
    reading.vibration_mm_s > 2.0 ||
    reading.motor_current_A > 16 ||
    reading.bearing_temperature_C > 65 ||
    reading.suction_pressure_bar < 0.8 ||
    reading.discharge_pressure_bar < 2.5 ||
    reading.flow_rate_lpm < 120
  ) {
    return "warning";
  }

  return "running";
}

function nextPumpReading(machineId) {
  const s = liveState[machineId];
  const b = BASELINES[machineId];
  s.tick += 1;

  let vibration = s.vibration_mm_s;
  let motorCurrent = s.motor_current_A;
  let bearingTemp = s.bearing_temperature_C;
  let suctionPressure = s.suction_pressure_bar;
  let dischargePressure = s.discharge_pressure_bar;
  let flowRate = s.flow_rate_lpm;

  const failure = getPumpFailureByTick(s.tick, machineId);
  s.active_failure = failure;

  vibration += (b.vibration_mm_s - vibration) * 0.03 + rand(-0.08, 0.08);
  motorCurrent += (b.motor_current_A - motorCurrent) * 0.03 + rand(-0.25, 0.25);
  bearingTemp += (b.bearing_temperature_C - bearingTemp) * 0.03 + rand(-0.4, 0.4);
  suctionPressure += (b.suction_pressure_bar - suctionPressure) * 0.03 + rand(-0.03, 0.03);
  dischargePressure += (b.discharge_pressure_bar - dischargePressure) * 0.03 + rand(-0.06, 0.06);
  flowRate += (b.flow_rate_lpm - flowRate) * 0.03 + rand(-3, 3);

  switch (failure) {
    case "bearing_failure":
      vibration += rand(0.6, 1.8);
      bearingTemp += rand(4, 10);
      motorCurrent += rand(1, 3);
      break;
    case "cavitation":
      vibration += rand(1.2, 3.2);
      suctionPressure -= rand(0.2, 0.7);
      dischargePressure -= rand(0.3, 1.0);
      flowRate -= rand(20, 70);
      motorCurrent += rand(0.5, 2.0);
      break;
    case "seal_leakage":
      dischargePressure -= rand(0.4, 1.0);
      flowRate -= rand(15, 45);
      motorCurrent += rand(0.2, 1.0);
      break;
    case "impeller_damage":
      vibration += rand(0.4, 1.2);
      dischargePressure -= rand(0.6, 1.4);
      flowRate -= rand(30, 80);
      motorCurrent += rand(1, 3);
      break;
    case "clogging":
      motorCurrent += rand(2, 6);
      suctionPressure -= rand(0.1, 0.4);
      dischargePressure += rand(0.4, 1.0);
      flowRate -= rand(40, 100);
      vibration += rand(0.2, 0.8);
      bearingTemp += rand(2, 6);
      break;
    case "dry_run":
      suctionPressure -= rand(0.6, 1.1);
      dischargePressure -= rand(1.5, 3.0);
      flowRate -= rand(80, 220);
      bearingTemp += rand(6, 14);
      vibration += rand(0.5, 2.0);
      motorCurrent += rand(-1.0, 1.5);
      break;
  }

  vibration = clamp(vibration, 0.1, 6.0);
  motorCurrent = clamp(motorCurrent, 1, 28);
  bearingTemp = clamp(bearingTemp, 20, 95);
  suctionPressure = clamp(suctionPressure, 0.0, 2.0);
  dischargePressure = clamp(dischargePressure, 0.0, 7.0);
  flowRate = clamp(flowRate, 0, 350);

  Object.assign(s, {
    vibration_mm_s: vibration,
    motor_current_A: motorCurrent,
    bearing_temperature_C: bearingTemp,
    suction_pressure_bar: suctionPressure,
    discharge_pressure_bar: dischargePressure,
    flow_rate_lpm: flowRate,
  });

  const reading = {
    machine_id: machineId,
    machine_type: "pump",
    timestamp: new Date().toISOString(),
    vibration_mm_s: fix(vibration),
    motor_current_A: fix(motorCurrent),
    bearing_temperature_C: fix(bearingTemp),
    suction_pressure_bar: fix(suctionPressure),
    discharge_pressure_bar: fix(dischargePressure),
    flow_rate_lpm: fix(flowRate),
    active_failure: failure,
  };

  reading.status = getPumpStatus(reading);
  return reading;
}

/* -------------------------- CONVEYOR SIMULATION -------------------------- */

function getConveyorFailureByTick(tick, machineId) {
  if (machineId === "CONVEYOR_04") {
    if (tick < 60) return "none";
    if (tick < 140) return "roller_bearing_failure";
    if (tick < 220) return "belt_misalignment";
    if (tick < 300) return "overload";
    if (tick < 380) return "belt_slip";
    if (tick < 460) return "gearbox_overheating";
    if (tick < 520) return "jam";
    return "none";
  }

  return "none";
}

function getConveyorStatus(reading) {
  if (
    reading.vibration_mm_s > 4.0 ||
    reading.motor_current_A > 14 ||
    reading.gearbox_temperature_C > 80 ||
    reading.belt_speed_mps < 0.5 ||
    reading.load_kg > 450 ||
    reading.belt_alignment_mm > 12
  ) {
    return "fault";
  }

  if (
    reading.vibration_mm_s > 2.0 ||
    reading.motor_current_A > 10 ||
    reading.gearbox_temperature_C > 65 ||
    reading.belt_speed_mps < 1.0 ||
    reading.load_kg > 320 ||
    reading.belt_alignment_mm > 6
  ) {
    return "warning";
  }

  return "running";
}

function nextConveyorReading(machineId) {
  const s = liveState[machineId];
  const b = BASELINES[machineId];
  s.tick += 1;

  let vibration = s.vibration_mm_s;
  let motorCurrent = s.motor_current_A;
  let gearboxTemp = s.gearbox_temperature_C;
  let beltSpeed = s.belt_speed_mps;
  let load = s.load_kg;
  let beltAlignment = s.belt_alignment_mm;

  const failure = getConveyorFailureByTick(s.tick, machineId);
  s.active_failure = failure;

  vibration += (b.vibration_mm_s - vibration) * 0.03 + rand(-0.05, 0.05);
  motorCurrent += (b.motor_current_A - motorCurrent) * 0.03 + rand(-0.15, 0.15);
  gearboxTemp += (b.gearbox_temperature_C - gearboxTemp) * 0.03 + rand(-0.35, 0.35);
  beltSpeed += (b.belt_speed_mps - beltSpeed) * 0.03 + rand(-0.03, 0.03);
  load += (b.load_kg - load) * 0.03 + rand(-8, 8);
  beltAlignment += (b.belt_alignment_mm - beltAlignment) * 0.03 + rand(-0.15, 0.15);

  switch (failure) {
    case "roller_bearing_failure":
      vibration += rand(0.6, 1.8);
      gearboxTemp += rand(2, 6);
      motorCurrent += rand(0.5, 1.5);
      break;
    case "belt_misalignment":
      beltAlignment += rand(2, 6);
      vibration += rand(0.4, 1.2);
      motorCurrent += rand(0.4, 1.2);
      break;
    case "overload":
      load += rand(80, 180);
      motorCurrent += rand(2, 5);
      beltSpeed -= rand(0.1, 0.4);
      gearboxTemp += rand(3, 8);
      break;
    case "belt_slip":
      beltSpeed -= rand(0.3, 0.8);
      motorCurrent += rand(1, 3);
      vibration += rand(0.3, 1.0);
      break;
    case "gearbox_overheating":
      gearboxTemp += rand(8, 18);
      vibration += rand(0.4, 1.2);
      motorCurrent += rand(0.8, 2.0);
      break;
    case "jam":
      beltSpeed -= rand(0.8, 1.4);
      motorCurrent += rand(5, 9);
      vibration += rand(1.0, 2.5);
      load += rand(100, 250);
      gearboxTemp += rand(5, 12);
      break;
  }

  vibration = clamp(vibration, 0.1, 7.0);
  motorCurrent = clamp(motorCurrent, 1, 18);
  gearboxTemp = clamp(gearboxTemp, 20, 100);
  beltSpeed = clamp(beltSpeed, 0, 2.5);
  load = clamp(load, 0, 600);
  beltAlignment = clamp(beltAlignment, 0, 20);

  Object.assign(s, {
    vibration_mm_s: vibration,
    motor_current_A: motorCurrent,
    gearbox_temperature_C: gearboxTemp,
    belt_speed_mps: beltSpeed,
    load_kg: load,
    belt_alignment_mm: beltAlignment,
  });

  const reading = {
    machine_id: machineId,
    machine_type: "conveyor",
    timestamp: new Date().toISOString(),
    vibration_mm_s: fix(vibration),
    motor_current_A: fix(motorCurrent),
    gearbox_temperature_C: fix(gearboxTemp),
    belt_speed_mps: fix(beltSpeed),
    load_kg: fix(load),
    belt_alignment_mm: fix(beltAlignment),
    active_failure: failure,
  };

  reading.status = getConveyorStatus(reading);
  return reading;
}

function nextLiveReading(machineId) {
  if (machineId.startsWith("CNC")) return nextCncReading(machineId);
  if (machineId.startsWith("PUMP")) return nextPumpReading(machineId);
  if (machineId.startsWith("CONVEYOR")) return nextConveyorReading(machineId);
  throw new Error(`Unknown machine type: ${machineId}`);
}

/* --------------------------------- ROUTES --------------------------------- */

app.get("/stream/:machine_id", (req, res) => {
  const { machine_id } = req.params;

  if (!MACHINES.includes(machine_id)) {
    return res.status(404).json({
      error: `Unknown machine: ${machine_id}. Valid IDs: ${MACHINES.join(", ")}`,
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`: connected to ${machine_id} stream\n\n`);

  const interval = setInterval(() => {
    const reading = nextLiveReading(machine_id);
    res.write(`data: ${JSON.stringify(reading)}\n\n`);
  }, 1000);

  req.on("close", () => clearInterval(interval));
});

app.get("/history/:machine_id", (req, res) => {
  const { machine_id } = req.params;

  if (!MACHINES.includes(machine_id)) {
    return res.status(404).json({
      error: `Unknown machine: ${machine_id}. Valid IDs: ${MACHINES.join(", ")}`,
    });
  }

  res.json({
    machine_id,
    count: HISTORY[machine_id].length,
    readings: HISTORY[machine_id],
  });
});

app.post("/alert", (req, res) => {
  const { machine_id, reason, reading } = req.body;

  if (!machine_id || !reason) {
    return res.status(400).json({ error: "Body must include machine_id and reason." });
  }

  if (!MACHINES.includes(machine_id)) {
    return res.status(400).json({
      error: `Unknown machine: ${machine_id}. Valid IDs: ${MACHINES.join(", ")}`,
    });
  }

  const alert = {
    id: `ALERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    machine_id,
    reason,
    reading: reading || null,
    triggered_at: new Date().toISOString(),
  };

  alerts.push(alert);
  console.log(`🚨 [ALERT] ${alert.id} | ${machine_id} | ${reason}`);

  res.status(201).json({ success: true, alert });
});

app.post("/schedule-maintenance", (req, res) => {
  const { machine_id, proposed_slot } = req.body;

  if (!machine_id) {
    return res.status(400).json({ error: "Body must include machine_id." });
  }

  if (!MACHINES.includes(machine_id)) {
    return res.status(400).json({
      error: `Unknown machine: ${machine_id}. Valid IDs: ${MACHINES.join(", ")}`,
    });
  }

  const slot =
    proposed_slot ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(6, 0, 0, 0);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      if (d.getDay() === 6) d.setDate(d.getDate() + 2);
      return d.toISOString();
    })();

  const booking = {
    id: `MAINT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    machine_id,
    slot,
    booked_at: new Date().toISOString(),
    technician: "Auto-assigned",
  };

  maintenances.push(booking);
  console.log(`🔧 [MAINTENANCE] ${booking.id} | ${machine_id} | slot: ${slot}`);

  res.status(201).json({ success: true, booking });
});

app.get("/alerts", (req, res) => {
  res.json({ count: alerts.length, alerts });
});

app.get("/machines", (req, res) => {
  res.json({ machines: MACHINES, baselines: BASELINES });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  🏭  Predictive Maintenance Simulation Server            ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Dashboard   →  http://localhost:${PORT}                   ║`);
  console.log(`║  Stream      →  GET  /stream/{machine_id}                ║`);
  console.log(`║  History     →  GET  /history/{machine_id}               ║`);
  console.log(`║  Alert       →  POST /alert                              ║`);
  console.log(`║  Maintenance →  POST /schedule-maintenance               ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Machines: ${MACHINES.join("  ")}              ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");
});