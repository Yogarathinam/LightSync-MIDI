import time
from typing import List, Dict, Any, Optional
from app.analytics.db import save_session

class PerformanceTracker:
    def __init__(self):
        self.is_recording = False
        self.current_song_id = "freestyle"
        self.current_song_title = "Freestyle Play"
        self.current_mode = "play"
        self.start_time = 0.0
        self.notes_recorded: List[Dict[str, Any]] = []

    def start_session(self, song_id: str, song_title: str, mode: str = "learn"):
        self.is_recording = True
        self.current_song_id = song_id
        self.current_song_title = song_title
        self.current_mode = mode
        self.start_time = time.time()
        self.notes_recorded = []

    def record_note_attempt(self, expected_pitch: int, played_pitch: int, deviation_ms: float, velocity: int):
        if not self.is_recording:
            return

        is_correct = (expected_pitch == played_pitch)
        abs_dev = abs(deviation_ms)

        if not is_correct:
            rating = "MISS"
        elif abs_dev <= 35:
            rating = "PERFECT"
        elif abs_dev <= 75:
            rating = "GREAT"
        elif deviation_ms < -75:
            rating = "EARLY"
        else:
            rating = "LATE"

        record = {
            "timestamp": time.time() - self.start_time,
            "expected_pitch": expected_pitch,
            "played_pitch": played_pitch,
            "is_correct": is_correct,
            "deviation_ms": round(deviation_ms, 1),
            "velocity": velocity,
            "rating": rating
        }
        self.notes_recorded.append(record)

    def end_session(self) -> Dict[str, Any]:
        if not self.is_recording:
            return {}

        self.is_recording = False
        duration_sec = round(time.time() - self.start_time, 2)
        total_notes = len(self.notes_recorded)

        if total_notes == 0:
            return {"total_notes": 0, "accuracy_pct": 100.0, "duration_sec": duration_sec}

        correct_notes = sum(1 for n in self.notes_recorded if n["is_correct"])
        missed_notes = total_notes - correct_notes
        accuracy_pct = round((correct_notes / total_notes) * 100.0, 1)

        valid_deviations = [n["deviation_ms"] for n in self.notes_recorded if n["is_correct"]]
        avg_deviation_ms = round(sum(valid_deviations) / len(valid_deviations), 1) if valid_deviations else 0.0

        ratings_count = {
            "PERFECT": sum(1 for n in self.notes_recorded if n["rating"] == "PERFECT"),
            "GREAT": sum(1 for n in self.notes_recorded if n["rating"] == "GREAT"),
            "EARLY": sum(1 for n in self.notes_recorded if n["rating"] == "EARLY"),
            "LATE": sum(1 for n in self.notes_recorded if n["rating"] == "LATE"),
            "MISS": missed_notes
        }

        session_summary = {
            "song_id": self.current_song_id,
            "song_title": self.current_song_title,
            "mode": self.current_mode,
            "duration_sec": duration_sec,
            "total_notes": total_notes,
            "correct_notes": correct_notes,
            "missed_notes": missed_notes,
            "accuracy_pct": accuracy_pct,
            "avg_deviation_ms": avg_deviation_ms,
            "ratings_count": ratings_count,
            "notes_detail": self.notes_recorded[:100]  # Store first 100 details
        }

        # Persist to SQLite
        session_id = save_session(session_summary)
        session_summary["id"] = session_id

        return session_summary

performance_tracker = PerformanceTracker()
