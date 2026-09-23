import threading
import time
from typing import List, Optional, Dict, Any
import logging

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    serial = None

from app.core.event_bus import event_bus
from app.device.protocol import ProtocolBuilder

logger = logging.getLogger("LightSync.SerialManager")

class SerialDeviceManager:
    def __init__(self):
        self.port_name: Optional[str] = None
        self.ser: Optional[Any] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self.connected = False
        self.simulated = True
        self.last_ping_ms = 0
        self.last_latency_ms = 0
        self.octave_shift: int = 0
        self.transpose: int = 0
        self.active_note_shifts: Dict[int, int] = {}
        self.device_info: Dict[str, Any] = {
            "name": "LightSync M5 Core",
            "firmware": "v2.0-PRO",
            "fps": 60,
            "led_count": 144
        }

        # Subscribe to Event Bus to automatically route Note and Effect events to MCU
        event_bus.subscribe("NOTE_ON", self._on_note_on)
        event_bus.subscribe("NOTE_OFF", self._on_note_off)
        event_bus.subscribe("EFFECT_CHANGED", self._on_effect_changed)
        event_bus.subscribe("PARAM_CHANGED", self._on_param_changed)
        event_bus.subscribe("COLOR_PRESET_CHANGED", self._on_preset_changed)
        event_bus.subscribe("KEY_COUNT_CHANGED", self._on_key_count_changed)
        event_bus.subscribe("MIDI_STATUS", self._on_midi_status)
        event_bus.subscribe("OCTAVE_SHIFT_CHANGED", self._on_octave_shift_changed)
        event_bus.subscribe("TRANSPOSE_CHANGED", self._on_transpose_changed)

    def list_ports(self) -> List[Dict[str, str]]:
        if not serial:
            return [{"port": "STANDALONE", "desc": "LightSync Optical Engine (Virtual)"}]

        try:
            ports = serial.tools.list_ports.comports()
            cp210x_ports = []
            other_ports = []
            for p in ports:
                item = {"port": p.device, "desc": p.description or ""}
                desc_lower = (p.description or "").lower()
                mfg_lower = getattr(p, "manufacturer", "") or ""
                if isinstance(mfg_lower, str):
                    mfg_lower = mfg_lower.lower()
                
                if any(k in desc_lower or k in mfg_lower for k in ["silicon", "cp210", "m5stack", "ch340"]):
                    cp210x_ports.append(item)
                else:
                    other_ports.append(item)

            res = cp210x_ports + other_ports
            res.append({"port": "STANDALONE", "desc": "LightSync Optical Engine (Virtual)"})
            return res
        except Exception as e:
            logger.warning(f"Error listing serial ports: {e}")
            return [{"port": "STANDALONE", "desc": "LightSync Optical Engine (Virtual)"}]

    def connect(self, port_name: str, baud: int = 115200) -> bool:
        self.disconnect()

        if port_name in ("SIMULATED", "STANDALONE") or not serial:
            self.simulated = True
            self.connected = True
            self.port_name = "STANDALONE"
            self.device_info["name"] = "LightSync Optical Engine"
            event_bus.publish_sync("DEVICE_STATUS", {"connected": True, "port": "STANDALONE", "simulated": True})
            return True

        try:
            self.ser = serial.Serial(port_name, baud, timeout=0.1)
            self.port_name = port_name
            self.connected = True
            self.simulated = False
            self._running = True
            self._thread = threading.Thread(target=self._reader_loop, daemon=True)
            self._thread.start()

            # Handshake
            self.send_raw(f"PORT_CONNECT {port_name}")
            try:
                from app.music.midi_engine import midi_engine
                if midi_engine.active_port_name:
                    self.send_raw(ProtocolBuilder.midi_port(midi_engine.active_port_name))
            except Exception:
                pass
            self.send_raw(ProtocolBuilder.ping())

            event_bus.publish_sync("DEVICE_STATUS", {"connected": True, "port": port_name, "simulated": False})
            logger.info(f"Connected to M5Stack on {port_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {port_name}: {e}")
            self.connected = False
            self.simulated = True
            return False

    def disconnect(self):
        if self.ser and self.connected:
            try:
                self.send_raw("PORT_DISCONNECT")
            except Exception:
                pass
        self._running = False
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
            self.ser = None
        self.connected = False
        self.port_name = None
        event_bus.publish_sync("DEVICE_STATUS", {"connected": False, "port": None, "simulated": self.simulated})


    def send_raw(self, cmd: str):
        if not cmd.endswith("\n"):
            cmd += "\n"

        if self.connected and self.ser and not self.simulated:
            try:
                self.ser.write(cmd.encode("utf-8"))
            except Exception as e:
                logger.error(f"Serial write error: {e}")
                self.disconnect()

    def ping(self):
        self.last_ping_ms = time.time() * 1000
        self.send_raw(ProtocolBuilder.ping())

    def _on_note_on(self, data: Dict[str, Any]):
        pitch = data.get("pitch", 60)
        vel = data.get("velocity", 100)
        shifted_pitch = max(0, min(127, pitch + (self.octave_shift * 12) + self.transpose))
        self.active_note_shifts[pitch] = shifted_pitch
        self.send_raw(ProtocolBuilder.note_on(shifted_pitch, vel))
        chord = data.get("chord")
        if chord and isinstance(chord, dict) and "chord" in chord:
            self.send_raw(ProtocolBuilder.chord(chord["chord"]))

    def _on_note_off(self, data: Dict[str, Any]):
        pitch = data.get("pitch", 60)
        shifted_pitch = self.active_note_shifts.pop(pitch, max(0, min(127, pitch + (self.octave_shift * 12) + self.transpose)))
        self.send_raw(ProtocolBuilder.note_off(shifted_pitch))
        chord = data.get("chord")
        if chord and isinstance(chord, dict) and "chord" in chord:
            self.send_raw(ProtocolBuilder.chord(chord["chord"]))
        elif data.get("active_count", 0) == 0:
            self.send_raw(ProtocolBuilder.chord("Ready"))

    def _on_octave_shift_changed(self, data: Dict[str, Any]):
        self.octave_shift = int(data.get("octave_shift", 0))
        logger.info(f"SerialManager octave_shift updated to {self.octave_shift}")

    def _on_transpose_changed(self, data: Dict[str, Any]):
        self.transpose = int(data.get("transpose", 0))
        logger.info(f"SerialManager transpose updated to {self.transpose}")

    def _on_effect_changed(self, data: Dict[str, Any]):
        eff = data.get("effect", "bounce")
        self.send_raw(ProtocolBuilder.set_effect(eff))

    def _on_param_changed(self, data: Dict[str, Any]):
        param = data.get("param")
        value = data.get("value")
        if param and value is not None:
            self.send_raw(ProtocolBuilder.set_param(param, value))

    def _on_preset_changed(self, data: Dict[str, Any]):
        preset = data.get("preset", "Cyberpunk Neon")
        self.send_raw(ProtocolBuilder.preset(preset))

    def _on_key_count_changed(self, data: Dict[str, Any]):
        keys = data.get("key_count", 61)
        self.send_raw(ProtocolBuilder.set_keyboard_size(keys))

    def _on_midi_status(self, data: Dict[str, Any]):
        if data.get("connected") and data.get("port"):
            self.send_raw(ProtocolBuilder.midi_port(str(data["port"])))
        else:
            self.send_raw(ProtocolBuilder.midi_disconnect())

    def _reader_loop(self):
        while self._running and self.ser:
            try:
                line = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if line:
                    self._handle_incoming_line(line)
            except Exception as e:
                logger.warning(f"Serial reader exception: {e}")
                time.sleep(0.05)
            time.sleep(0.002)

    def _handle_incoming_line(self, line: str):
        if line.startswith("PONG"):
            now = time.time() * 1000
            self.last_latency_ms = max(1, int(now - self.last_ping_ms)) if self.last_ping_ms else 2
        elif line.startswith("LIGHTSYNC_M5_READY"):
            self.device_info["ready"] = True
            logger.info("M5Stack Handshake Verified: " + line)
        elif line.startswith("EVENT "):
            # Physical button press on M5Stack
            parts = line.split(" ", 2)
            event_name = parts[1]
            val = parts[2] if len(parts) > 2 else ""
            event_bus.publish_sync("M5_HARDWARE_EVENT", {"event": event_name, "value": val})

serial_manager = SerialDeviceManager()
