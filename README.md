# LightSync v2 — Music Interaction & LED Platform

[![Platform](https://img.shields.io/badge/Platform-Desktop%20(Windows%20%7C%20Linux%20%7C%20macOS)-blue.svg)]()
[![Hardware](https://img.shields.io/badge/Hardware-M5Stack%20Core%20%2B%20WS2812B%20LEDs-brightgreen.svg)]()
[![Tech Stack](https://img.shields.io/badge/Stack-Python%20%7C%20FastAPI%20%7C%20React%20%7C%20Tailwind-indigo.svg)]()
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)]()

> **"One music event. Many experiences."**  
> LightSync v2 is a unified music interaction platform that connects physical MIDI input, 60 FPS on-screen canvas visualization, physical WS2812B LED lighting, interactive learning, performance analytics, and AI assistance into a single standalone desktop application.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             LIGHTSYNC DESKTOP                               │
│                                                                             │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │    Frontend (React + TS)        │   │       Python Core (Backend)     │  │
│  ├─────────────────────────────────┤   ├─────────────────────────────────┤  │
│  │ • Vite + React 19 + TypeScript  │   │ • FastAPI + Uvicorn Core        │  │
│  │ • Material Design 3 System      │   │ • WebSocket Bidirectional Bridge│  │
│  │ • Dual Theme: Pure Black / Light│   │ • Central Event Bus (Pub/Sub)   │  │
│  │ • Zustand Central Store         │   │ • Polyphonic Chord Detector     │  │
│  │ • 60 FPS Canvas Visualizer      │   │ • Device Manager (USB Serial)   │  │
│  │ • Polyphonic Web Audio Synth    │   │ • SQLite Session Database       │  │
│  └─────────────────────────────────┘   │ • Heuristic AI Coach & Copilot  │  │
│                                        └─────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Desktop Window: PyQt6-WebEngine Native Desktop Host (Chromium GPU)    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ USB Serial (115200 Baud Semantic Commands)
                                       ▼
                             ┌──────────────────┐
                             │   M5Stack Core   │
                             │  WS2812B 144/m   │
                             └──────────────────┘
```

---

## Key Features

- 🎹 **Play Studio**: Polyphonic keyboard, real-time chord detection (Triads, 7ths, Diminished, Suspended, Inversions), interactive metronome (Tap Tempo, BPM slider, visual beats, audio click), and sustain pedal (Spacebar).
- 🔊 **Sound Engine**: 4 selectable Web Audio instruments (*Concert Grand Piano*, *Vintage Rhodes*, *Analog Synth*, *Marimba Pluck*) with natural ADSR release curves.
- 🌈 **Effect Studio (9 Algorithms)**:
  - `Bounce`, `Ripple`, `Pulse`, `Hold Aura`, `Cyber Glitch`, `Spark Burst`, `Sprinkle`, `Neon Rain`, `Harmonic Wave`.
  - Dynamic sliders: Speed, Decay, Spread Width, Brightness, Rainbow dynamic mode, and Color pickers.
  - Live protocol generator (CLI Text & JSON format) with one-click **"Apply to M5Stack Strip"**.
- 🎓 **Learn Mode**: Guided interactive curriculum (*Ode to Joy*, *Für Elise*, *C Major Scale*) with *Wait-For-Key* and *In-Time Flow* modes, step progress, real-time hit rating badges (Perfect, Great, Early, Late, Miss), and confetti celebrations.
- ⚡ **Practice Mode**: Sub-tempo scaling (50% to 130%), hand isolation (Both Hands, Right Hand only, Left Hand only), and A-B looper.
- 📊 **Analyze Mode**: Performance accuracy score (%), micro-timing deviation distribution (ms early/late), velocity consistency, and historical session logs persisted in local SQLite.
- 🤖 **AI Coach & Visual Copilot**:
  - **AI Coach**: Detailed diagnostic critique analyzing user timing variance and suggesting tailored practice drills.
  - **Visual Copilot**: Text prompt bar (*"Warm fireplace with gentle sparks"*) that translates natural language into structured LED parameters.
- 📟 **Hardware Device Monitor**: COM port scanner, roundtrip ping latency tester, live simulated M5Stack 320x240 LCD display with clickable hardware buttons A, B, C, and live serial logs.
- 🌗 **Dual Theme (`ThemeContext`)**: One-click switch between **Pure OLED Black** (`#000000`) and **Crisp Studio Daylight** (`#ffffff`).

---

## Quick Start / How to Run

### Option 1: Launch Native Desktop Window (Recommended)

Run this command from your terminal:

```powershell
.\venv\Scripts\python.exe run.py
```

*Or with the full absolute path from anywhere:*
```powershell
e:\Project_1\LightSync_MIDI\venv\Scripts\python.exe e:\Project_1\LightSync_MIDI\run.py
```

> **What this does**: Starts the Python Core on `127.0.0.1:8765` in the background and opens the LightSync desktop application in a dedicated, GPU-accelerated window (1440x920) without any browser address bars or frames.

---

### Option 2: Open in Your Web Browser

If you prefer testing directly in Google Chrome, Microsoft Edge, or Firefox:

```powershell
.\venv\Scripts\python.exe run.py --browser
```

*(Or navigate to [http://127.0.0.1:8765/](http://127.0.0.1:8765/) in your browser).*

---

### Option 3: Development Mode (Vite Hot-Reload)

If you are modifying the React frontend or styling:

**Terminal 1 (Backend Core):**
```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8765 --app-dir backend --reload
```

**Terminal 2 (Frontend Vite Server):**
```powershell
cd frontend
npm.cmd run dev
```

Navigate to `http://localhost:5173/`.

---

## Hardware Setup & Arduino IDE Upload

The M5Stack Core firmware is organized specifically for direct uploading via the **Arduino IDE**.

### 1. Wiring Pinout

| Component | Pin / Signal | M5Stack Core Connection | Notes |
| :--- | :--- | :--- | :--- |
| **WS2812B Data (DIN)** | Data In | **GPIO 21** (Pin G21 on bottom header) | 330Ω - 470Ω resistor recommended in series |
| **WS2812B Ground (GND)** | Ground | **GND** | Must share common ground with M5Stack & power supply |
| **WS2812B Power (+5V)** | +5V | **External 5V Power Supply** (5V 4A+) | **Do NOT power 144 LEDs directly from M5Stack 5V pin!** |

> [!CAUTION]
> **Power Injection Notice**: 144 LEDs at full white can draw up to ~8.6 Amps. Always power the strip from an external regulated 5V power supply and inject power at both ends of the strip.

### 2. Flashing with Arduino IDE
1. Open **Arduino IDE**.
2. Click **File $\rightarrow$ Open...** and select:
   ```
   firmware/LightSync_M5Core/LightSync_M5Core.ino
   ```
3. In **Tools $\rightarrow$ Manage Libraries...**, install:
   - `M5Stack`
   - `FastLED`
   - `ArduinoJson`
4. Select **Tools $\rightarrow$ Board $\rightarrow$ ESP32 Arduino $\rightarrow$ M5Stack-Core-ESP32**.
5. Select your device port (e.g. `COM3` on Windows).
6. Click **Upload** ($\rightarrow$).

Full firmware details are in [`firmware/README.md`](firmware/README.md).

---

## Automated Tests

To run the automated backend test suite:

```powershell
.\venv\Scripts\python.exe tests/test_core.py
```

Output:
```
......
----------------------------------------------------------------------
Ran 6 tests in 0.065s

OK
```

To verify the frontend TypeScript and production bundle:
```powershell
cd frontend
npm.cmd run build
```

---

## Repository Structure

```
LightSync_MIDI/
├── README.md                      # Main documentation and guide (this file)
├── run.py                         # Standalone desktop application launcher
├── backend/                       # Python Core backend
│   ├── app/
│   │   ├── main.py                # FastAPI server & WebSocket bridge
│   │   ├── core/                  # Event bus & configuration
│   │   ├── music/                 # MIDI engine, chord detector, song catalog
│   │   ├── device/                # M5Stack USB serial protocol & manager
│   │   ├── analytics/             # Accuracy tracker & SQLite database
│   │   └── ai/                    # Heuristic AI Coach & Visual Copilot
│   ├── data/                      # Local SQLite database (lightsync.db)
│   └── requirements.txt
├── frontend/                      # React 19 + TypeScript + Tailwind CSS UI
│   ├── src/
│   │   ├── context/               # ThemeContext (Pure Black / Light Mode)
│   │   ├── audio/                 # Web Audio polyphonic synth engine
│   │   ├── store/                 # Central Zustand state store
│   │   ├── components/
│   │   │   ├── layout/            # AppHeader, StatusBar
│   │   │   ├── visualizer/        # 60 FPS Canvas & VisualizerToolbar
│   │   │   ├── play/              # Play Studio & Chord Detector
│   │   │   ├── effects/           # Effect Studio (9 algorithms)
│   │   │   ├── learn/             # Learn Mode (Wait-for-key, scoring)
│   │   │   ├── practice/          # Practice Mode (Tempo scaling, looper)
│   │   │   ├── analyze/           # Performance charts & history
│   │   │   ├── aicoach/           # AI Coach & Visual Copilot
│   │   │   └── device/            # Hardware Monitor & M5Stack screen mirror
│   │   └── hooks/                 # WebSocket bridge & QWERTY keyboard hooks
│   └── dist/                      # Pre-compiled production bundle
├── firmware/                      # Hardware firmware for M5Stack Core
│   ├── README.md                  # Wiring and Arduino IDE flashing guide
│   └── LightSync_M5Core/          # Arduino IDE sketch (complete)
├── prototypes/
│   └── effect_studio_mockup.html  # Initial HTML/JS prototype
└── tests/
    └── test_core.py               # Automated unit test suite
```

---

## Controls Reference

| Control | Shortcut / Input | Description |
| :--- | :--- | :--- |
| **Piano Keys** | Mouse / Touch Drag | Click or slide across piano keys |
| **QWERTY Keys** | `A` to `K` (`A` = C4, `W` = C#4, `S` = D4, etc.) | Play notes in current octave |
| **Sustain Pedal** | `Spacebar` | Toggle polyphonic sustain hold |
| **Theme Toggle** | Top Right Sun/Moon Button | Switch between Pure Black and Light Mode |
| **Metronome** | Top Right Clock Button | Toggle metronome click sound |
