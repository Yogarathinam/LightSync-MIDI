# LightSync v2 — M5Stack Core Firmware (Arduino IDE)

This directory contains the ready-to-upload Arduino sketch for the **M5Stack Core (ESP32)** hardware runtime driving the **WS2812B addressable LED strip** (144 LEDs/m).

---

## 1. Hardware Pinout & Wiring

| Component | Pin / Signal | M5Stack Core Connection | Notes |
| :--- | :--- | :--- | :--- |
| **WS2812B Data (DIN)** | Data In | **GPIO 21** (Pin G21 on bottom header) | 330Ω - 470Ω resistor recommended in series |
| **WS2812B Ground (GND)** | Ground | **GND** | Must share common ground with M5Stack & power supply |
| **WS2812B Power (+5V)** | +5V | **External 5V Power Supply** (5V 4A+) | **Do NOT power 144 LEDs directly from M5Stack 5V pin!** |

> [!CAUTION]
> **Power Injection Warning**: A 144-LED strip draws up to ~8.6 Amps at full white (60mA per pixel). Even with software brightness capping (max 200/255), provide an external 5V 4A+ DC supply and inject 5V/GND at both ends of the strip to prevent voltage drop and brownouts.

---

## 2. Arduino Sketch Structure

In Arduino IDE, the sketch folder name **must match** the main `.ino` file. Everything is structured for direct loading:

```
firmware/
└── LightSync_M5Core/
    ├── LightSync_M5Core.ino     # Main Arduino sketch (setup, loop, serial handler)
    ├── config.h                 # Pin definitions (Pin 21), defaults, runtime state
    ├── protocol.h               # High-speed serial CLI & JSON command parser
    ├── effects.h                # FastLED effect engine (Bounce, Ripple, Pulse, Hold, etc.)
    └── ui.h                     # M5Stack LCD Mini UI & physical button handlers (A, B, C)
```

---

## 3. How to Open and Upload in Arduino IDE

### Step 1: Open Sketch
1. Launch **Arduino IDE** (v1.8.x or v2.x).
2. Click **File $\rightarrow$ Open...**
3. Navigate to:
   ```
   firmware/LightSync_M5Core/LightSync_M5Core.ino
   ```
4. All tabs (`config.h`, `protocol.h`, `effects.h`, `ui.h`) will automatically appear as top tabs in Arduino IDE.

### Step 2: Install Board Package
If not already installed:
1. Open **File $\rightarrow$ Preferences**.
2. In **Additional Boards Manager URLs**, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools $\rightarrow$ Board $\rightarrow$ Boards Manager...**, search for `esp32` by Espressif, and install it.
4. Select **Tools $\rightarrow$ Board $\rightarrow$ ESP32 Arduino $\rightarrow$ M5Stack-Core-ESP32**.

### Step 3: Install Required Libraries
Open **Tools $\rightarrow$ Manage Libraries...** and install:
1. **M5Stack** (by M5Stack)
2. **FastLED** (by Daniel Garcia)
3. **ArduinoJson** (by Benoit Blanchon, v7.x or v6.x)

### Step 4: Upload
1. Connect your M5Stack Core via USB-C.
2. Select your device port under **Tools $\rightarrow$ Port** (e.g. `COM3` on Windows).
3. Set **Upload Speed** to `921600` (or `115200` if upload fails).
4. Click the **Upload** button ($\rightarrow$).
5. Once uploaded, open **Tools $\rightarrow$ Serial Monitor** set to **115200 baud**. You will see:
   ```
   LIGHTSYNC_M5_READY version=2.0 board=M5Stack_Core
   ```

---

## 4. Supported Effects Engine

The local effect engine runs at 60+ FPS independently of the serial connection:
1. **Bounce**: Ballistic particle mass with damping bounce off strip boundaries.
2. **Ripple**: Expanding sinusoidal ring crest wave.
3. **Pulse**: Radial breathing envelope expanding and contracting.
4. **Hold Aura (`hold_beam`)**: Sustained illumination with reactive spark emitters while keys remain pressed.
5. **Cyber Glitch**: Stochastic digital bit noise.
6. **Spark Burst**: Explosive velocity scatter.
7. **Sprinkle Glow**: Twinkling star / glitter fade.
8. **Neon Rain**: Directional comet particles with trailing tails.
9. **Harmonic Wave**: Continuous spatial sine wave ripple.

---

## 5. Serial Command Protocol (115200 Baud)

### Real-Time Music Events
- `NOTE_ON <midi_pitch> <velocity>` (e.g. `NOTE_ON 60 100`)
- `NOTE_OFF <midi_pitch>` (e.g. `NOTE_OFF 60`)

### Effect & Parameter Sync (CLI Format)
- `EFFECT <name>` (e.g. `EFFECT ripple`)
- `speed=<float>` (e.g. `speed=1.20`)
- `decay=<float>` (e.g. `decay=0.85`)
- `spread=<float>` (e.g. `spread=3.5`)
- `brightness=<0-255>` (e.g. `brightness=180`)
- `color=<r>,<g>,<b>` (e.g. `color=0,240,255`)
- `rainbow=<0|1>`
- `leds=<count>` (e.g. `leds=144`)

### Diagnostic Commands
- `PING` $\rightarrow$ Responds with `PONG LIGHTSYNC_M5 CORE FPS=<fps>`
- `STATUS` $\rightarrow$ Responds with full parameter dump

---

## 6. M5Stack Physical Controls
- **Button A (Left)**: Cycle active effect locally.
- **Button B (Center)**: Cycle brightness presets (50, 100, 150, 200, 250).
- **Button C (Right)**: Trigger local test note (Middle C) without PC connected.
