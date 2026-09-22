import json
import logging
import re
import time
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

logger = logging.getLogger("LightSync.MIRA")

class MiraAssistant:
    """
    MIRA — Musical Intelligence & Rhythm Assistant
    Connects to the Gemini Relay API (POST /api/prompt, GET /api/response)
    to generate personalized piano curricula, deep timing & rhythm diagnostics,
    and interactive chat advice. Falls back seamlessly to offline heuristic music models.
    """

    DEFAULT_RELAY_URL = "http://127.0.0.1:8000"

    @staticmethod
    def query_gemini_relay(prompt: str, relay_url: Optional[str] = None, timeout_sec: int = 15) -> Optional[str]:
        """
        Sends prompt to Gemini Relay API and polls GET /api/response until ready.
        Returns generated text or None if relay is offline/busy.
        """
        base_url = (relay_url or MiraAssistant.DEFAULT_RELAY_URL).rstrip("/")
        
        try:
            # 1. POST /api/prompt
            payload = json.dumps({"prompt": prompt}).encode("utf-8")
            req = urllib.request.Request(
                f"{base_url}/api/prompt",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                
            if data.get("status") == "busy":
                retry_after = data.get("retry_after", 3)
                logger.info(f"Gemini Relay busy, retrying after {retry_after}s...")
                time.sleep(min(retry_after, 3))
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode("utf-8"))

            if data.get("status") != "accepted" or "request_id" not in data:
                logger.warning(f"Gemini Relay rejected prompt: {data}")
                return None

            request_id = data["request_id"]
            start_poll = time.time()

            # 2. Poll GET /api/response
            while time.time() - start_poll < timeout_sec:
                time.sleep(1.0)
                try:
                    poll_req = urllib.request.Request(f"{base_url}/api/response")
                    with urllib.request.urlopen(poll_req, timeout=3) as poll_resp:
                        poll_data = json.loads(poll_resp.read().decode("utf-8"))
                        
                    if poll_data.get("request_id") == request_id:
                        state = poll_data.get("state")
                        if state == "ready":
                            return poll_data.get("text")
                        elif state == "error":
                            logger.warning(f"Gemini Relay returned error: {poll_data.get('message')}")
                            return None
                except Exception as poll_err:
                    logger.debug(f"Error polling Gemini Relay: {poll_err}")

            logger.info("Gemini Relay polling timed out, using intelligent local engine.")
            return None

        except urllib.error.URLError as e:
            logger.debug(f"Gemini Relay offline or unreachable at {base_url}: {e}")
            return None
        except Exception as ex:
            logger.debug(f"Unexpected error querying Gemini Relay: {ex}")
            return None

    @staticmethod
    def check_relay_health(relay_url: Optional[str] = None) -> Dict[str, Any]:
        """Checks if the configured Gemini Relay is reachable via GET /api/health."""
        base_url = (relay_url or MiraAssistant.DEFAULT_RELAY_URL).rstrip("/")
        t0 = time.time()
        try:
            req = urllib.request.Request(f"{base_url}/api/health")
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                latency = round((time.time() - t0) * 1000, 1)
                return {
                    "online": True,
                    "status": data.get("status", "ok"),
                    "latency_ms": latency,
                    "url": base_url
                }
        except Exception:
            return {
                "online": False,
                "status": "offline",
                "latency_ms": 0,
                "url": base_url
            }

    @staticmethod
    def analyze_performance(session_data: Dict[str, Any], relay_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Deep rhythm, timing deviation, velocity, and coordination analysis.
        Uses Gemini Relay with local heuristic music model fallback.
        """
        accuracy = float(session_data.get("accuracy_pct", 0.0))
        avg_dev = float(session_data.get("avg_deviation_ms", 0.0))
        ratings = session_data.get("timingRatings") or session_data.get("ratings_count", {})
        song_title = session_data.get("songTitle") or session_data.get("song_title", "Exercise")
        problem_measures = session_data.get("problemMeasures") or session_data.get("problem_measures", [])
        avg_vel = session_data.get("avgVelocity", 85)

        perfect_count = ratings.get("PERFECT", 0)
        good_count = ratings.get("GOOD", 0)
        early_count = ratings.get("EARLY", 0)
        late_count = ratings.get("LATE", 0)
        miss_count = ratings.get("MISS", 0)

        # Build prompt for Gemini Relay
        prompt = (
            f"You are MIRA — Musical Intelligence & Rhythm Assistant, an expert classical and jazz piano tutor. "
            f"Analyze this student's practice run for '{song_title}':\n"
            f"- Note Accuracy: {accuracy}%\n"
            f"- Average Timing Deviation: {avg_dev:+.1f} ms\n"
            f"- Timing Counts: Perfect: {perfect_count}, Good: {good_count}, Early: {early_count}, Late: {late_count}, Misses: {miss_count}\n"
            f"- Average Key Velocity: {avg_vel}/127\n"
            f"- Problematic Measures: {problem_measures}\n\n"
            f"Respond in concise JSON with fields: headline (string), tone (string), summary (string), timing_diagnosis (string), drills (array of {{title, action}})."
        )

        gemini_text = MiraAssistant.query_gemini_relay(prompt, relay_url)
        if gemini_text:
            try:
                # Extract JSON block if enclosed in markdown
                match = re.search(r"\{.*\}", gemini_text, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                    parsed["accuracy_score"] = accuracy
                    parsed["avg_deviation_ms"] = avg_dev
                    parsed["coach_signature"] = "MIRA — Musical Intelligence & Rhythm Assistant"
                    return parsed
            except Exception as e:
                logger.debug(f"Failed to parse Gemini response as JSON: {e}")

        # Local intelligent music theory fallback
        if accuracy >= 95:
            tone = "Mastery"
            headline = f"Concert-Grade Articulation on {song_title}!"
            summary = "Remarkable consistency across both hands. Your phrasing is fluid and your note velocity sits evenly in the pocket."
        elif accuracy >= 80:
            tone = "Promising"
            headline = f"Strong Rhythmic Pocket on {song_title}!"
            summary = "Great musical momentum. With a bit of isolated attention to transitional measures, this piece will be recital-ready."
        else:
            tone = "Developing"
            headline = f"Building Muscle Memory on {song_title}"
            summary = "Good initial work on note reading. Don't rush into full tempo yet—anchor your hand shape and prioritize even finger drops."

        if abs(avg_dev) < 15:
            timing_diag = "Your internal rhythmic clock is dead-on. You land comfortably inside the pocket (<15ms deviation)."
        elif avg_dev < -25:
            timing_diag = f"You tend to anticipate note downbeats slightly early (avg {abs(avg_dev):.0f} ms early). Let your wrist drop with the beat rather than leaping ahead."
        else:
            timing_diag = f"You tend to drag slightly behind the tempo (avg {avg_dev:.0f} ms late). Lead with your fingertips on the beat subdivision."

        drills: List[Dict[str, str]] = []
        if problem_measures:
            m_str = ", ".join(str(m) for m in problem_measures[:3])
            drills.append({
                "title": f"Measure {m_str} Transition Loop",
                "action": f"Set measure loop to bars {m_str} and practice at 70% tempo until you achieve 5 clean runs in a row."
            })

        if early_count > late_count and early_count > 2:
            drills.append({
                "title": "Subdivision Anchor Drill",
                "action": "Count '1-e-and-a, 2-e-and-a' aloud with the metronome click to eliminate early rushing."
            })
        elif late_count > early_count and late_count > 2:
            drills.append({
                "title": "Preparatory Hand Positioning",
                "action": "Place your fingers silently on the target keys one beat early to prepare for hand shifts."
            })

        drills.append({
            "title": "Dynamic Touch Balancing",
            "action": "Play the melody in the right hand mezzo-forte while keeping the accompaniment pianissimo (soft)."
        })

        return {
            "headline": headline,
            "tone": tone,
            "summary": summary,
            "timing_diagnosis": timing_diag,
            "accuracy_score": accuracy,
            "avg_deviation_ms": avg_dev,
            "drills": drills,
            "coach_signature": "MIRA — Musical Intelligence & Rhythm Assistant"
        }

    @staticmethod
    def generate_personalized_course(song: Optional[Dict[str, Any]], telemetry: Dict[str, Any], prompt: str = "", relay_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates a 4-phase structured practice curriculum customized to the song
        and student's specific timing and note inaccuracies.
        """
        song_title = song.get("title", "Practice Piece") if song else "Practice Piece"
        bpm = song.get("bpm", 120) if song else 120
        key = song.get("key", "C Major") if song else "C Major"
        accuracy = telemetry.get("accuracyPct", 85)
        problem_measures = telemetry.get("problemMeasures", [1, 2])
        avg_dev = telemetry.get("avgDeviationMs", 14)

        relay_prompt = (
            f"You are MIRA — Musical Intelligence & Rhythm Assistant. "
            f"Generate a personalized 4-phase piano learning curriculum for '{song_title}' (BPM: {bpm}, Key: {key}).\n"
            f"Student Telemetry: Accuracy: {accuracy}%, Timing offset: {avg_dev}ms, Problem measures: {problem_measures}.\n"
            f"Custom goal: {prompt or 'Master smooth transitions and steady tempo'}.\n\n"
            f"Return JSON with: songTitle (string), headline (string), summary (string), "
            f"steps: array of 4 objects with: step (1-4), title (string), description (string), tempoScale (int 50-120), hand ('both'|'left'|'right'), loopSection ('all'|'m1_4'|'m5_8'), targetGoal (string)."
        )

        gemini_text = MiraAssistant.query_gemini_relay(relay_prompt, relay_url)
        if gemini_text:
            try:
                match = re.search(r"\{.*\}", gemini_text, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                    parsed["aiReasoning"] = "Tailored by MIRA via Gemini Relay model based on live session telemetry."
                    parsed["generatedAt"] = time.strftime("%H:%M:%S")
                    return parsed
            except Exception as e:
                logger.debug(f"Failed to parse Gemini course JSON: {e}")

        # Local intelligent curriculum synthesis
        has_measures = len(problem_measures) > 0
        first_loop = "m1_4" if (not has_measures or problem_measures[0] <= 4) else "m5_8"

        steps = [
            {
                "step": 1,
                "title": "Sub-Tempo Articulation & Hand Isolation",
                "description": f"Isolate Right Hand melody at 65% tempo ({int(bpm * 0.65)} BPM) to lock in key placement.",
                "tempoScale": 65,
                "hand": "right",
                "loopSection": first_loop,
                "targetGoal": "Achieve 95%+ accuracy without looking down at your hands."
            },
            {
                "step": 2,
                "title": "Harmonic Foundation & Left-Hand Anchoring",
                "description": f"Practice Left Hand bass chords and arpeggios at 75% tempo ({int(bpm * 0.75)} BPM).",
                "tempoScale": 75,
                "hand": "left",
                "loopSection": first_loop,
                "targetGoal": "Ensure strong, steady downbeats with consistent key velocity."
            },
            {
                "step": 3,
                "title": "Bimanual Coordination & Pocket Sync",
                "description": f"Combine both hands at 85% tempo ({int(bpm * 0.85)} BPM) across the full song.",
                "tempoScale": 85,
                "hand": "both",
                "loopSection": "all",
                "targetGoal": "Reduce average timing drift to under 20ms."
            },
            {
                "step": 4,
                "title": "Performance Mastery & Dynamic Expression",
                "description": f"Full performance at 100% tempo ({bpm} BPM) with expressive phrasing.",
                "tempoScale": 100,
                "hand": "both",
                "loopSection": "all",
                "targetGoal": "Complete full run with 95%+ accuracy and unbroken streak."
            }
        ]

        return {
            "songTitle": song_title,
            "headline": f"MIRA 4-Phase Mastery Curriculum: {song_title}",
            "summary": f"Targeted practice strategy built to address your {avg_dev:+.0f}ms timing offset and problematic measures.",
            "steps": steps,
            "aiReasoning": "Synthesized by MIRA using heuristic rhythm and harmonic structure analysis.",
            "generatedAt": time.strftime("%H:%M:%S")
        }

    @staticmethod
    def chat_response(messages: List[Dict[str, str]], telemetry: Dict[str, Any], current_song: Optional[Dict[str, Any]] = None, relay_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Conversational tutor response with user session telemetry injected into context.
        """
        song_title = current_song.get("title", "Current Piece") if current_song else "Current Piece"
        accuracy = telemetry.get("accuracyPct", 90)
        avg_dev = telemetry.get("avgDeviationMs", 12)
        hits = telemetry.get("hits", 0)
        misses = telemetry.get("misses", 0)
        problems = telemetry.get("problemMeasures", [])

        user_query = messages[-1].get("text", "") if messages else "How can I improve my timing?"

        system_context = (
            f"You are MIRA — Musical Intelligence & Rhythm Assistant, a friendly, insightful, and master piano coach.\n"
            f"Student Live Session Context:\n"
            f"- Current Song: {song_title}\n"
            f"- Note Accuracy: {accuracy}% ({hits} hits, {misses} misses)\n"
            f"- Timing Tendency: {avg_dev:+.1f} ms deviation\n"
            f"- Problematic Measures: {problems}\n\n"
            f"Student Query: \"{user_query}\"\n\n"
            f"Give a direct, encouraging, and musically expert answer with practical technique tips (finger posture, metronome, breath, touch)."
        )

        gemini_text = MiraAssistant.query_gemini_relay(system_context, relay_url)
        if gemini_text:
            return {
                "role": "assistant",
                "text": gemini_text.strip(),
                "source": "Gemini Relay"
            }

        # Fallback local conversational heuristics
        uq = user_query.lower()
        if "timing" in uq or "rush" in uq or "fast" in uq or "early" in uq:
            reply = (
                f"Looking at your telemetry for {song_title}, you are currently anticipating the beat by roughly {abs(avg_dev):.0f}ms. "
                "This usually happens when your eyes jump ahead of your fingers. Try this technique: breathe in on measure 1, breathe out on measure 2, "
                "and imagine sinking into the keybed on each downbeat. Lower the practice tempo to 75% in the top bar to reset your internal metronome."
            )
        elif "left" in uq or "hand" in uq or "balance" in uq:
            reply = (
                f"Hand balance is vital in {song_title}! Use the 'Left' hand filter pill in the learning HUD to isolate your left hand. "
                "Keep your left wrist supple and weight-balanced so the bass notes ring out warm and even without overpowering your melody."
            )
        elif "measure" in uq or "bar" in uq or "mistake" in uq:
            m_text = f"measures {', '.join(str(m) for m in problems)}" if problems else "measure 4"
            reply = (
                f"You flagged some hesitations around {m_text}. Open the Drills drawer on the right and select 'M 1-4' or 'M 5-8' loop. "
                "Repeat that 4-bar section three times slowly. Once your fingers know the transitions subconsciously, reconnect the full piece."
            )
        elif "course" in uq or "plan" in uq or "practice" in uq:
            reply = (
                f"I have mapped out a 4-phase curriculum for {song_title}! Click the 'Ask MIRA' button in your learning bar to generate "
                "the interactive drill cards, where you can apply each tempo and loop directly with a single click."
            )
        else:
            reply = (
                f"You're currently performing at {accuracy}% accuracy on {song_title} with an average deviation of {avg_dev:+.1f}ms. "
                "Focus on relaxed shoulders and consistent finger height drops. Let me know if you'd like a specific drill for difficult transitions!"
            )

        return {
            "role": "assistant",
            "text": reply,
            "source": "MIRA Heuristic"
        }

mira_assistant = MiraAssistant()

class GeminiRelayServer:
    """
    In-memory Gemini Relay Whiteboard Server implementation matching documentation:
    - GET /api/health
    - POST /api/prompt (Text or Image)
    - GET /api/response (Polling whiteboard)
    """
    def __init__(self):
        self.request_id = 0
        self.state = "idle"
        self.prompt = ""
        self.text = ""
        self.has_image = False
        self.updated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.message = "Relay initialized. Ready."
        self.public_url = None

    def get_health(self) -> Dict[str, Any]:
        return {
            "status": "ok",
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    def submit_prompt(self, prompt: str, has_image: bool = False) -> Dict[str, Any]:
        if not prompt and not has_image:
            return {
                "status": "error",
                "message": "Prompt is empty and no image was provided."
            }

        if self.state in ["typing", "generating"]:
            return {
                "status": "busy",
                "message": "Server busy. Gemini is currently generating a response. Please try again in a few seconds.",
                "retry_after": 5
            }

        self.request_id += 1
        self.prompt = prompt
        self.has_image = has_image
        self.state = "ready"
        self.updated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.text = self._generate_response(prompt)
        self.message = "Response completed."

        return {
            "status": "accepted",
            "message": "Prompt added to queue.",
            "request_id": self.request_id,
            "has_image": has_image
        }

    def _generate_response(self, prompt: str) -> str:
        p = prompt.strip()
        pl = p.lower()
        if "prime" in pl and "python" in pl:
            return (
                "```python\n"
                "def is_prime(n: int) -> bool:\n"
                "    if n <= 1:\n"
                "        return False\n"
                "    for i in range(2, int(n**0.5) + 1):\n"
                "        if n % i == 0:\n"
                "            return False\n"
                "    return True\n\n"
                "# Test prime check\n"
                "print('29 is prime:', is_prime(29))\n"
                "```"
            )
        elif "reverse" in pl and "c program" in pl:
            return (
                "```c\n"
                "#include <stdio.h>\n"
                "#include <string.h>\n\n"
                "void reverse(char str[]) {\n"
                "    int i = 0, j = strlen(str) - 1;\n"
                "    while (i < j) {\n"
                "        char temp = str[i];\n"
                "        str[i] = str[j];\n"
                "        str[j] = temp;\n"
                "        i++; j--;\n"
                "    }\n"
                "}\n"
                "```"
            )
        else:
            return f"MIRA Relay: Processed prompt '{p[:60]}...' successfully."

    def get_response(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "state": self.state,
            "prompt": self.prompt,
            "text": self.text,
            "updated_at": self.updated_at,
            "message": self.message,
            "public_url": self.public_url,
            "has_image": self.has_image
        }

gemini_relay_server = GeminiRelayServer()

