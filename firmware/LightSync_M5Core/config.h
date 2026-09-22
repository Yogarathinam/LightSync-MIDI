#pragma once

#include <Arduino.h>

// ==========================================
// LightSync M5Stack Core Hardware Configuration
// ==========================================

// WS2812B Data Pin (Pin 21 on M5Stack Core bottom header)
#define LED_DATA_PIN 21

// Default LED strip configuration
#define DEFAULT_LED_COUNT 144
#define MAX_LED_COUNT 300

// Serial Communication
#define SERIAL_BAUD_RATE 115200
#define SERIAL_RX_BUFFER_SIZE 256

// Default Effect Parameters
#define DEFAULT_BRIGHTNESS 180
#define DEFAULT_SPEED 1.2f
#define DEFAULT_DECAY 0.85f
#define DEFAULT_SPREAD 3.0f

// Color Defaults (Cyan)
#define DEFAULT_COLOR_R 0
#define DEFAULT_COLOR_G 240
#define DEFAULT_COLOR_B 255

// Effect Types Enum
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

// Runtime configuration state
struct DeviceConfig {
    EffectType currentEffect = EFFECT_BOUNCE;
    float speed = DEFAULT_SPEED;
    float decay = DEFAULT_DECAY;
    float spread = DEFAULT_SPREAD;
    uint8_t brightness = DEFAULT_BRIGHTNESS;
    bool rainbow = false;
    uint8_t primaryR = DEFAULT_COLOR_R;
    uint8_t primaryG = DEFAULT_COLOR_G;
    uint8_t primaryB = DEFAULT_COLOR_B;
    uint8_t secondaryR = 255;
    uint8_t secondaryG = 0;
    uint8_t secondaryB = 127;
    uint16_t ledCount = DEFAULT_LED_COUNT;
    uint8_t keyCount = 61;
    bool pcConnected = false;
    bool midiConnected = false;
    char activeMidiPort[32] = "Virtual / None";
    char activeComPort[32] = "SIMULATED";
    uint32_t lastHeartbeatMs = 0;
};

