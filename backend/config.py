import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
TRAFFIC_DELAY_THRESHOLD = 1.5
SOLVER_TIME_LIMIT_SECONDS = 3
SIMULATOR_TICK_SECONDS = 2.5
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
