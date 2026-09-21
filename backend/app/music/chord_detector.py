from typing import List, Optional, Tuple, Set

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Interval patterns from root (in semitones)
CHORD_PATTERNS = {
    # Triads
    (0, 4, 7): "Major",
    (0, 3, 7): "Minor",
    (0, 3, 6): "Diminished",
    (0, 4, 8): "Augmented",
    (0, 2, 7): "Sus2",
    (0, 5, 7): "Sus4",
    # 7th Chords
    (0, 4, 7, 11): "Maj7",
    (0, 3, 7, 10): "Min7",
    (0, 4, 7, 10): "7",
    (0, 3, 6, 10): "m7b5",
    (0, 3, 6, 9): "Dim7",
    (0, 4, 8, 10): "Aug7",
    (0, 3, 7, 11): "MinMaj7",
    # Extended & Sixth
    (0, 4, 7, 9): "6",
    (0, 3, 7, 9): "Min6",
    (0, 4, 7, 14): "Add9",
}

class ChordDetector:
    """
    Real-time polyphonic chord recognizer with inversion detection.
    """
    @staticmethod
    def pitch_to_name(pitch: int) -> str:
        octave = (pitch // 12) - 1
        return f"{NOTE_NAMES[pitch % 12]}{octave}"

    @staticmethod
    def identify(active_pitches: Set[int]) -> Optional[dict]:
        if len(active_pitches) < 2:
            if len(active_pitches) == 1:
                p = next(iter(active_pitches))
                return {
                    "chord": ChordDetector.pitch_to_name(p),
                    "root": NOTE_NAMES[p % 12],
                    "type": "Single Note",
                    "bass": NOTE_NAMES[p % 12],
                    "pitches": list(active_pitches)
                }
            return None

        sorted_pitches = sorted(list(active_pitches))
        lowest_pitch = sorted_pitches[0]
        bass_note = NOTE_NAMES[lowest_pitch % 12]

        pitch_classes = sorted(list(set(p % 12 for p in sorted_pitches)))

        # Try every note in the chord as a candidate root
        best_match = None
        for candidate_root in pitch_classes:
            root_name = NOTE_NAMES[candidate_root]
            # Calculate intervals from candidate root
            intervals = tuple(sorted((pc - candidate_root) % 12 for pc in pitch_classes))

            if intervals in CHORD_PATTERNS:
                quality = CHORD_PATTERNS[intervals]
                chord_name = f"{root_name} {quality}" if quality != "Major" else root_name
                if bass_note != root_name:
                    chord_name = f"{chord_name}/{bass_note}"

                best_match = {
                    "chord": chord_name,
                    "root": root_name,
                    "type": quality,
                    "bass": bass_note,
                    "pitches": sorted_pitches
                }
                break

        # If not matched directly, check for power chord or interval
        if not best_match and len(pitch_classes) == 2:
            interval = (pitch_classes[1] - pitch_classes[0]) % 12
            r_name = NOTE_NAMES[pitch_classes[0]]
            if interval == 7:
                best_match = {"chord": f"{r_name}5 (Power)", "root": r_name, "type": "5", "bass": bass_note, "pitches": sorted_pitches}
            elif interval == 4:
                best_match = {"chord": f"{r_name} (Major 3rd)", "root": r_name, "type": "Interval", "bass": bass_note, "pitches": sorted_pitches}
            elif interval == 3:
                best_match = {"chord": f"{r_name} (Minor 3rd)", "root": r_name, "type": "Interval", "bass": bass_note, "pitches": sorted_pitches}

        return best_match
