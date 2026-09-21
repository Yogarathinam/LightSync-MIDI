from typing import List, Dict, Any

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
        "id": "fur_elise",
        "title": "Für Elise (Theme)",
        "composer": "L. v. Beethoven",
        "difficulty": "Intermediate",
        "bpm": 120,
        "time_signature": "3/8",
        "key": "A Minor",
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
