import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


MONGO_URI = os.environ.get("AMDA_MONGO_URI", "mongodb://127.0.0.1:27017/amda_db")
MONGO_DB = os.environ.get("AMDA_MONGO_DB", "amda_db")

MODELS_DIR = os.environ.get("AMDA_MODELS_DIR", str(Path.home() / "AMDA/models"))

STREAM_BASE_URL = os.environ.get("AMDA_STREAM_BASE_URL", "http://127.0.0.1:3000/stream")

ALERT_COOLDOWN_SECONDS = int(os.environ.get("AMDA_ALERT_COOLDOWN_SECONDS", "300"))

TURN_AROUND_TIME_SECONDS = int(os.environ.get("AMDA_TAT_SECONDS", "3600"))

FLASK_SECRET_KEY = os.environ.get("AMDA_FLASK_SECRET_KEY", "change-me-in-production")
FLASK_DEBUG = os.environ.get("AMDA_FLASK_DEBUG", "false").lower() == "true"
FLASK_HOST = os.environ.get("AMDA_FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.environ.get("AMDA_FLASK_PORT", "5000"))
