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

        # Callback signature: void CALLBACK MidiInProc(HMIDIIN, UINT, DWORD_PTR, DWORD_PTR, DWORD_PTR)
        MIDIINPROC = ctypes.WINFUNCTYPE(
            None,
            wintypes.HANDLE,
            wintypes.UINT,
            ctypes.c_void_p,
            ctypes.c_void_p,
            ctypes.c_void_p
        )
        MIM_DATA = 0x3C3
        MIM_MOREDATA = 0x3CC
        CALLBACK_FUNCTION = 0x00030000
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
        self._rtmidi2_callback: Optional[Any] = None
        self._winmm_handle = None
        self._winmm_cb = None
        self._thread: Optional[threading.Thread] = None
        self._watcher_thread: Optional[threading.Thread] = None
        self._watcher_running = False
        self._running = False
        self.active_pitches: Set[int] = set()
        self.current_chord: Optional[Dict[str, Any]] = None

    def get_available_ports(self) -> List[str]:
        # On Windows, if WinMM reports 0 MIDI devices, return empty early to suppress C++ stderr spam
        if is_windows and winmm:
            try:
                if winmm.midiInGetNumDevs() == 0:
                    return []
            except Exception:
                pass

        found_ports: List[str] = []

        # Priority 1: rtmidi2
        if rtmidi2:
            try:
                ports = rtmidi2.get_in_ports()
                if ports:
                    for p in ports:
                        if p and p not in found_ports:
                            found_ports.append(p)
            except Exception as e:
                logger.debug(f"rtmidi2 port query error: {e}")

        # Priority 2: Native Windows WinMM (zero dependencies, works out of the box on Windows)
        if winmm:
            try:
                num = winmm.midiInGetNumDevs()
                for i in range(num):
                    caps = MIDIINCAPSW()
                    if winmm.midiInGetDevCapsW(i, ctypes.byref(caps), ctypes.sizeof(caps)) == 0:
                        name = caps.szPname
                        if name and name not in found_ports:
                            found_ports.append(name)
            except Exception as e:
                logger.debug(f"WinMM port query error: {e}")

        # Priority 3: mido
        if mido:
            try:
                m_ports = mido.get_input_names()
                if m_ports:
                    for p in m_ports:
                        if p and p not in found_ports:
                            found_ports.append(p)
            except Exception as e:
                logger.debug(f"mido input query: {e}")

        return found_ports

    def start(self, preferred_port: Optional[str] = None) -> bool:
        self.stop()
        self._start_auto_watcher()

        if preferred_port == "DISCONNECT" or preferred_port == "None":
            logger.info("MIDI engine set to Disconnected / Virtual Mode.")
            event_bus.publish_sync("MIDI_STATUS", {"connected": False, "port": None})
            return False

        ports = self.get_available_ports()
        target_port = preferred_port if (preferred_port and preferred_port in ports) else (ports[0] if ports else None)

        if not target_port:
            logger.info("No physical MIDI device detected. Running in Virtual / WebMIDI Mode.")
            event_bus.publish_sync("MIDI_STATUS", {"connected": False, "port": None})
            return False

        # Attempt 1: rtmidi2
        if rtmidi2:
            try:
                self._rtmidi2_in = rtmidi2.MidiIn()
                in_ports = self._rtmidi2_in.ports or []
                port_idx = -1
                for idx, pname in enumerate(in_ports):
                    if target_port == pname or target_port in pname or pname in target_port:
                        port_idx = idx
                        break
                if port_idx == -1 and len(in_ports) > 0:
                    port_idx = 0

                if port_idx >= 0:
                    self._rtmidi2_in.open_port(port_idx)

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

                    self._rtmidi2_callback = _rtmidi2_callback
                    self._rtmidi2_in.callback = _rtmidi2_callback
                    self.active_port_name = target_port
                    self._running = True
                    logger.info(f"Connected to MIDI Device via rtmidi2: {target_port}")
                    event_bus.publish_sync("MIDI_STATUS", {"connected": True, "port": target_port})
                    return True
            except Exception as e:
                logger.warning(f"rtmidi2 open failed on {target_port}: {e}")
                self._rtmidi2_in = None

        # Attempt 2: Native Windows WinMM (zero dependencies, 100% reliable on Windows)
        if winmm:
            try:
                num = winmm.midiInGetNumDevs()
                dev_idx = -1
                for i in range(num):
                    try:
                        caps = MIDIINCAPSW()
                        if winmm.midiInGetDevCapsW(i, ctypes.byref(caps), ctypes.sizeof(caps)) == 0:
                            if target_port == caps.szPname or target_port in caps.szPname or caps.szPname in target_port:
                                dev_idx = i
                                break
                    except Exception:
                        pass
                if dev_idx == -1 and num > 0:
                    dev_idx = 0

                if dev_idx >= 0:
                    h_midi = wintypes.HANDLE()

                    def _winmm_proc(hMidiIn, wMsg, dwInstance, dwParam1, dwParam2):
                        if wMsg == MIM_DATA or wMsg == MIM_MOREDATA:
                            p1 = int(ctypes.cast(dwParam1, ctypes.c_void_p).value or 0)
                            status = p1 & 0xFF
                            pitch = (p1 >> 8) & 0xFF
                            velocity = (p1 >> 16) & 0xFF
                            msg_type = status & 0xF0
                            if msg_type == 0x90:
                                if velocity > 0:
                                    self.handle_note_on(pitch, velocity, source="physical_midi")
                                else:
                                    self.handle_note_off(pitch, source="physical_midi")
                            elif msg_type == 0x80:
                                self.handle_note_off(pitch, source="physical_midi")

                    self._winmm_cb = MIDIINPROC(_winmm_proc)
                    res = -1
                    try:
                        res = winmm.midiInOpen(
                            ctypes.byref(h_midi),
                            dev_idx,
                            self._winmm_cb,
                            0,
                            CALLBACK_FUNCTION
                        )
                    except Exception as err:
                        logger.warning(f"WinMM midiInOpen exception: {err}")
                    if res == 0:
                        winmm.midiInStart(h_midi)
                        self._winmm_handle = h_midi
                        self.active_port_name = target_port
                        self._running = True
                        logger.info(f"Connected to MIDI Device via WinMM: {target_port}")
                        event_bus.publish_sync("MIDI_STATUS", {"connected": True, "port": target_port})
                        return True
                    else:
                        logger.warning(f"WinMM midiInOpen error code: {res}")
            except Exception as e:
                logger.warning(f"WinMM open failed on {target_port}: {e}")
                self._winmm_handle = None

        # Attempt 3: mido
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
            self._rtmidi2_callback = None

        if hasattr(self, "_winmm_handle") and self._winmm_handle and winmm:
            try:
                winmm.midiInStop(self._winmm_handle)
                winmm.midiInClose(self._winmm_handle)
            except Exception:
                pass
            self._winmm_handle = None
            self._winmm_cb = None

        if self.inport:
            try:
                self.inport.close()
            except Exception:
                pass
            self.inport = None

        self.active_port_name = None
        event_bus.publish_sync("MIDI_STATUS", {"connected": False, "port": None})

    def _start_auto_watcher(self):
        if self._watcher_thread and self._watcher_thread.is_alive():
            return
        self._watcher_running = True
        self._watcher_thread = threading.Thread(target=self._auto_watcher_loop, daemon=True)
        self._watcher_thread.start()

    def _auto_watcher_loop(self):
        last_port_set = set(self.get_available_ports())
        while self._watcher_running:
            time.sleep(2.5)
            try:
                current_ports = self.get_available_ports()
                current_set = set(current_ports)
                if current_set != last_port_set:
                    last_port_set = current_set
                    logger.info(f"MIDI device change detected: {current_ports}")
                    event_bus.publish_sync("MIDI_PORTS_CHANGED", {
                        "ports": current_ports,
                        "active": self.active_port_name
                    })
                    # If not connected and devices are available, auto-connect
                    if not self._running and current_ports:
                        logger.info(f"Auto-connecting newly detected MIDI device: {current_ports[0]}")
                        self.start(current_ports[0])
            except Exception as e:
                logger.debug(f"Watcher loop error: {e}")

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
