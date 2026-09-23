import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

from app.music.midi_parser import parse_midi_file, generate_sample_midi_files

logger = logging.getLogger("LightSync.SongCatalog")

# Base directory for local MIDI files
def get_midi_folder_path() -> Path:
    base = Path(__file__).resolve().parent.parent.parent / "data" / "midi"
    base.mkdir(parents=True, exist_ok=True)
    return base

# Curated interactive practice song catalog with note timings (in beats), pitch, and hand
SONG_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "ode_to_joy",
        "title": "Ode to Joy",
        "composer": "L. v. Beethoven",
        "difficulty": "Beginner",
        "bpm": 100,
        "time_signature": "4/4",
        "key": "C Major",
        "source": "curated",
        "notes": [
            # Measure 1
            {"pitch": 64, "name": "E4", "time": 0.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 1.0, "duration": 1.0, "hand": "right"},
            {"pitch": 65, "name": "F4", "time": 2.0, "duration": 1.0, "hand": "right"},
            {"pitch": 67, "name": "G4", "time": 3.0, "duration": 1.0, "hand": "right"},
            # Measure 2
            {"pitch": 67, "name": "G4", "time": 4.0, "duration": 1.0, "hand": "right"},
            {"pitch": 65, "name": "F4", "time": 5.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 6.0, "duration": 1.0, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 7.0, "duration": 1.0, "hand": "right"},
            # Measure 3
            {"pitch": 60, "name": "C4", "time": 8.0, "duration": 1.0, "hand": "right"},
            {"pitch": 60, "name": "C4", "time": 9.0, "duration": 1.0, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 10.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 11.0, "duration": 1.0, "hand": "right"},
            # Measure 4
            {"pitch": 64, "name": "E4", "time": 12.0, "duration": 1.5, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 13.5, "duration": 0.5, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 14.0, "duration": 2.0, "hand": "right"},
            # Measure 5
            {"pitch": 64, "name": "E4", "time": 16.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 17.0, "duration": 1.0, "hand": "right"},
            {"pitch": 65, "name": "F4", "time": 18.0, "duration": 1.0, "hand": "right"},
            {"pitch": 67, "name": "G4", "time": 19.0, "duration": 1.0, "hand": "right"},
            # Measure 6
            {"pitch": 67, "name": "G4", "time": 20.0, "duration": 1.0, "hand": "right"},
            {"pitch": 65, "name": "F4", "time": 21.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 22.0, "duration": 1.0, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 23.0, "duration": 1.0, "hand": "right"},
            # Measure 7
            {"pitch": 60, "name": "C4", "time": 24.0, "duration": 1.0, "hand": "right"},
            {"pitch": 60, "name": "C4", "time": 25.0, "duration": 1.0, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 26.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 27.0, "duration": 1.0, "hand": "right"},
            # Measure 8
            {"pitch": 62, "name": "D4", "time": 28.0, "duration": 1.5, "hand": "right"},
            {"pitch": 60, "name": "C4", "time": 29.5, "duration": 0.5, "hand": "right"},
            {"pitch": 60, "name": "C4", "time": 30.0, "duration": 2.0, "hand": "right"},
        ]
    },
    {
        "id": "fur_elise_curated",
        "title": "Für Elise (Theme)",
        "composer": "L. v. Beethoven",
        "difficulty": "Intermediate",
        "bpm": 120,
        "time_signature": "3/8",
        "key": "A Minor",
        "source": "curated",
        "notes": [
            {"pitch": 76, "name": "E5", "time": 0.0, "duration": 0.5, "hand": "right"},
            {"pitch": 75, "name": "D#5", "time": 0.5, "duration": 0.5, "hand": "right"},
            {"pitch": 76, "name": "E5", "time": 1.0, "duration": 0.5, "hand": "right"},
            {"pitch": 75, "name": "D#5", "time": 1.5, "duration": 0.5, "hand": "right"},
            {"pitch": 76, "name": "E5", "time": 2.0, "duration": 0.5, "hand": "right"},
            {"pitch": 71, "name": "B4", "time": 2.5, "duration": 0.5, "hand": "right"},
            {"pitch": 74, "name": "D5", "time": 3.0, "duration": 0.5, "hand": "right"},
            {"pitch": 72, "name": "C5", "time": 3.5, "duration": 0.5, "hand": "right"},
            {"pitch": 69, "name": "A4", "time": 4.0, "duration": 1.5, "hand": "right"},
            {"pitch": 45, "name": "A2", "time": 4.0, "duration": 1.0, "hand": "left"},
            {"pitch": 52, "name": "E3", "time": 5.0, "duration": 1.0, "hand": "left"},
            {"pitch": 57, "name": "A3", "time": 5.5, "duration": 1.0, "hand": "left"},
        ]
    },
    {
        "id": "c_major_scale",
        "title": "C Major Scale Drill",
        "composer": "Technique Drill",
        "difficulty": "Beginner",
        "bpm": 90,
        "time_signature": "4/4",
        "key": "C Major",
        "source": "curated",
        "notes": [
            {"pitch": 60, "name": "C4", "time": 0.0, "duration": 1.0, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 1.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 2.0, "duration": 1.0, "hand": "right"},
            {"pitch": 65, "name": "F4", "time": 3.0, "duration": 1.0, "hand": "right"},
            {"pitch": 67, "name": "G4", "time": 4.0, "duration": 1.0, "hand": "right"},
            {"pitch": 69, "name": "A4", "time": 5.0, "duration": 1.0, "hand": "right"},
            {"pitch": 71, "name": "B4", "time": 6.0, "duration": 1.0, "hand": "right"},
            {"pitch": 72, "name": "C5", "time": 7.0, "duration": 1.0, "hand": "right"},
            {"pitch": 71, "name": "B4", "time": 8.0, "duration": 1.0, "hand": "right"},
            {"pitch": 69, "name": "A4", "time": 9.0, "duration": 1.0, "hand": "right"},
            {"pitch": 67, "name": "G4", "time": 10.0, "duration": 1.0, "hand": "right"},
            {"pitch": 65, "name": "F4", "time": 11.0, "duration": 1.0, "hand": "right"},
            {"pitch": 64, "name": "E4", "time": 12.0, "duration": 1.0, "hand": "right"},
            {"pitch": 62, "name": "D4", "time": 13.0, "duration": 1.0, "hand": "right"},
            {"pitch": 60, "name": "C4", "time": 14.0, "duration": 2.0, "hand": "right"},
        ]
    }
]

# Cached local MIDI songs & mtime parse cache
_cached_local_songs: List[Dict[str, Any]] = []
_file_parse_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}  # filepath -> (mtime, song_dict)
_has_scanned: bool = False

def scan_midi_folders() -> List[Dict[str, Any]]:
    """
    Scans primary backend/data/midi directory and related midi folders
    recursively for .mid and .midi files (case-insensitive), parses them with mtime caching, and updates library.
    """
    global _cached_local_songs, _has_scanned, _file_parse_cache
    folder = get_midi_folder_path()
    generate_sample_midi_files(folder)

    # Candidate directories to scan recursively
    root_backend = Path(__file__).resolve().parent.parent.parent
    scan_dirs = [
        folder,
        root_backend / "data" / "midi",
        root_backend / "midi",
        root_backend.parent / "data" / "midi",
        root_backend.parent / "midi"
    ]

    discovered_songs: List[Dict[str, Any]] = []
    seen_ids = set()

    for d in scan_dirs:
        if not d.exists() or not d.is_dir():
            continue
        try:
            # Recursive scan for all case variations (.mid, .midi, .MID, .MIDI)
            candidate_files = [
                p for p in d.rglob("*")
                if p.is_file() and p.suffix.lower() in (".mid", ".midi")
            ]
            candidate_files.sort(key=lambda p: p.name.lower())

            for mf in candidate_files:
                try:
                    str_path = str(mf.resolve())
                    mtime = mf.stat().st_mtime
                    
                    # Check mtime cache to speed up rescan
                    if str_path in _file_parse_cache and _file_parse_cache[str_path][0] == mtime:
                        song = _file_parse_cache[str_path][1]
                    else:
                        song = parse_midi_file(mf)
                        if song:
                            _file_parse_cache[str_path] = (mtime, song)

                    if song and song["id"] not in seen_ids:
                        seen_ids.add(song["id"])
                        discovered_songs.append(song)
                except Exception as e:
                    logger.error(f"Error parsing MIDI file {mf.name}: {e}")
        except Exception as err:
            logger.error(f"Error scanning directory {d}: {err}")

    _cached_local_songs = discovered_songs
    _has_scanned = True
    logger.info(f"Scanned MIDI folders. Found {len(_cached_local_songs)} local MIDI songs.")
    return _cached_local_songs

def get_all_songs() -> List[Dict[str, Any]]:
    """Returns combined list of curated songs and scanned local MIDI songs."""
    scan_midi_folders()
    return SONG_CATALOG + _cached_local_songs

def rescan_midi_folder() -> List[Dict[str, Any]]:
    """Forces an immediate rescan of the MIDI folders."""
    scan_midi_folders()
    return get_all_songs()

def save_uploaded_midi(filename: str, content: bytes) -> Optional[Dict[str, Any]]:
    """
    Saves an uploaded MIDI file into backend/data/midi/, parses it,
    adds it to the cached songs, and returns the song item.
    """
    folder = get_midi_folder_path()
    clean_filename = Path(filename).name
    # Ensure proper extension
    if not clean_filename.lower().endswith(('.mid', '.midi')):
        clean_filename += '.mid'

    target_path = folder / clean_filename
    with open(target_path, "wb") as f:
        f.write(content)

    logger.info(f"Saved uploaded MIDI file to {target_path}")
    song = parse_midi_file(target_path)
    if song:
        song["source"] = "imported"
        # Update cache
        global _cached_local_songs
        # Replace if ID exists or prepend
        _cached_local_songs = [s for s in _cached_local_songs if s["id"] != song["id"]]
        _cached_local_songs.insert(0, song)
        return song
    return None

def delete_midi_file(song_id: str) -> bool:
    """Deletes a local MIDI file by song_id if it exists in the midi folder."""
    global _cached_local_songs
    folder = get_midi_folder_path()
    
    # Find matching song in cache
    target_song = next((s for s in _cached_local_songs if s["id"] == song_id), None)
    if not target_song:
        return False

    filename = target_song.get("filename")
    if filename:
        file_path = folder / filename
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info(f"Deleted MIDI file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete {file_path}: {e}")
                return False

    _cached_local_songs = [s for s in _cached_local_songs if s["id"] != song_id]
    return True
