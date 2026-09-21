import re
from typing import Dict, Any

class VisualCopilot:
    """
    Translates natural language creative prompts into validated,
    structured LightSync LED and visualizer configurations.
    """
    @staticmethod
    def generate_preset_from_prompt(prompt: str) -> Dict[str, Any]:
        p = prompt.lower()

        # Default fallback config
        effect = "ripple"
        speed = 1.2
        decay = 0.85
        spread = 3.0
        brightness = 200
        rainbow = False
        primary = "#00f0ff"
        secondary = "#6366f1"
        name = "Custom AI Aura"

        # 1. Effect Selection Heuristics
        if any(w in p for w in ["bounce", "jump", "rebound", "energy", "ball"]):
            effect = "bounce"
            speed = 1.6
            name = "Dynamic Bounce"
        elif any(w in p for w in ["pulse", "heart", "breath", "breathe", "throb", "meditat"]):
            effect = "pulse"
            speed = 0.8
            spread = 4.5
            decay = 0.88
            name = "Rhythmic Pulse"
        elif any(w in p for w in ["spark", "fire", "lightning", "electric", "explode", "burst"]):
            effect = "spark"
            speed = 1.8
            spread = 2.0
            decay = 0.78
            brightness = 255
            name = "Electric Sparks"
        elif any(w in p for w in ["rain", "storm", "comet", "meteor", "fall", "waterfall"]):
            effect = "rain"
            speed = 1.5
            spread = 4.0
            decay = 0.90
            name = "Neon Rainfall"
        elif any(w in p for w in ["wave", "ocean", "sea", "tide", "water", "flow", "harmonic"]):
            effect = "wave"
            speed = 0.6
            spread = 5.0
            decay = 0.92
            name = "Ocean Swell"
        elif any(w in p for w in ["glitch", "cyber", "matrix", "hacker", "digital", "bit"]):
            effect = "glitch"
            speed = 2.0
            decay = 0.75
            name = "Cyber Glitch"
        elif any(w in p for w in ["sprinkle", "magic", "fairy", "glitter", "starlight", "twinkle"]):
            effect = "sprinkle"
            speed = 1.1
            spread = 3.5
            decay = 0.86
            name = "Starlight Shimmer"
        elif any(w in p for w in ["hold", "aura", "sustain", "beam", "laser"]):
            effect = "hold_beam"
            spread = 4.0
            name = "Sustained Aura"

        # 2. Color Scheme Detection
        if any(w in p for w in ["rainbow", "chromatic", "colorful", "prism"]):
            rainbow = True
            primary = "#ff007f"
            secondary = "#00f0ff"
        elif any(w in p for w in ["fire", "warm", "sunset", "amber", "orange", "gold"]):
            primary = "#f59e0b"
            secondary = "#ef4444"
        elif any(w in p for w in ["ocean", "blue", "ice", "cool", "azure", "sky"]):
            primary = "#0ea5e9"
            secondary = "#3b82f6"
        elif any(w in p for w in ["emerald", "forest", "nature", "green", "matrix"]):
            primary = "#10b981"
            secondary = "#059669"
        elif any(w in p for w in ["purple", "violet", "galaxy", "cosmic", "nebula"]):
            primary = "#a855f7"
            secondary = "#6366f1"
        elif any(w in p for w in ["pink", "rose", "magenta", "blush"]):
            primary = "#ec4899"
            secondary = "#f43f5e"

        # 3. Speed / Intensity adjustments
        if any(w in p for w in ["calm", "gentle", "slow", "ambient", "soft"]):
            speed = max(0.4, speed * 0.6)
            decay = min(0.95, decay + 0.05)
            brightness = max(120, brightness - 50)
        elif any(w in p for w in ["fast", "hyper", "intense", "furious", "crazy", "quick"]):
            speed = min(3.5, speed * 1.5)
            decay = max(0.65, decay - 0.1)
            brightness = 255

        return {
            "id": f"ai_{int(speed * 100)}_{effect}",
            "name": name,
            "effect": effect,
            "speed": round(speed, 2),
            "decay": round(decay, 2),
            "spread": round(spread, 1),
            "brightness": brightness,
            "rainbow": rainbow,
            "primary_color": primary,
            "secondary_color": secondary,
            "prompt_used": prompt,
            "ai_reasoning": f"Configured {effect.upper()} dynamics at speed {speed:.2f} with {primary} aesthetic for prompt '{prompt}'."
        }

visual_copilot = VisualCopilot()
