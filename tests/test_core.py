import sys
import unittest
from pathlib import Path

# Add backend directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.event_bus import event_bus
from app.music.chord_detector import ChordDetector
from app.device.protocol import ProtocolBuilder
from app.analytics.db import init_db, save_session, get_recent_sessions
from app.analytics.tracker import performance_tracker
from app.ai.coach import ai_coach
from app.ai.copilot import visual_copilot

class TestLightSyncCore(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_chord_detector(self):
        # C Major Triad: C4(60), E4(64), G4(67)
        c_major = ChordDetector.identify({60, 64, 67})
        self.assertIsNotNone(c_major)
        self.assertEqual(c_major["chord"], "C")
        self.assertEqual(c_major["root"], "C")

        # A Minor: A3(57), C4(60), E4(64)
        a_minor = ChordDetector.identify({57, 60, 64})
        self.assertIsNotNone(a_minor)
        self.assertEqual(a_minor["chord"], "A Minor")

        # G7: G3(55), B3(59), D4(62), F4(65)
        g7 = ChordDetector.identify({55, 59, 62, 65})
        self.assertIsNotNone(g7)
        self.assertEqual(g7["chord"], "G 7")

    def test_protocol_builder(self):
        note_on = ProtocolBuilder.note_on(60, 110)
        self.assertEqual(note_on, "NOTE_ON 60 110\n")

        effect_cmd = ProtocolBuilder.set_effect("ripple")
        self.assertEqual(effect_cmd, "EFFECT ripple\n")

        speed_param = ProtocolBuilder.set_param("speed", 1.25)
        self.assertEqual(speed_param, "speed=1.25\n")

    def test_event_bus(self):
        received = []
        def on_event(data):
            received.append(data)

        event_bus.subscribe("TEST_NOTE", on_event)
        event_bus.publish_sync("TEST_NOTE", {"pitch": 64})

        self.assertEqual(len(received), 1)
        self.assertEqual(received[0]["pitch"], 64)

    def test_performance_tracker_and_db(self):
        performance_tracker.start_session("test_drill", "Test Drill", "practice")
        performance_tracker.record_note_attempt(60, 60, 12.5, 100) # Perfect
        performance_tracker.record_note_attempt(62, 62, -45.0, 95) # Great early
        performance_tracker.record_note_attempt(64, 65, 0.0, 90)   # Miss

        result = performance_tracker.end_session()
        self.assertEqual(result["total_notes"], 3)
        self.assertEqual(result["correct_notes"], 2)
        self.assertEqual(result["missed_notes"], 1)
        self.assertAlmostEqual(result["accuracy_pct"], 66.7, places=1)

        recent = get_recent_sessions(5)
        self.assertTrue(any(s["song_id"] == "test_drill" for s in recent))

    def test_ai_coach(self):
        sample_session = {
            "accuracy_pct": 88.0,
            "avg_deviation_ms": -32.0,
            "ratings_count": {"PERFECT": 15, "GREAT": 5, "EARLY": 6, "LATE": 1, "MISS": 3},
            "total_notes": 30,
            "song_title": "Minuet in G"
        }
        review = ai_coach.analyze_performance(sample_session)
        self.assertIn("headline", review)
        self.assertIn("drills", review)
        self.assertTrue(len(review["drills"]) >= 1)
        self.assertIn("anticipate", review["timing_diagnosis"].lower())

    def test_visual_copilot(self):
        preset = visual_copilot.generate_preset_from_prompt("Warm golden fire sparks")
        self.assertEqual(preset["effect"], "spark")
        self.assertEqual(preset["primary_color"], "#f59e0b")

        preset_wave = visual_copilot.generate_preset_from_prompt("Calm gentle ocean waves")
        self.assertEqual(preset_wave["effect"], "wave")

if __name__ == "__main__":
    unittest.main()
