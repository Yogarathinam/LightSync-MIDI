/*
  LightSync v2 — M5Stack Core LED Firmware
  Hardware: M5Stack Core (ESP32) + WS2812B LED strip (Pin 21)
  Protocol: USB Serial (115200 Baud)
  Target: Arduino IDE / RMK Innovate Hackathon 2026
*/

#include <M5Stack.h>
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
void CommandProtocol::processLine(const String& rawLine, DeviceConfig& cfg, EffectEngine& eng) {
    String line = rawLine;
    line.trim();
    if (line.length() == 0) return;

    cfg.pcConnected = true;
    cfg.lastHeartbeatMs = millis();

    // 1. JSON Format Support
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
            if (doc.containsKey("led_count")) {
                cfg.ledCount = constrain(doc["led_count"].as<uint16_t>(), 10, MAX_LED_COUNT);
            }
            if (doc.containsKey("key_count")) {
                cfg.keyCount = doc["key_count"].as<uint8_t>();
            }
            Serial.println("OK SYNCED_JSON");
            deviceUi.requestRedraw();
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
        }
    } else if (line.startsWith("NOTE_OFF ")) {
        // Syntax: NOTE_OFF <pitch>
        int firstSpace = line.indexOf(' ');
        uint8_t pitch = line.substring(firstSpace + 1).toInt();
        eng.onNoteOff(pitch);
    } else if (line.startsWith("EFFECT ")) {
        // Syntax: EFFECT <name>
        String effName = line.substring(7);
        cfg.currentEffect = parseEffectName(effName);
        eng.clearAll();
        deviceUi.requestRedraw();
        Serial.printf("OK EFFECT %s\n", getEffectName(cfg.currentEffect));
    } else if (line.startsWith("speed=")) {
        cfg.speed = line.substring(6).toFloat();
        deviceUi.requestRedraw();
        Serial.printf("OK SPEED %.2f\n", cfg.speed);
    } else if (line.startsWith("decay=")) {
        cfg.decay = line.substring(6).toFloat();
        deviceUi.requestRedraw();
        Serial.printf("OK DECAY %.2f\n", cfg.decay);
    } else if (line.startsWith("spread=")) {
        cfg.spread = line.substring(7).toFloat();
        deviceUi.requestRedraw();
        Serial.printf("OK SPREAD %.1f\n", cfg.spread);
    } else if (line.startsWith("brightness=")) {
        cfg.brightness = line.substring(11).toInt();
        FastLED.setBrightness(cfg.brightness);
        deviceUi.requestRedraw();
        Serial.printf("OK BRIGHTNESS %d\n", cfg.brightness);
    } else if (line.startsWith("rainbow=")) {
        cfg.rainbow = (line.substring(8).toInt() != 0);
        deviceUi.requestRedraw();
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
            deviceUi.requestRedraw();
            Serial.printf("OK COLOR %d,%d,%d\n", cfg.primaryR, cfg.primaryG, cfg.primaryB);
        }
    } else if (line.startsWith("leds=")) {
        cfg.ledCount = constrain(line.substring(5).toInt(), 10, MAX_LED_COUNT);
        deviceUi.requestRedraw();
        Serial.printf("OK LEDS %d\n", cfg.ledCount);
    } else if (line == "PING") {
        Serial.printf("PONG LIGHTSYNC_M5 CORE FPS=%d\n", eng.currentFps);
    } else if (line == "STATUS") {
        Serial.printf("STATUS EFFECT=%s SPD=%.2f DEC=%.2f SPR=%.1f BRT=%d LEDS=%d FPS=%d\n",
            getEffectName(cfg.currentEffect), cfg.speed, cfg.decay, cfg.spread,
            cfg.brightness, cfg.ledCount, eng.currentFps);
    }
}

void setup() {
    M5.begin();
    Serial.begin(SERIAL_BAUD_RATE);
    serialBuffer.reserve(SERIAL_RX_BUFFER_SIZE);

    engine.init();
    deviceUi.init();

    Serial.println("LIGHTSYNC_M5_READY version=2.0 board=M5Stack_Core");
}

void loop() {
    M5.update();

    // Non-blocking serial listener
    while (Serial.available() > 0) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            if (serialBuffer.length() > 0) {
                CommandProtocol::processLine(serialBuffer, config, engine);
                serialBuffer = "";
            }
        } else {
            if (serialBuffer.length() < SERIAL_RX_BUFFER_SIZE - 1) {
                serialBuffer += c;
            }
        }
    }

    // Automatic PC connection timeout check
    if (config.pcConnected && (millis() - config.lastHeartbeatMs > 4000)) {
        config.pcConnected = false;
        deviceUi.requestRedraw();
    }

    // High-FPS LED effect engine computation & FastLED.show()
    engine.update();

    // Update screen display and physical buttons
    deviceUi.update(engine);
}
