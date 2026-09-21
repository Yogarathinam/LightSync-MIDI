from typing import Dict, Any, List

class AICoach:
    """
    Intelligent Performance Coach.
    Analyzes session metrics and outputs structured, natural-language musical feedback and targeted drills.
    """
    @staticmethod
    def analyze_performance(session_data: Dict[str, Any]) -> Dict[str, Any]:
        accuracy = session_data.get("accuracy_pct", 0.0)
        avg_dev = session_data.get("avg_deviation_ms", 0.0)
        ratings = session_data.get("ratings_count", {})
        total_notes = session_data.get("total_notes", 1)
        song_title = session_data.get("song_title", "Exercise")

        perfect_count = ratings.get("PERFECT", 0)
        early_count = ratings.get("EARLY", 0)
        late_count = ratings.get("LATE", 0)
        miss_count = ratings.get("MISS", 0)

        # 1. Headline diagnosis
        if accuracy >= 95:
            tone = "Mastery"
            headline = f"Superb Performance on {song_title}!"
            summary = "Your note precision and rhythmic pocket are remarkably consistent. Your fingers are well synchronized with the tempo."
        elif accuracy >= 80:
            tone = "Promising"
            headline = f"Strong Foundation on {song_title}!"
            summary = "Great musical flow overall. With a bit of targeted attention to transitional measures and timing consistency, you'll reach concert-ready consistency."
        else:
            tone = "Developing"
            headline = f"Good Effort on {song_title} - Let's Refine"
            summary = "You're building familiarity with the notes. Don't worry about high tempo yet—prioritize steady hand posture and clear articulation."

        # 2. Timing Tendency Analysis
        if abs(avg_dev) < 15:
            timing_diag = "Your internal clock is dead-on. You sit comfortably right in the pocket."
        elif avg_dev < -25:
            timing_diag = f"You tend to anticipate notes slightly early (average {abs(avg_dev):.0f} ms early). Try relaxing your wrist and letting the beat arrive."
        else:
            timing_diag = f"You tend to drag slightly behind the beat (average {avg_dev:.0f} ms late). Practice leading with your fingertips on the downbeat."

        # 3. Targeted Practice Drills
        drills: List[Dict[str, str]] = []
        if miss_count > 0:
            drills.append({
                "title": "Sub-Tempo Articulation Drill",
                "action": "Lower the tempo to 70% in Practice Mode and play the piece through twice without looking at your hands."
            })
        if early_count > late_count and early_count > 3:
            drills.append({
                "title": "Metronome Pocket Sync",
                "action": "Enable the Metronome click at 4/4 and count '1-and-2-and' aloud to anchor your tempo before playing."
            })
        elif late_count > early_count and late_count > 3:
            drills.append({
                "title": "Downbeat Preparation Drill",
                "action": "Rest your hand on the starting keys one measure early and anticipate hand position shifts before the measure begins."
            })
        else:
            drills.append({
                "title": "Dynamic Expression Challenge",
                "action": "Experiment with playing the repeat section pianissimo (softly) while maintaining your current accuracy score."
            })

        return {
            "headline": headline,
            "tone": tone,
            "summary": summary,
            "timing_diagnosis": timing_diag,
            "accuracy_score": accuracy,
            "avg_deviation_ms": avg_dev,
            "drills": drills,
            "coach_signature": "LightSync AI Mentor"
        }

ai_coach = AICoach()
