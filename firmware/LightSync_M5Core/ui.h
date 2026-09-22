#pragma once

#include <M5Unified.h>
#include "config.h"
#include "protocol.h"
#include "effects.h"

class DeviceUI {
public:
    DeviceConfig& config;
    uint32_t lastDrawMs = 0;
    uint32_t lastVisualizerDrawMs = 0;
    bool needsFullRedraw = true;

    // Track previous values to only update changed regions (prevents flickering)
    EffectType lastDrawnEffect = (EffectType)-1;
    ColorPresetId lastDrawnPreset = (ColorPresetId)-1;
    uint8_t lastDrawnBrightness = 0;
    bool lastDrawnPcConnected = false;
    char lastDrawnChord[24] = "";

    DeviceUI(DeviceConfig& cfg) : config(cfg) {}

    void init() {
        M5.Display.setRotation(1); // Landscape 320x240
        M5.Display.fillScreen(TFT_BLACK);
        needsFullRedraw = true;
        drawStaticLayout();
        drawDynamicWidgets(true);
    }

    void requestRedraw() {
        needsFullRedraw = true;
    }

    void update(EffectEngine& engine) {
        // Handle M5 Physical Buttons & Touch Zones
        // Button A: Click -> Next Effect | Hold -> Next Color Sync Preset
        if (M5.BtnA.wasClicked() || M5.BtnA.wasPressed()) {
            int nextEff = ((int)config.currentEffect + 1) % EFFECT_COUNT;
            config.currentEffect = (EffectType)nextEff;
            engine.clearAll();
            needsFullRedraw = true;
            Serial.printf("EVENT EFFECT_CHANGED %s\n", CommandProtocol::getEffectName(config.currentEffect));
            if (M5.Speaker.isEnabled()) M5.Speaker.tone(1200, 30);
        } else if (M5.BtnA.wasHold()) {
            int nextPreset = ((int)config.currentPreset + 1) % PRESET_COUNT;
            CommandProtocol::applyPreset((ColorPresetId)nextPreset, config);
            engine.clearAll();
            needsFullRedraw = true;
            Serial.printf("EVENT PRESET_CHANGED %s\n", CommandProtocol::getPresetName(config.currentPreset));
            if (M5.Speaker.isEnabled()) M5.Speaker.tone(1600, 60);
        }

        // Button B: Step Brightness
        if (M5.BtnB.wasClicked() || M5.BtnB.wasPressed()) {
            if (config.brightness >= 240) config.brightness = 50;
            else if (config.brightness < 100) config.brightness = 100;
            else if (config.brightness < 160) config.brightness = 160;
            else if (config.brightness < 220) config.brightness = 220;
            else config.brightness = 255;

            FastLED.setBrightness(config.brightness);
            needsFullRedraw = true;
            Serial.printf("EVENT BRIGHTNESS_CHANGED %d\n", config.brightness);
            if (M5.Speaker.isEnabled()) M5.Speaker.tone(1000, 30);
        }

        // Button C: Test Arpeggio / Note Demo
        if (M5.BtnC.wasClicked() || M5.BtnC.wasPressed()) {
            engine.playArpeggioDemo();
            needsFullRedraw = true;
            Serial.println("EVENT TEST_ARPEGGIO_TRIGGERED");
            if (M5.Speaker.isEnabled()) {
                M5.Speaker.tone(523, 60); // C5
            }
        }

        uint32_t now = millis();

        // 1. High-rate Live LED Visualizer update (~30 FPS)
        if (now - lastVisualizerDrawMs >= 33) {
            drawLiveVisualizer(engine);
            lastVisualizerDrawMs = now;
        }

        // 2. State & Parameter refresh (~5 to 10 FPS or when requested)
        if (needsFullRedraw || (now - lastDrawMs >= 150)) {
            if (needsFullRedraw) {
                drawStaticLayout();
                drawDynamicWidgets(true);
                needsFullRedraw = false;
            } else {
                drawDynamicWidgets(false);
            }
            lastDrawMs = now;
        }
    }

    void drawStaticLayout() {
        M5.Display.fillScreen(0x0841); // Very dark slate / black background

        // ==========================================
        // 1. Top Header Bar (Y: 0 to 28)
        // ==========================================
        M5.Display.fillRect(0, 0, 320, 28, 0x0926); // Dark Navy Accent
        M5.Display.drawFastHLine(0, 28, 320, 0x0410); // Subtle border

        // Brand Title
        M5.Display.setTextSize(2);
        M5.Display.setTextColor(0x07FF, 0x0926); // Cyan
        M5.Display.drawString("LIGHTSYNC", 10, 6);

        // Version & Team XLR8 Badge
        M5.Display.setTextSize(1);
        M5.Display.fillRoundRect(128, 6, 68, 16, 4, 0xFD20); // Gold / Orange
        M5.Display.setTextColor(TFT_BLACK, 0xFD20);
        M5.Display.drawString("Team XLR8", 133, 10);

        // ==========================================
        // 2. Live Optical Strip Container (Y: 34 to 62)
        // ==========================================
        M5.Display.fillRoundRect(8, 34, 304, 28, 6, 0x10A2); // Container background
        M5.Display.drawRoundRect(8, 34, 304, 28, 6, 0x2124);

        M5.Display.setTextSize(1);
        M5.Display.setTextColor(0x6CDF, 0x10A2); // Light cyan
        M5.Display.drawString("LIVE OPTICAL STRIP SIMULATION (Pin 21)", 16, 37);

        // ==========================================
        // 3. Center Deck Containers (Y: 66 to 184)
        // ==========================================
        // Left Card: Effect & Color Preset (W: 148, H: 118)
        M5.Display.fillRoundRect(8, 66, 148, 118, 6, 0x10A2);
        M5.Display.drawRoundRect(8, 66, 148, 118, 6, 0x2124);

        // Right Card: Harmonic & Performance (W: 148, H: 118)
        M5.Display.fillRoundRect(164, 66, 148, 118, 6, 0x10A2);
        M5.Display.drawRoundRect(164, 66, 148, 118, 6, 0x2124);

        // ==========================================
        // 4. Bottom Button Legend (Y: 190 to 240)
        // ==========================================
        // Button A Zone
        M5.Display.fillRoundRect(8, 192, 96, 42, 6, 0x18C3);
        M5.Display.drawRoundRect(8, 192, 96, 42, 6, 0x3186);
        M5.Display.setTextSize(1);
        M5.Display.setTextColor(0x07FF, 0x18C3); // Cyan
        M5.Display.drawString("[A] EFFECT", 20, 198);
        M5.Display.setTextColor(TFT_LIGHTGREY, 0x18C3);
        M5.Display.drawString("Hold: Preset", 18, 214);

        // Button B Zone
        M5.Display.fillRoundRect(112, 192, 96, 42, 6, 0x18C3);
        M5.Display.drawRoundRect(112, 192, 96, 42, 6, 0x3186);
        M5.Display.setTextColor(0xFD20, 0x18C3); // Orange
        M5.Display.drawString("[B] BRIGHT", 124, 198);
        M5.Display.setTextColor(TFT_LIGHTGREY, 0x18C3);
        M5.Display.drawString("Step 50-255", 124, 214);

        // Button C Zone
        M5.Display.fillRoundRect(216, 192, 96, 42, 6, 0x18C3);
        M5.Display.drawRoundRect(216, 192, 96, 42, 6, 0x3186);
        M5.Display.setTextColor(0x07E0, 0x18C3); // Green
        M5.Display.drawString("[C] DEMO", 232, 198);
        M5.Display.setTextColor(TFT_LIGHTGREY, 0x18C3);
        M5.Display.drawString("C-E-G Chord", 228, 214);
    }

    void drawDynamicWidgets(bool force) {
        // 1. Connection Status Pill (Top Right)
        if (force || config.pcConnected != lastDrawnPcConnected) {
            if (config.pcConnected) {
                M5.Display.fillRoundRect(220, 5, 92, 18, 4, 0x0440); // Dark Green
                M5.Display.drawRoundRect(220, 5, 92, 18, 4, 0x07E0); // Bright Green
                M5.Display.setTextColor(0x07E0, 0x0440);
                M5.Display.drawString("* ONLINE", 234, 10);
            } else {
                M5.Display.fillRoundRect(220, 5, 92, 18, 4, 0x4208); // Dark Grey/Amber
                M5.Display.drawRoundRect(220, 5, 92, 18, 4, 0x7BEF);
                M5.Display.setTextColor(0xD69A, 0x4208);
                M5.Display.drawString("STANDALONE", 226, 10);
            }
            lastDrawnPcConnected = config.pcConnected;
        }

        // 2. Left Card: Active Effect & Preset
        if (force || config.currentEffect != lastDrawnEffect || config.currentPreset != lastDrawnPreset) {
            // Clear content area
            M5.Display.fillRect(12, 70, 140, 110, 0x10A2);

            M5.Display.setTextSize(1);
            M5.Display.setTextColor(0x6CDF, 0x10A2); // Sky blue
            M5.Display.drawString("ACTIVE EFFECT", 16, 72);

            // Effect Name in Bold Large Font
            M5.Display.setTextSize(2);
            M5.Display.setTextColor(TFT_WHITE, 0x10A2);
            M5.Display.drawString(CommandProtocol::getEffectName(config.currentEffect), 16, 86);

            // Color Swatch
            uint16_t col1 = M5.Display.color565(config.primaryR, config.primaryG, config.primaryB);
            uint16_t col2 = M5.Display.color565(config.secondaryR, config.secondaryG, config.secondaryB);
            M5.Display.fillRoundRect(16, 114, 28, 14, 3, col1);
            M5.Display.fillRoundRect(48, 114, 28, 14, 3, col2);
            M5.Display.drawRoundRect(16, 114, 60, 14, 3, TFT_WHITE);

            // Preset Name
            M5.Display.setTextSize(1);
            M5.Display.setTextColor(0xF81F, 0x10A2); // Magenta
            M5.Display.drawString("PRESET:", 16, 136);
            M5.Display.setTextColor(TFT_LIGHTGREY, 0x10A2);
            M5.Display.drawString(CommandProtocol::getPresetName(config.currentPreset), 16, 148);

            // Rainbow Flag
            if (config.rainbow) {
                M5.Display.setTextColor(0x07E0, 0x10A2);
                M5.Display.drawString("Dynamic Spectrum", 16, 162);
            } else {
                M5.Display.setTextColor(0x7BEF, 0x10A2);
                char rgbBuf[32];
                snprintf(rgbBuf, sizeof(rgbBuf), "#%02X%02X%02X", config.primaryR, config.primaryG, config.primaryB);
                M5.Display.drawString(rgbBuf, 16, 162);
            }

            lastDrawnEffect = config.currentEffect;
            lastDrawnPreset = config.currentPreset;
        }

        // 3. Right Card: Harmonic Analysis, Live Note & Active Ports
        if (force || strcmp(config.currentChord, lastDrawnChord) != 0) {
            M5.Display.fillRect(168, 70, 140, 110, 0x10A2);

            M5.Display.setTextSize(1);
            M5.Display.setTextColor(0x07E0, 0x10A2); // Emerald Green
            M5.Display.drawString("DETECTED CHORD", 172, 72);

            // Big Chord Title
            M5.Display.setTextSize(2);
            M5.Display.setTextColor(0x07FF, 0x10A2); // Cyan
            const char* chordToShow = strlen(config.currentChord) > 0 ? config.currentChord : "Listening...";
            M5.Display.drawString(chordToShow, 172, 86);

            // Active Note Info
            M5.Display.setTextSize(1);
            M5.Display.setTextColor(TFT_WHITE, 0x10A2);
            char noteBuf[32];
            snprintf(noteBuf, sizeof(noteBuf), "Note: %d  Vel: %d", config.lastPitch, config.lastVelocity);
            M5.Display.drawString(noteBuf, 172, 114);

            // Params Info
            M5.Display.setTextColor(TFT_LIGHTGREY, 0x10A2);
            char p1Buf[32];
            snprintf(p1Buf, sizeof(p1Buf), "Speed: %.2fx Dec: %.2f", config.speed, config.decay);
            M5.Display.drawString(p1Buf, 172, 130);

            char p2Buf[32];
            snprintf(p2Buf, sizeof(p2Buf), "Spread: %.1f Brt: %d", config.spread, config.brightness);
            M5.Display.drawString(p2Buf, 172, 144);

            // Port connection info
            char portBuf[32];
            snprintf(portBuf, sizeof(portBuf), "%s | %s", config.activeComPort, config.activeMidiPort);
            M5.Display.setTextColor(0xFD20, 0x10A2); // Gold / orange
            M5.Display.drawString(portBuf, 172, 158);

            strncpy(lastDrawnChord, config.currentChord, sizeof(lastDrawnChord));
        }
    }

    void drawLiveVisualizer(EffectEngine& engine) {
        // Virtual LED bar: 288 pixels wide, 8 pixels tall at (X: 16, Y: 48)
        int startX = 16;
        int barY = 48;
        int barWidth = 288;
        int barHeight = 8;

        int numLeds = config.ledCount;
        if (numLeds <= 0) numLeds = 144;

        // Downsample engine.leds[] to screen width in chunks
        for (int x = 0; x < barWidth; x++) {
            int ledIdx = (x * numLeds) / barWidth;
            CRGB c = engine.leds[constrain(ledIdx, 0, numLeds - 1)];

            uint16_t color565 = M5.Display.color565(c.r, c.g, c.b);
            M5.Display.drawFastVLine(startX + x, barY, barHeight, color565);
        }
    }
};
