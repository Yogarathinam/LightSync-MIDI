import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { useTheme } from '../../context/ThemeContext';
import { EffectType, EffectConfig, FlowKeyConfig } from '../../types';
import { SongTimelineScrubber } from '../layout/SongTimelineScrubber';

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

interface RunwayParticle {
  active: boolean;
  type: 'spark' | 'burst';
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: { r: number; g: number; b: number };
  life: number;
  maxLife: number;
}

interface ShockwaveRipple {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;
  color: { r: number; g: number; b: number };
}

interface LensFlare {
  active: boolean;
  x: number;
  y: number;
  width: number;
  life: number;
  color: { r: number; g: number; b: number };
}

interface AmbientParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftPhase: number;
  driftSpeed: number;
  alpha: number;
  color: { r: number; g: number; b: number };
}

const MAX_PARTICLES = 64;
const MAX_FALLING_NOTES = 128;
const MAX_RUNWAY_PARTICLES = 128;
const MAX_RIPPLES = 16;
const MAX_LENS_FLARES = 6;
const AMBIENT_PARTICLES_COUNT = 36;

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

  // Use custom FlowKey colors if present, otherwise fallback to effectConfig primary/secondary
  const pColor = flowKeyConfig.customColor || effectConfig.primaryColor;
  const sColor = flowKeyConfig.customSecondaryColor || effectConfig.secondaryColor || pColor;

  const p = hexToRgb(pColor);
  const s = hexToRgb(sColor);
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
    setExpectedPitch,
    currentSong,
    isSongPlaying,
    songPlaybackId,
    startSongPlayback,
    stopSongPlayback,
    seekEpoch,
    targetSeekBeat,
    seekToBeat,
    setPlaybackBeat,
    learnMode,
    isWaitingAtHitline,
    setWaitingState,
    handFilter,
    leftHandColor,
    rightHandColor,
    activeWorkspace,
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

  // 2D Runway Visual Effects Pools
  const runwayParticlesRef = useRef<RunwayParticle[]>(
    Array.from({ length: MAX_RUNWAY_PARTICLES }, () => ({
      active: false,
      type: 'spark',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      color: { r: 99, g: 102, b: 241 },
      life: 0,
      maxLife: 1
    }))
  );

  const shockwaveRipplesRef = useRef<ShockwaveRipple[]>(
    Array.from({ length: MAX_RIPPLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 0,
      maxRadius: 60,
      speed: 120,
      life: 0,
      color: { r: 99, g: 102, b: 241 }
    }))
  );

  const lensFlaresRef = useRef<LensFlare[]>(
    Array.from({ length: MAX_LENS_FLARES }, () => ({
      active: false,
      x: 0,
      y: 0,
      width: 0,
      life: 0,
      color: { r: 255, g: 255, b: 255 }
    }))
  );

  const ambientParticlesRef = useRef<AmbientParticle[]>(
    Array.from({ length: AMBIENT_PARTICLES_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1.0 + Math.random() * 2.2,
      speedY: 0.12 + Math.random() * 0.3,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.4 + Math.random() * 1.2,
      alpha: 0.15 + Math.random() * 0.45,
      color: Math.random() > 0.5 ? { r: 165, g: 180, b: 252 } : { r: 192, g: 132, b: 252 }
    }))
  );

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
      case 'static':
      case 'blink':
        p.pos = centerLed;
        p.spread = 0; // strictly one LED only!
        p.life = 1.0;
        break;
    }
  }, [effectConfig, ledCount]);

  // Helper to spawn 2D sparks and bursts at note impact / press
  const spawnRunwayBursts = useCallback((x: number, y: number, color: { r: number; g: number; b: number }, count = 12, isBurst = false) => {
    const pool = runwayParticlesRef.current;
    let spawned = 0;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      const p = pool[i];
      if (!p.active) {
        p.active = true;
        p.type = isBurst ? (Math.random() < 0.4 ? 'burst' : 'spark') : 'spark';
        p.x = x + (Math.random() - 0.5) * 8;
        p.y = y + (Math.random() - 0.5) * 4;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * (isBurst ? Math.PI * 1.2 : Math.PI * 0.7);
        const speed = isBurst ? (80 + Math.random() * 160) : (50 + Math.random() * 120);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = isBurst ? (2.0 + Math.random() * 2.5) : (1.2 + Math.random() * 2.0);
        p.color = color;
        p.life = 1.0;
        p.maxLife = 0.4 + Math.random() * 0.4;
        spawned++;
      }
    }
  }, []);

  // Helper to spawn a shockwave ripple at key press location
  const spawnShockwaveRipple = useCallback((x: number, y: number, color: { r: number; g: number; b: number }, maxRadius = 70) => {
    const pool = shockwaveRipplesRef.current;
    const r = pool.find(item => !item.active);
    if (!r) return;
    r.active = true;
    r.x = x;
    r.y = y;
    r.radius = 2;
    r.maxRadius = maxRadius;
    r.speed = 140;
    r.life = 1.0;
    r.color = color;
  }, []);

  // Helper to spawn an anamorphic lens flare on chords or intense notes
  const spawnLensFlare = useCallback((x: number, y: number, color: { r: number; g: number; b: number }, width = 340) => {
    const pool = lensFlaresRef.current;
    const f = pool.find(item => !item.active);
    if (!f) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.width = width;
    f.life = 1.0;
    f.color = color;
  }, []);

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
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const isSongPlayingRef = useRef(isSongPlaying);
  isSongPlayingRef.current = isSongPlaying;
  const handFilterRef = useRef(handFilter);
  handFilterRef.current = handFilter;
  const leftHandColorRef = useRef(leftHandColor);
  leftHandColorRef.current = leftHandColor;
  const rightHandColorRef = useRef(rightHandColor);
  rightHandColorRef.current = rightHandColor;
  const activeWorkspaceRef = useRef(activeWorkspace);
  activeWorkspaceRef.current = activeWorkspace;
  const songBeatRef = useRef<number>(0);
  const soundingSongNotesRef = useRef<Map<number, number>>(new Map());
  const learnModeRef = useRef(learnMode);
  learnModeRef.current = learnMode;
  const playbackPublishTimerRef = useRef<number>(0);

  // Cleanly synchronize song playback: whenever songPlaybackId or currentSong changes, reset notes
  useEffect(() => {
    songBeatRef.current = 0;
    soundingSongNotesRef.current.forEach((pitch) => triggerNoteOff(pitch));
    soundingSongNotesRef.current.clear();
    fallingBarsRef.current = [];
  }, [songPlaybackId, currentSong?.id, triggerNoteOff]);

  // Handle interactive timeline seeking (scrub forward / reverse)
  useEffect(() => {
    if (seekEpoch > 0) {
      songBeatRef.current = targetSeekBeat;
      soundingSongNotesRef.current.forEach((pitch) => triggerNoteOff(pitch));
      soundingSongNotesRef.current.clear();
      fallingBarsRef.current = [];
    }
  }, [seekEpoch, targetSeekBeat, triggerNoteOff]);

  // Listen for newly pressed keys to trigger LED strip effects & 2D Runway VFX
  const prevPitchesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const currentPitches = new Set(activeNotes.keys());
    const prevPitches = prevPitchesRef.current;

    for (const pitch of currentPitches) {
      if (!prevPitches.has(pitch)) {
        const noteData = activeNotes.get(pitch);
        const centerLed = noteData ? noteData.centerLed : 72;
        const velocity = noteData ? noteData.velocity : 100;
        const cols = getNoteColors(pitch, effectConfig, flowKeyConfig);

        // Spawn LED strip burst (static effect is sustained directly while held)
        if (effectConfig.effect === 'static' || effectConfig.effect === 'blink') {
          // Maintained solid in held loop!
        } else if (effectConfig.effect === 'spark') {
          for (let i = 0; i < 6; i++) spawnParticle('spark', centerLed, cols.primary);
        } else if (effectConfig.effect === 'glitch') {
          for (let i = 0; i < 5; i++) spawnParticle('glitch', centerLed, cols.primary);
        } else if (effectConfig.effect === 'sprinkle') {
          for (let i = 0; i < 8; i++) spawnParticle('sprinkle', centerLed, cols.primary);
        } else {
          spawnParticle(effectConfig.effect, centerLed, cols.primary);
        }

        // Spawn 2D Runway VFX (sparks, note bursts, ripples, lens flares)
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const curH = keyboardHeightRef.current;
          const keyAreaHeight = Math.max(100, Math.min(curH, Math.floor(canvas.height * 0.52)));
          const keyAreaTop = canvas.height - keyAreaHeight - 1;
          const ledBarTop = keyAreaTop - 25;
          const geom = getKeyGeometry(pitch, canvas.width, keyAreaTop, keyAreaHeight);
          if (geom) {
            const keyCenterX = geom.x + geom.width / 2;
            spawnRunwayBursts(keyCenterX, ledBarTop, cols.primary, 14, velocity > 85);
            spawnShockwaveRipple(keyCenterX, ledBarTop, cols.primary, geom.width * 2.8 + 45);
            if (velocity >= 90 || currentPitches.size >= 3) {
              spawnLensFlare(keyCenterX, ledBarTop, cols.primary, Math.max(280, canvas.width * 0.45));
            }
          }
        }
      }
    }

    // Trigger smooth release fade when keys are released
    for (const pitch of prevPitches) {
      if (!currentPitches.has(pitch)) {
        if (effectConfig.effect === 'static' || effectConfig.effect === 'blink') {
          const keyIdx = Math.max(0, Math.min(keyboardSize - 1, pitch - startMidi));
          const centerLed = Math.floor((keyIdx / (keyboardSize - 1)) * 143);
          const cols = getNoteColors(pitch, effectConfig, flowKeyConfig);
          spawnParticle('static', centerLed, cols.primary);
        }
      }
    }
    prevPitchesRef.current = currentPitches;
  }, [activeNotes, effectConfig, flowKeyConfig, spawnParticle, getKeyGeometry, spawnRunwayBursts, spawnShockwaveRipple, spawnLensFlare, keyboardSize, startMidi]);

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

      // B. Volumetric Atmospheric Haze & Reactive Musical Atmosphere
      const reactiveEnergy = Math.min(1.0, curActiveNotes.size * 0.22);
      const beatPulse = Math.pow(Math.sin((now * 0.002) * Math.PI), 6);
      const totalPulse = Math.max(beatPulse * 0.35, reactiveEnergy);

      // Custom Color resolution for runway background and grid
      const customHazeRgb = curBg.hazeColor ? hexToRgb(curBg.hazeColor) : { r: 99, g: 102, b: 241 };
      const customLaneRgb = curBg.laneColor ? hexToRgb(curBg.laneColor) : (isDark ? { r: 71, g: 85, b: 105 } : { r: 148, g: 163, b: 184 });
      const customGridRgb = curBg.gridColor ? hexToRgb(curBg.gridColor) : (isDark ? { r: 148, g: 163, b: 184 } : { r: 100, g: 116, b: 139 });

      const hazeGrad = ctx.createLinearGradient(0, ledBarTop, 0, waterfallTop);
      const hazeAlpha = (isDark ? 0.12 : 0.06) + totalPulse * 0.14;
      hazeGrad.addColorStop(0, `rgba(${customHazeRgb.r}, ${customHazeRgb.g}, ${customHazeRgb.b}, ${hazeAlpha})`);
      hazeGrad.addColorStop(0.5, `rgba(${customHazeRgb.r}, ${customHazeRgb.g}, ${customHazeRgb.b}, ${hazeAlpha * 0.45})`);
      hazeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(16, waterfallTop, width - 32, waterfallHeight);

      // C. Particle Field: Ambient Stardust Floating through Background Runway
      const ambParts = ambientParticlesRef.current;
      for (let i = 0; i < ambParts.length; i++) {
        const ap = ambParts[i];
        ap.driftPhase += dt * ap.driftSpeed;
        ap.y -= ap.speedY * dt * 0.06;
        if (ap.y < 0) ap.y += 1.0;

        const apx = 16 + ap.x * (width - 32) + Math.sin(ap.driftPhase) * 6;
        const apy = waterfallTop + ap.y * waterfallHeight;
        const twinkle = 0.5 + 0.5 * Math.sin(ap.driftPhase * 2.5);
        const curAlpha = ap.alpha * twinkle * (isDark ? 0.55 : 0.35);

        ctx.fillStyle = `rgba(${ap.color.r}, ${ap.color.g}, ${ap.color.b}, ${curAlpha})`;
        ctx.beginPath();
        ctx.arc(apx, apy, ap.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // D. Key Region Zebra Columns (Tinting for black vs white keys & reactive pitch columns)
      if (curBg.showKeyRegions) {
        curKeys.forEach((key) => {
          const geom = getKeyGeometry(key.midi, width, keyAreaTop, keyAreaHeight);
          if (!geom) return;

          if (key.isBlack) {
            // Darker obsidian column for black keys giving visual depth
            ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.7)';
            ctx.fillRect(geom.x, waterfallTop, geom.width, waterfallHeight);
          }

          if (curActiveNotes.has(key.midi)) {
            // Reactive Background: active pitch column glowing upward
            const cols = getNoteColors(key.midi, curEff, curFlow);
            const beamGrad = ctx.createLinearGradient(0, ledBarTop, 0, waterfallTop);
            beamGrad.addColorStop(0, `rgba(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b}, 0.22)`);
            beamGrad.addColorStop(0.6, `rgba(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b}, 0.07)`);
            beamGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(geom.x, waterfallTop, geom.width, waterfallHeight);
          }
        });
      }

      // E. Vertical Pitch Lanes matching piano keys
      if (curBg.showVerticalPitchLanes) {
        ctx.lineWidth = 1;
        curKeys.forEach((key) => {
          if (key.isBlack) return;
          const geom = getKeyGeometry(key.midi, width, keyAreaTop, keyAreaHeight);
          if (!geom) return;

          ctx.strokeStyle = `rgba(${customLaneRgb.r}, ${customLaneRgb.g}, ${customLaneRgb.b}, ${isDark ? 0.45 : 0.35})`;
          ctx.beginPath();
          ctx.moveTo(geom.x, waterfallTop);
          ctx.lineTo(geom.x, ledBarTop);
          ctx.stroke();
        });
      }

      // F. Horizontal Time & Measure Divisions (Synthesia-style: moves towards keyboard in songs/practice)
      if (curBg.showHorizontalBeatLines) {
        const beatSpacing = 44;
        const isSongActive = isSongPlayingRef.current;
        const isSongMode = isSongActive || activeWorkspaceRef.current === 'songs' || activeWorkspaceRef.current === 'learn';
        let scrollDistance = 0;
        if (curBg.scrollGrid) {
          if (isSongMode && currentSongRef.current) {
            const speed = 170 * curFlow.flowSpeed;
            const bpm = currentSongRef.current.bpm || 120;
            const pxPerBeat = (speed * 60) / bpm;
            scrollDistance = -(songBeatRef.current * pxPerBeat);
          } else {
            const scrollDir = isSongActive ? -1 : 1;
            scrollDistance = (now * 0.001 * 50 * curFlow.flowSpeed * scrollDir);
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(16, waterfallTop, width - 32, waterfallHeight);
        ctx.clip(); // Keep grid strictly contained inside the runway

        const kMin = Math.floor((scrollDistance - waterfallHeight - beatSpacing) / beatSpacing) - 1;
        const kMax = Math.ceil((scrollDistance + beatSpacing) / beatSpacing) + 1;

        for (let k = kMin; k <= kMax; k++) {
          const y = ledBarTop - (scrollDistance - k * beatSpacing);
          if (y < waterfallTop - 2 || y > ledBarTop + 2) continue;

          const isMeasureBar = ((k % 4 + 4) % 4 === 0);

          ctx.beginPath();
          ctx.moveTo(16, y);
          ctx.lineTo(width - 16, y);

          if (isMeasureBar) {
            ctx.strokeStyle = `rgba(${customGridRgb.r}, ${customGridRgb.g}, ${customGridRgb.b}, ${isDark ? 0.35 : 0.45})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (curBg.showSubtleGrid) {
            ctx.strokeStyle = `rgba(${customGridRgb.r}, ${customGridRgb.g}, ${customGridRgb.b}, ${isDark ? 0.12 : 0.18})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // G. Stronger Markings around Important Divisions (Octave Boundaries & C-Markers)
      if (curBg.showOctaveDividers) {
        curKeys.forEach((key) => {
          if (key.midi % 12 === 0) { // Every C note (C1, C2, C3, C4, C5, C6...)
            const geom = getKeyGeometry(key.midi, width, keyAreaTop, keyAreaHeight);
            if (!geom) return;

            const isOctaveActive = Array.from(curActiveNotes.keys()).some(p => Math.floor(p / 12) === Math.floor(key.midi / 12));
            ctx.strokeStyle = isOctaveActive 
              ? (isDark ? 'rgba(129, 140, 248, 0.9)' : 'rgba(99, 102, 241, 0.95)')
              : (isDark ? 'rgba(99, 102, 241, 0.6)' : 'rgba(129, 140, 248, 0.7)');
            ctx.lineWidth = isOctaveActive ? 2.5 : 2;
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

      // H. Beat Pulse Lateral Border & Horizon Glow
      if (totalPulse > 0.02) {
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 + totalPulse * 0.22})`;
        ctx.lineWidth = 1 + totalPulse * 1.5;
        ctx.strokeRect(16, waterfallTop, width - 32, waterfallHeight);
      }

      const headerGrad = ctx.createLinearGradient(0, waterfallTop, 0, waterfallTop + 35);
      headerGrad.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)');
      headerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(16, waterfallTop, width - 32, 35);

      // ==========================================
      // 2. SONG PLAYBACK & AUTO-DEMO WATERFALL FALLING BARS (Synthesia Style)
      // ==========================================
      const curSong = currentSongRef.current;
      const isSongOn = isSongPlayingRef.current;
      const isSongMode = isSongOn || activeWorkspaceRef.current === 'songs' || activeWorkspaceRef.current === 'learn';
      const curLearnMode = learnModeRef.current;
      const hFilter = handFilterRef.current;

      const isMatchingHand = (hand?: string) => {
        if (hFilter === 'right' && hand === 'left') return false;
        if (hFilter === 'left' && hand === 'right') return false;
        return true;
      };

      if (curSong && curSong.notes && curSong.notes.length > 0 && isSongMode) {
        const speed = 170 * curFlow.flowSpeed;
        const maxNoteEnd = Math.max(...curSong.notes.map(n => n.time + n.duration));

        let canAdvance = isSongOn;

        if (isSongOn) {
          if (curLearnMode === 'wait_for_key') {
            // Find next target note that matches hand filter and has not finished its duration
            const targetNote = curSong.notes.find(
              n => isMatchingHand(n.hand) && songBeatRef.current < (n.time + n.duration)
            );

            if (targetNote) {
              // Check if note has arrived at hitline (ledBarTop)
              if (songBeatRef.current >= targetNote.time) {
                // Find all notes in this chord (within 0.05 beats of targetNote.time)
                const chordNotes = curSong.notes.filter(
                  n => isMatchingHand(n.hand) && Math.abs(n.time - targetNote.time) < 0.05 && songBeatRef.current < (n.time + n.duration)
                );
                const allHeld = chordNotes.every(n => curActiveNotes.has(n.pitch));

                if (!allHeld) {
                  // Freeze right at targetNote.time until user strikes key!
                  songBeatRef.current = Math.max(targetNote.time, songBeatRef.current);
                  canAdvance = false;
                  setWaitingState(true, targetNote.pitch);
                  setExpectedPitch(targetNote.pitch);
                } else {
                  // Key is actively held: let timeline progress through its duration!
                  canAdvance = true;
                  setWaitingState(false, null);
                  setExpectedPitch(null);
                }
              } else {
                setWaitingState(false, null);
                setExpectedPitch(null);
              }
            } else {
              setWaitingState(false, null);
              setExpectedPitch(null);
            }
          }

          if (canAdvance) {
            const prevBeat = songBeatRef.current;
            songBeatRef.current += dt * (curSong.bpm / 60);
            const currentBeat = songBeatRef.current;

            // In Watch & Listen: trigger notes and explosive impact visuals
            if (curLearnMode !== 'wait_for_key') {
              curSong.notes.forEach((note, idx) => {
                if (!isMatchingHand(note.hand)) return;

                // Note On
                if (prevBeat < note.time && currentBeat >= note.time) {
                  triggerNoteOn(note.pitch, 100);
                  soundingSongNotesRef.current.set(idx, note.pitch);

                  const geom = getKeyGeometry(note.pitch, width, keyAreaTop, keyAreaHeight);
                  if (geom) {
                    const noteColorHex = note.hand === 'left'
                      ? (leftHandColorRef.current || '#38bdf8')
                      : (rightHandColorRef.current || '#10b981');
                    const col = hexToRgb(noteColorHex);
                    const keyIdx = Math.max(0, Math.min(keyboardSize - 1, note.pitch - startMidi));
                    const centerLed = Math.floor((keyIdx / (keyboardSize - 1)) * 143);

                    if (curEff.effect !== 'static' && curEff.effect !== 'blink') {
                      for (let s = 0; s < 4; s++) spawnParticle('spark', centerLed, col);
                      const keyCenterX = geom.x + geom.width / 2;
                      spawnRunwayBursts(keyCenterX, ledBarTop, col, 12, true);
                      spawnShockwaveRipple(keyCenterX, ledBarTop, col, geom.width * 2.5 + 40);
                      if (Math.random() < 0.3) spawnLensFlare(keyCenterX, ledBarTop, col, 260);
                    } else {
                      spawnParticle('static', centerLed, col);
                    }
                  }
                }

                // Note Off
                const noteEnd = note.time + note.duration;
                if (prevBeat < noteEnd && currentBeat >= noteEnd) {
                  if (soundingSongNotesRef.current.has(idx)) {
                    triggerNoteOff(note.pitch);
                    soundingSongNotesRef.current.delete(idx);
                  }
                }
              });
            }

            // Piece completion
            if (currentBeat > maxNoteEnd + 2) {
              stopSongPlayback();
            }
          }

          // Periodically sync playback position to store (for timeline scrubber)
          playbackPublishTimerRef.current += dt;
          if (playbackPublishTimerRef.current >= 0.04) {
            playbackPublishTimerRef.current = 0;
            setPlaybackBeat(songBeatRef.current, maxNoteEnd);
          }
        } else {
          // Paused: release sounding notes so audio stops immediately
          if (soundingSongNotesRef.current.size > 0) {
            soundingSongNotesRef.current.forEach((pitch) => triggerNoteOff(pitch));
            soundingSongNotesRef.current.clear();
          }
        }

        // Render all visible waterfall bars (freeze solidly when paused, scrub dynamically!)
        const currentBeat = songBeatRef.current;
        curSong.notes.forEach((note) => {
          if (!isMatchingHand(note.hand)) return;

          const timeToHitSec = (note.time - currentBeat) / (curSong.bpm / 60);
          const noteLengthPx = Math.max(28, (note.duration * (60 / curSong.bpm)) * speed);
          const noteY = ledBarTop - (timeToHitSec * speed) - noteLengthPx;

          // Skip notes outside visible canvas vertical range
          if (noteY + noteLengthPx < waterfallTop - 10 || noteY > height + 20) return;

          const geom = getKeyGeometry(note.pitch, width, keyAreaTop, keyAreaHeight);
          if (!geom) return;

          const noteColorHex = note.hand === 'left'
            ? (leftHandColorRef.current || '#38bdf8')
            : (rightHandColorRef.current || '#10b981');
          const col = hexToRgb(noteColorHex);

          const barX = geom.x + 2;
          const barW = Math.max(4, geom.width - 4);
          const barH = noteLengthPx;

          // Render falling bar with rich neon gradient
          const barGrad = ctx.createLinearGradient(0, noteY, 0, noteY + barH);
          barGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.35)`);
          barGrad.addColorStop(0.85, `rgba(${col.r}, ${col.g}, ${col.b}, 0.95)`);
          barGrad.addColorStop(1, '#ffffff');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(barX, noteY, barW, barH, [6, 6, 4, 4]);
          ctx.fill();

          ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.9)`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Impact / Active Glow at LED strip line
          const noteBottom = noteY + barH;
          if (noteBottom >= ledBarTop - 2 && noteY <= ledBarTop + 10) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = `rgb(${col.r}, ${col.g}, ${col.b})`;
            ctx.shadowBlur = 14;
            ctx.fillRect(barX - 2, ledBarTop - 2, barW + 4, 4);
            ctx.shadowBlur = 0;
          }
        });
      }

      // Auto Demo Chords (only when in main Play tab with no song active)
      if (isAutoDemoRef.current && !isSongMode) {
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
              if (curEff.effect !== 'static' && curEff.effect !== 'blink') {
                for (let s = 0; s < 4; s++) spawnParticle('spark', centerLed, bar.color);
                const keyCenterX = bar.x + bar.width / 2;
                spawnRunwayBursts(keyCenterX, ledBarTop, bar.color, 12, true);
                spawnShockwaveRipple(keyCenterX, ledBarTop, bar.color, bar.width * 2.5 + 40);
                if (Math.random() < 0.3) spawnLensFlare(keyCenterX, ledBarTop, bar.color, 260);
              } else {
                spawnParticle('static', centerLed, bar.color);
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
      }

      // ==========================================
      // 3. INTERACTIVE FLOW KEY TRAILS (LIVE USER PLAY)
      // ==========================================
      const trails = flowTrailsRef.current;
      const speedPxPerSec = 170 * curFlow.flowSpeed;
      const isSongPlayingActive = isSongPlayingRef.current || isSongOn;
      const isSongOrLearnActive = isSongPlayingActive || activeWorkspaceRef.current === 'songs' || activeWorkspaceRef.current === 'learn';

      // When song is playing or in Song/Learn mode:
      // Flow key is strictly TOP TO BOTTOM ONLY (Synthesia waterfall).
      // The bottom-to-top play tab flow key trails are completely suppressed!
      if (isSongOrLearnActive) {
        if (trails.length > 0) {
          trails.length = 0;
        }
      } else if (!isAutoDemoRef.current) {
        // A. Register new trails for actively pressed keys (only when in standard Play mode with no song playing)
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
            const geom = getKeyGeometry(t.pitch, width, keyAreaTop, keyAreaHeight);
            if (geom) {
              spawnRunwayBursts(geom.x + geom.width / 2, ledBarTop, t.color, 2, false);
            }
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

          // Optical Bloom / Glow Aura
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

          // Note ribbon transverse ridges: glowing horizontal micro-bars across ribbon
          if (barHeight > 18) {
            const ridgeSpacing = 20;
            const startRidge = Math.ceil(barTop / ridgeSpacing) * ridgeSpacing;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let ry = startRidge; ry < barBottom - 4; ry += ridgeSpacing) {
              ctx.moveTo(trailX + 3, ry);
              ctx.lineTo(trailX + trailWidth - 3, ry);
            }
            ctx.stroke();
          }

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
            ctx.shadowBlur = 12;
            ctx.fillRect(trailX - 1, ledBarTop - 2, trailWidth + 2, 3);
            ctx.shadowBlur = 0;
          }

          // Afterglow / persistence trail: fading phosphor wake left behind moving note
          if (t.endTime !== null && barBottom < ledBarTop) {
            const wakeDist = Math.min(45, ledBarTop - barBottom);
            const wakeGrad = ctx.createLinearGradient(0, barBottom, 0, barBottom + wakeDist);
            wakeGrad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.28)`);
            wakeGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = wakeGrad;
            ctx.fillRect(trailX + 1, barBottom, trailWidth - 2, wakeDist);
          }
        }
      }

      // ==========================================
      // 4. SHOCKWAVE RIPPLES (CIRCULAR SHOCKWAVES)
      // ==========================================
      const ripples = shockwaveRipplesRef.current;
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        if (!r.active) continue;

        r.radius += r.speed * dt;
        r.life = Math.max(0, 1.0 - (r.radius / r.maxRadius));

        if (r.radius >= r.maxRadius || r.life <= 0) {
          r.active = false;
          continue;
        }

        ctx.save();
        ctx.beginPath();
        // Elliptical perspective ripple
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r.color.r}, ${r.color.g}, ${r.color.b}, ${r.life * 0.65})`;
        ctx.lineWidth = Math.max(1, 2.5 * r.life);
        ctx.shadowColor = `rgb(${r.color.r}, ${r.color.g}, ${r.color.b})`;
        ctx.shadowBlur = 8 * r.life;
        ctx.stroke();
        ctx.restore();
      }

      // ==========================================
      // 5. RUNWAY VFX PARTICLES (SPARKS & IMPACT BURSTS)
      // ==========================================
      const runwayParts = runwayParticlesRef.current;
      for (let i = 0; i < runwayParts.length; i++) {
        const p = runwayParts[i];
        if (!p.active) continue;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 85 * dt; // gentle gravity
        p.life -= dt / p.maxLife;

        if (p.life <= 0 || p.y < waterfallTop || p.y > height) {
          p.active = false;
          continue;
        }

        const alpha = Math.max(0, Math.min(1, p.life));
        ctx.save();
        if (p.type === 'spark') {
          // Electrical spark: luminous fast-moving streak aligned with velocity
          const vLen = Math.hypot(p.vx, p.vy) || 1;
          const streakLen = Math.min(10, vLen * 0.05);
          const tailX = p.x - (p.vx / vLen) * streakLen;
          const tailY = p.y - (p.vy / vLen) * streakLen;

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
          ctx.lineWidth = p.size;
          ctx.stroke();

          // Spark core
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Impact burst particle: glowing circular starburst
          ctx.shadowColor = `rgb(${p.color.r}, ${p.color.g}, ${p.color.b})`;
          ctx.shadowBlur = 6;
          ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ==========================================
      // 6. ANAMORPHIC LENS FLARES
      // ==========================================
      const flares = lensFlaresRef.current;
      for (let i = 0; i < flares.length; i++) {
        const f = flares[i];
        if (!f.active) continue;

        f.life -= dt * 2.5;
        if (f.life <= 0) {
          f.active = false;
          continue;
        }

        const alpha = Math.max(0, Math.min(1, f.life));
        ctx.save();

        // Horizontal laser streak
        const flareGrad = ctx.createLinearGradient(f.x - f.width / 2, 0, f.x + f.width / 2, 0);
        flareGrad.addColorStop(0, 'transparent');
        flareGrad.addColorStop(0.35, `rgba(${f.color.r}, ${f.color.g}, ${f.color.b}, ${alpha * 0.4})`);
        flareGrad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.95})`);
        flareGrad.addColorStop(0.65, `rgba(${f.color.r}, ${f.color.g}, ${f.color.b}, ${alpha * 0.4})`);
        flareGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = flareGrad;
        ctx.fillRect(f.x - f.width / 2, f.y - 1.5, f.width, 3);

        // Core bright radial orb
        const orbGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 16);
        orbGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        orbGrad.addColorStop(0.3, `rgba(${f.color.r}, ${f.color.g}, ${f.color.b}, ${alpha * 0.7})`);
        orbGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // ==========================================
      // 7. LED BUFFER DECAY & AURA
      // ==========================================
      const decay = curEff.decay;
      const leds = ledsRef.current;
      for (let i = 0; i < ledCount; i++) {
        leds[i].r *= decay;
        leds[i].g *= decay;
        leds[i].b *= decay;
      }

      // Sustain aura on held keys
      if (curEff.effect === 'static' || curEff.effect === 'blink') {
        // STATIC KEY LIGHT: Solid illumination on ONLY the key's target LED while held!
        curActiveNotes.forEach((noteData) => {
          const cols = getNoteColors(noteData.pitch, curEff, curFlow);
          const targetLed = Math.round(noteData.centerLed);
          if (targetLed >= 0 && targetLed < ledCount) {
            const cur = leds[targetLed];
            cur.r = cols.primary.r;
            cur.g = cols.primary.g;
            cur.b = cols.primary.b;
          }
        });
      } else {
        curActiveNotes.forEach((noteData) => {
          const cols = getNoteColors(noteData.pitch, curEff, curFlow);
          addSpreadLuminance(noteData.centerLed, curEff.spread * 1.2, cols.primary, 1.0);
        });
      }

      // Update active LED particles
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
          case 'static':
          case 'blink':
            // Smooth release quadratic decay on ONLY THE ONE LED for key release
            p.life -= dt * (2.2 * p.speed);
            if (p.life > 0) {
              const fadeCurve = p.life * p.life;
              const targetLed = Math.round(p.pos);
              if (targetLed >= 0 && targetLed < ledCount) {
                const cur = leds[targetLed];
                cur.r = Math.min(255, cur.r + p.color.r * fadeCurve);
                cur.g = Math.min(255, cur.g + p.color.g * fadeCurve);
                cur.b = Math.min(255, cur.b + p.color.b * fadeCurve);
              }
            }
            break;
        }
      }

      // ==========================================
      // 8. DRAW WS2812B LED STRIP MOUNT
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
      // 9. DRAW PIANO KEYS (KEY PRESS GLOW & RADIANCE)
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
          // Key Press Glow: radiant gradient from top contact to bottom
          const keyGrad = ctx.createLinearGradient(0, keyAreaTop, 0, keyAreaTop + keyAreaHeight);
          keyGrad.addColorStop(0, '#ffffff'); // intense contact highlight
          keyGrad.addColorStop(0.12, `rgba(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b}, 0.95)`);
          keyGrad.addColorStop(0.85, `rgba(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b}, 0.82)`);
          keyGrad.addColorStop(1, `rgba(${cols.secondary.r}, ${cols.secondary.g}, ${cols.secondary.b}, 0.95)`);
          ctx.fillStyle = keyGrad;

          // Key bloom aura
          ctx.shadowColor = `rgba(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b}, 0.6)`;
          ctx.shadowBlur = 12;
        } else if (isExpected) {
          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = isDark ? '#18181b' : '#ffffff';
          ctx.shadowBlur = 0;
        }

        ctx.fillRect(keyX + 1, keyAreaTop, whiteKeyWidth - 2, keyAreaHeight);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = isDark ? '#27272a' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(keyX + 1, keyAreaTop, whiteKeyWidth - 2, keyAreaHeight);

        // Pressed bottom accent line & inner light reflection
        if (isPressed) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(keyX + 2, keyAreaTop + keyAreaHeight - 6, whiteKeyWidth - 4, 4);

          const highlightGrad = ctx.createLinearGradient(keyX + 1, 0, keyX + whiteKeyWidth - 1, 0);
          highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          highlightGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
          highlightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
          ctx.fillStyle = highlightGrad;
          ctx.fillRect(keyX + 1, keyAreaTop, whiteKeyWidth - 2, keyAreaHeight - 6);
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

      // B. Black Keys (Overlaid on top with radiant glow)
      curKeys.forEach((key) => {
        if (!key.isBlack) return;

        const prevWhiteIdx = curKeys.slice(0, key.index).filter(k => !k.isBlack).length - 1;
        const keyX = 16 + (prevWhiteIdx + 0.65) * whiteKeyWidth;
        const blackKeyWidth = whiteKeyWidth * 0.65;
        const isPressed = curActiveNotes.has(key.midi);
        const isExpected = expectedPitch === key.midi;

        if (isPressed) {
          const cols = getNoteColors(key.midi, curEff, curFlow);
          const bGrad = ctx.createLinearGradient(0, keyAreaTop, 0, keyAreaTop + blackKeyHeight);
          bGrad.addColorStop(0, '#ffffff');
          bGrad.addColorStop(0.18, `rgb(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b})`);
          bGrad.addColorStop(1, `rgb(${Math.round(cols.secondary.r * 0.7)}, ${Math.round(cols.secondary.g * 0.7)}, ${Math.round(cols.secondary.b * 0.7)})`);
          ctx.fillStyle = bGrad;
          ctx.shadowColor = `rgba(${cols.primary.r}, ${cols.primary.g}, ${cols.primary.b}, 0.75)`;
          ctx.shadowBlur = 14;
        } else if (isExpected) {
          ctx.fillStyle = '#059669';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = isDark ? '#000000' : '#0f172a';
          ctx.shadowBlur = 0;
        }

        ctx.fillRect(keyX, keyAreaTop, blackKeyWidth, blackKeyHeight);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = isPressed ? '#ffffff' : (isDark ? '#3f3f46' : '#475569');
        ctx.lineWidth = isPressed ? 1.5 : 1;
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

        {/* On-Stage Song Timeline Scrubber when Song is active on stage */}
        {currentSong && (isSongPlaying || activeWorkspace === 'songs' || activeWorkspace === null) && activeWorkspace !== 'learn' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[92%] pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <SongTimelineScrubber />
          </div>
        )}

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
