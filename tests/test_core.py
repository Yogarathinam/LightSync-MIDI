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
from app.ai.mira import mira_assistant

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

    def test_serial_manager_octave_and_transpose_shift(self):
        from app.device.serial_manager import SerialDeviceManager
        sm = SerialDeviceManager()
        sm.connect("SIMULATED")
        
        event_bus.publish_sync("OCTAVE_SHIFT_CHANGED", {"octave_shift": 1})
        event_bus.publish_sync("TRANSPOSE_CHANGED", {"transpose": 2})
        self.assertEqual(sm.octave_shift, 1)
        self.assertEqual(sm.transpose, 2)
        
        event_bus.publish_sync("NOTE_ON", {"pitch": 60, "velocity": 100})
        self.assertEqual(sm.active_note_shifts[60], 74)
        
        event_bus.publish_sync("NOTE_OFF", {"pitch": 60})
        self.assertNotIn(60, sm.active_note_shifts)

    def test_protocol_builder(self):
        note_on = ProtocolBuilder.note_on(60, 110)
        self.assertEqual(note_on, "NOTE_ON 60 110\n")

        effect_cmd = ProtocolBuilder.set_effect("ripple")
        self.assertEqual(effect_cmd, "EFFECT ripple\n")

        preset_cmd = ProtocolBuilder.preset("Cyberpunk Neon")
        self.assertEqual(preset_cmd, "PRESET Cyberpunk Neon\n")

        keys_cmd = ProtocolBuilder.set_keyboard_size(88)
        self.assertEqual(keys_cmd, "KEY_COUNT 88\n")

        port_cmd = ProtocolBuilder.port_connect("COM5")
        self.assertEqual(port_cmd, "PORT_CONNECT COM5\n")

        midi_cmd = ProtocolBuilder.midi_port("Yamaha Digital Piano")
        self.assertEqual(midi_cmd, "MIDI_PORT Yamaha Digital Piano\n")

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

    def test_bidirectional_sync(self):
        m5_events = []
        def on_m5_event(data):
            m5_events.append(data)

        event_bus.subscribe("M5_HARDWARE_EVENT", on_m5_event)
        event_bus.publish_sync("M5_HARDWARE_EVENT", {"event": "EFFECT_CHANGED", "value": "ripple"})
        event_bus.publish_sync("M5_HARDWARE_EVENT", {"event": "KEY_COUNT", "value": "88"})

        self.assertEqual(len(m5_events), 2)
        self.assertEqual(m5_events[0]["event"], "EFFECT_CHANGED")
        self.assertEqual(m5_events[0]["value"], "ripple")
        self.assertEqual(m5_events[1]["event"], "KEY_COUNT")
        self.assertEqual(m5_events[1]["value"], "88")

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

    def test_mira_assistant(self):
        # 1. Performance analysis
        review = mira_assistant.analyze_performance({
            "accuracy_pct": 92.0,
            "avg_deviation_ms": -18.5,
            "songTitle": "Minuet in G",
            "timingRatings": {"PERFECT": 20, "EARLY": 5, "MISS": 1}
        })
        self.assertIn("headline", review)
        self.assertIn("drills", review)
        self.assertEqual(review["coach_signature"], "MIRA — Musical Intelligence & Rhythm Assistant")

        # 2. Personalized course generation
        course = mira_assistant.generate_personalized_course(
            song={"title": "Minuet in G", "bpm": 110, "key": "G Major"},
            telemetry={"accuracyPct": 88, "problemMeasures": [3, 4], "avgDeviationMs": 20}
        )
        self.assertIn("steps", course)
        self.assertEqual(len(course["steps"]), 4)
        self.assertEqual(course["songTitle"], "Minuet in G")

        # 3. Interactive chat response
        chat = mira_assistant.chat_response(
            messages=[{"role": "user", "text": "How do I fix my rushing?"}],
            telemetry={"accuracyPct": 85, "avgDeviationMs": -25, "problemMeasures": [2]},
            current_song={"title": "Minuet in G"}
        )
        self.assertEqual(chat["role"], "assistant")
        self.assertIn("text", chat)

    def test_gemini_relay_endpoints(self):
        from app.ai.mira import (
            gemini_relay_server,
            generate_unique_token,
            format_prompt_with_token,
            extract_token_from_prompt,
            strip_token_from_response,
            MiraAssistant
        )
        # 1. Health
        health = gemini_relay_server.get_health()
        self.assertEqual(health["status"], "ok")

        # 2. Submit prompt without token (standard/legacy)
        sub = gemini_relay_server.submit_prompt("Write a Python program to check whether a number is prime.")
        self.assertEqual(sub["status"], "accepted")
        self.assertIn("request_id", sub)

        resp = gemini_relay_server.get_response()
        self.assertEqual(resp["state"], "ready")
        self.assertIn("is_prime", resp["text"])

        # 3. Unique Token Protocol
        token = generate_unique_token()
        self.assertTrue(token.startswith("MIRA_TOKEN_"))

        formatted_prompt = format_prompt_with_token("What are the best drills for timing?", token)
        detected_token = extract_token_from_prompt(formatted_prompt)
        self.assertEqual(detected_token, token)

        # Submit prompt with token to relay
        sub_token = gemini_relay_server.submit_prompt(formatted_prompt)
        self.assertEqual(sub_token["status"], "accepted")

        # Response MUST start and end with the matching unique token
        resp_token = gemini_relay_server.get_response()
        self.assertEqual(resp_token["token"], token)
        self.assertTrue(resp_token["text"].startswith(token), f"Response does not start with {token}")
        self.assertTrue(resp_token["text"].endswith(token), f"Response does not end with {token}")

        # Strip token envelope to extract clean response
        clean_text = strip_token_from_response(resp_token["text"], token)
        self.assertNotIn(token, clean_text)
        self.assertIn("Subdivision Click Drill", clean_text)

    def test_query_gemini_relay_token_protocol(self):
        from app.ai.mira import (
            gemini_relay_server,
            MiraAssistant,
            generate_unique_token,
            format_prompt_with_token
        )
        # Ensure that if the whiteboard has an old response with a different token,
        # strip_token_from_response will not falsely match, and query_gemini_relay requires matching token
        old_token = generate_unique_token()
        gemini_relay_server.submit_prompt(format_prompt_with_token("Old request", old_token))
        
        # Verify whiteboard currently holds old_token
        whiteboard = gemini_relay_server.get_response()
        self.assertEqual(whiteboard["token"], old_token)
        self.assertIn(old_token, whiteboard["text"])

        # New request with fresh token
        new_token = generate_unique_token()
        self.assertNotEqual(old_token, new_token)
        # The whiteboard does NOT match new_token yet
        self.assertNotIn(new_token, whiteboard["text"])

        # When new request is submitted to relay
        gemini_relay_server.submit_prompt(format_prompt_with_token("What is prime?", new_token))
        new_whiteboard = gemini_relay_server.get_response()
        self.assertEqual(new_whiteboard["token"], new_token)
        self.assertTrue(new_whiteboard["text"].startswith(new_token))
        self.assertTrue(new_whiteboard["text"].endswith(new_token))

if __name__ == "__main__":
    unittest.main()


