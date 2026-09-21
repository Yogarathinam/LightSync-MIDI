#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "config.h"

// Forward declaration
class EffectEngine;

class CommandProtocol {
public:
    static EffectType parseEffectName(const String& name) {
        String lower = name;
        lower.toLowerCase();
        lower.trim();

        if (lower == "bounce") return EFFECT_BOUNCE;
        if (lower == "ripple") return EFFECT_RIPPLE;
        if (lower == "pulse") return EFFECT_PULSE;
        if (lower == "hold_beam" || lower == "hold") return EFFECT_HOLD_BEAM;
        if (lower == "glitch") return EFFECT_GLITCH;
        if (lower == "spark") return EFFECT_SPARK;
        if (lower == "sprinkle") return EFFECT_SPRINKLE;
        if (lower == "rain") return EFFECT_RAIN;
        if (lower == "wave") return EFFECT_WAVE;

        return EFFECT_BOUNCE;
    }

    static const char* getEffectName(EffectType eff) {
        switch (eff) {
            case EFFECT_BOUNCE: return "BOUNCE";
            case EFFECT_RIPPLE: return "RIPPLE";
            case EFFECT_PULSE: return "PULSE";
            case EFFECT_HOLD_BEAM: return "HOLD AURA";
            case EFFECT_GLITCH: return "CYBER GLITCH";
            case EFFECT_SPARK: return "SPARK BURST";
            case EFFECT_SPRINKLE: return "SPRINKLE";
            case EFFECT_RAIN: return "NEON RAIN";
            case EFFECT_WAVE: return "HARMONIC WAVE";
            default: return "UNKNOWN";
        }
    }

    static void processLine(const String& line, DeviceConfig& config, EffectEngine& engine);
};
