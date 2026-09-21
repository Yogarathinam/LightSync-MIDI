import sqlite3
import json
import time
from typing import List, Dict, Any, Optional
from app.core.config import DB_PATH

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id TEXT,
        song_title TEXT,
        mode TEXT,
        duration_sec REAL,
        total_notes INTEGER,
        correct_notes INTEGER,
        missed_notes INTEGER,
        accuracy_pct REAL,
        avg_deviation_ms REAL,
        notes_detail TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        name TEXT,
        effect TEXT,
        speed REAL,
        decay REAL,
        spread REAL,
        brightness INTEGER,
        rainbow INTEGER,
        primary_color TEXT,
        secondary_color TEXT,
        is_factory INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed default factory presets if empty
    cursor.execute("SELECT COUNT(*) FROM presets")
    if cursor.fetchone()[0] == 0:
        default_presets = [
            ("ethereal_echo", "Ethereal Echo", "ripple", 1.2, 0.88, 3.5, 200, 0, "#00f0ff", "#6366f1", 1),
            ("neon_pulse", "Neon Pulse", "pulse", 0.9, 0.82, 4.0, 220, 0, "#a855f7", "#ec4899", 1),
            ("starlight_rain", "Starlight Rain", "rain", 1.4, 0.92, 5.0, 240, 1, "#f59e0b", "#38bdf8", 1),
            ("cyber_spark", "Cyber Spark", "spark", 1.6, 0.80, 2.5, 255, 0, "#10b981", "#06b6d4", 1),
            ("harmonic_glow", "Harmonic Glow", "wave", 0.7, 0.90, 6.0, 180, 0, "#3b82f6", "#8b5cf6", 1),
        ]
        cursor.executemany("""
        INSERT INTO presets (id, name, effect, speed, decay, spread, brightness, rainbow, primary_color, secondary_color, is_factory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, default_presets)

    conn.commit()
    conn.close()

def save_session(session_data: Dict[str, Any]) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO sessions (
        song_id, song_title, mode, duration_sec, total_notes,
        correct_notes, missed_notes, accuracy_pct, avg_deviation_ms, notes_detail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_data.get("song_id", "freestyle"),
        session_data.get("song_title", "Freestyle Play"),
        session_data.get("mode", "play"),
        session_data.get("duration_sec", 0.0),
        session_data.get("total_notes", 0),
        session_data.get("correct_notes", 0),
        session_data.get("missed_notes", 0),
        session_data.get("accuracy_pct", 100.0),
        session_data.get("avg_deviation_ms", 0.0),
        json.dumps(session_data.get("notes_detail", []))
    ))
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id

def get_recent_sessions(limit: int = 20) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results

def get_all_presets() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM presets ORDER BY is_factory DESC, created_at DESC")
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results

def save_preset(preset: Dict[str, Any]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO presets (
        id, name, effect, speed, decay, spread, brightness, rainbow, primary_color, secondary_color, is_factory
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (
        preset["id"],
        preset["name"],
        preset["effect"],
        preset["speed"],
        preset["decay"],
        preset["spread"],
        preset["brightness"],
        1 if preset.get("rainbow") else 0,
        preset.get("primary_color", "#00f0ff"),
        preset.get("secondary_color", "#ff007f")
    ))
    conn.commit()
    conn.close()
