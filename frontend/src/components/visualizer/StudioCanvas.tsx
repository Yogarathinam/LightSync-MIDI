import React, { useRef, useEffect, useState, useCallback } from 'react';
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

const MAX_PARTICLES = 64;
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
    keyLabels,
    diffuseBlur,
    fallingNotes,
    effectConfig,
    activeNotes,
    triggerNoteOn,
    triggerNoteOff,
    expectedPitch
  } = useLightSyncStore();

  const ledCount = 144;
  const startMidi = keyboardSize === 25 ? 48 : keyboardSize === 49 ? 36 : keyboardSize === 61 ? 36 : 21;

  // Particle pool
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

  // Drag interaction state
  const isPointerDownRef = useRef(false);
  const activePointerKeyRef = useRef<number | null>(null);
  const prevActivePitchesRef = useRef<Set<number>>(new Set());

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
        p.spread = effectConfig.spread * 3.0; // tail length
        break;
      case 'wave':
        p.pos = centerLed;
        p.phase = 0;
        p.speed = effectConfig.speed * 0.2;
        p.spread = effectConfig.spread * 4.0;
        break;
    }
  }, [effectConfig, ledCount]);

  // Listen for new notes pressed to spawn effect particles
  useEffect(() => {
    const currentPitches = new Set(activeNotes.keys());
    const prevPitches = prevActivePitchesRef.current;

    for (const pitch of currentPitches) {
      if (!prevPitches.has(pitch)) {
        // Note ON occurred!
        const noteData = activeNotes.get(pitch);
        const centerLed = noteData ? noteData.centerLed : 72;

        let col = hexToRgb(effectConfig.primaryColor);
        if (effectConfig.rainbow) {
          const hue = (pitch % 12) / 12;
          col = hslToRgb(hue, 1.0, 0.5);
        }

        // Spawn burst based on current effect
        if (effectConfig.effect === 'spark') {
          for (let i = 0; i < 6; i++) spawnParticle('spark', centerLed, col);
        } else if (effectConfig.effect === 'glitch') {
          for (let i = 0; i < 5; i++) spawnParticle('glitch', centerLed, col);
        } else if (effectConfig.effect === 'sprinkle') {
          for (let i = 0; i < 8; i++) spawnParticle('sprinkle', centerLed, col);
        } else {
          spawnParticle(effectConfig.effect, centerLed, col);
        }
      }
    }

    prevActivePitchesRef.current = currentPitches;
  }, [activeNotes, effectConfig, spawnParticle]);

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

      // FPS tracking
      frameCounter++;
      if (now - fpsTimer >= 1000) {
        if (onFpsUpdate) onFpsUpdate(frameCounter);
        frameCounter = 0;
        fpsTimer = now;
      }

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // 1. Decay LED Buffer
      const decay = effectConfig.decay;
      const leds = ledsRef.current;
      for (let i = 0; i < ledCount; i++) {
        leds[i].r *= decay;
        leds[i].g *= decay;
        leds[i].b *= decay;
      }

      // 2. Sustain aura on held keys
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

      // 3. Update Particles
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) continue;

        switch (p.type) {
          case 'bounce':
            p.pos += p.vel;
            if (p.pos <= 0 || p.pos >= ledCount - 1) {
              p.vel *= -0.85;
              p.pos = Math.max(0, Math.min(ledCount - 1, p.pos));
            }
            p.life *= (effectConfig.decay + 0.01);
            addSpreadLuminance(p.pos, p.spread, p.color, p.life);
            break;

          case 'ripple':
            p.radius += p.speed * 0.8;
            p.life -= (1 - effectConfig.decay) * 0.35;
            for (let idx = 0; idx < ledCount; idx++) {
              const dist = Math.abs(idx - p.pos);
              const distFromRing = Math.abs(dist - p.radius);
              if (distFromRing < p.thickness) {
                const ringIntensity = Math.cos((distFromRing / p.thickness) * (Math.PI / 2)) * p.life;
                if (ringIntensity > 0) addSpreadLuminance(idx, 0.8, p.color, ringIntensity);
              }
            }
            if (p.pos - p.radius < 0 && p.pos + p.radius >= ledCount) p.life = 0;
            break;

          case 'pulse':
            p.radius += p.speed * 0.5;
            p.phase += p.speed * 0.15;
            p.life -= (1 - effectConfig.decay) * 0.25;
            const pulseBreath = (Math.sin(p.phase * Math.PI * 2) * 0.5 + 0.5) * p.life;
            for (let idx = 0; idx < ledCount; idx++) {
              const dist = Math.abs(idx - p.pos);
              if (dist <= p.radius) {
                const innerIntensity = (1 - (dist / p.radius)) * pulseBreath;
                addSpreadLuminance(idx, p.spread, p.color, innerIntensity);
              }
            }
            if (p.radius >= p.maxRadius) p.life = 0;
            break;

          case 'hold_beam':
            p.life -= 0.05;
            addSpreadLuminance(p.pos, p.spread, p.color, p.life * 1.5);
            break;

          case 'glitch':
            p.life -= 0.04;
            if (Math.random() > 0.3) {
              addSpreadLuminance(p.pos, 0.6, p.color, p.life);
            }
            break;

          case 'spark':
            p.pos += p.vel;
            p.life -= 0.03 * (2.0 - effectConfig.decay);
            addSpreadLuminance(p.pos, p.spread, p.color, Math.max(0, p.life));
            break;

          case 'sprinkle':
            p.life -= 0.03;
            const sparkleIntensity = Math.sin(p.life * Math.PI) * Math.random();
            addSpreadLuminance(p.pos, 0.8, p.color, Math.max(0, sparkleIntensity));
            break;

          case 'rain':
            p.pos += p.vel;
            p.life -= 0.02 * (2.0 - effectConfig.decay);
            const dir = p.vel >= 0 ? 1 : -1;
            for (let t = 0; t < p.spread; t++) {
              const tailPos = p.pos - (dir * t);
              if (tailPos >= 0 && tailPos < ledCount) {
                const tailFactor = (1 - t / p.spread) * p.life;
                addSpreadLuminance(tailPos, 0.8, p.color, tailFactor);
              }
            }
            if (p.pos < 0 || p.pos >= ledCount) p.life = 0;
            break;

          case 'wave':
            p.phase += p.speed;
            p.life -= 0.015;
            for (let idx = 0; idx < ledCount; idx++) {
              const dist = Math.abs(idx - p.pos);
              if (dist <= p.spread * 2) {
                const waveVal = Math.sin(dist * 0.5 - p.phase) * 0.5 + 0.5;
                addSpreadLuminance(idx, 1.0, p.color, waveVal * p.life);
              }
            }
            break;
        }

        if (p.life <= 0.02) p.active = false;
      }

      // 4. Draw WS2812B Strip Channel (Top Bar)
      const isDark = theme === 'dark';
      const ledBarHeight = 32;
      const keyAreaTop = ledBarHeight + 16;
      const keyAreaHeight = height - keyAreaTop - 8;

      // Strip Track
      ctx.fillStyle = isDark ? '#09090b' : '#f1f5f9';
      ctx.fillRect(8, 6, width - 16, ledBarHeight);
      ctx.strokeStyle = isDark ? '#27272a' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 6, width - 16, ledBarHeight);

      const ledSpacing = (width - 32) / ledCount;

      for (let i = 0; i < ledCount; i++) {
        const ledX = 16 + i * ledSpacing + ledSpacing / 2;
        const ledY = 6 + ledBarHeight / 2;
        const col = leds[i];

        // LED dot core
        ctx.beginPath();
        ctx.arc(ledX, ledY, Math.min(ledSpacing * 0.4, 3.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${Math.round(col.r)}, ${Math.round(col.g)}, ${Math.round(col.b)})`;
        ctx.fill();

        // Silicone diffuser glow
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

      // 5. Draw Piano Keys
      const whiteKeys = keys.filter(k => !k.isBlack);
      const whiteKeyWidth = (width - 32) / whiteKeys.length;

      // Draw White Keys First
      whiteKeys.forEach((key, wIdx) => {
        const keyX = 16 + wIdx * whiteKeyWidth;
        const isPressed = activeNotes.has(key.midi);
        const isExpected = expectedPitch === key.midi;

        if (isPressed) {
          ctx.fillStyle = isDark ? '#6366f1' : '#4f46e5';
        } else if (isExpected) {
          ctx.fillStyle = '#10b981'; // Green prompt for learn
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

        // Labels
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

      // Draw Black Keys Second
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
    effectConfig,
    activeNotes,
    expectedPitch,
    keys,
    ledCount,
    onFpsUpdate
  ]);

  // Coordinate mapping for touch/mouse interaction
  const getPitchFromCoords = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ledBarHeight = 32;
    const keyAreaTop = ledBarHeight + 16;
    if (y < keyAreaTop) return null;

    const width = canvas.width;
    const height = canvas.height;
    const whiteKeys = keys.filter(k => !k.isBlack);
    const whiteKeyWidth = (width - 32) / whiteKeys.length;
    const blackKeyHeight = (height - keyAreaTop - 8) * 0.62;

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

  // Pointer Handlers with Drag Capture
  const handlePointerDown = (e: React.PointerEvent) => {
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

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = window.innerWidth < 640 ? 260 : 310;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="relative w-full bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-2 overflow-hidden shadow-sm transition-colors">
      <div className="w-full flex justify-between items-center px-2 py-1 text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
        <span>WS2812B STRIP MOUNT (144 LEDS)</span>
        <span>{keyboardSize} KEYS (MIDI {startMidi} - {startMidi + keyboardSize - 1})</span>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-[260px] sm:h-[310px] cursor-pointer rounded-xl touch-none"
      />

      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 px-2 font-mono">
        <span>Touch or click keys, or press QWERTY [A-K] / Space for sustain</span>
        <span>Polyphonic 60 FPS Engine</span>
      </div>
    </div>
  );
};
