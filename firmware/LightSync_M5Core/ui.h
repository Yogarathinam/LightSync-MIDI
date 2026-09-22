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
    uint32_t lastPreviewTriggerMs = 0;
    bool needsFullRedraw = true;

    // Track previous values to prevent screen flicker
    ScreenMode lastDrawnScreen = (ScreenMode)-1;
    EffectType lastDrawnEffect = (EffectType)-1;
    ColorPresetId lastDrawnPreset = (ColorPresetId)-1;
    uint8_t lastDrawnBrightness = 0;
    uint8_t lastDrawnKeyCount = 0;
    bool lastDrawnPcConnected = false;
    char lastDrawnChord[24] = "";
    uint8_t lastDrawnMenuEffectIdx = 255;
    uint8_t lastDrawnMenuPresetIdx = 255;
    uint8_t lastDrawnMenuSettingIdx = 255;
    bool lastDrawnDemoActive = false;

    // Debounce timers for each button
    uint32_t btnADebounceTimer = 0;
    uint32_t btnBDebounceTimer = 0;
    uint32_t btnCDebounceTimer = 0;

    DeviceUI(DeviceConfig& cfg) : config(cfg) {}

    void init() {
        M5.Display.setRotation(1); // Landscape 320x240
        M5.Display.fillScreen(TFT_BLACK);
        needsFullRedraw = true;
        drawScreen();
    }

    void requestRedraw() {
        needsFullRedraw = true;
    }

    void update(EffectEngine& engine) {
        uint32_t now = millis();

        // =================================================================
        // 1. Hardware & Software Debounced Button State Machine
        // =================================================================
        // Button A (Left)
        if ((M5.BtnA.wasClicked() || M5.BtnA.wasPressed()) && (now - btnADebounceTimer > BUTTON_DEBOUNCE_MS)) {
            btnADebounceTimer = now;
            handleButtonA(engine);
        }

        // Button B (Center)
        if ((M5.BtnB.wasClicked() || M5.BtnB.wasPressed()) && (now - btnBDebounceTimer > BUTTON_DEBOUNCE_MS)) {
            btnBDebounceTimer = now;
            handleButtonB(engine);
        }

        // Button C (Right)
        if ((M5.BtnC.wasClicked() || M5.BtnC.wasPressed()) && (now - btnCDebounceTimer > BUTTON_DEBOUNCE_MS)) {
            btnCDebounceTimer = now;
            handleButtonC(engine);
        }

        // =================================================================
        // 2. Automated Effect Preview when in Effects Browser
        // =================================================================
        if (config.currentScreen == SCREEN_EFFECTS_MENU) {
            if (now - lastPreviewTriggerMs >= 650) {
                engine.triggerEffectPreview((EffectType)config.menuEffectIndex);
                lastPreviewTriggerMs = now;
            }
        }

        // =================================================================
        // 3. High-Rate Live Visualizer Updates (~30 FPS)
        // =================================================================
        if (now - lastVisualizerDrawMs >= 33) {
            if (config.currentScreen == SCREEN_DASHBOARD || config.currentScreen == SCREEN_EFFECTS_MENU) {
                drawLiveVisualizer(engine, config.currentScreen == SCREEN_DASHBOARD ? 48 : 50);
            }
            lastVisualizerDrawMs = now;
        }

        // =================================================================
        // 4. UI Screen & Telemetry Refresh
        // =================================================================
        if (lastDrawnDemoActive != config.demoActive) {
            needsFullRedraw = true;
            lastDrawnDemoActive = config.demoActive;
        }

        if (needsFullRedraw || (now - lastDrawMs >= 150)) {
            if (needsFullRedraw || lastDrawnScreen != config.currentScreen) {
                drawScreen();
                needsFullRedraw = false;
                lastDrawnScreen = config.currentScreen;
            } else {
                updateDynamicWidgets();
            }
            lastDrawMs = now;
        }
    }

    void playClickChime(uint16_t freq = 1200, uint16_t dur = 30) {
        if (config.soundEnabled && M5.Speaker.isEnabled()) {
            M5.Speaker.tone(freq, dur);
        }
    }

    // =====================================================================
    // Button Logic Per Screen Mode
    // =====================================================================
    void handleButtonA(EffectEngine& engine) {
        playClickChime(1200, 25);

        switch (config.currentScreen) {
            case SCREEN_DASHBOARD:
                // Open Effects Browser
                config.currentScreen = SCREEN_EFFECTS_MENU;
                config.menuEffectIndex = (uint8_t)config.currentEffect;
                needsFullRedraw = true;
                break;

            case SCREEN_EFFECTS_MENU:
                // Next Effect in Browser
                config.menuEffectIndex = (config.menuEffectIndex + 1) % EFFECT_COUNT;
                engine.clearAll();
                engine.triggerEffectPreview((EffectType)config.menuEffectIndex);
                needsFullRedraw = true;
                break;

            case SCREEN_PRESETS_MENU:
                // Next Preset in Browser
                config.menuPresetIndex = (config.menuPresetIndex + 1) % PRESET_COUNT;
                needsFullRedraw = true;
                break;

            case SCREEN_SETTINGS_MENU:
                // Navigate Setting Item (0 to 3)
                config.menuSettingIndex = (config.menuSettingIndex + 1) % 4;
                needsFullRedraw = true;
                break;
        }
    }

    void handleButtonB(EffectEngine& engine) {
        playClickChime(1000, 25);

        switch (config.currentScreen) {
            case SCREEN_DASHBOARD: {
                // Smooth Low to High steps: 15% (38) -> 30% (76) -> 50% (128) -> 70% (178) -> 85% (217) -> 100% (255)
                const uint8_t brightnessLevels[] = {38, 76, 128, 178, 217, 255};
                const int numLevels = 6;
                int nextIdx = 0;
                for (int i = 0; i < numLevels; i++) {
                    if (config.brightness < brightnessLevels[i]) {
                        nextIdx = i;
                        break;
                    }
                }
                if (config.brightness >= brightnessLevels[numLevels - 1]) {
                    nextIdx = 0; // wrap back to 15%
                }
                config.brightness = brightnessLevels[nextIdx];
                FastLED.setBrightness(config.brightness);
                needsFullRedraw = true;
                Serial.printf("EVENT BRIGHTNESS_CHANGED %d\n", config.brightness);
                break;
            }

            case SCREEN_EFFECTS_MENU:
                // Apply Selected Effect and return to Dashboard
                config.currentEffect = (EffectType)config.menuEffectIndex;
                engine.clearAll();
                config.currentScreen = SCREEN_DASHBOARD;
                needsFullRedraw = true;
                Serial.printf("EVENT EFFECT_CHANGED %s\n", CommandProtocol::getEffectName(config.currentEffect));
                playClickChime(1500, 60);
                break;

            case SCREEN_PRESETS_MENU:
                // Apply Selected Color Preset and return to Dashboard
                CommandProtocol::applyPreset((ColorPresetId)config.menuPresetIndex, config);
                engine.clearAll();
                config.currentScreen = SCREEN_DASHBOARD;
                needsFullRedraw = true;
                Serial.printf("EVENT PRESET_CHANGED %s\n", CommandProtocol::getPresetName(config.currentPreset));
                playClickChime(1600, 60);
                break;

            case SCREEN_SETTINGS_MENU:
                // Modify Highlighted Setting
                if (config.menuSettingIndex == 0) {
                    // Cycle Keyboard Size: 25 -> 49 -> 61 -> 88 -> 25
                    CommandProtocol::cycleKeyboardSize(config);
                    Serial.printf("EVENT KEY_COUNT %d\n", config.keyCount);
                } else if (config.menuSettingIndex == 1) {
                    // Cycle Speed: 0.8x -> 1.2x -> 1.6x -> 2.0x -> 0.8x
                    if (config.speed < 1.0f) config.speed = 1.2f;
                    else if (config.speed < 1.4f) config.speed = 1.6f;
                    else if (config.speed < 1.8f) config.speed = 2.0f;
                    else config.speed = 0.8f;
                    Serial.printf("EVENT SPEED_CHANGED %.2f\n", config.speed);
                } else if (config.menuSettingIndex == 2) {
                    // Toggle Sound Chime
                    config.soundEnabled = !config.soundEnabled;
                }
                needsFullRedraw = true;
                break;
        }
    }

    void handleButtonC(EffectEngine& engine) {
        playClickChime(800, 25);

        switch (config.currentScreen) {
            case SCREEN_DASHBOARD:
                // Toggle Random Melodic Keys Demo
                engine.toggleDemo();
                needsFullRedraw = true;
                break;

            case SCREEN_EFFECTS_MENU:
                // Next Menu: Color Presets
                config.currentScreen = SCREEN_PRESETS_MENU;
                config.menuPresetIndex = (uint8_t)config.currentPreset;
                needsFullRedraw = true;
                break;

            case SCREEN_PRESETS_MENU:
                // Next Menu: Settings
                config.currentScreen = SCREEN_SETTINGS_MENU;
                needsFullRedraw = true;
                break;

            case SCREEN_SETTINGS_MENU:
                // Return to Home Dashboard
                config.currentScreen = SCREEN_DASHBOARD;
                needsFullRedraw = true;
                break;
        }
    }

    // =====================================================================
    // Drawing Screens
    // =====================================================================
    void drawScreen() {
        M5.Display.fillScreen(0x0841); // Deep slate/black

        switch (config.currentScreen) {
            case SCREEN_DASHBOARD:
                drawDashboard();
                break;
            case SCREEN_EFFECTS_MENU:
                drawEffectsMenu();
                break;
            case SCREEN_PRESETS_MENU:
                drawPresetsMenu();
                break;
            case SCREEN_SETTINGS_MENU:
                drawSettingsMenu();
                break;
        }
    }

    // --- Screen 0: Live Dashboard ---
    void drawDashboard() {
        // Top Header Bar
        drawHeader("LIGHTSYNC", "DASHBOARD", 0x07FF);

        // Live Optical Strip Container (Y: 34 to 62)
        M5.Display.fillRoundRect(8, 34, 304, 28, 6, 0x10A2);
        M5.Display.drawRoundRect(8, 34, 304, 28, 6, 0x2124);
        M5.Display.setTextSize(1);
        M5.Display.setTextColor(0x6CDF, 0x10A2);
        M5.Display.drawString("OPTICAL STRIP MONITOR", 16, 37);

        // Center Deck: Left Card (Effect & Preset)
        M5.Display.fillRoundRect(8, 66, 148, 118, 6, 0x10A2);
        M5.Display.drawRoundRect(8, 66, 148, 118, 6, 0x2124);

        // Center Deck: Right Card (Harmonic & Ports)
        M5.Display.fillRoundRect(164, 66, 148, 118, 6, 0x10A2);
        M5.Display.drawRoundRect(164, 66, 148, 118, 6, 0x2124);

        // Dynamic content
        updateDynamicWidgets();

        // Bottom Button Legend
        uint8_t brtPct = (uint8_t)((config.brightness * 100 + 127) / 255);
        char brtLegend[16];
        snprintf(brtLegend, sizeof(brtLegend), "Level: %d%%", brtPct);

        if (config.demoActive) {
            drawButtonLegend("[A] MENU", "Browse FX", 0x07FF,
                             "[B] BRIGHT", brtLegend, 0xFD20,
                             "[C] STOP", "Stop Demo", 0xF800);
        } else {
            drawButtonLegend("[A] MENU", "Browse FX", 0x07FF,
                             "[B] BRIGHT", brtLegend, 0xFD20,
                             "[C] DEMO", "Random Keys", 0x07E0);
        }
    }

    // --- Screen 1: Effects Browser with Live Preview ---
    void drawEffectsMenu() {
        char counterBuf[16];
        snprintf(counterBuf, sizeof(counterBuf), "FX [%d/9]", config.menuEffectIndex + 1);
        drawHeader("EFFECTS BROWSER", counterBuf, 0x07FF);

        // Preview Optical Strip Container (Y: 34 to 64)
        M5.Display.fillRoundRect(8, 34, 304, 30, 6, 0x10A2);
        M5.Display.drawRoundRect(8, 34, 304, 30, 6, 0x2124);
        M5.Display.setTextSize(1);
        M5.Display.setTextColor(0x07E0, 0x10A2); // Green
        M5.Display.drawString("* LIVE PREVIEW ANIMATION RUNNING", 16, 37);

        // Big Effect Card (Y: 68 to 184)
        M5.Display.fillRoundRect(8, 68, 304, 116, 6, 0x10A2);
        M5.Display.drawRoundRect(8, 68, 304, 116, 6, 0x07FF); // Cyan border

        // Effect Name
        M5.Display.setTextSize(3);
        M5.Display.setTextColor(TFT_WHITE, 0x10A2);
        EffectType eff = (EffectType)config.menuEffectIndex;
        M5.Display.drawString(CommandProtocol::getEffectName(eff), 18, 76);

        // Effect Description
        M5.Display.setTextSize(1);
        M5.Display.setTextColor(0x6CDF, 0x10A2);
        M5.Display.drawString(CommandProtocol::getEffectDescription(eff), 18, 110);

        // Current Active indicator
        if (config.currentEffect == eff) {
            M5.Display.fillRoundRect(18, 140, 110, 20, 4, 0x03E0);
            M5.Display.setTextColor(TFT_WHITE, 0x03E0);
            M5.Display.drawString("ACTIVE EFFECT", 24, 146);
        } else {
            M5.Display.fillRoundRect(18, 140, 110, 20, 4, 0x2945);
            M5.Display.setTextColor(0xD69A, 0x2945);
            M5.Display.drawString("Click [B] to Apply", 22, 146);
        }

        // Color Swatches on right
        uint16_t col1 = M5.Display.color565(config.primaryR, config.primaryG, config.primaryB);
        uint16_t col2 = M5.Display.color565(config.secondaryR, config.secondaryG, config.secondaryB);
        M5.Display.fillRoundRect(220, 140, 36, 20, 4, col1);
        M5.Display.fillRoundRect(262, 140, 36, 20, 4, col2);
        M5.Display.drawRoundRect(220, 140, 78, 20, 4, TFT_WHITE);

        // Bottom Button Legend
        drawButtonLegend("[A] NEXT FX", "Browse 1-9", 0x07FF,
                         "[B] SELECT", "Apply Effect", 0x07E0,
                         "[C] PRESETS", "Color Schemes", 0xF81F);
    }

    // --- Screen 2: Color Presets Menu ---
    void drawPresetsMenu() {
        char counterBuf[16];
        snprintf(counterBuf, sizeof(counterBuf), "PRESET [%d/7]", config.menuPresetIndex + 1);
        drawHeader("COLOR PRESETS", counterBuf, 0xF81F);

        // Preset Card (Y: 34 to 184)
        M5.Display.fillRoundRect(8, 34, 304, 150, 6, 0x10A2);
        M5.Display.drawRoundRect(8, 34, 304, 150, 6, 0xF81F); // Magenta border

        ColorPresetId pId = (ColorPresetId)config.menuPresetIndex;

        // Big Preset Title
        M5.Display.setTextSize(2);
        M5.Display.setTextColor(TFT_WHITE, 0x10A2);
        M5.Display.drawString(CommandProtocol::getPresetName(pId), 18, 44);

        // Temporary colors for display
        DeviceConfig tempCfg = config;
        CommandProtocol::applyPreset(pId, tempCfg);

        // Large Dual Color Palette Box
        uint16_t c1 = M5.Display.color565(tempCfg.primaryR, tempCfg.primaryG, tempCfg.primaryB);
        uint16_t c2 = M5.Display.color565(tempCfg.secondaryR, tempCfg.secondaryG, tempCfg.secondaryB);
        M5.Display.fillRoundRect(18, 76, 128, 44, 6, c1);
        M5.Display.fillRoundRect(158, 76, 128, 44, 6, c2);
        M5.Display.drawRoundRect(18, 76, 128, 44, 6, TFT_WHITE);
        M5.Display.drawRoundRect(158, 76, 128, 44, 6, TFT_WHITE);

        M5.Display.setTextSize(1);
        M5.Display.setTextColor(TFT_BLACK, c1);
        M5.Display.drawString("PRIMARY", 26, 94);
        M5.Display.setTextColor(TFT_WHITE, c2);
        M5.Display.drawString("SECONDARY", 166, 94);

        // Linked default effect
        M5.Display.setTextColor(0x6CDF, 0x10A2);
        char fxBuf[48];
        snprintf(fxBuf, sizeof(fxBuf), "Default Synced Effect: %s", CommandProtocol::getEffectName(tempCfg.currentEffect));
        M5.Display.drawString(fxBuf, 18, 134);

        // Status
        if (config.currentPreset == pId) {
            M5.Display.setTextColor(0x07E0, 0x10A2);
            M5.Display.drawString("* ACTIVE COLOR PRESET", 18, 154);
        } else {
            M5.Display.setTextColor(0xFD20, 0x10A2);
            M5.Display.drawString("Click [B] to Apply Preset", 18, 154);
        }

        // Bottom Button Legend
        drawButtonLegend("[A] NEXT", "Palette 1-7", 0xF81F,
                         "[B] SELECT", "Apply Preset", 0x07E0,
                         "[C] SETTINGS", "Config & Keys", 0xFD20);
    }

    // --- Screen 3: Settings & Keyboard Layout Menu ---
    void drawSettingsMenu() {
        drawHeader("STUDIO SETTINGS", "CONFIG", 0xFD20);

        // Settings Container (Y: 34 to 184)
        M5.Display.fillRoundRect(8, 34, 304, 150, 6, 0x10A2);
        M5.Display.drawRoundRect(8, 34, 304, 150, 6, 0xFD20);

        int startY = 42;
        int rowH = 26;

        const char* settingLabels[] = {
            "1. Keyboard Size",
            "2. FX Speed",
            "3. Audio Chimes",
            "4. Port Telemetry"
        };

        char valBuf[4][32];
        snprintf(valBuf[0], sizeof(valBuf[0]), "%d Keys", config.keyCount);
        snprintf(valBuf[1], sizeof(valBuf[1]), "%.1fx", config.speed);
        snprintf(valBuf[2], sizeof(valBuf[2]), "%s", config.soundEnabled ? "Enabled" : "Muted");
        if (config.pcConnected) {
            snprintf(valBuf[3], sizeof(valBuf[3]), "%s | %s", config.activeComPort, config.midiConnected ? config.activeMidiPort : "MIDI");
        } else {
            snprintf(valBuf[3], sizeof(valBuf[3]), "%s", config.midiConnected ? config.activeMidiPort : "Standalone Engine");
        }

        for (int i = 0; i < 4; i++) {
            int y = startY + i * rowH;
            bool isSelected = (config.menuSettingIndex == i);

            if (isSelected) {
                M5.Display.fillRoundRect(12, y - 2, 296, 22, 4, 0x2945); // Highlight
                M5.Display.setTextColor(0xFD20, 0x2945);
            } else {
                M5.Display.setTextColor(TFT_WHITE, 0x10A2);
            }

            M5.Display.setTextSize(1);
            M5.Display.drawString(settingLabels[i], 18, y + 2);

            // Value on right
            M5.Display.setTextColor(isSelected ? 0x07FF : 0xD69A, isSelected ? 0x2945 : 0x10A2);
            M5.Display.drawString(valBuf[i], 180, y + 2);
        }

        // Connection telemetry note
        M5.Display.setTextSize(1);
        M5.Display.setTextColor(config.pcConnected ? 0x07E0 : 0xFD20, 0x10A2);
        char connBuf[64];
        snprintf(connBuf, sizeof(connBuf), "System: %s (%d Optical LEDs)",
                 config.pcConnected ? "USB Online (Synchronized)" : "Standalone Optical Engine",
                 config.ledCount);
        M5.Display.drawString(connBuf, 18, 156);

        // Bottom Button Legend
        drawButtonLegend("[A] NEXT ITEM", "Select Row", 0xFD20,
                         "[B] CHANGE", "Toggle Value", 0x07E0,
                         "[C] HOME", "Back to Play", 0x07FF);
    }

    // --- Helpers ---
    void drawHeader(const char* title, const char* badge, uint16_t accentColor) {
        M5.Display.fillRect(0, 0, 320, 28, 0x0926);
        M5.Display.drawFastHLine(0, 28, 320, 0x0410);

        M5.Display.setTextSize(2);
        M5.Display.setTextColor(accentColor, 0x0926);
        M5.Display.drawString(title, 10, 6);

        // Team XLR8 Badge
        M5.Display.setTextSize(1);
        M5.Display.fillRoundRect(160, 6, 64, 16, 4, 0xFD20); // Gold
        M5.Display.setTextColor(TFT_BLACK, 0xFD20);
        M5.Display.drawString("Team XLR8", 164, 10);

        // Right Pill (Online Status or Screen Indicator)
        if (config.pcConnected) {
            M5.Display.fillRoundRect(232, 5, 80, 18, 4, 0x0440);
            M5.Display.drawRoundRect(232, 5, 80, 18, 4, 0x07E0);
            M5.Display.setTextColor(0x07E0, 0x0440);
            M5.Display.drawString("* ONLINE", 244, 10);
        } else {
            M5.Display.fillRoundRect(232, 5, 80, 18, 4, 0x4208);
            M5.Display.drawRoundRect(232, 5, 80, 18, 4, 0x7BEF);
            M5.Display.setTextColor(0xD69A, 0x4208);
            M5.Display.drawString("STANDALONE", 236, 10);
        }
    }

    void drawButtonLegend(const char* a1, const char* a2, uint16_t colA,
                          const char* b1, const char* b2, uint16_t colB,
                          const char* c1, const char* c2, uint16_t colC) {
        // Button A Zone
        M5.Display.fillRoundRect(8, 192, 96, 42, 6, 0x18C3);
        M5.Display.drawRoundRect(8, 192, 96, 42, 6, 0x3186);
        M5.Display.setTextSize(1);
        M5.Display.setTextColor(colA, 0x18C3);
        M5.Display.drawString(a1, 14, 198);
        M5.Display.setTextColor(TFT_LIGHTGREY, 0x18C3);
        M5.Display.drawString(a2, 14, 214);

        // Button B Zone
        M5.Display.fillRoundRect(112, 192, 96, 42, 6, 0x18C3);
        M5.Display.drawRoundRect(112, 192, 96, 42, 6, 0x3186);
        M5.Display.setTextColor(colB, 0x18C3);
        M5.Display.drawString(b1, 118, 198);
        M5.Display.setTextColor(TFT_LIGHTGREY, 0x18C3);
        M5.Display.drawString(b2, 118, 214);

        // Button C Zone
        M5.Display.fillRoundRect(216, 192, 96, 42, 6, 0x18C3);
        M5.Display.drawRoundRect(216, 192, 96, 42, 6, 0x3186);
        M5.Display.setTextColor(colC, 0x18C3);
        M5.Display.drawString(c1, 222, 198);
        M5.Display.setTextColor(TFT_LIGHTGREY, 0x18C3);
        M5.Display.drawString(c2, 222, 214);
    }

    void updateDynamicWidgets() {
        if (config.currentScreen != SCREEN_DASHBOARD) return;

        // 1. Left Card: Active Effect & Preset
        M5.Display.fillRect(12, 70, 140, 110, 0x10A2);

        M5.Display.setTextSize(1);
        M5.Display.setTextColor(0x6CDF, 0x10A2);
        M5.Display.drawString("ACTIVE EFFECT", 16, 72);

        M5.Display.setTextSize(2);
        M5.Display.setTextColor(TFT_WHITE, 0x10A2);
        M5.Display.drawString(CommandProtocol::getEffectName(config.currentEffect), 16, 86);

        // Color Swatch
        uint16_t col1 = M5.Display.color565(config.primaryR, config.primaryG, config.primaryB);
        uint16_t col2 = M5.Display.color565(config.secondaryR, config.secondaryG, config.secondaryB);
        M5.Display.fillRoundRect(16, 114, 28, 14, 3, col1);
        M5.Display.fillRoundRect(48, 114, 28, 14, 3, col2);
        M5.Display.drawRoundRect(16, 114, 60, 14, 3, TFT_WHITE);

        M5.Display.setTextSize(1);
        M5.Display.setTextColor(0xF81F, 0x10A2);
        M5.Display.drawString("PRESET:", 16, 136);
        M5.Display.setTextColor(TFT_LIGHTGREY, 0x10A2);
        M5.Display.drawString(CommandProtocol::getPresetName(config.currentPreset), 16, 148);

        if (config.rainbow) {
            M5.Display.setTextColor(0x07E0, 0x10A2);
            M5.Display.drawString("Dynamic Spectrum", 16, 162);
        } else {
            M5.Display.setTextColor(0x7BEF, 0x10A2);
            char rgbBuf[32];
            snprintf(rgbBuf, sizeof(rgbBuf), "#%02X%02X%02X", config.primaryR, config.primaryG, config.primaryB);
            M5.Display.drawString(rgbBuf, 16, 162);
        }

        // 2. Right Card: Harmonic Analysis, Live Note & Active Ports
        M5.Display.fillRect(168, 70, 140, 110, 0x10A2);

        M5.Display.setTextSize(1);
        if (config.demoActive) {
            M5.Display.setTextColor(0xFD20, 0x10A2); // Gold
            M5.Display.drawString("* RANDOM DEMO *", 172, 72);
        } else {
            M5.Display.setTextColor(0x07E0, 0x10A2); // Green
            M5.Display.drawString("DETECTED CHORD", 172, 72);
        }

        M5.Display.setTextSize(2);
        M5.Display.setTextColor(0x07FF, 0x10A2); // Cyan
        const char* chordToShow = strlen(config.currentChord) > 0 ? config.currentChord : "Listening...";
        M5.Display.drawString(chordToShow, 172, 86);

        M5.Display.setTextSize(1);
        M5.Display.setTextColor(TFT_WHITE, 0x10A2);
        char noteBuf[32];
        snprintf(noteBuf, sizeof(noteBuf), "Note: %d (%d Keys)", config.lastPitch, config.keyCount);
        M5.Display.drawString(noteBuf, 172, 114);

        M5.Display.setTextColor(TFT_LIGHTGREY, 0x10A2);
        char p1Buf[32];
        snprintf(p1Buf, sizeof(p1Buf), "Spd: %.1fx  Dec: %.2f", config.speed, config.decay);
        M5.Display.drawString(p1Buf, 172, 130);

        char p2Buf[32];
        uint8_t brtPct = (uint8_t)((config.brightness * 100 + 127) / 255);
        snprintf(p2Buf, sizeof(p2Buf), "Spr: %.1f  Brt: %d%%", config.spread, brtPct);
        M5.Display.drawString(p2Buf, 172, 144);

        char portBuf[32];
        if (config.pcConnected) {
            snprintf(portBuf, sizeof(portBuf), "%s | %s", config.activeComPort, config.midiConnected ? config.activeMidiPort : "MIDI");
        } else {
            snprintf(portBuf, sizeof(portBuf), "%s", config.midiConnected ? config.activeMidiPort : "Standalone Engine");
        }
        M5.Display.setTextColor(0xFD20, 0x10A2);
        M5.Display.drawString(portBuf, 172, 158);
    }

    void drawLiveVisualizer(EffectEngine& engine, int barY) {
        int startX = 16;
        int barWidth = 288;
        int barHeight = 8;
        int numLeds = config.ledCount;
        if (numLeds <= 0) numLeds = 144;

        for (int x = 0; x < barWidth; x++) {
            int ledIdx = (x * numLeds) / barWidth;
            CRGB c = engine.leds[constrain(ledIdx, 0, numLeds - 1)];

            uint16_t color565 = M5.Display.color565(c.r, c.g, c.b);
            M5.Display.drawFastVLine(startX + x, barY, barHeight, color565);
        }
    }
};
