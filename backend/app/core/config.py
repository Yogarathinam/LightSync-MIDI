import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "lightsync.db"

class Settings(BaseModel):
    APP_NAME: str = "LightSync v2"
    VERSION: str = "2.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8765
    SERIAL_BAUD: int = 115200
    DEFAULT_LED_COUNT: int = 144
    DEFAULT_KEY_COUNT: int = 61
    DB_FILE: str = str(DB_PATH)

settings = Settings()
