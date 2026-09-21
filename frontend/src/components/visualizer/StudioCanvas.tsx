import React, { useRef, useEffect, useCallback } from 'react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { useTheme } from '../../context/ThemeContext';
import { EffectType } from '../../types';

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

interface RisingBeam {
  id: number;
  pitch: number;
  x: number;
  width: number;
  y: number;
  height: number;
  alpha: number;
  color: { r: number; g: number; b: number };
}

const MAX_PARTICLES = 64;
const MAX_FALLING_NOTES = 128;
const MAX_RISING_BEAMS = 32;

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
    activeNotes,
    triggerNoteOn,
    triggerNoteOff,
    expectedPitch,
    activeOverlay,
    closeOverlay
  } = useLightSyncStore();

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

  // Falling waterfall bars pool
  const fallingBarsRef = useRef<WaterfallNote[]>([]);
  // Rising freestyle beams pool
  const risingBeamsRef = useRef<RisingBeam[]>([]);

  // Pointer drag interaction
  const isPointerDownRef = useRef(false);
  const activePointerKeyRef = useRef<number | null>(null);
  const prevActivePitchesRef = useRef<Set<number>>(new Set());

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
  const keys = React.useMemo(() => {
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
  const getKeyGeometry = useCallback((midi: number, width: number, keyAreaTop: number, keyAreaHeight: number) => {
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

  // Listen for key presses to spawn effects and rising fountain beams
  useEffect(() => {
    const currentPitches = new Set(activeNotes.keys());
    const prevPitches = prevActivePitchesRef.current;
    const canvas = canvasRef.current;

    for (const pitch of currentPitches) {
      if (!prevPitches.has(pitch)) {
        const noteData = activeNotes.get(pitch);
        const centerLed = noteData ? noteData.centerLed : 72;

        let col = hexToRgb(effectConfig.primaryColor);
        if (effectConfig.rainbow) {
          const hue = (pitch % 12) / 12;
          col = hslToRgb(hue, 1.0, 0.5);
        }

        // Spawn LED strip burst
        if (effectConfig.effect === 'spark') {
          for (let i = 0; i < 6; i++) spawnParticle('spark', centerLed, col);
        } else if (effectConfig.effect === 'glitch') {
          for (let i = 0; i < 5; i++) spawnParticle('glitch', centerLed, col);
        } else if (effectConfig.effect === 'sprinkle') {
          for (let i = 0; i < 8; i++) spawnParticle('sprinkle', centerLed, col);
        } else {
          spawnParticle(effectConfig.effect, centerLed, col);
        }

        // Spawn rising fountain beam into the waterfall lane if not in auto-demo
        if (!isAutoDemo && canvas) {
          const geom = getKeyGeometry(pitch, canvas.width, 0, 0);
          if (geom) {
            risingBeamsRef.current.push({
              id: Date.now() + Math.random(),
              pitch,
              x: geom.x + 2,
              width: geom.width - 4,
              y: canvas.height - 150,
              height: 40,
              alpha: 0.9,
              color: col
            });
            if (risingBeamsRef.current.length > MAX_RISING_BEAMS) {
              risingBeamsRef.current.shift();
            }
          }
        }
      }
    }

    prevActivePitchesRef.current = currentPitches;
  }, [activeNotes, effectConfig, spawnParticle, isAutoDemo, getKeyGeometry]);

  // Main 60 FPS Render Loop
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
      const brt = (effectConfig.brightness / 255) * factor;
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
        if (onFpsUpdate) onFpsUpdate(frameCounter);
        frameCounter = 0;
        fpsTimer = now;
      }

      const width = canvas.width;
      const height = canvas.height;
      const isDark = theme === 'dark';

      // Dimensions: Dynamic resizable tall keyboard anchored directly at bottom
      const keyAreaHeight = Math.max(90, Math.min(keyboardHeight, Math.floor(height * 0.52)));
      const keyAreaTop = height - keyAreaHeight - 1;
      const ledBarHeight = 24;
      const ledBarTop = keyAreaTop - ledBarHeight - 1;
      const waterfallTop = 6;
      const waterfallHeight = ledBarTop - waterfallTop;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Waterfall Runway Background (Dark grey in light mode for vibrant flow key visibility)
      ctx.fillStyle = isDark ? '#000000' : '#1e293b';
      ctx.fillRect(0, 0, width, height);

      // Subtle Vertical Key Lane Separators in Waterfall Runway
      const whiteKeys = keys.filter(k => !k.isBlack);
      const whiteKeyWidth = (width - 32) / whiteKeys.length;

      ctx.lineWidth = 1;
      for (let i = 0; i <= whiteKeys.length; i++) {
        const laneX = 16 + i * whiteKeyWidth;
        ctx.strokeStyle = isDark ? 'rgba(39, 39, 42, 0.4)' : 'rgba(71, 85, 105, 0.45)';
        ctx.beginPath();
        ctx.moveTo(laneX, waterfallTop);
        ctx.lineTo(laneX, ledBarTop);
        ctx.stroke();
      }

      // Waterfall Lane Guide Glow Header
      const headerGrad = ctx.createLinearGradient(0, waterfallTop, 0, waterfallTop + 40);
      headerGrad.addColorStop(0, isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.06)');
      headerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(16, waterfallTop, width - 32, 40);

      // 2. Auto Demo Spawner
      if (isAutoDemo) {
        demoTimerRef.current += dt;
        if (demoTimerRef.current > 0.35 / flowSpeed) {
          demoTimerRef.current = 0;
          const chord = demoChords[demoStepRef.current % demoChords.length];
          demoStepRef.current++;

          chord.forEach((pitch) => {
            const geom = getKeyGeometry(pitch, width, keyAreaTop, keyAreaHeight);
            if (geom) {
              let col = hexToRgb(effectConfig.primaryColor);
              if (effectConfig.rainbow) {
                col = hslToRgb((pitch % 12) / 12, 1.0, 0.5);
              }

              fallingBarsRef.current.push({
                id: Math.random(),
                pitch,
                x: geom.x + 2,
                width: geom.width - 4,
                y: waterfallTop,
                length: Math.max(30, 60 * flowSpeed),
                speed: 180 * flowSpeed,
                color: col,
                triggered: false,
                active: true
              });
            }
          });
        }
      }

      // 3. Update & Draw Waterfall Falling Note Bars
      if (fallingNotes) {
        const bars = fallingBarsRef.current;
        for (let i = bars.length - 1; i >= 0; i--) {
          const bar = bars[i];
          bar.y += bar.speed * dt;

          // Check if bar has reached LED strip impact line
          if (!bar.triggered && (bar.y + bar.length) >= ledBarTop) {
            bar.triggered = true;
            triggerNoteOn(bar.pitch, 100);

            // Impact Sparkles
            const keyIdx = Math.max(0, Math.min(keyboardSize - 1, bar.pitch - startMidi));
            const centerLed = Math.floor((keyIdx / (keyboardSize - 1)) * 143);
            for (let s = 0; s < 4; s++) {
              spawnParticle('spark', centerLed, bar.color);
            }
          }

          // Check if tail passed bottom of key area
          if (bar.y >= ledBarTop) {
            if (bar.triggered && bar.active) {
              triggerNoteOff(bar.pitch);
              bar.active = false;
            }
          }

          // Remove completed bar
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

          // Bar Outline
          ctx.strokeStyle = `rgba(${bar.color.r}, ${bar.color.g}, ${bar.color.b}, 0.8)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Impact Glow when hitting LED strip
          if (bar.y + bar.length >= ledBarTop && bar.y < ledBarTop + 10) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = `rgb(${bar.color.r}, ${bar.color.g}, ${bar.color.b})`;
            ctx.shadowBlur = 15;
            ctx.fillRect(bar.x - 2, ledBarTop - 2, bar.width + 4, 4);
            ctx.shadowBlur = 0;
          }
        }
      }

      // 4. Update & Draw Rising Freestyle Beams (when user presses keys manually)
      const risingBeams = risingBeamsRef.current;
      for (let i = risingBeams.length - 1; i >= 0; i--) {
        const beam = risingBeams[i];
        beam.y -= 260 * dt;
        beam.alpha -= 1.1 * dt;

        if (beam.alpha <= 0 || beam.y < waterfallTop) {
          risingBeams.splice(i, 1);
          continue;
        }

        const beamGrad = ctx.createLinearGradient(0, beam.y + beam.height, 0, beam.y);
        beamGrad.addColorStop(0, `rgba(${beam.color.r}, ${beam.color.g}, ${beam.color.b}, ${beam.alpha * 0.8})`);
        beamGrad.addColorStop(1, `rgba(${beam.color.r}, ${beam.color.g}, ${beam.color.b}, 0)`);

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.roundRect(beam.x, beam.y, beam.width, beam.height, 4);
        ctx.fill();
      }

      // 5. Decay LED Buffer
      const decay = effectConfig.decay;
      const leds = ledsRef.current;
      for (let i = 0; i < ledCount; i++) {
        leds[i].r *= decay;
        leds[i].g *= decay;
        leds[i].b *= decay;
      }

      // 6. Sustain aura on held keys
      activeNotes.forEach((noteData) => {
        let col = hexToRgb(effectConfig.primaryColor);
        if (effectConfig.rainbow) {
          col = hslToRgb((noteData.pitch % 12) / 12, 1.0, 0.5);
        }
        addSpreadLuminance(noteData.centerLed, effectConfig.spread * 1.2, col, 1.0);

        if (effectConfig.effect === 'hold_beam') {
          const secCol = hexToRgb(effectConfig.secondaryColor);
          addSpreadLuminance(noteData.centerLed, effectConfig.spread * 2.2, secCol, 0.6);
        }
      });

      // 7. Update Particles
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

      // 8. Draw WS2812B LED Strip Mount (Directly above piano keys)
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
        if (diffuseBlur && (col.r > 8 || col.g > 8 || col.b > 8)) {
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

      // 9. Draw Piano Keys (Anchored at the very bottom)
      // A. White Keys
      whiteKeys.forEach((key, wIdx) => {
        const keyX = 16 + wIdx * whiteKeyWidth;
        const isPressed = activeNotes.has(key.midi);
        const isExpected = expectedPitch === key.midi;

        if (isPressed) {
          ctx.fillStyle = isDark ? '#6366f1' : '#4f46e5';
        } else if (isExpected) {
          ctx.fillStyle = '#10b981';
        } else {
          ctx.fillStyle = isDark ? '#18181b' : '#ffffff';
        }

        ctx.fillRect(keyX + 1, keyAreaTop, whiteKeyWidth - 2, keyAreaHeight);
        ctx.strokeStyle = isDark ? '#27272a' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(keyX + 1, keyAreaTop, whiteKeyWidth - 2, keyAreaHeight);

        // Bottom key border lip
        ctx.fillStyle = isPressed ? (isDark ? '#4338ca' : '#3730a3') : (isDark ? '#27272a' : '#e2e8f0');
        ctx.fillRect(keyX + 1, keyAreaTop + keyAreaHeight - 8, whiteKeyWidth - 2, 8);

        // Key Labels
        if (keyLabels !== 'none') {
          let labelText = '';
          if (keyLabels === 'notes') labelText = key.name;
          else if (keyLabels === 'solfege') labelText = key.solfege;
          else if (keyLabels === 'qwerty') labelText = key.qwerty;

          if (labelText) {
            ctx.fillStyle = isPressed ? '#ffffff' : (isDark ? '#71717a' : '#64748b');
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(labelText, keyX + whiteKeyWidth / 2, keyAreaTop + keyAreaHeight - 14);
          }
        }
      });

      // B. Black Keys (Overlapping top)
      keys.forEach((key) => {
        if (!key.isBlack) return;

        const prevWhiteIdx = keys.slice(0, key.index).filter(k => !k.isBlack).length - 1;
        const keyX = 16 + (prevWhiteIdx + 0.65) * whiteKeyWidth;
        const blackKeyWidth = whiteKeyWidth * 0.65;
        const blackKeyHeight = keyAreaHeight * 0.62;
        const isPressed = activeNotes.has(key.midi);
        const isExpected = expectedPitch === key.midi;

        if (isPressed) {
          ctx.fillStyle = '#ec4899';
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
        ctx.fillStyle = isPressed ? '#be185d' : (isDark ? '#27272a' : '#1e293b');
        ctx.fillRect(keyX + 1, keyAreaTop, blackKeyWidth - 2, 4);

        if (keyLabels === 'qwerty' && key.qwerty) {
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
    theme,
    keyboardSize,
    keyLabels,
    diffuseBlur,
    fallingNotes,
    flowSpeed,
    isAutoDemo,
    effectConfig,
    activeNotes,
    expectedPitch,
    keys,
    ledCount,
    startMidi,
    triggerNoteOn,
    triggerNoteOff,
    spawnParticle,
    getKeyGeometry,
    keyboardHeight,
    onFpsUpdate
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

    const keyAreaHeight = Math.max(90, Math.min(keyboardHeight, Math.floor(canvas.height * 0.52)));
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
  }, [keys]);

  // Pointer Handlers with Drag Capture & Overlay Autohide
  const handlePointerDown = (e: React.PointerEvent) => {
    // Autohide card overlay on canvas click
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

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full flex-1 cursor-pointer touch-none block min-h-0"
      />
    </div>
  );
};
