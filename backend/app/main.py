import asyncio
import json
import logging
from typing import List, Dict, Any
from contextlib import asynccontextmanager

from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.core.config import settings
from app.core.event_bus import event_bus
from app.music.midi_engine import midi_engine
from app.music.song_catalog import SONG_CATALOG
from app.music.chord_detector import ChordDetector
from app.device.serial_manager import serial_manager
from app.analytics.db import init_db, get_recent_sessions, get_all_presets, save_preset
from app.analytics.tracker import performance_tracker
from app.ai.coach import ai_coach
from app.ai.copilot import visual_copilot

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("LightSync.API")

# Connected WebSocket clients set
active_websockets: List[WebSocket] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing LightSync v2 Backend Core...")
    init_db()
    midi_engine.start()
    serial_manager.connect("SIMULATED")

    # Hook event bus to forward events to all active WebSocket clients
    def forward_to_ws(event: Dict[str, Any]):
        if not active_websockets:
            return
        msg = json.dumps(event)
        # Schedule sending to active sockets
        for ws in list(active_websockets):
            try:
                asyncio.create_task(ws.send_text(msg))
            except Exception:
                pass

    event_bus.subscribe("*", forward_to_ws)
    yield
    # Shutdown
    logger.info("Shutting down LightSync Core...")
    midi_engine.stop()
    serial_manager.disconnect()

app = FastAPI(title=settings.APP_NAME, version=settings.VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class PresetModel(BaseModel):
    id: str
    name: str
    effect: str
    speed: float
    decay: float
    spread: float
    brightness: int
    rainbow: bool = False
    primary_color: str = "#00f0ff"
    secondary_color: str = "#ff007f"

class CopilotPromptModel(BaseModel):
    prompt: str

class ConnectDeviceModel(BaseModel):
    port: str
    baud: int = 115200

# REST Endpoints
@app.get("/api/status")
def get_status():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "midi": {
            "active_port": midi_engine.active_port_name,
            "active_notes": list(midi_engine.active_pitches),
            "chord": midi_engine.current_chord
        },
        "device": {
            "connected": serial_manager.connected,
            "port": serial_manager.port_name,
            "simulated": serial_manager.simulated,
            "latency_ms": serial_manager.last_latency_ms,
            "info": serial_manager.device_info
        }
    }

@app.get("/api/midi/ports")
def get_midi_ports():
    return {"ports": midi_engine.get_available_ports(), "active": midi_engine.active_port_name}

@app.post("/api/midi/connect")
def connect_midi(data: Dict[str, str]):
    port = data.get("port")
    success = midi_engine.start(port)
    return {"success": success, "active_port": midi_engine.active_port_name}

@app.get("/api/device/ports")
def get_device_ports():
    return {"ports": serial_manager.list_ports(), "active": serial_manager.port_name}

@app.post("/api/device/connect")
def connect_device(data: ConnectDeviceModel):
    success = serial_manager.connect(data.port, data.baud)
    return {"success": success, "port": serial_manager.port_name, "simulated": serial_manager.simulated}

@app.get("/api/songs")
def get_songs():
    return {"songs": SONG_CATALOG}

@app.get("/api/presets")
def get_presets():
    return {"presets": get_all_presets()}

@app.post("/api/presets")
def post_preset(preset: PresetModel):
    save_preset(preset.model_dump())
    return {"status": "success", "preset": preset}

@app.get("/api/analytics/sessions")
def get_sessions():
    return {"sessions": get_recent_sessions(30)}

@app.post("/api/ai/coach")
def analyze_session(session_data: Dict[str, Any]):
    return ai_coach.analyze_performance(session_data)

@app.post("/api/ai/copilot")
def copilot_generate(req: CopilotPromptModel):
    return visual_copilot.generate_preset_from_prompt(req.prompt)

# WebSocket Real-Time Bidirectional Channel
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(active_websockets)}")

    # Send initial snapshot
    await websocket.send_text(json.dumps({
        "type": "INITIAL_STATE",
        "midi_ports": midi_engine.get_available_ports(),
        "active_midi": midi_engine.active_port_name,
        "device": {
            "connected": serial_manager.connected,
            "port": serial_manager.port_name,
            "simulated": serial_manager.simulated,
            "latency_ms": serial_manager.last_latency_ms
        }
    }))

    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                msg_type = msg.get("type")

                if msg_type == "NOTE_ON":
                    pitch = msg.get("pitch", 60)
                    velocity = msg.get("velocity", 100)
                    midi_engine.handle_note_on(pitch, velocity, source="client_ui")

                elif msg_type == "NOTE_OFF":
                    pitch = msg.get("pitch", 60)
                    midi_engine.handle_note_off(pitch, source="client_ui")

                elif msg_type == "EFFECT_CHANGED":
                    eff = msg.get("effect", "bounce")
                    event_bus.publish_sync("EFFECT_CHANGED", {"effect": eff})

                elif msg_type == "PARAM_CHANGED":
                    param = msg.get("param")
                    val = msg.get("value")
                    event_bus.publish_sync("PARAM_CHANGED", {"param": param, "value": val})

                elif msg_type == "START_SESSION":
                    song_id = msg.get("song_id", "freestyle")
                    song_title = msg.get("song_title", "Freestyle Play")
                    mode = msg.get("mode", "learn")
                    performance_tracker.start_session(song_id, song_title, mode)

                elif msg_type == "NOTE_ATTEMPT":
                    exp_p = msg.get("expected_pitch", 60)
                    play_p = msg.get("played_pitch", 60)
                    dev_ms = msg.get("deviation_ms", 0.0)
                    vel = msg.get("velocity", 100)
                    performance_tracker.record_note_attempt(exp_p, play_p, dev_ms, vel)

                elif msg_type == "END_SESSION":
                    summary = performance_tracker.end_session()
                    if summary:
                        coach_feedback = ai_coach.analyze_performance(summary)
                        await websocket.send_text(json.dumps({
                            "type": "SESSION_RESULT",
                            "summary": summary,
                            "coach": coach_feedback
                        }))

                elif msg_type == "PING":
                    serial_manager.ping()
                    await websocket.send_text(json.dumps({
                        "type": "PONG",
                        "server_time": asyncio.get_event_loop().time(),
                        "latency_ms": serial_manager.last_latency_ms
                    }))

            except Exception as e:
                logger.error(f"Error processing WS payload: {e}")
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(active_websockets)}")

# Mount static frontend build files if present
dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="static")
