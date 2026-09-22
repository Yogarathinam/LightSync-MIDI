import sys
import unittest
from pathlib import Path

# Add backend directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.music.midi_parser import parse_midi_file, pitch_to_name, generate_sample_midi_files
from app.music.song_catalog import (
    get_all_songs, 
    get_midi_folder_path, 
    save_uploaded_midi, 
    delete_midi_file, 
    rescan_midi_folder
)

class TestMidiSupport(unittest.TestCase):
    def test_pitch_to_name(self):
        self.assertEqual(pitch_to_name(60), "C4")
        self.assertEqual(pitch_to_name(69), "A4")
        self.assertEqual(pitch_to_name(72), "C5")
        self.assertEqual(pitch_to_name(21), "A0")
        self.assertEqual(pitch_to_name(108), "C8")

    def test_midi_folder_and_samples(self):
        folder = get_midi_folder_path()
        self.assertTrue(folder.exists())
        self.assertTrue(folder.is_dir())

        # Verify sample generation
        generate_sample_midi_files(folder)
        midi_files = list(folder.glob("*.mid"))
        self.assertGreaterEqual(len(midi_files), 1)

    def test_parse_sample_midi(self):
        folder = get_midi_folder_path()
        generate_sample_midi_files(folder)
        sample = next(folder.glob("*.mid"))
        song = parse_midi_file(sample)

        self.assertIsNotNone(song)
        self.assertIn("id", song)
        self.assertIn("title", song)
        self.assertIn("notes", song)
        self.assertGreater(len(song["notes"]), 0)
        self.assertIn(song["difficulty"], ["Beginner", "Intermediate", "Advanced"])
        self.assertEqual(song["source"], "local_midi")

        # Verify note fields
        first_note = song["notes"][0]
        self.assertIn("pitch", first_note)
        self.assertIn("time", first_note)
        self.assertIn("duration", first_note)
        self.assertIn("hand", first_note)

    def test_get_all_songs(self):
        songs = get_all_songs()
        self.assertGreaterEqual(len(songs), 3)
        # Should include both curated and local_midi
        sources = {s.get("source") for s in songs}
        self.assertIn("curated", sources)
        self.assertIn("local_midi", sources)

    def test_save_and_delete_uploaded_midi(self):
        folder = get_midi_folder_path()
        sample = next(folder.glob("*.mid"))
        sample_bytes = sample.read_bytes()

        uploaded = save_uploaded_midi("test_uploaded_tune.mid", sample_bytes)
        self.assertIsNotNone(uploaded)
        self.assertEqual(uploaded["source"], "imported")
        self.assertEqual(uploaded["filename"], "test_uploaded_tune.mid")

        # Verify file exists
        self.assertTrue((folder / "test_uploaded_tune.mid").exists())

        # Test delete
        success = delete_midi_file(uploaded["id"])
        self.assertTrue(success)
        self.assertFalse((folder / "test_uploaded_tune.mid").exists())

    def test_api_endpoints(self):
        from app.main import get_songs, rescan_songs, delete_song
        
        songs_resp = get_songs()
        self.assertIn("songs", songs_resp)
        self.assertIn("midi_folder", songs_resp)
        self.assertGreaterEqual(len(songs_resp["songs"]), 1)

        rescan_resp = rescan_songs()
        self.assertEqual(rescan_resp["status"], "success")
        self.assertIn("songs", rescan_resp)

        # Deleting nonexistent song
        del_resp = delete_song("non_existent_song_id")
        self.assertEqual(del_resp["deleted"], False)

    def test_midi_engine_ports_and_lifecycle(self):
        from app.music.midi_engine import midi_engine
        ports = midi_engine.get_available_ports()
        self.assertIsInstance(ports, list)
        
        # Test start with DISCONNECT mode
        res = midi_engine.start("DISCONNECT")
        self.assertFalse(res)
        self.assertIsNone(midi_engine.active_port_name)

    def test_midi_engine_note_events(self):
        from app.music.midi_engine import midi_engine
        from app.core.event_bus import event_bus

        received_events = []
        def listener(data):
            received_events.append(data)

        event_bus.subscribe("NOTE_ON", listener)
        event_bus.subscribe("NOTE_OFF", listener)

        # Trigger physical MIDI note on
        midi_engine.handle_note_on(60, 100, source="physical_midi")
        self.assertIn(60, midi_engine.active_pitches)

        # Trigger physical MIDI note off
        midi_engine.handle_note_off(60, source="physical_midi")
        self.assertNotIn(60, midi_engine.active_pitches)

        self.assertGreaterEqual(len(received_events), 2)
        note_on_ev = [e for e in received_events if e.get("pitch") == 60 and "velocity" in e]
        self.assertTrue(len(note_on_ev) >= 1)
        self.assertEqual(note_on_ev[0]["source"], "physical_midi")

    def test_save_recording_endpoint(self):
        from app.main import save_recording, SaveRecordingModel
        from app.music.song_catalog import delete_midi_file, get_midi_folder_path
        
        payload = SaveRecordingModel(
            title="Unit_Test_Recording",
            events=[
                {"type": "note_on", "pitch": 60, "velocity": 100, "time_ms": 0},
                {"type": "note_off", "pitch": 60, "velocity": 0, "time_ms": 400},
                {"type": "note_on", "pitch": 64, "velocity": 90, "time_ms": 500},
                {"type": "note_off", "pitch": 64, "velocity": 0, "time_ms": 900}
            ],
            bpm=120
        )
        res = save_recording(payload)
        self.assertEqual(res.get("status"), "success")
        self.assertIn("filename", res)
        created_file = get_midi_folder_path() / res["filename"]
        self.assertTrue(created_file.exists())
        
        # Cleanup
        created_file.unlink(missing_ok=True)

if __name__ == "__main__":
    unittest.main()

