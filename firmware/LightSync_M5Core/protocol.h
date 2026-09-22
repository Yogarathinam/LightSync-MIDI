#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "config.h"

// Forward declaration
class EffectEngine;
class DeviceUI;

class CommandProtocol {
public:
    static EffectType parseEffectName(const String& name) {
        String lower = name;
        lower.toLowerCase();
        lower.trim();

        if (lower == "bounce") return EFFECT_BOUNCE;
        if (lower == "ripple") return EFFECT_RIPPLE;
        if (lower == "pulse") return EFFECT_PULSE;
        if (lower == "hold_beam" || lower == "hold" || lower == "hold aura") return EFFECT_HOLD_BEAM;
        if (lower == "glitch") return EFFECT_GLITCH;
        if (lower == "spark") return EFFECT_SPARK;
        if (lower == "sprinkle") return EFFECT_SPRINKLE;
        if (lower == "rain") return EFFECT_RAIN;
        if (lower == "wave") return EFFECT_WAVE;

        return EFFECT_BOUNCE;
    }

    static const char* getEffectName(EffectType eff) {
        switch (eff) {
            case EFFECT_BOUNCE:    return "BOUNCE";
            case EFFECT_RIPPLE:    return "RIPPLE";
            case EFFECT_PULSE:     return "PULSE";
            case EFFECT_HOLD_BEAM: return "HOLD AURA";
            case EFFECT_GLITCH:    return "CYBER GLITCH";
            case EFFECT_SPARK:     return "SPARK BURST";
            case EFFECT_SPRINKLE:  return "SPRINKLE";
            case EFFECT_RAIN:      return "NEON RAIN";
            case EFFECT_WAVE:      return "HARMONIC WAVE";
            default:               return "BOUNCE";
        }
    }

    static const char* getPresetName(ColorPresetId preset) {
        switch (preset) {
            case PRESET_CYBERPUNK: return "Cyberpunk Neon";
            case PRESET_SYNTHWAVE: return "Synthwave Sunset";
            case PRESET_EMERALD:   return "Emerald Matrix";
            case PRESET_SUNSET:    return "Sunset Horizon";
            case PRESET_INDIGO:    return "Electric Indigo";
            case PRESET_CRIMSON:   return "Crimson Nova";
            case PRESET_SPECTRUM:  return "Pitch Spectrum";
            default:               return "Custom";
        }
    }

    static void applyPreset(ColorPresetId preset, DeviceConfig& cfg) {
        cfg.currentPreset = preset;
        switch (preset) {
            case PRESET_CYBERPUNK:
                cfg.primaryR = 0;   cfg.primaryG = 240; cfg.primaryB = 255; // Cyan
                cfg.secondaryR = 236; cfg.secondaryG = 72; cfg.secondaryB = 153; // Magenta
                cfg.rainbow = false;
                cfg.currentEffect = EFFECT_SPARK;
                break;
            case PRESET_SYNTHWAVE:
                cfg.primaryR = 245; cfg.primaryG = 158; cfg.primaryB = 11;  // Amber
                cfg.secondaryR = 139; cfg.secondaryG = 92; cfg.secondaryB = 246; // Violet
                cfg.rainbow = false;
                cfg.currentEffect = EFFECT_PULSE;
                break;
            case PRESET_EMERALD:
                cfg.primaryR = 16;  cfg.primaryG = 185; cfg.primaryB = 129; // Mint
                cfg.secondaryR = 6; cfg.secondaryG = 182; cfg.secondaryB = 212; // Teal
                cfg.rainbow = false;
                cfg.currentEffect = EFFECT_GLITCH;
                break;
            case PRESET_SUNSET:
                cfg.primaryR = 244; cfg.primaryG = 63;  cfg.primaryB = 94;  // Rose
                cfg.secondaryR = 251; cfg.secondaryG = 146; cfg.secondaryB = 60; // Peach
                cfg.rainbow = false;
                cfg.currentEffect = EFFECT_RIPPLE;
                break;
            case PRESET_INDIGO:
                cfg.primaryR = 99;  cfg.primaryG = 102; cfg.primaryB = 241; // Indigo
                cfg.secondaryR = 56; cfg.secondaryG = 189; cfg.secondaryB = 248; // Sky Blue
                cfg.rainbow = false;
                cfg.currentEffect = EFFECT_WAVE;
                break;
            case PRESET_CRIMSON:
                cfg.primaryR = 239; cfg.primaryG = 68;  cfg.primaryB = 68;  // Red flame
                cfg.secondaryR = 249; cfg.secondaryG = 115; cfg.secondaryB = 22; // Orange
                cfg.rainbow = false;
                cfg.currentEffect = EFFECT_BOUNCE;
                break;
            case PRESET_SPECTRUM:
                cfg.rainbow = true;
                cfg.currentEffect = EFFECT_RAIN;
                break;
            default:
                break;
        }
    }

    static void processLine(const String& rawLine, DeviceConfig& cfg, EffectEngine& eng, DeviceUI& ui);
};
