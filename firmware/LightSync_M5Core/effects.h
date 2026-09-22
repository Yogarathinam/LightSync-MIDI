#pragma once

#define FASTLED_INTERNAL
#include <FastLED.h>
#include "config.h"

#define MAX_PARTICLES 48
#define MAX_ACTIVE_NOTES 16

struct Particle {
    bool active = false;
    EffectType type = EFFECT_BOUNCE;
    float pos = 0.0f;
    float vel = 0.0f;
    float radius = 0.0f;
    float maxRadius = 24.0f;
    float speed = 1.0f;
    float life = 1.0f;
    float phase = 0.0f;
    float thickness = 2.0f;
    float spread = 3.0f;
    CRGB color = CRGB::Cyan;
};

struct ActiveNote {
    bool active = false;
    uint8_t pitch = 0;
    uint8_t velocity = 0;
    int16_t centerLed = 0;
    uint32_t startTime = 0;
};

class EffectEngine {
public:
    CRGB leds[MAX_LED_COUNT];
    Particle particles[MAX_PARTICLES];
    ActiveNote activeNotes[MAX_ACTIVE_NOTES];
    DeviceConfig& config;
    uint32_t lastUpdateMs = 0;
    uint16_t currentFps = 60;
    uint32_t frameCount = 0;
    uint32_t fpsTimer = 0;
    uint8_t previewStep = 0;

    EffectEngine(DeviceConfig& cfg) : config(cfg) {}

    void init() {
        FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, MAX_LED_COUNT);
        FastLED.setBrightness(config.brightness);
        clearAll();
        lastUpdateMs = millis();
        fpsTimer = millis();
    }

    void clearAll() {
        fill_solid(leds, MAX_LED_COUNT, CRGB::Black);
        for (int i = 0; i < MAX_PARTICLES; i++) particles[i].active = false;
        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) activeNotes[i].active = false;
        FastLED.show();
    }

    int16_t mapPitchToLed(uint8_t pitch) {
        int startMidi = 36;
        if (config.keyCount == 25) startMidi = 48;       // C3
        else if (config.keyCount == 49) startMidi = 36;  // C2
        else if (config.keyCount == 61) startMidi = 36;  // C2
        else if (config.keyCount == 88) startMidi = 21;  // A0

        int keyIndex = pitch - startMidi;
        if (keyIndex < 0) keyIndex = 0;
        if (keyIndex >= config.keyCount) keyIndex = config.keyCount - 1;

        float norm = (float)keyIndex / (float)(config.keyCount - 1);
        int16_t led = (int16_t)(norm * (config.ledCount - 1));
        return constrain(led, 0, config.ledCount - 1);
    }

    CRGB getNoteColor(uint8_t pitch, int16_t centerLed) {
        if (config.rainbow) {
            uint8_t hue = map(centerLed, 0, config.ledCount - 1, 0, 255);
            return CHSV(hue, 240, 255);
        }
        // Alternating pitch color gradient between primary and secondary
        if ((pitch % 2) != 0 && (config.secondaryR != 0 || config.secondaryG != 0 || config.secondaryB != 0)) {
            return CRGB(config.secondaryR, config.secondaryG, config.secondaryB);
        }
        return CRGB(config.primaryR, config.primaryG, config.primaryB);
    }

    void onNoteOn(uint8_t pitch, uint8_t velocity) {
        int16_t centerLed = mapPitchToLed(pitch);
        CRGB col = getNoteColor(pitch, centerLed);

        config.lastPitch = pitch;
        config.lastVelocity = velocity;
        config.lastNoteTime = millis();

        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) {
            if (!activeNotes[i].active) {
                activeNotes[i].active = true;
                activeNotes[i].pitch = pitch;
                activeNotes[i].velocity = velocity;
                activeNotes[i].centerLed = centerLed;
                activeNotes[i].startTime = millis();
                break;
            }
        }

        spawnEffect(config.currentEffect, centerLed, col, velocity);
    }

    void onNoteOff(uint8_t pitch) {
        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) {
            if (activeNotes[i].active && activeNotes[i].pitch == pitch) {
                activeNotes[i].active = false;
                break;
            }
        }
    }

    void triggerEffectPreview(EffectType eff) {
        // Generates an automated musical demo trigger for live previewing
        previewStep = (previewStep + 1) % 4;
        int16_t positions[] = {
            (int16_t)(config.ledCount * 0.25f),
            (int16_t)(config.ledCount * 0.50f),
            (int16_t)(config.ledCount * 0.75f),
            (int16_t)(config.ledCount * 0.40f)
        };
        int16_t centerLed = positions[previewStep];
        CRGB col = getNoteColor(60 + previewStep * 4, centerLed);
        spawnEffect(eff, centerLed, col, 100);
    }

    void playArpeggioDemo() {
        // C Major Arpeggio: C4(60), E4(64), G4(67), C5(72)
        uint8_t notes[] = {60, 64, 67, 72};
        for (int i = 0; i < 4; i++) {
            onNoteOn(notes[i], 100);
        }
        strncpy(config.currentChord, "C Major", sizeof(config.currentChord));
    }

    void spawnEffect(EffectType type, int16_t centerLed, CRGB col, uint8_t velocity) {
        float velNorm = constrain(velocity / 127.0f, 0.3f, 1.0f);

        switch (type) {
            case EFFECT_BOUNCE: {
                int pIdx = allocateParticle();
                if (pIdx >= 0) {
                    particles[pIdx].active = true;
                    particles[pIdx].type = EFFECT_BOUNCE;
                    particles[pIdx].pos = centerLed;
                    particles[pIdx].vel = ((random(0, 200) - 100) / 100.0f) * 2.8f * config.speed * velNorm;
                    if (abs(particles[pIdx].vel) < 0.6f) {
                        particles[pIdx].vel = (particles[pIdx].vel >= 0 ? 1.2f : -1.2f) * config.speed;
                    }
                    particles[pIdx].color = col;
                    particles[pIdx].life = 1.0f;
                    particles[pIdx].spread = config.spread;
                }
                break;
            }

            case EFFECT_RIPPLE: {
                int pIdx = allocateParticle();
                if (pIdx >= 0) {
                    particles[pIdx].active = true;
                    particles[pIdx].type = EFFECT_RIPPLE;
                    particles[pIdx].pos = centerLed;
                    particles[pIdx].radius = 0.0f;
                    particles[pIdx].speed = config.speed * 2.4f;
                    particles[pIdx].color = col;
                    particles[pIdx].life = 1.0f;
                    particles[pIdx].thickness = max(1.5f, config.spread * 0.7f);
                }
                break;
            }

            case EFFECT_PULSE: {
                int pIdx = allocateParticle();
                if (pIdx >= 0) {
                    particles[pIdx].active = true;
                    particles[pIdx].type = EFFECT_PULSE;
                    particles[pIdx].pos = centerLed;
                    particles[pIdx].radius = 0.0f;
                    particles[pIdx].maxRadius = config.spread * 8.5f * velNorm;
                    particles[pIdx].speed = config.speed * 0.9f;
                    particles[pIdx].color = col;
                    particles[pIdx].life = 1.0f;
                    particles[pIdx].phase = 0.0f;
                }
                break;
            }

            case EFFECT_HOLD_BEAM: {
                int pIdx = allocateParticle();
                if (pIdx >= 0) {
                    particles[pIdx].active = true;
                    particles[pIdx].type = EFFECT_HOLD_BEAM;
                    particles[pIdx].pos = centerLed;
                    particles[pIdx].color = col;
                    particles[pIdx].life = 1.0f;
                    particles[pIdx].spread = config.spread * 1.6f;
                }
                break;
            }

            case EFFECT_GLITCH: {
                for (int i = 0; i < 5; i++) {
                    int pIdx = allocateParticle();
                    if (pIdx >= 0) {
                        float offset = ((random(0, 200) - 100) / 100.0f) * config.spread * 5.5f;
                        particles[pIdx].active = true;
                        particles[pIdx].type = EFFECT_GLITCH;
                        particles[pIdx].pos = constrain(centerLed + offset, 0, config.ledCount - 1);
                        particles[pIdx].color = (random(0, 2) == 0) ? col : CRGB(config.secondaryR, config.secondaryG, config.secondaryB);
                        particles[pIdx].life = 0.35f + (random(0, 45) / 100.0f);
                    }
                }
                break;
            }

            case EFFECT_SPARK: {
                for (int i = 0; i < 7; i++) {
                    int pIdx = allocateParticle();
                    if (pIdx >= 0) {
                        particles[pIdx].active = true;
                        particles[pIdx].type = EFFECT_SPARK;
                        particles[pIdx].pos = centerLed;
                        particles[pIdx].vel = ((random(0, 200) - 100) / 100.0f) * 4.8f * config.speed * velNorm;
                        particles[pIdx].color = col;
                        particles[pIdx].life = 1.0f;
                        particles[pIdx].spread = config.spread * 0.6f;
                    }
                }
                break;
            }

            case EFFECT_SPRINKLE: {
                for (int i = 0; i < 9; i++) {
                    int pIdx = allocateParticle();
                    if (pIdx >= 0) {
                        float offset = ((random(0, 200) - 100) / 100.0f) * config.spread * 4.5f;
                        particles[pIdx].active = true;
                        particles[pIdx].type = EFFECT_SPRINKLE;
                        particles[pIdx].pos = constrain(centerLed + offset, 0, config.ledCount - 1);
                        particles[pIdx].color = col;
                        particles[pIdx].life = 0.75f + (random(0, 50) / 100.0f);
                    }
                }
                break;
            }

            case EFFECT_RAIN: {
                int pIdx = allocateParticle();
                if (pIdx >= 0) {
                    particles[pIdx].active = true;
                    particles[pIdx].type = EFFECT_RAIN;
                    particles[pIdx].pos = centerLed;
                    particles[pIdx].vel = (random(0, 2) == 0 ? 1.0f : -1.0f) * config.speed * 2.0f;
                    particles[pIdx].color = col;
                    particles[pIdx].life = 1.0f;
                    particles[pIdx].spread = config.spread * 3.2f;
                }
                break;
            }

            case EFFECT_WAVE: {
                int pIdx = allocateParticle();
                if (pIdx >= 0) {
                    particles[pIdx].active = true;
                    particles[pIdx].type = EFFECT_WAVE;
                    particles[pIdx].pos = centerLed;
                    particles[pIdx].phase = 0.0f;
                    particles[pIdx].speed = config.speed * 0.25f;
                    particles[pIdx].color = col;
                    particles[pIdx].life = 1.0f;
                    particles[pIdx].spread = config.spread * 4.5f;
                }
                break;
            }
            default: break;
        }
    }

    int allocateParticle() {
        for (int i = 0; i < MAX_PARTICLES; i++) {
            if (!particles[i].active) return i;
        }
        return -1;
    }

    void addSpreadLuminance(float centerPos, float spread, CRGB color, float factor) {
        if (factor <= 0.001f) return;
        float brtFactor = (config.brightness / 255.0f) * factor;

        int minLed = max(0, (int)floor(centerPos - spread * 2.2f));
        int maxLed = min((int)config.ledCount - 1, (int)ceil(centerPos + spread * 2.2f));

        for (int i = minLed; i <= maxLed; i++) {
            float dist = abs(i - centerPos);
            float falloff = expf(-(dist * dist) / (2.0f * spread * spread));
            float intensity = falloff * brtFactor;

            if (intensity > 0.01f) {
                leds[i].r = qadd8(leds[i].r, (uint8_t)(color.r * intensity));
                leds[i].g = qadd8(leds[i].g, (uint8_t)(color.g * intensity));
                leds[i].b = qadd8(leds[i].b, (uint8_t)(color.b * intensity));
            }
        }
    }

    void update() {
        uint32_t now = millis();
        float dt = (now - lastUpdateMs) / 1000.0f;
        if (dt > 0.05f) dt = 0.05f;
        lastUpdateMs = now;

        frameCount++;
        if (now - fpsTimer >= 1000) {
            currentFps = frameCount;
            frameCount = 0;
            fpsTimer = now;
        }

        uint8_t fadeAmt = (uint8_t)((1.0f - config.decay) * 255.0f);
        fadeToBlackBy(leds, config.ledCount, max((uint8_t)12, fadeAmt));

        // 1. Process held notes
        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) {
            if (activeNotes[i].active) {
                CRGB col = getNoteColor(activeNotes[i].pitch, activeNotes[i].centerLed);
                addSpreadLuminance(activeNotes[i].centerLed, config.spread * 1.2f, col, 1.0f);

                if (config.currentEffect == EFFECT_HOLD_BEAM) {
                    CRGB secCol = CRGB(config.secondaryR, config.secondaryG, config.secondaryB);
                    addSpreadLuminance(activeNotes[i].centerLed, config.spread * 2.6f, secCol, 0.65f);
                }
            }
        }

        // 2. Process active particles
        for (int i = 0; i < MAX_PARTICLES; i++) {
            if (!particles[i].active) continue;

            Particle& p = particles[i];

            switch (p.type) {
                case EFFECT_BOUNCE:
                    p.pos += p.vel;
                    if (p.pos <= 0 || p.pos >= config.ledCount - 1) {
                        p.vel *= -0.88f;
                        p.pos = constrain(p.pos, 0.0f, (float)(config.ledCount - 1));
                    }
                    p.life *= (config.decay + 0.015f);
                    addSpreadLuminance(p.pos, p.spread, p.color, p.life);
                    break;

                case EFFECT_RIPPLE: {
                    p.radius += p.speed * 0.85f;
                    p.life -= (1.0f - config.decay) * 0.35f;

                    for (int idx = 0; idx < config.ledCount; idx++) {
                        float dist = abs(idx - p.pos);
                        float distFromRing = abs(dist - p.radius);
                        if (distFromRing < p.thickness) {
                            float ringIntensity = cosf((distFromRing / p.thickness) * (3.14159f / 2.0f)) * p.life;
                            if (ringIntensity > 0) {
                                addSpreadLuminance(idx, 0.8f, p.color, ringIntensity);
                            }
                        }
                    }
                    if (p.pos - p.radius < 0 && p.pos + p.radius >= config.ledCount) p.life = 0;
                    break;
                }

                case EFFECT_PULSE: {
                    p.radius += p.speed * 0.55f;
                    p.phase += p.speed * 0.16f;
                    p.life -= (1.0f - config.decay) * 0.25f;

                    float pulseBreath = (sinf(p.phase * 6.28318f) * 0.5f + 0.5f) * p.life;
                    for (int idx = 0; idx < config.ledCount; idx++) {
                        float dist = abs(idx - p.pos);
                        if (dist <= p.radius) {
                            float innerIntensity = (1.0f - (dist / p.radius)) * pulseBreath;
                            addSpreadLuminance(idx, config.spread, p.color, innerIntensity);
                        }
                    }
                    if (p.radius >= p.maxRadius) p.life = 0;
                    break;
                }

                case EFFECT_HOLD_BEAM:
                    p.life -= 0.05f;
                    addSpreadLuminance(p.pos, p.spread, p.color, p.life * 1.5f);
                    break;

                case EFFECT_GLITCH:
                    p.life -= 0.04f;
                    if (random(0, 100) > 25) {
                        addSpreadLuminance(p.pos, 0.7f, p.color, p.life);
                    }
                    break;

                case EFFECT_SPARK:
                    p.pos += p.vel;
                    p.life -= 0.03f * (2.0f - config.decay);
                    addSpreadLuminance(p.pos, p.spread, p.color, max(0.0f, p.life));
                    break;

                case EFFECT_SPRINKLE: {
                    p.life -= 0.03f;
                    float sparkleIntensity = sinf(p.life * 3.14159f) * (random(50, 100) / 100.0f);
                    addSpreadLuminance(p.pos, 0.8f, p.color, max(0.0f, sparkleIntensity));
                    break;
                }

                case EFFECT_RAIN: {
                    p.pos += p.vel;
                    p.life -= 0.02f * (2.0f - config.decay);
                    int dir = (p.vel >= 0) ? 1 : -1;
                    for (int t = 0; t < (int)p.spread; t++) {
                        int tailPos = (int)(p.pos - (dir * t));
                        if (tailPos >= 0 && tailPos < config.ledCount) {
                            float tailFactor = (1.0f - (float)t / p.spread) * p.life;
                            addSpreadLuminance(tailPos, 0.8f, p.color, tailFactor);
                        }
                    }
                    if (p.pos < 0 || p.pos >= config.ledCount) p.life = 0;
                    break;
                }

                case EFFECT_WAVE: {
                    p.phase += p.speed;
                    p.life -= 0.015f;
                    for (int idx = 0; idx < config.ledCount; idx++) {
                        float dist = abs(idx - p.pos);
                        if (dist <= p.spread * 2.0f) {
                            float waveVal = sinf(dist * 0.5f - p.phase) * 0.5f + 0.5f;
                            addSpreadLuminance(idx, 1.0f, p.color, waveVal * p.life);
                        }
                    }
                    break;
                }
                default: break;
            }

            if (p.life <= 0.02f) {
                p.active = false;
            }
        }

        FastLED.show();
    }
};
