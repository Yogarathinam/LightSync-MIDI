# LightSync v2 — M5Stack Core Firmware (Arduino IDE & M5Unified)
### Built for Team XLR8 | RMK Innovate Hackathon 2026

This directory contains the complete, ready-to-upload Arduino sketch for the **M5Stack Core (ESP32)** hardware runtime driving the **WS2812B addressable LED strip** (144 LEDs/m), powered by the modern **M5Unified** library.

---

## 1. Features & Capabilities

- **M5Unified Library**: Compatible with M5Stack Basic, Gray, Core, Core2, Fire, and CoreS3!
- **On-Screen Live Optical Simulation**: A real-time 288-pixel virtual LED strip rendered directly on the 320x240 LCD at 30+ FPS, showing the exact optical effects even without physical LEDs connected.
- **Harmonic Chord Readout**: Real-time detected chord display (`C Major`, `A Minor`, `F#7`, etc.) synchronized directly from the Python AI/Chord Engine.
- **Team XLR8 Branding**: High-tech cyber aesthetic with Team XLR8 hackathon badge and LightSync v2 logo.
- **All 9 Software Effects**:
  1. `BOUNCE`: Ballistic particle mass with damping rebound.
  2. `RIPPLE`: Expanding circular wave crest with thickness.
  3. `PULSE`: Radial breathing envelope expanding and contracting.
  4. `HOLD AURA`: Sustained luminous radiance from held keys.
  5. `CYBER GLITCH`: High-energy stochastic digital noise and scanlines.
  6. `SPARK BURST`: Explosive kinetic scatter.
  7. `SPRINKLE`: Twinkling starlight / fairy dust fade.
  8. `NEON RAIN`: Directional comet streaks with trailing tails.
  9. `HARMONIC WAVE`: Continuous spatial sine wave ripple.
- **7 Visual Sync Color Presets**:
  - *Cyberpunk Neon* (Cyan & Hot Magenta)
  - *Synthwave Sunset* (Golden Amber & Deep Violet)
  - *Emerald Matrix* (Mint & Luminous Teal)
  - *Sunset Horizon* (Rose Red & Warm Peach)
  - *Electric Indigo* (Indigo & Cobalt Sky)
  - *Crimson Nova* (Flame Red & Blaze Orange)
  - *Pitch Spectrum* (Dynamic Chromatic Frequency)
- **Interactive On-Device Controls**:
  - **Button [A] (Left)**: Single click cycles Effects; **Hold >500ms** cycles Color Sync Presets!
  - **Button [B] (Center)**: Steps brightness (50 $\rightarrow$ 100 $\rightarrow$ 160 $\rightarrow$ 220 $\rightarrow$ 255).
  - **Button [C] (Right)**: Plays a live musical Arpeggio Demo (C-E-G-C) with speaker audio chime!

---

## 2. Hardware Pinout & Wiring

| Component | Pin / Signal | M5Stack Connection | Notes |
| :--- | :--- | :--- | :--- |
| **WS2812B Data (DIN)** | Data In | **GPIO 21** (Pin G21 on bottom header / Grove Port) | 330Ω–470Ω resistor recommended in series |
| **WS2812B Ground (GND)** | Ground | **GND** | Must share common ground with M5Stack & power supply |
| **WS2812B Power (+5V)** | +5V | **External 5V Power Supply** (5V 4A+) | **Do NOT power 144 LEDs directly from M5Stack 5V pin!** |

> [!CAUTION]
> **Power Supply Requirement**: A 144-LED strip draws up to ~8.6 Amps at full white (60mA per pixel). Even with software brightness capping, use an external 5V 4A+ DC power brick and connect GND together with M5Stack.

---

## 3. Sketch Folder Structure

In Arduino IDE, the sketch folder name must match the main `.ino` file:

```
firmware/
└── LightSync_M5Core/
    ├── LightSync_M5Core.ino     # Main Arduino sketch (setup, loop, serial handler)
    ├── config.h                 # Pin definitions (Pin 21), presets, runtime state
    ├── protocol.h               # High-speed serial CLI & JSON command parser
    ├── effects.h                # FastLED effect engine (Bounce, Ripple, Pulse, etc.)
    └── ui.h                     # M5Unified LCD UI, live visualizer & button handlers
```

---

## 4. How to Open and Upload in Arduino IDE

### Step 1: Install Arduino IDE
Ensure you have **Arduino IDE 2.x** (or 1.8.19+).

### Step 2: Install ESP32 Board Package
1. In Arduino IDE, go to **File $\rightarrow$ Preferences**.
2. In **Additional Boards Manager URLs**, paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools $\rightarrow$ Board $\rightarrow$ Boards Manager...**, search for `esp32` by **Espressif**, and install version **2.0.x or 3.x**.
4. Select **Tools $\rightarrow$ Board $\rightarrow$ ESP32 Arduino $\rightarrow$ M5Stack-Core-ESP32** (or `M5Stack Core2` if using Core2).

### Step 3: Install Required Libraries
Open **Tools $\rightarrow$ Manage Libraries...** (Ctrl+Shift+I) and install:
1. **M5Unified** (by M5Stack) — *Latest version*
2. **FastLED** (by Daniel Garcia) — *v3.6.0 or higher*
3. **ArduinoJson** (by Benoît Blanchon) — *v6.x or v7.x*

### Step 4: Open the Sketch
1. Click **File $\rightarrow$ Open...**
2. Browse to:
   ```
   firmware/LightSync_M5Core/LightSync_M5Core.ino
   ```
3. All 4 accompanying header files (`config.h`, `protocol.h`, `effects.h`, `ui.h`) will automatically open in separate tabs.

### Step 5: Select Port & Upload
1. Connect your M5Stack Core to your computer with the USB-C cable.
2. Select your device port under **Tools $\rightarrow$ Port** (e.g. `COM3` on Windows, `/dev/ttyUSB0` on Linux/macOS).
3. Set **Upload Speed** to `921600` (or `115200` if connection is noisy).
4. Click **Upload** ($\rightarrow$).
5. After upload finishes, the screen will light up with the **LIGHTSYNC v2.0 | Team XLR8** dashboard, and the Serial Monitor at **115200 baud** will print:
   ```
   LIGHTSYNC_M5_READY version=2.0 board=M5Stack_Core team=XLR8 lib=M5Unified
   ```

---

## 5. Serial Command Protocol (115200 Baud)

### Real-Time Music Events
- `NOTE_ON <midi_pitch> <velocity>` (e.g. `NOTE_ON 60 100`)
- `NOTE_OFF <midi_pitch>` (e.g. `NOTE_OFF 60`)
- `CHORD <name>` (e.g. `CHORD C Major`, `CHORD Am`, `CHORD Ready`)

### Effect & Parameter Controls
- `EFFECT <name>` (e.g. `EFFECT glitch`, `EFFECT ripple`, `EFFECT wave`)
- `PRESET <name>` (e.g. `PRESET cyberpunk`, `PRESET synthwave`, `PRESET emerald`)
- `speed=<float>` (e.g. `speed=1.50`)
- `decay=<float>` (e.g. `decay=0.85`)
- `spread=<float>` (e.g. `spread=3.0`)
- `brightness=<0-255>` (e.g. `brightness=200`)
- `color=<r>,<g>,<b>` (Primary RGB, e.g. `color=0,240,255`)
- `color2=<r>,<g>,<b>` (Secondary RGB, e.g. `color2=236,72,153`)
- `rainbow=<0|1>`
- `leds=<count>` (e.g. `leds=144`)

### Diagnostic Commands
- `PING` $\rightarrow$ Responds with `PONG LIGHTSYNC_M5 CORE FPS=<fps> TEAM=XLR8`
- `STATUS` $\rightarrow$ Responds with full parameter telemetry
- JSON Payloads: Supports `{ "effect": "spark", "speed": 1.4, "brightness": 200, "chord": "C Major", "color": [0, 240, 255] }`

---

## 6. On-Device Button Commands
- **[A] Click**: Next Visual Effect (sends `EVENT EFFECT_CHANGED` to PC)
- **[A] Hold (>500ms)**: Next Color Sync Preset (sends `EVENT PRESET_CHANGED` to PC)
- **[B] Click**: Cycle Brightness levels (50 $\rightarrow$ 100 $\rightarrow$ 160 $\rightarrow$ 220 $\rightarrow$ 255)
- **[C] Click**: Trigger Test Arpeggio (C-E-G-C chord) with audio chime
