#pragma once

#include <M5Stack.h>
#include "config.h"
#include "protocol.h"

class DeviceUI {
public:
    DeviceConfig& config;
    uint32_t lastDrawMs = 0;
    bool needsFullRedraw = true;

    DeviceUI(DeviceConfig& cfg) : config(cfg) {}

    void init() {
        M5.Lcd.begin();
        M5.Lcd.setRotation(1); // Landscape
        M5.Lcd.fillScreen(TFT_BLACK);
        needsFullRedraw = true;
        drawScreen();
    }

    void requestRedraw() {
        needsFullRedraw = true;
    }

    void update(EffectEngine& engine) {
        // Handle physical buttons
        if (M5.BtnA.wasPressed()) {
            // Cycle Effect
            int nextEff = ((int)config.currentEffect + 1) % EFFECT_COUNT;
            config.currentEffect = (EffectType)nextEff;
            engine.clearAll();
            needsFullRedraw = true;
            Serial.printf("EVENT EFFECT_CHANGED %s\n", CommandProtocol::getEffectName(config.currentEffect));
        }

        if (M5.BtnB.wasPressed()) {
            // Step brightness: 80 -> 140 -> 200 -> 255 -> 40
            if (config.brightness >= 240) config.brightness = 50;
            else config.brightness += 50;
            FastLED.setBrightness(config.brightness);
            needsFullRedraw = true;
            Serial.printf("EVENT BRIGHTNESS_CHANGED %d\n", config.brightness);
        }

        if (M5.BtnC.wasPressed()) {
            // Trigger local test note (Middle C = 60)
            engine.onNoteOn(60, 110);
            needsFullRedraw = true;
        }

        // Periodic non-blocking UI refresh
        uint32_t now = millis();
        if (needsFullRedraw || (now - lastDrawMs > 250)) {
            drawScreen();
            lastDrawMs = now;
            needsFullRedraw = false;
        }
    }

    void drawScreen() {
        // Header Bar
        M5.Lcd.fillRect(0, 0, 320, 32, 0x0A2B); // Dark Cyan / Blue
        M5.Lcd.setTextColor(TFT_WHITE, 0x0A2B);
        M5.Lcd.setTextSize(2);
        M5.Lcd.drawString("LIGHTSYNC", 10, 8);

        // Status Badge
        M5.Lcd.setTextSize(1);
        if (config.pcConnected) {
            M5.Lcd.fillRoundRect(230, 6, 80, 20, 4, 0x03E0); // Green
            M5.Lcd.setTextColor(TFT_WHITE, 0x03E0);
            M5.Lcd.drawString("ONLINE", 248, 11);
        } else {
            M5.Lcd.fillRoundRect(230, 6, 80, 20, 4, 0x7BEF); // Grey
            M5.Lcd.setTextColor(TFT_WHITE, 0x7BEF);
            M5.Lcd.drawString("STANDALONE", 236, 11);
        }

        // Main Panel (Black background)
        M5.Lcd.fillRect(0, 33, 320, 175, TFT_BLACK);

        // Current Effect Display
        M5.Lcd.setTextColor(0x07FF, TFT_BLACK); // Cyan
        M5.Lcd.setTextSize(1);
        M5.Lcd.drawString("ACTIVE EFFECT", 16, 44);

        M5.Lcd.setTextColor(TFT_WHITE, TFT_BLACK);
        M5.Lcd.setTextSize(3);
        M5.Lcd.drawString(CommandProtocol::getEffectName(config.currentEffect), 16, 58);

        // Parameter Grid
        M5.Lcd.setTextSize(2);
        M5.Lcd.setTextColor(0xFD20, TFT_BLACK); // Orange / Amber
        M5.Lcd.drawString("PARAMS", 16, 100);

        M5.Lcd.setTextSize(1);
        M5.Lcd.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
        char buf[64];

        snprintf(buf, sizeof(buf), "Speed: %.2f   Decay: %.2f", config.speed, config.decay);
        M5.Lcd.drawString(buf, 16, 122);

        snprintf(buf, sizeof(buf), "Spread: %.1f  Brightness: %d/255", config.spread, config.brightness);
        M5.Lcd.drawString(buf, 16, 138);

        snprintf(buf, sizeof(buf), "LEDs: %d  (WS2812B @ Pin %d)", config.ledCount, LED_DATA_PIN);
        M5.Lcd.drawString(buf, 16, 154);

        // Button Legend Bar (Bottom)
        M5.Lcd.fillRect(0, 208, 320, 32, 0x18C3); // Dark Grey
        M5.Lcd.setTextColor(TFT_WHITE, 0x18C3);
        M5.Lcd.setTextSize(1);
        M5.Lcd.drawString(" [A] EFFECT ", 25, 218);
        M5.Lcd.drawString(" [B] BRIGHT ", 125, 218);
        M5.Lcd.drawString(" [C] TEST NOTE ", 220, 218);
    }
};
