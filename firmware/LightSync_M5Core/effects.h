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
    uint32_t durationMs = 0; // 0 = hold until explicit NoteOff; >0 = auto-release after duration
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

    void onNoteOn(uint8_t pitch, uint8_t velocity, uint32_t durationMs = 0) {
        int16_t centerLed = mapPitchToLed(pitch);
        CRGB col = getNoteColor(pitch, centerLed);

        config.lastPitch = pitch;
        config.lastVelocity = velocity;
        config.lastNoteTime = millis();

        // Find existing slot for this pitch or allocate empty slot
        int slot = -1;
        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) {
            if (activeNotes[i].active && activeNotes[i].pitch == pitch) {
                slot = i;
                break;
            }
        }
        if (slot == -1) {
            for (int i = 0; i < MAX_ACTIVE_NOTES; i++) {
                if (!activeNotes[i].active) {
                    slot = i;
                    break;
                }
            }
        }

        if (slot >= 0) {
            activeNotes[slot].active = true;
            activeNotes[slot].pitch = pitch;
            activeNotes[slot].velocity = velocity;
            activeNotes[slot].centerLed = centerLed;
            activeNotes[slot].startTime = millis();
            activeNotes[slot].durationMs = durationMs;
        }

        // Only spawn particle effects for dynamic animations;
        // For EFFECT_STATIC, the LED is held solidly by activeNotes until key release!
        if (config.currentEffect != EFFECT_STATIC) {
            spawnEffect(config.currentEffect, centerLed, col, velocity);
        }
    }

    void onNoteOff(uint8_t pitch) {
        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) {
            if (activeNotes[i].active && activeNotes[i].pitch == pitch) {
                activeNotes[i].active = false;
                // When key is released in EFFECT_STATIC, trigger smooth release fade for the single LED
                if (config.currentEffect == EFFECT_STATIC) {
                    int pIdx = allocateParticle();
                    if (pIdx >= 0) {
                        particles[pIdx].active = true;
                        particles[pIdx].type = EFFECT_STATIC;
                        particles[pIdx].pos = activeNotes[i].centerLed;
                        particles[pIdx].color = getNoteColor(pitch, activeNotes[i].centerLed);
                        particles[pIdx].life = 1.0f;
                        particles[pIdx].spread = 0.0f; // strictly one LED only!
                    }
                }
                break;
            }
        }
    }

    void triggerEffectPreview(EffectType eff) {
        // Generates an automated musical demo trigger for live previewing
        previewStep = (previewStep + 1) % 4;
        uint8_t previewPitch = 60 + previewStep * 4;
        int16_t centerLed = mapPitchToLed(previewPitch);
        CRGB col = getNoteColor(previewPitch, centerLed);
        if (eff == EFFECT_STATIC) {
            onNoteOn(previewPitch, 100, 360);
        } else {
            spawnEffect(eff, centerLed, col, 100);
        }
    }

    uint16_t pitchToFreq(uint8_t pitch) {
        if (pitch < 21 || pitch > 108) return 440;
        return (uint16_t)(440.0f * powf(2.0f, (pitch - 69.0f) / 12.0f));
    }

    void toggleDemo() {
        config.demoActive = !config.demoActive;
        if (config.demoActive) {
            config.lastDemoStepMs = 0;
            config.nextDemoIntervalMs = 120;
            Serial.println("EVENT DEMO_STARTED");
        } else {
            stopDemo();
            Serial.println("EVENT DEMO_STOPPED");
        }
    }

    void stopDemo() {
        config.demoActive = false;
        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) activeNotes[i].active = false;
        strncpy(config.currentChord, "Ready", sizeof(config.currentChord));
        FastLED.show();
    }

    void updateRandomDemo(uint32_t now) {
        if (!config.demoActive) return;

        if (now - config.lastDemoStepMs < config.nextDemoIntervalMs) {
            return;
        }
        config.lastDemoStepMs = now;
        config.nextDemoIntervalMs = random(180, 360);

        // Musical Pentatonic & Diatonic scale intervals
        const uint8_t scaleIntervals[] = {0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36};
        const int numIntervals = sizeof(scaleIntervals) / sizeof(scaleIntervals[0]);

        // Base MIDI root depending on keyboard size
        uint8_t baseRoot = 48; // C3 default
        if (config.keyCount == 25) baseRoot = 48;       // C3
        else if (config.keyCount == 49) baseRoot = 36;  // C2
        else if (config.keyCount == 61) baseRoot = 36;  // C2
        else if (config.keyCount == 88) baseRoot = 33;  // A1

        // Pick a random melodic note
        uint8_t noteOffset = scaleIntervals[random(0, numIntervals)];
        uint8_t pitch = baseRoot + noteOffset;
        uint8_t vel = random(85, 120);
        uint32_t noteDur = random(200, 380);

        // Random harmonic chords displayed on UI
        const char* demoChords[] = {
            "C Major", "Am7", "Fmaj7", "G7", "Em7", "Dm7", "Cadd9", "F#dim", "Bb", "A Major"
        };
        if (random(0, 3) == 0) {
            strncpy(config.currentChord, demoChords[random(0, 10)], sizeof(config.currentChord));
        }

        // Trigger note with auto-release duration!
        onNoteOn(pitch, vel, noteDur);

        // Sound tone if enabled
        if (config.soundEnabled && M5.Speaker.isEnabled()) {
            M5.Speaker.tone(pitchToFreq(pitch), min((uint32_t)70, noteDur / 3));
        }

        // Send note event to PC / Web UI
        Serial.printf("EVENT NOTE_ON %d %d\n", pitch, vel);
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

            case EFFECT_STATIC: {
                // EFFECT_STATIC note holding is directly maintained by activeNotes.
                // No decaying particle is spawned on note-on.
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
        float brtFactor = factor;

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

        // Process random melodic demo if active
        if (config.demoActive) {
            updateRandomDemo(now);
        }

        frameCount++;
        if (now - fpsTimer >= 1000) {
            currentFps = frameCount;
            frameCount = 0;
            fpsTimer = now;
        }

        uint8_t fadeAmt = (uint8_t)((1.0f - config.decay) * 255.0f);
        fadeToBlackBy(leds, config.ledCount, max((uint8_t)12, fadeAmt));

        // 1. Process held notes with auto-release duration
        for (int i = 0; i < MAX_ACTIVE_NOTES; i++) {
            if (activeNotes[i].active) {
                // Auto-expire note if duration has elapsed (e.g. from demo mode)
                // or fail-safe timeout of 60 seconds (prevents permanently stuck notes)
                if ((activeNotes[i].durationMs > 0 && (now - activeNotes[i].startTime >= activeNotes[i].durationMs)) ||
                    (now - activeNotes[i].startTime > 60000)) {
                    activeNotes[i].active = false;
                    if (config.currentEffect == EFFECT_STATIC) {
                        int pIdx = allocateParticle();
                        if (pIdx >= 0) {
                            particles[pIdx].active = true;
                            particles[pIdx].type = EFFECT_STATIC;
                            particles[pIdx].pos = activeNotes[i].centerLed;
                            particles[pIdx].color = getNoteColor(activeNotes[i].pitch, activeNotes[i].centerLed);
                            particles[pIdx].life = 1.0f;
                            particles[pIdx].spread = 0.0f;
                        }
                    }
                    continue;
                }

                // STATIC KEY LIGHT: Solid single-LED illumination held continuously until key release!
                if (config.currentEffect == EFFECT_STATIC) {
                    CRGB col = getNoteColor(activeNotes[i].pitch, activeNotes[i].centerLed);
                    int16_t ledIdx = activeNotes[i].centerLed;
                    if (ledIdx >= 0 && ledIdx < (int16_t)config.ledCount) {
                        leds[ledIdx] = col; // Direct full CRGB; FastLED master brightness handles overall dimming cleanly.
                    }
                }
                else if (config.currentEffect == EFFECT_HOLD_BEAM) {
                    CRGB col = getNoteColor(activeNotes[i].pitch, activeNotes[i].centerLed);
                    addSpreadLuminance(activeNotes[i].centerLed, config.spread * 1.2f, col, 1.0f);
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

                case EFFECT_STATIC: {
                    // Smooth quadratic fade on release for ONLY THE ONE LED
                    p.life -= dt * (2.2f * config.speed);
                    if (p.life > 0.0f) {
                        float fadeCurve = p.life * p.life;
                        int16_t ledIdx = (int16_t)roundf(p.pos);
                        if (ledIdx >= 0 && ledIdx < (int16_t)config.ledCount) {
                            leds[ledIdx].r = qadd8(leds[ledIdx].r, (uint8_t)(p.color.r * fadeCurve));
                            leds[ledIdx].g = qadd8(leds[ledIdx].g, (uint8_t)(p.color.g * fadeCurve));
                            leds[ledIdx].b = qadd8(leds[ledIdx].b, (uint8_t)(p.color.b * fadeCurve));
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
