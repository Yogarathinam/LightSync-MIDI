import threading
import time
from typing import Set, List, Optional, Dict, Any
import logging

try:
    import mido
except ImportError:
    mido = None

from app.core.event_bus import event_bus
from app.music.chord_detector import ChordDetector

logger = logging.getLogger("LightSync.MidiEngine")

class MidiEngine:
    def __init__(self):
        self.active_port_name: Optional[str] = None
        self.inport = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self.active_pitches: Set[int] = set()
        self.current_chord: Optional[Dict[str, Any]] = None

    def get_available_ports(self) -> List[str]:
        if not mido:
            return []
        try:
            return mido.get_input_names()
        except Exception as e:
            logger.warning(f"Could not list MIDI ports: {e}")
            return []

    def start(self, preferred_port: Optional[str] = None):
        ports = self.get_available_ports()
        target_port = preferred_port if (preferred_port and preferred_port in ports) else (ports[0] if ports else None)

        if not target_port:
            logger.info("No physical MIDI device detected. Running in Virtual / WebMIDI Mode.")
            return False

        try:
            self.inport = mido.open_input(target_port)
            self.active_port_name = target_port
            self._running = True
            self._thread = threading.Thread(target=self._listen_loop, daemon=True)
            self._thread.start()
            logger.info(f"Connected to MIDI Device: {target_port}")
            return True
        except Exception as e:
            logger.error(f"Failed to open MIDI port {target_port}: {e}")
            return False

    def stop(self):
        self._running = False
        if self.inport:
            try:
                self.inport.close()
            except Exception:
                pass
            self.inport = None
        self.active_port_name = None

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
                logger.error(f"Error reading MIDI stream: {e}")
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
