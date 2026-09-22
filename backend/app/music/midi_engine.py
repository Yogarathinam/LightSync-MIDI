import threading
import time
import sys
from typing import Set, List, Optional, Dict, Any
import logging

# 1. Primary backend: rtmidi2 (pre-compiled wheel support for Python 3.13 on Windows/Mac/Linux)
try:
    import rtmidi2
except ImportError:
    rtmidi2 = None

# 2. Secondary backend: mido
try:
    import mido
except ImportError:
    mido = None

# 3. Native Windows WinMM fallback (zero dependency fallback on all Windows versions)
is_windows = sys.platform.startswith("win")
if is_windows:
    try:
        import ctypes
        from ctypes import wintypes
        class MIDIINCAPSW(ctypes.Structure):
            _fields_ = [
                ('wMid', wintypes.WORD),
                ('wPid', wintypes.WORD),
                ('vDriverVersion', wintypes.DWORD),
                ('szPname', wintypes.WCHAR * 32),
                ('dwSupport', wintypes.DWORD),
            ]
        winmm = ctypes.windll.winmm
    except Exception:
        winmm = None
else:
    winmm = None

from app.core.event_bus import event_bus
from app.music.chord_detector import ChordDetector

logger = logging.getLogger("LightSync.MidiEngine")

class MidiEngine:
    def __init__(self):
        self.active_port_name: Optional[str] = None
        self.inport = None
        self._rtmidi2_in: Optional[Any] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self.active_pitches: Set[int] = set()
        self.current_chord: Optional[Dict[str, Any]] = None

    def get_available_ports(self) -> List[str]:
        # Priority 1: rtmidi2
        if rtmidi2:
            try:
                ports = rtmidi2.get_in_ports()
                if ports is not None:
                    return list(ports)
            except Exception as e:
                logger.debug(f"rtmidi2 port query error: {e}")

        # Priority 2: Native Windows WinMM (zero dependencies, works out of the box on Windows)
        if winmm:
            try:
                num = winmm.midiInGetNumDevs()
                ports = []
                for i in range(num):
                    caps = MIDIINCAPSW()
                    if winmm.midiInGetDevCapsW(i, ctypes.byref(caps), ctypes.sizeof(caps)) == 0:
                        ports.append(caps.szPname)
                return ports
            except Exception as e:
                logger.debug(f"WinMM port query error: {e}")

        # Priority 3: mido
        if mido:
            try:
                return mido.get_input_names()
            except Exception as e:
                # Suppress missing backend warning so logs are never spammed
                logger.debug(f"mido input query: {e}")

        return []

    def start(self, preferred_port: Optional[str] = None) -> bool:
        self.stop()

        if not preferred_port or preferred_port == "DISCONNECT" or preferred_port == "None":
            logger.info("MIDI engine set to Disconnected / Virtual Mode.")
            event_bus.publish_sync("MIDI_STATUS", {"connected": False, "port": None})
            return False

        ports = self.get_available_ports()
        target_port = preferred_port if preferred_port in ports else (ports[0] if ports else None)

        if not target_port:
            logger.info("No matching physical MIDI device detected. Running in Virtual / WebMIDI Mode.")
            event_bus.publish_sync("MIDI_STATUS", {"connected": False, "port": None})
            return False

        # Attempt opening via rtmidi2 first
        if rtmidi2:
            try:
                self._rtmidi2_in = rtmidi2.MidiIn()
                
                def _rtmidi2_callback(msg, timestamp):
                    if not msg or len(msg) < 2:
                        return
                    status = msg[0]
                    pitch = msg[1]
                    velocity = msg[2] if len(msg) > 2 else 0
                    msg_type = status & 0xF0
                    
                    if msg_type == 0x90:
                        if velocity > 0:
                            self.handle_note_on(pitch, velocity, source="physical_midi")
                        else:
                            self.handle_note_off(pitch, source="physical_midi")
                    elif msg_type == 0x80:
                        self.handle_note_off(pitch, source="physical_midi")

                self._rtmidi2_in.callback = _rtmidi2_callback
                
                in_ports = self._rtmidi2_in.ports
                opened = False
                for idx, pname in enumerate(in_ports):
                    if pname == target_port or target_port in pname:
                        self._rtmidi2_in.open_port(idx)
                        opened = True
                        break
                
                if not opened and len(in_ports) > 0:
                    self._rtmidi2_in.open_port(0)
                    opened = True

                if opened:
                    self.active_port_name = target_port
                    self._running = True
                    logger.info(f"Connected to MIDI Device via rtmidi2: {target_port}")
                    event_bus.publish_sync("MIDI_STATUS", {"connected": True, "port": target_port})
                    return True
            except Exception as e:
                logger.warning(f"rtmidi2 open failed on {target_port}: {e}")
                self._rtmidi2_in = None

        # Fallback to mido
        if mido:
            try:
                self.inport = mido.open_input(target_port)
                self.active_port_name = target_port
                self._running = True
                self._thread = threading.Thread(target=self._listen_loop, daemon=True)
                self._thread.start()
                logger.info(f"Connected to MIDI Device via mido: {target_port}")
                event_bus.publish_sync("MIDI_STATUS", {"connected": True, "port": target_port})
                return True
            except Exception as e:
                logger.error(f"Failed to open MIDI port via mido {target_port}: {e}")

        event_bus.publish_sync("MIDI_STATUS", {"connected": False, "port": None})
        return False

    def stop(self):
        self._running = False
        if self._rtmidi2_in:
            try:
                self._rtmidi2_in.close_port()
            except Exception:
                pass
            self._rtmidi2_in = None

        if self.inport:
            try:
                self.inport.close()
            except Exception:
                pass
            self.inport = None

        self.active_port_name = None
        event_bus.publish_sync("MIDI_STATUS", {"connected": False, "port": None})

    def _listen_loop(self):
        while self._running and self.inport:
            try:
                for msg in self.inport.iter_pending():
                    if msg.type == 'note_on':
                        if msg.velocity > 0:
                            self.handle_note_on(msg.note, msg.velocity, source="physical_midi")
                        else:
                            self.handle_note_off(msg.note, source="physical_midi")
                    elif msg.type == 'note_off':
                        self.handle_note_off(msg.note, source="physical_midi")
            except Exception as e:
                logger.debug(f"Error reading MIDI stream: {e}")
                time.sleep(0.05)
            time.sleep(0.001)

    def handle_note_on(self, pitch: int, velocity: int = 100, source: str = "virtual"):
        self.active_pitches.add(pitch)
        chord_info = ChordDetector.identify(self.active_pitches)
        self.current_chord = chord_info

        payload = {
            "pitch": pitch,
            "velocity": velocity,
            "timestamp": time.time(),
            "source": source,
            "active_count": len(self.active_pitches),
            "chord": chord_info
        }

        event_bus.publish_sync("NOTE_ON", payload)

    def handle_note_off(self, pitch: int, source: str = "virtual"):
        if pitch in self.active_pitches:
            self.active_pitches.remove(pitch)

        chord_info = ChordDetector.identify(self.active_pitches)
        self.current_chord = chord_info

        payload = {
            "pitch": pitch,
            "timestamp": time.time(),
            "source": source,
            "active_count": len(self.active_pitches),
            "chord": chord_info
        }

        event_bus.publish_sync("NOTE_OFF", payload)

midi_engine = MidiEngine()
