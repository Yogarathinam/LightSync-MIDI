import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging

try:
    import mido
except ImportError:
    mido = None

logger = logging.getLogger("LightSync.MidiParser")

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def pitch_to_name(pitch: int) -> str:
    """Converts a MIDI pitch number (0-127) to standard note name (e.g. 60 -> C4)."""
    octave = (pitch // 12) - 1
    name = NOTE_NAMES[pitch % 12]
    return f"{name}{octave}"

def parse_midi_file(filepath: Path | str) -> Optional[Dict[str, Any]]:
    """
    Parses a .mid or .midi file into LightSync's SongItem structure.
    Extracts note events in chronological beat order with start time, duration, and hand assignment.
    """
    if not mido:
        logger.error("mido library not available for MIDI parsing.")
        return None

    path = Path(filepath)
    if not path.exists() or not path.is_file():
        logger.warning(f"MIDI file does not exist: {filepath}")
        return None

    try:
        mid = mido.MidiFile(str(path))
    except Exception as e:
        logger.error(f"Failed to open MIDI file {path.name}: {e}")
        return None

    ticks_per_beat = mid.ticks_per_beat or 480
    song_id = f"midi_{re.sub(r'[^a-zA-Z0-9_]', '_', path.stem.lower())}"
    default_title = path.stem.replace("_", " ").replace("-", " ").title()

    title: Optional[str] = None
    composer: Optional[str] = None
    bpm: int = 120
    time_signature: str = "4/4"
    key_sig: str = "C Major"

    # 1. Scan meta messages across all tracks
    for track in mid.tracks:
        for msg in track:
            if msg.is_meta:
                if msg.type == "track_name" and not title and msg.name.strip():
                    cleaned = msg.name.strip()
                    # Filter out generic track names like 'Track 1', 'Piano'
                    if not re.match(r"^(track\s*\d+|piano|midi|channel\s*\d+)$", cleaned, re.IGNORECASE):
                        title = cleaned
                elif msg.type == "set_tempo" and bpm == 120:
                    try:
                        bpm = int(round(mido.tempo2bpm(msg.tempo)))
                    except Exception:
                        pass
                elif msg.type == "time_signature":
                    time_signature = f"{msg.numerator}/{msg.denominator}"
                elif msg.type == "key_signature":
                    raw_key = msg.key
                    if raw_key.endswith("m"):
                        key_sig = f"{raw_key[:-1]} Minor"
                    else:
                        key_sig = f"{raw_key} Major"
                elif msg.type == "copyright" and not composer:
                    composer = msg.text.strip()
                elif msg.type == "text" and not composer:
                    text = msg.text.strip()
                    if any(w in text.lower() for w in ["by ", "composer", "arranger", "copyright"]):
                        composer = text

    if not title:
        title = default_title
    if not composer:
        composer = "Local MIDI File"

    # 2. Merge tracks and parse note on/off events
    try:
        merged = mido.merge_tracks(mid.tracks)
    except Exception as e:
        logger.warning(f"Could not merge tracks for {path.name}: {e}. Falling back to first track.")
        merged = mid.tracks[0] if mid.tracks else []

    current_tick = 0
    active_notes: Dict[tuple, tuple] = {}  # (channel, pitch) -> (start_tick, velocity)
    parsed_notes: List[Dict[str, Any]] = []

    for msg in merged:
        current_tick += msg.time
        if msg.type == "note_on" and msg.velocity > 0:
            key = (getattr(msg, "channel", 0), msg.note)
            if key in active_notes:
                # Note was already active without an explicit note_off, close previous
                start_tick, vel = active_notes.pop(key)
                duration_beats = max(0.25, (current_tick - start_tick) / ticks_per_beat)
                parsed_notes.append({
                    "pitch": msg.note,
                    "name": pitch_to_name(msg.note),
                    "time": round(start_tick / ticks_per_beat, 3),
                    "duration": round(duration_beats, 3),
                    "hand": "right" if msg.note >= 60 else "left",
                    "velocity": vel
                })
            active_notes[key] = (current_tick, msg.velocity)
        elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
            key = (getattr(msg, "channel", 0), msg.note)
            if key in active_notes:
                start_tick, vel = active_notes.pop(key)
                duration_beats = max(0.25, (current_tick - start_tick) / ticks_per_beat)
                parsed_notes.append({
                    "pitch": msg.note,
                    "name": pitch_to_name(msg.note),
                    "time": round(start_tick / ticks_per_beat, 3),
                    "duration": round(duration_beats, 3),
                    "hand": "right" if msg.note >= 60 else "left",
                    "velocity": vel
                })

    # Close any hanging notes
    for (ch, pitch), (start_tick, vel) in active_notes.items():
        duration_beats = max(0.5, (current_tick - start_tick) / ticks_per_beat)
        parsed_notes.append({
            "pitch": pitch,
            "name": pitch_to_name(pitch),
            "time": round(start_tick / ticks_per_beat, 3),
            "duration": round(min(4.0, duration_beats), 3),
            "hand": "right" if pitch >= 60 else "left",
            "velocity": vel
        })

    # Sort notes by start time, then pitch
    parsed_notes.sort(key=lambda n: (n["time"], n["pitch"]))

    # Normalize timing so the first note starts at time 0.0 if there is initial silence
    if parsed_notes and parsed_notes[0]["time"] > 0.5:
        offset = parsed_notes[0]["time"]
        for n in parsed_notes:
            n["time"] = round(max(0.0, n["time"] - offset), 3)

    # 3. Determine difficulty
    note_count = len(parsed_notes)
    if note_count < 80 and bpm <= 110:
        difficulty = "Beginner"
    elif note_count < 250:
        difficulty = "Intermediate"
    else:
        difficulty = "Advanced"

    return {
        "id": song_id,
        "title": title,
        "composer": composer,
        "difficulty": difficulty,
        "bpm": max(40, min(240, bpm)),
        "time_signature": time_signature,
        "key": key_sig,
        "source": "local_midi",
        "filename": path.name,
        "notes": parsed_notes
    }


def generate_sample_midi_files(output_dir: Path) -> None:
    """Generates 3 classic sample MIDI files in output_dir if the directory is empty."""
    if not mido:
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    existing = list(output_dir.glob("*.mid")) + list(output_dir.glob("*.midi"))
    if existing:
        return

    logger.info(f"Generating initial sample MIDI files in {output_dir}...")

    # Sample 1: Für Elise Theme
    mid1 = mido.MidiFile()
    track1 = mido.MidiTrack()
    mid1.tracks.append(track1)
    track1.append(mido.MetaMessage("track_name", name="Für Elise", time=0))
    track1.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(130), time=0))
    track1.append(mido.MetaMessage("time_signature", numerator=3, denominator=8, time=0))
    track1.append(mido.MetaMessage("key_signature", key="Am", time=0))

    elise_notes = [
        (76, 240), (75, 240), (76, 240), (75, 240), (76, 240), 
        (71, 240), (74, 240), (72, 240), (69, 480),
        (45, 240), (52, 240), (57, 240), (60, 240), (64, 240), (69, 480)
    ]
    for pitch, dur in elise_notes:
        track1.append(mido.Message("note_on", note=pitch, velocity=85, time=0))
        track1.append(mido.Message("note_off", note=pitch, velocity=0, time=dur))
    mid1.save(str(output_dir / "beethoven_fur_elise.mid"))

    # Sample 2: Pachelbel's Canon in D
    mid2 = mido.MidiFile()
    track2 = mido.MidiTrack()
    mid2.tracks.append(track2)
    track2.append(mido.MetaMessage("track_name", name="Canon in D", time=0))
    track2.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(80), time=0))
    track2.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    track2.append(mido.MetaMessage("key_signature", key="D", time=0))

    canon_melody = [
        (74, 480), (73, 480), (71, 480), (69, 480),
        (67, 480), (66, 480), (67, 480), (69, 480),
        (74, 240), (73, 240), (71, 240), (73, 240), (74, 480), (73, 480)
    ]
    for pitch, dur in canon_melody:
        track2.append(mido.Message("note_on", note=pitch, velocity=80, time=0))
        track2.append(mido.Message("note_off", note=pitch, velocity=0, time=dur))
    mid2.save(str(output_dir / "pachelbel_canon_in_d.mid"))

    # Sample 3: Bach - Prelude in C Major (BWV 846)
    mid3 = mido.MidiFile()
    track3 = mido.MidiTrack()
    mid3.tracks.append(track3)
    track3.append(mido.MetaMessage("track_name", name="Prelude in C Major", time=0))
    track3.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(100), time=0))
    track3.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    track3.append(mido.MetaMessage("key_signature", key="C", time=0))

    # Arpeggio pattern (C - E - G - C - E)
    bach_pattern = [48, 52, 55, 60, 64, 55, 60, 64, 48, 52, 55, 60, 64, 55, 60, 64,
                    48, 50, 57, 62, 65, 57, 62, 65, 48, 50, 57, 62, 65, 57, 62, 65]
    for pitch in bach_pattern:
        track3.append(mido.Message("note_on", note=pitch, velocity=75, time=0))
        track3.append(mido.Message("note_off", note=pitch, velocity=0, time=120))
    mid3.save(str(output_dir / "bach_prelude_c_major.mid"))
    logger.info("Sample MIDI files generated successfully.")
