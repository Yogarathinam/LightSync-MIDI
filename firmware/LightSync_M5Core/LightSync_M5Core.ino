/*
  =============================================================================
  LightSync v2 — M5Stack Core LED Firmware
  Team XLR8 | RMK Innovate Hackathon 2026
  
  Target Hardware: M5Stack Core / Core2 / CoreS3 / Fire (ESP32)
  Display & Input: M5Unified Library
  LED Controller:  FastLED (WS2812B on Pin 21)
  Host Protocol:   High-speed USB Serial (115200 Baud)
  =============================================================================
*/

#include <M5Unified.h>
#include "config.h"
#include "protocol.h"
#include "effects.h"
#include "ui.h"
 
// Global instances
DeviceConfig config;
EffectEngine engine(config);
DeviceUI deviceUi(config);

String serialBuffer = "";

// Implementation of CommandProtocol::processLine
void CommandProtocol::processLine(const String& rawLine, DeviceConfig& cfg, EffectEngine& eng, DeviceUI& ui) {
    String line = rawLine;
    line.trim();
    if (line.length() == 0) return;

    cfg.pcConnected = true;
    cfg.lastHeartbeatMs = millis();

    // 1. JSON Format Support (Web & Backend synchronization)
    if (line.startsWith("{")) {
        StaticJsonDocument<512> doc;
        DeserializationError err = deserializeJson(doc, line);
        if (!err) {
            if (doc.containsKey("effect")) {
                cfg.currentEffect = parseEffectName(doc["effect"].as<const char*>());
            }
            if (doc.containsKey("speed")) cfg.speed = doc["speed"].as<float>();
            if (doc.containsKey("decay")) cfg.decay = doc["decay"].as<float>();
            if (doc.containsKey("spread")) cfg.spread = doc["spread"].as<float>();
            if (doc.containsKey("brightness")) {
                cfg.brightness = doc["brightness"].as<uint8_t>();
                FastLED.setBrightness(cfg.brightness);
            }
            if (doc.containsKey("rainbow")) cfg.rainbow = doc["rainbow"].as<bool>();
            if (doc.containsKey("color") && doc["color"].is<JsonArray>()) {
                JsonArray col = doc["color"].as<JsonArray>();
                if (col.size() >= 3) {
                    cfg.primaryR = col[0];
                    cfg.primaryG = col[1];
                    cfg.primaryB = col[2];
                }
            }
            if (doc.containsKey("secondary") && doc["secondary"].is<JsonArray>()) {
                JsonArray col = doc["secondary"].as<JsonArray>();
                if (col.size() >= 3) {
                    cfg.secondaryR = col[0];
                    cfg.secondaryG = col[1];
                    cfg.secondaryB = col[2];
                }
            }
            if (doc.containsKey("chord")) {
                strncpy(cfg.currentChord, doc["chord"].as<const char*>(), sizeof(cfg.currentChord) - 1);
            }
            if (doc.containsKey("led_count")) {
                cfg.ledCount = constrain(doc["led_count"].as<uint16_t>(), 10, MAX_LED_COUNT);
            }
            if (doc.containsKey("key_count")) {
                cfg.keyCount = doc["key_count"].as<uint8_t>();
            }
            Serial.println("OK SYNCED_JSON");
            ui.requestRedraw();
            return;
        }
    }

    // 2. High-speed CLI Text Protocol
    if (line.startsWith("NOTE_ON ")) {
        // Syntax: NOTE_ON <pitch> <velocity>
        int firstSpace = line.indexOf(' ');
        int secondSpace = line.indexOf(' ', firstSpace + 1);
        if (secondSpace > firstSpace) {
            uint8_t pitch = line.substring(firstSpace + 1, secondSpace).toInt();
            uint8_t velocity = line.substring(secondSpace + 1).toInt();
            eng.onNoteOn(pitch, velocity);
            ui.requestRedraw();
        }
    } else if (line.startsWith("NOTE_OFF ")) {
        // Syntax: NOTE_OFF <pitch>
        int firstSpace = line.indexOf(' ');
        uint8_t pitch = line.substring(firstSpace + 1).toInt();
        eng.onNoteOff(pitch);
    } else if (line.startsWith("CHORD ")) {
        // Syntax: CHORD <chord_name> (e.g. CHORD C Major, CHORD Am)
        String chordName = line.substring(6);
        chordName.trim();
        if (chordName == "NONE" || chordName.length() == 0) {
            strncpy(cfg.currentChord, "Ready", sizeof(cfg.currentChord));
        } else {
            strncpy(cfg.currentChord, chordName.c_str(), sizeof(cfg.currentChord) - 1);
        }
        ui.requestRedraw();
    } else if (line.startsWith("EFFECT ")) {
        // Syntax: EFFECT <name>
        String effName = line.substring(7);
        cfg.currentEffect = parseEffectName(effName);
        eng.clearAll();
        ui.requestRedraw();
        Serial.printf("OK EFFECT %s\n", getEffectName(cfg.currentEffect));
    } else if (line.startsWith("PRESET ")) {
        // Syntax: PRESET <preset_name>
        String presetStr = line.substring(7);
        presetStr.toLowerCase();
        presetStr.trim();
        if (presetStr.indexOf("cyberpunk") >= 0) applyPreset(PRESET_CYBERPUNK, cfg);
        else if (presetStr.indexOf("synthwave") >= 0) applyPreset(PRESET_SYNTHWAVE, cfg);
        else if (presetStr.indexOf("emerald") >= 0) applyPreset(PRESET_EMERALD, cfg);
        else if (presetStr.indexOf("sunset") >= 0) applyPreset(PRESET_SUNSET, cfg);
        else if (presetStr.indexOf("indigo") >= 0) applyPreset(PRESET_INDIGO, cfg);
        else if (presetStr.indexOf("crimson") >= 0) applyPreset(PRESET_CRIMSON, cfg);
        else if (presetStr.indexOf("spectrum") >= 0) applyPreset(PRESET_SPECTRUM, cfg);
        eng.clearAll();
        ui.requestRedraw();
        Serial.printf("OK PRESET %s\n", getPresetName(cfg.currentPreset));
    } else if (line.startsWith("speed=")) {
        cfg.speed = line.substring(6).toFloat();
        ui.requestRedraw();
        Serial.printf("OK SPEED %.2f\n", cfg.speed);
    } else if (line.startsWith("decay=")) {
        cfg.decay = line.substring(6).toFloat();
        ui.requestRedraw();
        Serial.printf("OK DECAY %.2f\n", cfg.decay);
    } else if (line.startsWith("spread=")) {
        cfg.spread = line.substring(7).toFloat();
        ui.requestRedraw();
        Serial.printf("OK SPREAD %.1f\n", cfg.spread);
    } else if (line.startsWith("brightness=")) {
        cfg.brightness = line.substring(11).toInt();
        FastLED.setBrightness(cfg.brightness);
        ui.requestRedraw();
        Serial.printf("OK BRIGHTNESS %d\n", cfg.brightness);
    } else if (line.startsWith("rainbow=")) {
        cfg.rainbow = (line.substring(8).toInt() != 0);
        ui.requestRedraw();
        Serial.printf("OK RAINBOW %d\n", cfg.rainbow ? 1 : 0);
    } else if (line.startsWith("color=")) {
        // Syntax: color=r,g,b
        String cStr = line.substring(6);
        int c1 = cStr.indexOf(',');
        int c2 = cStr.indexOf(',', c1 + 1);
        if (c1 > 0 && c2 > c1) {
            cfg.primaryR = cStr.substring(0, c1).toInt();
            cfg.primaryG = cStr.substring(c1 + 1, c2).toInt();
            cfg.primaryB = cStr.substring(c2 + 1).toInt();
            ui.requestRedraw();
            Serial.printf("OK COLOR %d,%d,%d\n", cfg.primaryR, cfg.primaryG, cfg.primaryB);
        }
    } else if (line.startsWith("color2=")) {
        // Syntax: color2=r,g,b
        String cStr = line.substring(7);
        int c1 = cStr.indexOf(',');
        int c2 = cStr.indexOf(',', c1 + 1);
        if (c1 > 0 && c2 > c1) {
            cfg.secondaryR = cStr.substring(0, c1).toInt();
            cfg.secondaryG = cStr.substring(c1 + 1, c2).toInt();
            cfg.secondaryB = cStr.substring(c2 + 1).toInt();
            ui.requestRedraw();
            Serial.printf("OK COLOR2 %d,%d,%d\n", cfg.secondaryR, cfg.secondaryG, cfg.secondaryB);
        }
    } else if (line.startsWith("leds=")) {
        cfg.ledCount = constrain(line.substring(5).toInt(), 10, MAX_LED_COUNT);
        ui.requestRedraw();
        Serial.printf("OK LEDS %d\n", cfg.ledCount);
    } else if (line.startsWith("keys=") || line.startsWith("KEY_COUNT ")) {
        int val = line.startsWith("keys=") ? line.substring(5).toInt() : line.substring(10).toInt();
        if (val == 25 || val == 49 || val == 61 || val == 88) {
            cfg.keyCount = val;
            ui.requestRedraw();
            Serial.printf("OK KEY_COUNT %d\n", cfg.keyCount);
        }
    } else if (line.startsWith("PORT_CONNECT ")) {
        String pName = line.substring(13);
        pName.toCharArray(cfg.activeComPort, sizeof(cfg.activeComPort));
        cfg.pcConnected = true;
        ui.requestRedraw();
        Serial.printf("OK PORT_CONNECT %s\n", cfg.activeComPort);
    } else if (line == "PORT_DISCONNECT") {
        snprintf(cfg.activeComPort, sizeof(cfg.activeComPort), "DISCONNECTED");
        cfg.pcConnected = false;
        ui.requestRedraw();
        Serial.println("OK PORT_DISCONNECT");
    } else if (line.startsWith("MIDI_PORT ")) {
        String mName = line.substring(10);
        mName.toCharArray(cfg.activeMidiPort, sizeof(cfg.activeMidiPort));
        cfg.midiConnected = true;
        ui.requestRedraw();
        Serial.printf("OK MIDI_PORT %s\n", cfg.activeMidiPort);
    } else if (line == "MIDI_DISCONNECT") {
        snprintf(cfg.activeMidiPort, sizeof(cfg.activeMidiPort), "None");
        cfg.midiConnected = false;
        ui.requestRedraw();
        Serial.println("OK MIDI_DISCONNECT");
    } else if (line == "PING") {
        Serial.printf("PONG LIGHTSYNC_M5 CORE FPS=%d TEAM=XLR8\n", eng.currentFps);
    } else if (line == "STATUS") {
        Serial.printf("STATUS EFFECT=%s PRESET=%s SPD=%.2f DEC=%.2f SPR=%.1f BRT=%d LEDS=%d KEYS=%d FPS=%d CHORD=%s PORT=%s MIDI=%s\n",
            getEffectName(cfg.currentEffect), getPresetName(cfg.currentPreset),
            cfg.speed, cfg.decay, cfg.spread, cfg.brightness, cfg.ledCount, cfg.keyCount, eng.currentFps, cfg.currentChord,
            cfg.activeComPort, cfg.activeMidiPort);
    }
}

void setup() {
    auto m5cfg = M5.config();
    M5.begin(m5cfg);

    Serial.begin(SERIAL_BAUD_RATE);
    serialBuffer.reserve(SERIAL_RX_BUFFER_SIZE);

    engine.init();
    deviceUi.init();

    // Play startup chime if speaker enabled
    if (M5.Speaker.isEnabled()) {
        M5.Speaker.setVolume(60);
        M5.Speaker.tone(880, 50);
        delay(60);
        M5.Speaker.tone(1320, 80);
    }

    Serial.println("LIGHTSYNC_M5_READY version=2.0 board=M5Stack_Core team=XLR8 lib=M5Unified");
}

void loop() {
    M5.update();

    // Non-blocking serial listener
    while (Serial.available() > 0) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            if (serialBuffer.length() > 0) {
                CommandProtocol::processLine(serialBuffer, config, engine, deviceUi);
                serialBuffer = "";
            }
        } else {
            if (serialBuffer.length() < SERIAL_RX_BUFFER_SIZE - 1) {
                serialBuffer += c;
            }
        }
    }

    // Automatic PC connection timeout check (after 4.5s of silence)
    if (config.pcConnected && (millis() - config.lastHeartbeatMs > 4500)) {
        config.pcConnected = false;
        deviceUi.requestRedraw();
    }

    // High-FPS LED effect engine computation & FastLED.show()
    engine.update();

    // Update screen display and physical buttons via M5Unified
    deviceUi.update(engine);
}
