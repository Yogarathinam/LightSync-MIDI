import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { useTheme } from '../../context/ThemeContext';
import { EffectType, EffectConfig, FlowKeyConfig } from '../../types';

interface Particle {
  active: boolean;
  type: EffectType;
  pos: number;
  vel: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: { r: number; g: number; b: number };
  life: number;
  thickness: number;
  spread: number;
  phase: number;
}

interface WaterfallNote {
  id: number;
  pitch: number;
  x: number;
  width: number;
  y: number;
  length: number;
  speed: number;
  color: { r: number; g: number; b: number };
  triggered: boolean;
  active: boolean;
}

interface FlowTrail {
  id: number;
  pitch: number;
  startTime: number;
  endTime: number | null; // null while key is actively held down
  x: number;
  width: number;
  isBlack: boolean;
  color: { r: number; g: number; b: number };
  secondaryColor: { r: number; g: number; b: number };
}

const MAX_PARTICLES = 64;
const MAX_FALLING_NOTES = 128;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SOLFEGE = ["Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "Sol", "Si", "La", "Li", "Ti"];

// QWERTY label mapping relative to C4 (MIDI 60)
const QWERTY_LABELS: Record<number, string> = {
  60: 'A', 61: 'W', 62: 'S', 63: 'E', 64: 'D', 65: 'F', 
  66: 'T', 67: 'G', 68: 'Y', 69: 'H', 70: 'U', 71: 'J', 72: 'K'
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 99, g: 102, b: 241 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function getNoteColors(pitch: number, effectConfig: EffectConfig, flowKeyConfig: FlowKeyConfig): {
  primary: { r: number; g: number; b: number };
  secondary: { r: number; g: number; b: number };
} {
  if (flowKeyConfig.colorPreset === 'rainbow_spectrum' || effectConfig.rainbow) {
    const hue = (pitch % 12) / 12;
    const p = hslToRgb(hue, 1.0, 0.55);
    const s = hslToRgb((hue + 0.08) % 1.0, 0.9, 0.65);
    return { primary: p, secondary: s };
  }

  const p = hexToRgb(effectConfig.primaryColor);
  const s = hexToRgb(effectConfig.secondaryColor || effectConfig.primaryColor);
  return { primary: p, secondary: s };
}

export const StudioCanvas: React.FC<{ onFpsUpdate?: (fps: number) => void }> = ({ onFpsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  const {
    keyboardSize,
    keyboardHeight,
    setKeyboardHeight,
    octaveShift,
    transpose,
    keyLabels,
    diffuseBlur,
    fallingNotes,
    flowSpeed,
    isAutoDemo,
    effectConfig,
    flowKeyConfig,
    bgConfig,
    activeNotes,
    triggerNoteOn,
    triggerNoteOff,
    expectedPitch,
    activeOverlay,
    closeOverlay
  } = useLightSyncStore();

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(220);
  const [canvasHeight, setCanvasHeight] = React.useState<number>(600);

  const ledCount = 144;
  const baseStartMidi = keyboardSize === 25 ? 48 : keyboardSize === 49 ? 36 : keyboardSize === 61 ? 36 : 21;
  const startMidi = baseStartMidi + octaveShift * 12 + transpose;

  // Particle pool for LED strip and impact sparks
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      type: 'bounce',
      pos: 0,
      vel: 0,
      radius: 0,
      maxRadius: 20,
      speed: 1.0,
      color: { r: 99, g: 102, b: 241 },
      life: 0,
      thickness: 2,
      spread: 3,
      phase: 0
    }))
  );

  // LED RGB frame buffer
  const ledsRef = useRef<{ r: number; g: number; b: number }[]>(
    Array.from({ length: ledCount }, () => ({ r: 0, g: 0, b: 0 }))
  );

  // Falling waterfall bars pool (Auto Demo / practice)
  const fallingBarsRef = useRef<WaterfallNote[]>([]);
  // Flow Key trails pool (User play / MIDI input)
  const flowTrailsRef = useRef<FlowTrail[]>([]);
  // Moving perspective grid offset
  const bgScrollOffsetRef = useRef<number>(0);

  // Pointer drag interaction
  const isPointerDownRef = useRef(false);
  const activePointerKeyRef = useRef<number | null>(null);

  // Demo step timer
  const demoTimerRef = useRef<number>(0);
  const demoStepRef = useRef<number>(0);

  // Helper to allocate a particle
  const spawnParticle = useCallback((type: EffectType, centerLed: number, color: { r: number; g: number; b: number }) => {
    const pool = particlesRef.current;
    const p = pool.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.type = type;
    p.color = color;
    p.life = 1.0;
    p.spread = effectConfig.spread;
    p.speed = effectConfig.speed;

    switch (type) {
      case 'bounce':
        p.pos = centerLed;
        p.vel = (Math.random() - 0.5) * 2.5 * effectConfig.speed;
        if (Math.abs(p.vel) < 0.4) p.vel = (p.vel >= 0 ? 0.8 : -0.8) * effectConfig.speed;
        break;
      case 'ripple':
        p.pos = centerLed;
        p.radius = 0;
        p.thickness = Math.max(1.5, effectConfig.spread * 0.6);
        p.speed = effectConfig.speed * 2.2;
        break;
      case 'pulse':
        p.pos = centerLed;
        p.radius = 0;
        p.maxRadius = effectConfig.spread * 8;
        p.speed = effectConfig.speed * 0.8;
        p.phase = 0;
        break;
      case 'hold_beam':
        p.pos = centerLed;
        p.spread = effectConfig.spread * 1.5;
        break;
      case 'glitch':
        p.pos = Math.max(0, Math.min(ledCount - 1, centerLed + (Math.random() - 0.5) * effectConfig.spread * 5));
        p.life = 0.3 + Math.random() * 0.4;
        break;
      case 'spark':
        p.pos = centerLed;
        p.vel = (Math.random() - 0.5) * 4.5 * effectConfig.speed;
        p.spread = effectConfig.spread * 0.5;
        break;
      case 'sprinkle':
        p.pos = Math.max(0, Math.min(ledCount - 1, centerLed + (Math.random() - 0.5) * effectConfig.spread * 4));
        p.life = 0.7 + Math.random() * 0.5;
        break;
      case 'rain':
        p.pos = centerLed;
        p.vel = (Math.random() > 0.5 ? 1 : -1) * effectConfig.speed * 1.8;
        p.spread = effectConfig.spread * 3.0;
        break;
      case 'wave':
        p.pos = centerLed;
        p.phase = 0;
        p.speed = effectConfig.speed * 0.2;
        p.spread = effectConfig.spread * 4.0;
        break;
    }
  }, [effectConfig, ledCount]);

  // Keyboard layout metadata
  const keys = useMemo(() => {
    const blackPattern = [false, true, false, true, false, false, true, false, true, false, true, false];
    const keyList = [];
    let whiteIndex = 0;

    for (let i = 0; i < keyboardSize; i++) {
      const midi = startMidi + i;
      const noteInOctave = midi % 12;
      const isBlack = blackPattern[noteInOctave];

      keyList.push({
        index: i,
        midi: midi,
        isBlack: isBlack,
        whiteIndex: isBlack ? -1 : whiteIndex,
        name: `${NOTE_NAMES[noteInOctave]}${Math.floor(midi / 12) - 1}`,
        solfege: SOLFEGE[noteInOctave],
        qwerty: QWERTY_LABELS[midi] || ''
      });

      if (!isBlack) whiteIndex++;
    }
    return keyList;
  }, [keyboardSize, startMidi]);

  // Calculate key geometry helper
  const getKeyGeometry = useCallback((midi: number, width: number, _keyAreaTop: number, _keyAreaHeight: number) => {
    const keyObj = keys.find(k => k.midi === midi);
    if (!keyObj) return null;

    const whiteKeys = keys.filter(k => !k.isBlack);
    const whiteKeyWidth = (width - 32) / whiteKeys.length;

    if (!keyObj.isBlack) {
      const x = 16 + keyObj.whiteIndex * whiteKeyWidth;
      return {
        x,
        width: whiteKeyWidth,
        isBlack: false
      };
    } else {
      const prevWhiteIdx = keys.slice(0, keyObj.index).filter(k => !k.isBlack).length - 1;
      const x = 16 + (prevWhiteIdx + 0.65) * whiteKeyWidth;
      const blackKeyWidth = whiteKeyWidth * 0.65;
      return {
        x,
        width: blackKeyWidth,
        isBlack: true
      };
    }
  }, [keys]);

  // Mutable refs for ultra-smooth 60/120 FPS render loop without recreation jitter
  const activeNotesRef = useRef(activeNotes);
  activeNotesRef.current = activeNotes;
  const keyboardHeightRef = useRef(keyboardHeight);
  keyboardHeightRef.current = keyboardHeight;
  const flowKeyConfigRef = useRef(flowKeyConfig);
  flowKeyConfigRef.current = flowKeyConfig;
  const bgConfigRef = useRef(bgConfig);
  bgConfigRef.current = bgConfig;
  const effectConfigRef = useRef(effectConfig);
  effectConfigRef.current = effectConfig;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const isAutoDemoRef = useRef(isAutoDemo);
  isAutoDemoRef.current = isAutoDemo;
  const keyLabelsRef = useRef(keyLabels);
  keyLabelsRef.current = keyLabels;
  const diffuseBlurRef = useRef(diffuseBlur);
  diffuseBlurRef.current = diffuseBlur;
  const fallingNotesRef = useRef(fallingNotes);
  fallingNotesRef.current = fallingNotes;
  const keysRef = useRef(keys);
  keysRef.current = keys;
  const onFpsUpdateRef = useRef(onFpsUpdate);
  onFpsUpdateRef.current = onFpsUpdate;

  // Listen for newly pressed keys to trigger LED strip effects
  const prevPitchesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const currentPitches = new Set(activeNotes.keys());
    const prevPitches = prevPitchesRef.current;

    for (const pitch of currentPitches) {
      if (!prevPitches.has(pitch)) {
        const noteData = activeNotes.get(pitch);
        const centerLed = noteData ? noteData.centerLed : 72;
        const cols = getNoteColors(pitch, effectConfig, flowKeyConfig);

        // Spawn LED strip burst
        if (effectConfig.effect === 'spark') {
          for (let i = 0; i < 6; i++) spawnParticle('spark', centerLed, cols.primary);
        } else if (effectConfig.effect === 'glitch') {
          for (let i = 0; i < 5; i++) spawnParticle('glitch', centerLed, cols.primary);
        } else if (effectConfig.effect === 'sprinkle') {
          for (let i = 0; i < 8; i++) spawnParticle('sprinkle', centerLed, cols.primary);
        } else {
          spawnParticle(effectConfig.effect, centerLed, cols.primary);
        }
      }
    }
    prevPitchesRef.current = currentPitches;
  }, [activeNotes, effectConfig, flowKeyConfig, spawnParticle]);

  // Main Rock-Solid 60/120 FPS Render Loop (Zero teardown on keypress or resize)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();

    // Auto demo melody chords
    const demoChords = [
      [60, 64, 67],      // C Maj
      [65, 69, 72],      // F Maj
      [67, 71, 74],      // G Maj
      [69, 72, 76],      // A min
      [65, 69, 72],      // F Maj
      [60, 64, 67, 72],  // C Maj spread
      [62, 65, 69],      // D min
      [67, 71, 76]       // G7 high
    ];

    const addSpreadLuminance = (centerPos: number, spread: number, color: { r: number; g: number; b: number }, factor: number) => {
      const curEff = effectConfigRef.current;
      const brt = (curEff.brightness / 255) * factor;
      const minLed = Math.max(0, Math.floor(centerPos - spread * 2));
      const maxLed = Math.min(ledCount - 1, Math.ceil(centerPos + spread * 2));
      const leds = ledsRef.current;

      for (let i = minLed; i <= maxLed; i++) {
        const dist = Math.abs(i - centerPos);
        const falloff = Math.exp(-(dist * dist) / (2 * spread * spread));
        leds[i].r = Math.min(255, leds[i].r + color.r * falloff * brt);
        leds[i].g = Math.min(255, leds[i].g + color.g * falloff * brt);
        leds[i].b = Math.min(255, leds[i].b + color.b * falloff * brt);
      }
    };

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      frameCounter++;
      if (now - fpsTimer >= 1000) {
        if (onFpsUpdateRef.current) onFpsUpdateRef.current(frameCounter);
        frameCounter = 0;
        fpsTimer = now;
      }

      const width = canvas.width;
      const height = canvas.height;
      const isDark = themeRef.current === 'dark';
      const curHeight = keyboardHeightRef.current;
      const curFlow = flowKeyConfigRef.current;
      const curBg = bgConfigRef.current;
      const curEff = effectConfigRef.current;
      const curActiveNotes = activeNotesRef.current;
      const curKeys = keysRef.current;

      // Scroll background grid offset smoothly with tempo
      bgScrollOffsetRef.current = (bgScrollOffsetRef.current + dt * 48 * curFlow.flowSpeed) % 176;

      // Dynamic resizable tall keyboard anchored directly at bottom
      const keyAreaHeight = Math.max(100, Math.min(curHeight, Math.floor(height * 0.52)));
      const keyAreaTop = height - keyAreaHeight - 1;
      const ledBarHeight = 24;
      // CRITICAL: ledBarTop is the EXACT boundary where note trails emerge into the runway!
      const ledBarTop = keyAreaTop - ledBarHeight - 1;
      const waterfallTop = 6;
      const waterfallHeight = ledBarTop - waterfallTop;

      ctx.clearRect(0, 0, width, height);

      // ==========================================
      // 1. RUNWAY BACKGROUND & PERSPECTIVE SPACE
      // ==========================================
      
      // A. Runway Deep Canvas Base
      ctx.fillStyle = isDark ? '#050608' : '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // B. Key Region Zebra Columns (Tinting for black vs white keys)
      if (curBg.showKeyRegions) {
        curKeys.forEach((key) => {
          const geom = getKeyGeometry(key.midi, width, keyAreaTop, keyAreaHeight);
          if (!geom) return;

          if (key.isBlack) {
            // Darker obsidian column for black keys giving visual depth
            ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.7)';
            ctx.fillRect(geom.x, waterfallTop, geom.width, waterfallHeight);
          } else if (curActiveNotes.has(key.midi)) {
            // Subtle active lane illumination
            ctx.fillStyle = isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.15)';
            ctx.fillRect(geom.x, waterfallTop, geom.width, waterfallHeight);
          }
        });
      }

      // C. Vertical Pitch Lanes matching piano keys
      if (curBg.showVerticalPitchLanes) {
        ctx.lineWidth = 1;
        curKeys.forEach((key) => {
          if (key.isBlack) return;
          const geom = getKeyGeometry(key.midi, width, keyAreaTop, keyAreaHeight);
          if (!geom) return;

          ctx.strokeStyle = isDark ? 'rgba(39, 39, 42, 0.45)' : 'rgba(71, 85, 105, 0.45)';
          ctx.beginPath();
          ctx.moveTo(geom.x, waterfallTop);
          ctx.lineTo(geom.x, ledBarTop);
          ctx.stroke();
        });
      }

      // D. Horizontal Time & Measure Divisions (Moving AWAY from the keyboard towards the horizon)
      if (curBg.showHorizontalBeatLines) {
        const beatSpacing = 44;
        // Continuous upward travel distance: increases over time (moves away from keyboard)
        const scrollDistance = curBg.scrollGrid ? (now * 0.001 * 50 * curFlow.flowSpeed) : 0;
        const phase = scrollDistance % beatSpacing;

        ctx.save();
        ctx.beginPath();
        ctx.rect(16, waterfallTop, width - 32, waterfallHeight);
        ctx.clip(); // Keep grid strictly contained inside the runway

        // Step upwards from ledBarTop towards waterfallTop:
        for (let y = ledBarTop + beatSpacing - phase; y >= waterfallTop - beatSpacing; y -= beatSpacing) {
          const indexFromBottom = Math.round((ledBarTop - y) / beatSpacing);
          const isMeasureBar = (indexFromBottom + Math.floor(scrollDistance / beatSpacing)) % 4 === 0;

          ctx.beginPath();
          ctx.moveTo(16, y);
          ctx.lineTo(width - 16, y);

          if (isMeasureBar) {
            ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (curBg.showSubtleGrid) {
            ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.14)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // E. Stronger Markings around Important Divisions (Octave Boundaries & C-Markers)
      if (curBg.showOctaveDividers) {
        curKeys.forEach((key) => {
          if (key.midi % 12 === 0) { // Every C note (C1, C2, C3, C4, C5, C6...)
            const geom = getKeyGeometry(key.midi, width, keyAreaTop, keyAreaHeight);
            if (!geom) return;

            // Prominent octave divider
            ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.6)' : 'rgba(129, 140, 248, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(geom.x, waterfallTop);
            ctx.lineTo(geom.x, ledBarTop);
            ctx.stroke();

            // Octave badge at runway header
            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(30, 41, 59, 0.9)';
            ctx.beginPath();
            ctx.roundRect(geom.x + 2, waterfallTop + 4, 22, 14, 4);
            ctx.fill();
            ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.7)' : 'rgba(129, 140, 248, 0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.fillStyle = '#a5b4fc';
            ctx.textAlign = 'center';
            ctx.fillText(key.name, geom.x + 13, waterfallTop + 14);
          }
        });
      }

      // F. Runway Top Glow Header
      const headerGrad = ctx.createLinearGradient(0, waterfallTop, 0, waterfallTop + 35);
      headerGrad.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)');
      headerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(16, waterfallTop, width - 32, 35);

      // ==========================================
      // 2. AUTO-DEMO WATERFALL FALLING BARS
      // ==========================================
      if (isAutoDemoRef.current) {
        demoTimerRef.current += dt;
        if (demoTimerRef.current > 0.38 / curFlow.flowSpeed) {
          demoTimerRef.current = 0;
          const chord = demoChords[demoStepRef.current % demoChords.length];
          demoStepRef.current++;

          chord.forEach((pitch) => {
            const geom = getKeyGeometry(pitch, width, keyAreaTop, keyAreaHeight);
            if (geom) {
              const cols = getNoteColors(pitch, curEff, curFlow);
              fallingBarsRef.current.push({
                id: Math.random(),
                pitch,
                x: geom.x + 2,
                width: geom.width - 4,
                y: waterfallTop,
                length: Math.max(32, 65 * curFlow.flowSpeed),
                speed: 170 * curFlow.flowSpeed,
                color: cols.primary,
                triggered: false,
                active: true
              });
            }
          });
        }
      }

      // Draw Falling Waterfall Bars (Auto Demo / Practice)
      if (fallingNotesRef.current) {
        const bars = fallingBarsRef.current;
        for (let i = bars.length - 1; i >= 0; i--) {
          const bar = bars[i];
          bar.y += bar.speed * dt;

          // Impact at LED strip line
          if (!bar.triggered && (bar.y + bar.length) >= ledBarTop) {
            bar.triggered = true;
            triggerNoteOn(bar.pitch, 100);

            const keyIdx = Math.max(0, Math.min(keyboardSize - 1, bar.pitch - startMidi));
            const centerLed = Math.floor((keyIdx / (keyboardSize - 1)) * 143);
            for (let s = 0; s < 4; s++) {
              spawnParticle('spark', centerLed, bar.color);
            }
          }

          if (bar.y >= ledBarTop) {
            if (bar.triggered && bar.active) {
              triggerNoteOff(bar.pitch);
              bar.active = false;
            }
          }

          if (bar.y > height) {
            bars.splice(i, 1);
            continue;
          }

          // Render Falling Bar
          const barGrad = ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.length);
          barGrad.addColorStop(0, `rgba(${bar.color.r}, ${bar.color.g}, ${bar.color.b}, 0.35)`);
          barGrad.addColorStop(0.8, `rgba(${bar.color.r}, ${bar.color.g}, ${bar.color.b}, 0.95)`);
          barGrad.addColorStop(1, '#ffffff');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(bar.x, bar.y, bar.width, bar.length, [6, 6, 4, 4]);
          ctx.fill();

          ctx.strokeStyle = `rgba(${bar.color.r}, ${bar.color.g}, ${bar.color.b}, 0.85)`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Impact Glow
          if (bar.y + bar.length >= ledBarTop && bar.y < ledBarTop + 10) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = `rgb(${bar.color.r}, ${bar.color.g}, ${bar.color.b})`;
            ctx.shadowBlur = 14;
            ctx.fillRect(bar.x - 2, ledBarTop - 2, bar.width + 4, 4);
            ctx.shadowBlur = 0;
          }
        }
      }

      // ==========================================
      // 3. INTERACTIVE FLOW KEY TRAILS (LIVE USER PLAY)
      // ==========================================
      const trails = flowTrailsRef.current;
      const speedPxPerSec = 170 * curFlow.flowSpeed;

      // A. Register new trails for actively pressed keys (only when NOT in auto-demo)
      if (!isAutoDemoRef.current) {
        curActiveNotes.forEach((_noteData, pitch) => {
          const existing = trails.find(t => t.pitch === pitch && t.endTime === null);
          if (!existing) {
            const geom = getKeyGeometry(pitch, width, keyAreaTop, keyAreaHeight);
            if (geom) {
              const cols = getNoteColors(pitch, curEff, curFlow);
              trails.push({
                id: Math.random(),
                pitch,
                startTime: now,
                endTime: null,
                x: geom.x + 1,
                width: geom.width - 2,
                isBlack: geom.isBlack,
                color: cols.primary,
                secondaryColor: cols.secondary
              });
            }
          }
        });
      }

      // B. Release trails when note is released
      for (let i = 0; i < trails.length; i++) {
        const t = trails[i];
        if (t.endTime === null && !curActiveNotes.has(t.pitch)) {
          t.endTime = now;
        }
      }

      // C. Render all Flow Key Trails moving up the runway
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        const elapsedHeadMs = now - t.startTime;
        const headDist = (elapsedHeadMs / 1000) * speedPxPerSec;
        // Trail head moves upward from ledBarTop!
        const headY = ledBarTop - headDist;

        let tailY: number;
        if (t.endTime === null) {
          // Actively held: tail stays anchored right at ledBarTop!
          tailY = ledBarTop;

          // Continuous contact sparks
          if (curFlow.showParticles && Math.random() < 0.25) {
            const keyIdx = Math.max(0, Math.min(keyboardSize - 1, t.pitch - startMidi));
            const centerLed = Math.floor((keyIdx / (keyboardSize - 1)) * 143);
            spawnParticle('spark', centerLed, t.color);
          }
        } else {
          // Released: tail lifts off ledBarTop and floats upward
          const elapsedTailMs = now - t.endTime;
          const tailDist = (elapsedTailMs / 1000) * speedPxPerSec;
          tailY = ledBarTop - tailDist;
        }

        // Remove trail once it completely clears the top of the runway
        if (tailY < waterfallTop || headY < -300) {
          trails.splice(i, 1);
          continue;
        }

        // Clamped bounds inside waterfall runway
        const barTop = Math.max(waterfallTop, headY);
        const barBottom = Math.min(ledBarTop, tailY);
        const barHeight = barBottom - barTop;

        // Dynamic geometry lookup so trails stay 100% aligned during screen resizes
        const geom = getKeyGeometry(t.pitch, width, keyAreaTop, keyAreaHeight);
        if (!geom) continue;
        const trailX = geom.x + 1;
        const trailWidth = geom.width - 2;

        if (barHeight > 2) {
          const col = t.color;
          const sec = t.secondaryColor;

          // Optical Bloom Aura
          if (curFlow.bloomGlow && curFlow.glowIntensity > 0) {
            const glowAlpha = (curFlow.glowIntensity / 100) * 0.7;
            ctx.shadowColor = `rgba(${col.r}, ${col.g}, ${col.b}, ${glowAlpha})`;
            ctx.shadowBlur = Math.max(4, Math.round((curFlow.glowIntensity / 100) * 16));
          }

          // Shaders matching Flow Key Trail Style
          const barGrad = ctx.createLinearGradient(0, barBottom, 0, barTop);
          if (curFlow.trailStyle === 'glow_laser') {
            barGrad.addColorStop(0, '#ffffff');
            barGrad.addColorStop(0.2, `rgba(${col.r}, ${col.g}, ${col.b}, 0.95)`);
            barGrad.addColorStop(1, `rgba(${sec.r}, ${sec.g}, ${sec.b}, 0.15)`);
          } else if (curFlow.trailStyle === 'gradient_ribbon') {
            barGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.9)`);
            barGrad.addColorStop(0.5, `rgba(${sec.r}, ${sec.g}, ${sec.b}, 0.7)`);
            barGrad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0.1)`);
          } else if (curFlow.trailStyle === 'particle_cascade') {
            barGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.9)`);
            barGrad.addColorStop(0.8, `rgba(${sec.r}, ${sec.g}, ${sec.b}, 0.6)`);
            barGrad.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0.05)`);
          } else { // 'neon_bar' (default)
            barGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.95)`);
            barGrad.addColorStop(0.7, `rgba(${col.r}, ${col.g}, ${col.b}, 0.75)`);
            barGrad.addColorStop(1, `rgba(${sec.r}, ${sec.g}, ${sec.b}, 0.2)`);
          }

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(trailX, barTop, trailWidth, barHeight, [5, 5, 3, 3]);
          ctx.fill();

          // Neon outline
          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.85)`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Acrylic glass reflection highlight
          const glassGrad = ctx.createLinearGradient(trailX, 0, trailX + trailWidth, 0);
          glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
          glassGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.1)');
          glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glassGrad;
          ctx.fillRect(trailX + 1, barTop, Math.max(2, trailWidth * 0.35), barHeight);

          ctx.shadowBlur = 0; // Reset shadow

          // White contact flare right at ledBarTop when key is actively held
          if (t.endTime === null && tailY >= ledBarTop - 2) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = `rgb(${col.r}, ${col.g}, ${col.b})`;
            ctx.shadowBlur = 10;
            ctx.fillRect(trailX - 1, ledBarTop - 2, trailWidth + 2, 3);
            ctx.shadowBlur = 0;
          }
        }
      }

      // ==========================================
      // 4. LED BUFFER DECAY & AURA
      // ==========================================
      const decay = curEff.decay;
      const leds = ledsRef.current;
      for (let i = 0; i < ledCount; i++) {
        leds[i].r *= decay;
        leds[i].g *= decay;
        leds[i].b *= decay;
      }

      // Sustain aura on held keys
      curActiveNotes.forEach((noteData) => {
        const cols = getNoteColors(noteData.pitch, curEff, curFlow);
        addSpreadLuminance(noteData.centerLed, curEff.spread * 1.2, cols.primary, 1.0);
      });

      // Update active particles
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) continue;

        p.life -= dt * (1.2 / Math.max(0.1, p.speed));
        if (p.life <= 0) {
          p.active = false;
          continue;
        }

        switch (p.type) {
          case 'bounce':
            p.pos += p.vel * dt * 45;
            if (p.pos <= 0 || p.pos >= ledCount - 1) {
              p.vel *= -1;
              p.pos = Math.max(0, Math.min(ledCount - 1, p.pos));
            }
            addSpreadLuminance(p.pos, p.spread, p.color, p.life);
            break;
          case 'ripple':
            p.radius += dt * 38 * p.speed;
            if (p.pos - p.radius >= 0) addSpreadLuminance(p.pos - p.radius, p.thickness, p.color, p.life * 0.9);
            if (p.pos + p.radius < ledCount) addSpreadLuminance(p.pos + p.radius, p.thickness, p.color, p.life * 0.9);
            break;
          case 'pulse':
            p.phase += dt * 5 * p.speed;
            p.radius = Math.sin(p.phase) * p.maxRadius;
            addSpreadLuminance(p.pos, Math.max(1, Math.abs(p.radius)), p.color, p.life);
            break;
          case 'hold_beam':
            addSpreadLuminance(p.pos, p.spread, p.color, p.life);
            break;
          case 'glitch':
            if (Math.random() > 0.4) {
              const jitterPos = Math.max(0, Math.min(ledCount - 1, p.pos + (Math.random() - 0.5) * 6));
              addSpreadLuminance(jitterPos, 1.5, p.color, p.life * 1.3);
            }
            break;
          case 'spark':
            p.pos += p.vel * dt * 50;
            if (p.pos >= 0 && p.pos < ledCount) addSpreadLuminance(p.pos, 1.2, p.color, p.life * 1.5);
            break;
          case 'sprinkle':
            if (Math.random() > 0.5) addSpreadLuminance(p.pos, 1.8, p.color, p.life);
            break;
          case 'rain':
            p.pos += p.vel * dt * 40;
            if (p.pos >= 0 && p.pos < ledCount) addSpreadLuminance(p.pos, p.spread, p.color, p.life);
            break;
          case 'wave':
            p.phase += dt * 8;
            const wavePos = p.pos + Math.sin(p.phase) * (p.spread * 3);
            if (wavePos >= 0 && wavePos < ledCount) addSpreadLuminance(wavePos, 2.5, p.color, p.life);
            break;
        }
      }

      // ==========================================
      // 5. DRAW WS2812B LED STRIP MOUNT
      // ==========================================
      ctx.fillStyle = isDark ? '#09090b' : '#f1f5f9';
      ctx.fillRect(8, ledBarTop, width - 16, ledBarHeight);
      ctx.strokeStyle = isDark ? '#27272a' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, ledBarTop, width - 16, ledBarHeight);

      const ledSpacing = (width - 32) / ledCount;

      for (let i = 0; i < ledCount; i++) {
        const ledX = 16 + i * ledSpacing + ledSpacing / 2;
        const ledY = ledBarTop + ledBarHeight / 2;
        const col = leds[i];

        // LED dot core
        ctx.beginPath();
        ctx.arc(ledX, ledY, Math.min(ledSpacing * 0.4, 3.2), 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)})`;
        ctx.fill();

        // Silicone optical diffuser blur
        if (diffuseBlurRef.current && (col.r > 8 || col.g > 8 || col.b > 8)) {
          const glowGrad = ctx.createRadialGradient(ledX, ledY, 0, ledX, ledY, ledSpacing * 2.8);
          glowGrad.addColorStop(0, `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, 0.85)`);
          glowGrad.addColorStop(0.5, `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, 0.3)`);
          glowGrad.addColorStop(1, `rgba(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)}, 0)`);

          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(ledX, ledY, ledSpacing * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ==========================================
      // 6. DRAW PIANO KEYS (Anchored directly at bottom)
      // ==========================================
      const whiteKeys = curKeys.filter(k => !k.isBlack);
      const whiteKeyWidth = (width - 32) / whiteKeys.length;
      const blackKeyHeight = keyAreaHeight * 0.64;

      // A. White Keys
      whiteKeys.forEach((key, wIdx) => {
        const keyX = 16 + wIdx * whiteKeyWidth;
        const isPressed = curActiveNotes.has(key.midi);
        const isExpected = expectedPitch === key.midi;

        if (isPressed) {
          const cols = getNoteColors(key.midi, curEff, curFlow);
          ctx.fillStyle = `rgb(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b})`;
        } else if (isExpected) {
          ctx.fillStyle = '#10b981';
        } else {
          ctx.fillStyle = isDark ? '#18181b' : '#ffffff';
        }

        ctx.fillRect(keyX + 1, keyAreaTop, whiteKeyWidth - 2, keyAreaHeight);
        ctx.strokeStyle = isDark ? '#27272a' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(keyX + 1, keyAreaTop, whiteKeyWidth - 2, keyAreaHeight);

        // Pressed bottom accent line
        if (isPressed) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(keyX + 2, keyAreaTop + keyAreaHeight - 6, whiteKeyWidth - 4, 4);
        }

        // Key Labels
        const lblType = keyLabelsRef.current;
        if (lblType !== 'none') {
          ctx.fillStyle = isPressed ? '#ffffff' : (isDark ? '#71717a' : '#94a3b8');
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.textAlign = 'center';

          let label = '';
          if (lblType === 'notes') label = key.name;
          else if (lblType === 'solfege') label = key.solfege;
          else if (lblType === 'qwerty') label = key.qwerty;

          ctx.fillText(label, keyX + whiteKeyWidth / 2, keyAreaTop + keyAreaHeight - 12);
        }
      });

      // B. Black Keys (Overlaid on top)
      curKeys.forEach((key) => {
        if (!key.isBlack) return;

        const prevWhiteIdx = curKeys.slice(0, key.index).filter(k => !k.isBlack).length - 1;
        const keyX = 16 + (prevWhiteIdx + 0.65) * whiteKeyWidth;
        const blackKeyWidth = whiteKeyWidth * 0.65;
        const isPressed = curActiveNotes.has(key.midi);
        const isExpected = expectedPitch === key.midi;

        if (isPressed) {
          const cols = getNoteColors(key.midi, curEff, curFlow);
          ctx.fillStyle = `rgb(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b})`;
        } else if (isExpected) {
          ctx.fillStyle = '#059669';
        } else {
          ctx.fillStyle = isDark ? '#000000' : '#0f172a';
        }

        ctx.fillRect(keyX, keyAreaTop, blackKeyWidth, blackKeyHeight);
        ctx.strokeStyle = isDark ? '#3f3f46' : '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(keyX, keyAreaTop, blackKeyWidth, blackKeyHeight);

        // Black key accent top
        ctx.fillStyle = isPressed ? '#ffffff' : (isDark ? '#27272a' : '#1e293b');
        ctx.fillRect(keyX + 1, keyAreaTop, blackKeyWidth - 2, 4);

        if (keyLabelsRef.current === 'qwerty' && key.qwerty) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(key.qwerty, keyX + blackKeyWidth / 2, keyAreaTop + blackKeyHeight - 8);
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animId);
  }, [
    keyboardSize,
    startMidi,
    getKeyGeometry,
    spawnParticle,
    triggerNoteOn,
    triggerNoteOff
  ]);

  // Coordinate mapping for touch/mouse interaction
  const getPitchFromCoords = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const keyAreaHeight = Math.max(100, Math.min(keyboardHeight, Math.floor(canvas.height * 0.52)));
    const keyAreaTop = canvas.height - keyAreaHeight - 1;

    // Only keys area triggers notes
    if (y < keyAreaTop) return null;

    const whiteKeys = keys.filter(k => !k.isBlack);
    const whiteKeyWidth = (canvas.width - 32) / whiteKeys.length;
    const blackKeyHeight = keyAreaHeight * 0.64;

    // Check black keys first
    if (y < keyAreaTop + blackKeyHeight) {
      for (const key of keys) {
        if (!key.isBlack) continue;
        const prevWhiteIdx = keys.slice(0, key.index).filter(k => !k.isBlack).length - 1;
        const keyX = 16 + (prevWhiteIdx + 0.65) * whiteKeyWidth;
        const blackKeyWidth = whiteKeyWidth * 0.65;

        if (x >= keyX && x <= keyX + blackKeyWidth) {
          return key.midi;
        }
      }
    }

    // Check white keys
    const whiteIdx = Math.floor((x - 16) / whiteKeyWidth);
    if (whiteIdx >= 0 && whiteIdx < whiteKeys.length) {
      return whiteKeys[whiteIdx].midi;
    }

    return null;
  }, [keys, keyboardHeight]);

  // Pointer Handlers with Drag Capture & Overlay Autohide
  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeOverlay !== null) {
      closeOverlay();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;

    const pitch = getPitchFromCoords(e.clientX, e.clientY);
    if (pitch !== null) {
      activePointerKeyRef.current = pitch;
      triggerNoteOn(pitch, 100);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const pitch = getPitchFromCoords(e.clientX, e.clientY);

    if (pitch !== activePointerKeyRef.current) {
      if (activePointerKeyRef.current !== null) {
        triggerNoteOff(activePointerKeyRef.current);
      }
      if (pitch !== null) {
        triggerNoteOn(pitch, 100);
      }
      activePointerKeyRef.current = pitch;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPointerDownRef.current) {
      if (activePointerKeyRef.current !== null) {
        triggerNoteOff(activePointerKeyRef.current);
        activePointerKeyRef.current = null;
      }
      isPointerDownRef.current = false;
      try {
        if (e.currentTarget && e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
  };

  // Dynamic Responsive Resize Observer for any screen aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const updateSize = () => {
      const rect = parent.getBoundingClientRect();
      const targetW = Math.max(320, Math.floor(rect.width));
      const targetH = Math.max(240, Math.floor(rect.height));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      setCanvasHeight(targetH);
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });

    ro.observe(parent);
    window.addEventListener('resize', updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Seamless boundary drag resize handlers
  const handleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = keyboardHeight;
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    const maxAllowed = Math.floor(canvasHeight * 0.52);
    const newHeight = Math.max(100, Math.min(Math.min(420, maxAllowed), startHeightRef.current + deltaY));
    setKeyboardHeight(newHeight);
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const effectiveKeyHeight = Math.max(100, Math.min(keyboardHeight, Math.floor(canvasHeight * 0.52)));

  return (
    <div className="relative w-full h-full max-w-[1920px] max-h-[calc(100vw*0.62)] flex flex-col bg-slate-950 dark:bg-black rounded-xl sm:rounded-2xl border border-slate-800/80 dark:border-zinc-800/80 p-1 sm:p-1.5 overflow-hidden shadow-2xl transition-colors min-h-0">
      {/* Visualizer Top Info Bar */}
      <div className="w-full flex justify-between items-center px-3 py-1 text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0 select-none">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          WATERFALL FLOW KEYS RUNWAY
        </span>
        <span className="truncate ml-2">WS2812B (144 LEDS) • {keyboardSize} KEYS (MIDI {startMidi} - {startMidi + keyboardSize - 1}) • QWERTY [A-K]</span>
      </div>

      {/* Visualizer Workspace with Seamless Pill-less Drag Boundary */}
      <div className="relative w-full flex-1 min-h-0 overflow-hidden">
        {/* Seamless Pill-less Resizing Boundary Edge (Zero obstruction, reveals sleek hairline on hover/drag) */}
        <div
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => setKeyboardHeight(220)}
          style={{ bottom: `${effectiveKeyHeight + 25}px` }}
          className="absolute left-0 right-0 h-4 -mb-2 z-20 cursor-row-resize select-none touch-none group flex items-center"
          title="Drag boundary up or down to resize keyboard (Double-click to reset)"
        >
          {/* Subtle sleek hairline laser guide that only reveals upon hover/drag */}
          <div className="w-full h-[2px] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-150 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.7)]" />
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full cursor-pointer touch-none block"
        />
      </div>
    </div>
  );
};
