#pragma once

#include <Arduino.h>

// =========================================================================
// LightSync v2 — M5Stack Core Firmware Configuration
// Designed for Team XLR8 | RMK Innovate Hackathon 2026
// Hardware: M5Stack Core / Core2 / Fire / CoreS3 (ESP32) + WS2812B LED Strip
// =========================================================================

// WS2812B Data Output Pin (Pin 21 on M5Stack Core bottom header / Grove port)
#ifndef LED_DATA_PIN
#define LED_DATA_PIN 21
#endif

// Default LED strip configuration
#define DEFAULT_LED_COUNT 144
#define MAX_LED_COUNT 300

// Serial Communication
#define SERIAL_BAUD_RATE 115200
#define SERIAL_RX_BUFFER_SIZE 512

// Button Debounce Threshold (ms) to eliminate hardware switch chatter
#define BUTTON_DEBOUNCE_MS 220

// Default Effect Parameters
#define DEFAULT_BRIGHTNESS 180
#define DEFAULT_SPEED 1.2f
#define DEFAULT_DECAY 0.85f
#define DEFAULT_SPREAD 3.0f

// Color Defaults (Electric Cyan & Hot Magenta - Cyberpunk Neon)
#define DEFAULT_COLOR_R 0
#define DEFAULT_COLOR_G 240
#define DEFAULT_COLOR_B 255

#define DEFAULT_SEC_R 236
#define DEFAULT_SEC_G 72
#define DEFAULT_SEC_B 153

// 4 Interactive On-Device Screen Modes
enum ScreenMode {
    SCREEN_DASHBOARD = 0,
    SCREEN_EFFECTS_MENU,
    SCREEN_PRESETS_MENU,
    SCREEN_SETTINGS_MENU,
    SCREEN_COUNT
};

// 9 Visual Effects matching Web Studio
enum EffectType {
    EFFECT_BOUNCE = 0,
    EFFECT_RIPPLE,
    EFFECT_PULSE,
    EFFECT_HOLD_BEAM,
    EFFECT_GLITCH,
    EFFECT_SPARK,
    EFFECT_SPRINKLE,
    EFFECT_RAIN,
    EFFECT_WAVE,
    EFFECT_COUNT
};

// 7 Preset Color Schemes matching Web Studio
enum ColorPresetId {
    PRESET_CYBERPUNK = 0,
    PRESET_SYNTHWAVE,
    PRESET_EMERALD,
    PRESET_SUNSET,
    PRESET_INDIGO,
    PRESET_CRIMSON,
    PRESET_SPECTRUM,
    PRESET_COUNT
};

// Runtime configuration state
struct DeviceConfig {
    ScreenMode currentScreen = SCREEN_DASHBOARD;
    EffectType currentEffect = EFFECT_BOUNCE;
    ColorPresetId currentPreset = PRESET_CYBERPUNK;

    // Menu Navigation State
    uint8_t menuEffectIndex = 0;
    uint8_t menuPresetIndex = 0;
    uint8_t menuSettingIndex = 0; // 0: Key Count, 1: Speed, 2: Audio, 3: Port Info

    float speed = DEFAULT_SPEED;
    float decay = DEFAULT_DECAY;
    float spread = DEFAULT_SPREAD;
    uint8_t brightness = DEFAULT_BRIGHTNESS;
    bool rainbow = false;
    bool soundEnabled = true;
    
    // Primary Color (RGB)
    uint8_t primaryR = DEFAULT_COLOR_R;
    uint8_t primaryG = DEFAULT_COLOR_G;
    uint8_t primaryB = DEFAULT_COLOR_B;

    // Secondary Color (RGB)
    uint8_t secondaryR = DEFAULT_SEC_R;
    uint8_t secondaryG = DEFAULT_SEC_G;
    uint8_t secondaryB = DEFAULT_SEC_B;

    uint16_t ledCount = DEFAULT_LED_COUNT;
    uint8_t keyCount = 61;       // 25, 49, 61, or 88 keys
    
    // Live Performance Readouts
    char currentChord[24] = "Ready";
    uint8_t lastPitch = 60;
    uint8_t lastVelocity = 0;
    uint32_t lastNoteTime = 0;

    // Connectivity Status
    bool pcConnected = false;
    bool midiConnected = false;
    char activeMidiPort[32] = "Virtual / None";
    char activeComPort[32] = "SIMULATED";
    uint32_t lastHeartbeatMs = 0;

    // Button & Animation Timers
    uint32_t lastButtonPressMs = 0;
    uint32_t previewTimer = 0;
};
