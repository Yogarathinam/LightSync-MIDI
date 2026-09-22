import json
from typing import Dict, Any, Union

class ProtocolBuilder:
    """
    Encodes LightSync high-speed semantic commands for M5Stack USB serial.
    Supports both human-readable CLI text commands and structured JSON payloads.
    """
    @staticmethod
    def note_on(pitch: int, velocity: int) -> str:
        return f"NOTE_ON {pitch} {velocity}\n"

    @staticmethod
    def note_off(pitch: int) -> str:
        return f"NOTE_OFF {pitch}\n"

    @staticmethod
    def set_effect(effect_name: str) -> str:
        return f"EFFECT {effect_name}\n"

    @staticmethod
    def chord(chord_name: str) -> str:
        return f"CHORD {chord_name}\n"

    @staticmethod
    def preset(preset_name: str) -> str:
        return f"PRESET {preset_name}\n"

    @staticmethod
    def set_param(param_name: str, value: Union[int, float, bool, str]) -> str:
        if isinstance(value, bool):
            val_str = "1" if value else "0"
        elif isinstance(value, float):
            val_str = f"{value:.2f}"
        else:
            val_str = str(value)
        return f"{param_name}={val_str}\n"

    @staticmethod
    def set_color(r: int, g: int, b: int) -> str:
        return f"color={r},{g},{b}\n"

    @staticmethod
    def ping() -> str:
        return "PING\n"

    @staticmethod
    def status() -> str:
        return "STATUS\n"

    @staticmethod
    def to_json_payload(config: Dict[str, Any]) -> str:
        return json.dumps(config) + "\n"
