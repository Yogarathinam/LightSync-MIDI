#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "config.h"

// Forward declarations
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
        if (lower == "static" || lower == "static key" || lower == "key light" || lower == "blink" || lower == "blink & fade" || lower == "fade") return EFFECT_STATIC;

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
            case EFFECT_STATIC:    return "STATIC KEY";
            default:               return "BOUNCE";
        }
    }

    static const char* getEffectDescription(EffectType eff) {
        switch (eff) {
            case EFFECT_BOUNCE:    return "Dynamic ballistic particles with boundary rebound";
            case EFFECT_RIPPLE:    return "Dual circular acoustic wave crests";
            case EFFECT_PULSE:     return "Breathing rhythmic radial expansion";
            case EFFECT_HOLD_BEAM: return "Continuous luminous glow while keys held";
            case EFFECT_GLITCH:    return "Cyberpunk scanlines & digital jitter";
            case EFFECT_SPARK:     return "High-velocity explosive particle burst";
            case EFFECT_SPRINKLE:  return "Gentle falling fairy dust sparkles";
            case EFFECT_RAIN:      return "Flowing neon comet trails along strip";
            case EFFECT_WAVE:      return "Interfering sinusoidal harmonic wave";
            case EFFECT_STATIC:    return "Solid key light held continuously until key release";
            default:               return "Dynamic visual LED effect";
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
            default:               return "Custom Palette";
        }
    }

    static void applyPreset(ColorPresetId preset, DeviceConfig& cfg, bool overrideEffect = false) {
        cfg.currentPreset = preset;
        switch (preset) {
            case PRESET_CYBERPUNK:
                cfg.primaryR = 0;   cfg.primaryG = 240; cfg.primaryB = 255; // Electric Cyan
                cfg.secondaryR = 236; cfg.secondaryG = 72; cfg.secondaryB = 153; // Hot Magenta
                cfg.rainbow = false;
                if (overrideEffect) cfg.currentEffect = EFFECT_SPARK;
                break;
            case PRESET_SYNTHWAVE:
                cfg.primaryR = 245; cfg.primaryG = 158; cfg.primaryB = 11;  // Golden Amber
                cfg.secondaryR = 139; cfg.secondaryG = 92; cfg.secondaryB = 246; // Deep Violet
                cfg.rainbow = false;
                if (overrideEffect) cfg.currentEffect = EFFECT_PULSE;
                break;
            case PRESET_EMERALD:
                cfg.primaryR = 16;  cfg.primaryG = 185; cfg.primaryB = 129; // Mint
                cfg.secondaryR = 6; cfg.secondaryG = 182; cfg.secondaryB = 212; // Luminous Teal
                cfg.rainbow = false;
                if (overrideEffect) cfg.currentEffect = EFFECT_GLITCH;
                break;
            case PRESET_SUNSET:
                cfg.primaryR = 244; cfg.primaryG = 63;  cfg.primaryB = 94;  // Rose Red
                cfg.secondaryR = 251; cfg.secondaryG = 146; cfg.secondaryB = 60; // Warm Peach
                cfg.rainbow = false;
                if (overrideEffect) cfg.currentEffect = EFFECT_RIPPLE;
                break;
            case PRESET_INDIGO:
                cfg.primaryR = 99;  cfg.primaryG = 102; cfg.primaryB = 241; // Deep Indigo
                cfg.secondaryR = 56; cfg.secondaryG = 189; cfg.secondaryB = 248; // Cobalt Sky
                cfg.rainbow = false;
                if (overrideEffect) cfg.currentEffect = EFFECT_WAVE;
                break;
            case PRESET_CRIMSON:
                cfg.primaryR = 239; cfg.primaryG = 68;  cfg.primaryB = 68;  // Intense Flame
                cfg.secondaryR = 249; cfg.secondaryG = 115; cfg.secondaryB = 22; // Blaze Orange
                cfg.rainbow = false;
                if (overrideEffect) cfg.currentEffect = EFFECT_BOUNCE;
                break;
            case PRESET_SPECTRUM:
                cfg.rainbow = true;
                if (overrideEffect) cfg.currentEffect = EFFECT_RAIN;
                break;
            default:
                break;
        }
    }

    static void cycleKeyboardSize(DeviceConfig& cfg) {
        if (cfg.keyCount == 25) cfg.keyCount = 49;
        else if (cfg.keyCount == 49) cfg.keyCount = 61;
        else if (cfg.keyCount == 61) cfg.keyCount = 88;
        else cfg.keyCount = 25;
    }

    static void processLine(const String& rawLine, DeviceConfig& cfg, EffectEngine& eng, DeviceUI& ui);
};
