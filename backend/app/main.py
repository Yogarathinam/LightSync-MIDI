import asyncio
import json
import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.core.config import settings
from app.core.event_bus import event_bus
from app.music.midi_engine import midi_engine
from app.music.song_catalog import (
    SONG_CATALOG, 
    get_all_songs, 
    get_midi_folder_path, 
    save_uploaded_midi, 
    delete_midi_file, 
    rescan_midi_folder
)
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
main_loop: Optional[asyncio.AbstractEventLoop] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop
    main_loop = asyncio.get_running_loop()
    logger.info("Initializing LightSync v2 Backend Core...")
    init_db()
    midi_engine.start()
    serial_manager.connect("SIMULATED")

    # Hook event bus to forward events to all active WebSocket clients thread-safely
    def forward_to_ws(event: Dict[str, Any]):
        if not active_websockets:
            return
        msg = json.dumps(event)
        for ws in list(active_websockets):
            try:
                if main_loop and main_loop.is_running():
                    asyncio.run_coroutine_threadsafe(ws.send_text(msg), main_loop)
                else:
                    asyncio.create_task(ws.send_text(msg))
            except Exception as e:
                logger.debug(f"WS broadcast error: {e}")

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

class SaveRecordingModel(BaseModel):
    title: str = "Recorded Performance"
    events: List[Dict[str, Any]]
    bpm: Optional[int] = 120

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

@app.post("/api/midi/disconnect")
def disconnect_midi():
    midi_engine.stop()
    return {"success": True, "active_port": None}

@app.get("/api/device/ports")
def get_device_ports():
    return {"ports": serial_manager.list_ports(), "active": serial_manager.port_name}

@app.post("/api/device/connect")
def connect_device(data: ConnectDeviceModel):
    success = serial_manager.connect(data.port, data.baud)
    return {"success": success, "port": serial_manager.port_name, "simulated": serial_manager.simulated}

@app.post("/api/device/disconnect")
def disconnect_device():
    serial_manager.disconnect()
    return {"success": True, "port": None, "simulated": True}

# User Settings Persistence File (Resolved relative to backend data folder)
SETTINGS_FILE = Path(__file__).resolve().parent.parent / "data" / "user_settings.json"

@app.get("/api/settings")
def get_user_settings():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading user settings: {e}")
    return {}

@app.post("/api/settings")
def save_user_settings(payload: Dict[str, Any]):
    try:
        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        return {"status": "ok", "saved": True}
    except Exception as e:
        logger.error(f"Error saving user settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/songs")
def get_songs():
    return {
        "songs": get_all_songs(),
        "midi_folder": str(get_midi_folder_path())
    }

@app.post("/api/songs/upload")
async def upload_midi_file(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(('.mid', '.midi')):
        raise HTTPException(status_code=400, detail="Only .mid and .midi files are supported.")
    
    try:
        content = await file.read()
        song = save_uploaded_midi(file.filename, content)
        if not song:
            raise HTTPException(status_code=422, detail="Failed to parse MIDI file.")
        return {"status": "success", "song": song}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving uploaded MIDI: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/songs/rescan")
def rescan_songs():
    refreshed_songs = rescan_midi_folder()
    return {
        "status": "success",
        "songs": refreshed_songs,
        "midi_folder": str(get_midi_folder_path())
    }

@app.delete("/api/songs/{song_id}")
def delete_song(song_id: str):
    success = delete_midi_file(song_id)
    return {"status": "success" if success else "not_found", "deleted": success}

@app.post("/api/midi/record/save")
def save_recording(payload: SaveRecordingModel):
    try:
        import time
        import mido
        from mido import MidiFile, MidiTrack, Message, MetaMessage
        
        mid = MidiFile(type=0)
        track = MidiTrack()
        mid.tracks.append(track)
        
        track.append(MetaMessage('track_name', name=payload.title, time=0))
        track.append(MetaMessage('set_tempo', tempo=mido.bpm2tempo(payload.bpm or 120), time=0))
        
        sorted_events = sorted(payload.events, key=lambda e: e.get("time_ms", 0))
        ticks_per_beat = mid.ticks_per_beat  # default 480
        ms_per_tick = (60000.0 / (payload.bpm or 120)) / ticks_per_beat
        
        last_time_ms = 0
        for ev in sorted_events:
            ev_time = ev.get("time_ms", 0)
            delta_ms = max(0, ev_time - last_time_ms)
            last_time_ms = ev_time
            delta_ticks = int(round(delta_ms / ms_per_tick))
            
            ev_type = ev.get("type", "note_on")
            pitch = int(ev.get("pitch", 60))
            velocity = int(ev.get("velocity", 64))
            
            if ev_type == "note_on" and velocity > 0:
                track.append(Message('note_on', note=pitch, velocity=velocity, time=delta_ticks))
            else:
                track.append(Message('note_off', note=pitch, velocity=0, time=delta_ticks))
                
        track.append(MetaMessage('end_of_track', time=0))
        
        clean_name = "".join(c for c in payload.title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
        filename = f"rec_{clean_name}_{int(time.time())}.mid"
        midi_dir = get_midi_folder_path()
        out_path = Path(midi_dir) / filename
        mid.save(str(out_path))
        
        refreshed_songs = rescan_midi_folder()
        return {"status": "success", "filename": filename, "songs": refreshed_songs}
    except Exception as e:
        logger.error(f"Error saving recording as MIDI: {e}")
        return {"status": "error", "detail": str(e)}

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

                elif msg_type == "COLOR_PRESET_CHANGED":
                    preset = msg.get("preset", "Cyberpunk Neon")
                    event_bus.publish_sync("COLOR_PRESET_CHANGED", {"preset": preset})

                elif msg_type == "KEY_COUNT_CHANGED":
                    key_count = msg.get("key_count", 61)
                    event_bus.publish_sync("KEY_COUNT_CHANGED", {"key_count": key_count})

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

                elif msg_type == "CONNECT_MIDI":
                    port = msg.get("port")
                    midi_engine.start(port)

                elif msg_type == "DISCONNECT_MIDI":
                    midi_engine.stop()

                elif msg_type == "CONNECT_DEVICE":
                    port = msg.get("port", "SIMULATED")
                    baud = msg.get("baud", 115200)
                    serial_manager.connect(port, baud)

                elif msg_type == "DISCONNECT_DEVICE":
                    serial_manager.disconnect()

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
