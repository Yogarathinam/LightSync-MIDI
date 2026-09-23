import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Palette, 
  Gauge, 
  Flame, 
  Maximize2, 
  Sun,
  Layers,
  Activity,
  Grid,
  Clock,
  Zap,
  CheckCircle2,
  Minus,
  Plus,
  Music
} from 'lucide-react';
import { useLightSyncStore, COLOR_SYNC_PRESETS } from '../../store/useLightSyncStore';
import { EffectType, ColorSyncPresetId, FlowKeyTrailStyle } from '../../types';

const EFFECTS_CATALOG: { id: EffectType; name: string; desc: string }[] = [
  { id: 'static', name: 'Static Key Light', desc: 'Solid single-LED light held continuously until key release' },
  { id: 'bounce', name: 'Bounce', desc: 'Damped ballistic particle motion' },
  { id: 'ripple', name: 'Ripple', desc: 'Expanding sinusoidal ring crest' },
  { id: 'pulse', name: 'Pulse', desc: 'Radial breathing heart rhythm' },
  { id: 'hold_beam', name: 'Hold Aura', desc: 'Sustained key laser illumination' },
  { id: 'glitch', name: 'Cyber Glitch', desc: 'Stochastic digital noise stutter' },
  { id: 'spark', name: 'Spark Burst', desc: 'Explosive multi-particle scatter' },
  { id: 'sprinkle', name: 'Sprinkle', desc: 'Twinkling starlight glitter' },
  { id: 'rain', name: 'Neon Rain', desc: 'Directional comet with trail' },
  { id: 'wave', name: 'Harmonic Wave', desc: 'Harmonic spatial sine wave' },
];

const TRAIL_STYLES: { id: FlowKeyTrailStyle; name: string; desc: string }[] = [
  { id: 'neon_bar', name: 'Neon Acrylic Bar', desc: 'Crisp rounded core with vivid edge glow' },
  { id: 'glow_laser', name: 'Laser Bloom Beam', desc: 'High-energy laser with bloom aura' },
  { id: 'gradient_ribbon', name: 'Prismatic Ribbon', desc: 'Multi-hue chromatic stream into horizon' },
  { id: 'particle_cascade', name: 'Particle Cascade', desc: 'Starlight sparkles trailing the note' },
];

export const EffectStudio: React.FC = () => {
  const { 
    effectConfig, 
    setEffectParam, 
    flowKeyConfig,
    setFlowKeyParam,
    bgConfig,
    setBgConfigParam,
    applyColorPreset,
    addConsoleLog,
    wsSender,
    octaveShift,
    incrementOctave,
    decrementOctave,
    transpose,
    incrementTranspose,
    decrementTranspose
  } = useLightSyncStore();


  // Natural structured order: 1. LED Effects -> 2. FlowKey -> 3. Grid & Background
  const [activeSection, setActiveSection] = useState<'led' | 'flow' | 'background'>('led');
  const [protocolFormat, setProtocolFormat] = useState<'cli' | 'json'>('cli');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // Generate payload string for hardware
  const getPayloadString = () => {
    if (protocolFormat === 'json') {
      return JSON.stringify({
        device: "M5Stack_LightSync",
        effect: effectConfig.effect,
        speed: parseFloat(effectConfig.speed.toFixed(2)),
        decay: parseFloat(effectConfig.decay.toFixed(2)),
        spread: parseFloat(effectConfig.spread.toFixed(1)),
        brightness: Math.round(effectConfig.brightness),
        rainbow: effectConfig.rainbow,
        primary_color: effectConfig.primaryColor,
        secondary_color: effectConfig.secondaryColor,
        led_count: 144
      }, null, 2);
    } else {
      return `EFFECT ${effectConfig.effect}\n` +
        `speed=${effectConfig.speed.toFixed(2)}\n` +
        `decay=${effectConfig.decay.toFixed(2)}\n` +
        `spread=${effectConfig.spread.toFixed(1)}\n` +
        `brightness=${Math.round(effectConfig.brightness)}\n` +
        `rainbow=${effectConfig.rainbow ? 1 : 0}\n` +
        `color=${effectConfig.primaryColor}\n` +
        `leds=144`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPayloadString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSendToDevice = () => {
    setSending(true);
    if (wsSender) {
      wsSender({
        type: 'SEND_DEVICE',
        payload: getPayloadString()
      });
    }
    addConsoleLog(`Synced [${effectConfig.effect.toUpperCase()}] parameters to M5Stack Hardware`);
    setTimeout(() => setSending(false), 800);
  };

  const quickColors = ['#00f0ff', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8', '#8b5cf6', '#ef4444', '#ffffff'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      
      {/* Left Column: Reimagined Hierarchical Controls (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* Navigation Tabs for Studio Sub-Sections (Ordered 1. LED -> 2. FlowKey -> 3. Grid) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900/90 rounded-2xl border border-slate-200 dark:border-zinc-800 shrink-0 shadow-sm">
          <button
            onClick={() => setActiveSection('led')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'led'
                ? 'bg-white dark:bg-zinc-800 text-amber-500 dark:text-amber-400 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>1. LED Strip Effects</span>
          </button>

          <button
            onClick={() => setActiveSection('flow')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'flow'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-zinc-700 font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>2. FlowKey Waterfall</span>
          </button>

          <button
            onClick={() => setActiveSection('background')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'background'
                ? 'bg-white dark:bg-zinc-800 text-sky-500 dark:text-sky-400 shadow-sm border border-slate-200/80 dark:border-zinc-700 font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-sky-500" />
            <span>3. Grid & 3D Runway</span>
          </button>
        </div>

        {/* SECTION 1: LED Strip Effects (Displayed First) */}
        {activeSection === 'led' && (
          <div className="flex flex-col gap-4">
            {/* Catalog Grid of 10 Effects */}
            <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    WS2812B Hardware Strip Effects
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Select active optical animation running on physical strip and visualizer
                  </p>
                </div>
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                  {EFFECTS_CATALOG.length} EFFECTS
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {EFFECTS_CATALOG.map((eff) => {
                  const isActive = effectConfig.effect === eff.id;
                  return (
                    <button
                      key={eff.id}
                      onClick={() => setEffectParam('effect', eff.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                        isActive
                          ? 'bg-amber-50/80 dark:bg-zinc-800 border-amber-500 dark:border-amber-400 shadow-sm'
                          : 'bg-slate-50/50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isActive ? 'text-amber-600 dark:text-amber-300' : 'text-slate-800 dark:text-zinc-200'}`}>
                          {eff.name}
                        </span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-tight">
                        {eff.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LED Physics & Hardware Sliders */}
            <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-500" />
                  LED Strip Physics & Optical Dynamics
                </h2>
                <span className="text-[11px] font-mono text-slate-400">FastLED Parameters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Speed */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-indigo-500" /> Animation Speed
                    </span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{effectConfig.speed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="4.0"
                    step="0.05"
                    value={effectConfig.speed}
                    onChange={(e) => setEffectParam('speed', parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Decay / Fade */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" /> Decay Rate / Fade Trail
                    </span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{effectConfig.decay.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.98"
                    step="0.01"
                    value={effectConfig.decay}
                    onChange={(e) => setEffectParam('decay', parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Spread Width */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-500" /> Spatial Key Spread
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{effectConfig.spread.toFixed(1)} LEDs</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="12.0"
                    step="0.5"
                    value={effectConfig.spread}
                    onChange={(e) => setEffectParam('spread', parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Brightness */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-yellow-500" /> FastLED Strip Brightness
                    </span>
                    <span className="font-mono text-yellow-600 dark:text-yellow-400 font-bold">{effectConfig.brightness} / 255</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="255"
                    step="5"
                    value={effectConfig.brightness}
                    onChange={(e) => setEffectParam('brightness', parseInt(e.target.value, 10))}
                    className="w-full accent-yellow-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Manual Palette Controls */}
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Primary Color:</span>
                      <input
                        type="color"
                        value={effectConfig.primaryColor}
                        onChange={(e) => setEffectParam('primaryColor', e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-zinc-800">
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Secondary:</span>
                      <input
                        type="color"
                        value={effectConfig.secondaryColor}
                        onChange={(e) => setEffectParam('secondaryColor', e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {quickColors.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => setEffectParam('primaryColor', hex)}
                          style={{ backgroundColor: hex }}
                          className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                          title={hex}
                        />
                      ))}
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer pl-3 border-l border-slate-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        checked={effectConfig.rainbow}
                        onChange={(e) => setEffectParam('rainbow', e.target.checked)}
                        className="accent-indigo-600 rounded cursor-pointer"
                      />
                      <span>Rainbow Spectrum</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* LED Position Octave Shift & Pitch Transpose Control Pod */}
            <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-indigo-500" />
                    LED Position Octave Shift & Pitch Transpose
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Adjust key-to-LED spatial alignment across the WS2812B LED strip using step buttons
                  </p>
                </div>
                <span className="text-[11px] font-mono text-indigo-500 font-bold bg-indigo-50 dark:bg-zinc-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-zinc-800">
                  STEPPER BUTTONS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. LED Octave Shift Stepper */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">LED Octave Shift</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Shift LED strip alignment by octaves</div>
                  </div>

                  <div className="flex items-center bg-slate-200/80 dark:bg-zinc-900 p-1 rounded-xl border border-slate-300/80 dark:border-zinc-700">
                    <button
                      onClick={decrementOctave}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                      title="Shift LED Octave Down (-12 st)"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="px-3 font-mono font-bold text-xs text-slate-900 dark:text-white min-w-[60px] text-center select-none">
                      {octaveShift === 0 ? 'Oct 0' : `Oct ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
                    </span>

                    <button
                      onClick={incrementOctave}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                      title="Shift LED Octave Up (+12 st)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. LED Pitch Transpose Stepper */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">LED Pitch Transpose</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Shift LED position by semitones</div>
                  </div>

                  <div className="flex items-center bg-slate-200/80 dark:bg-zinc-900 p-1 rounded-xl border border-slate-300/80 dark:border-zinc-700">
                    <button
                      onClick={decrementTranspose}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                      title="Transpose -1 Semitone"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="px-3 font-mono font-bold text-xs text-slate-900 dark:text-white min-w-[60px] text-center select-none">
                      {transpose === 0 ? '0 st' : `${transpose > 0 ? `+${transpose}` : transpose} st`}
                    </span>

                    <button
                      onClick={incrementTranspose}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                      title="Transpose +1 Semitone"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* SECTION 2: Flow Key Visualizer & Trails (Displayed Second) */}
        {activeSection === 'flow' && (
          <div className="flex flex-col gap-4">
            {/* Trail Styles Selector */}
            <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Flow Key Trail Render Style
                </h2>
                <span className="text-[11px] font-mono text-slate-400">Physics & Shaders</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TRAIL_STYLES.map((st) => {
                  const isActive = flowKeyConfig.trailStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setFlowKeyParam('trailStyle', st.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50/70 dark:bg-zinc-800 border-indigo-500 dark:border-zinc-600 elevation-1'
                          : 'bg-slate-50/50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                          {st.name}
                        </span>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
                        {st.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trail Dynamics Sliders */}
            <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-indigo-500" />
                  Trail Duration & Flow Dynamics
                </h2>
                <span className="text-[11px] font-mono text-slate-400">Live Simulation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Trail Duration */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" /> Flow Key Length / Duration
                    </span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{flowKeyConfig.trailDuration.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={flowKeyConfig.trailDuration}
                    onChange={(e) => setFlowKeyParam('trailDuration', parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Flow Speed */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-cyan-500" /> Movement Flow Speed
                    </span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{flowKeyConfig.flowSpeed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={flowKeyConfig.flowSpeed}
                    onChange={(e) => setFlowKeyParam('flowSpeed', parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Glow Intensity */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" /> Neon Glow Intensity
                    </span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{flowKeyConfig.glowIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={flowKeyConfig.glowIntensity}
                    onChange={(e) => setFlowKeyParam('glowIntensity', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Particle & Bloom Toggles */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-center gap-3">
                  <label className="flex items-center justify-between text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Zap className="w-3.5 h-3.5 text-yellow-500" /> Contact Spark Particles
                    </span>
                    <input
                      type="checkbox"
                      checked={flowKeyConfig.showParticles}
                      onChange={(e) => setFlowKeyParam('showParticles', e.target.checked)}
                      className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-700 dark:text-zinc-300 cursor-pointer pt-2 border-t border-slate-200/60 dark:border-zinc-800/60">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Optical Bloom Aura
                    </span>
                    <input
                      type="checkbox"
                      checked={flowKeyConfig.bloomGlow}
                      onChange={(e) => setFlowKeyParam('bloomGlow', e.target.checked)}
                      className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* NEW: Custom FlowKey Color Controls */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Flow Note Primary:</span>
                    <input
                      type="color"
                      value={flowKeyConfig.customColor || '#00f0ff'}
                      onChange={(e) => setFlowKeyParam('customColor', e.target.value)}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Flow Secondary / Glow:</span>
                    <input
                      type="color"
                      value={flowKeyConfig.customSecondaryColor || '#ec4899'}
                      onChange={(e) => setFlowKeyParam('customSecondaryColor', e.target.value)}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {quickColors.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setFlowKeyParam('customColor', hex)}
                      style={{ backgroundColor: hex }}
                      className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Runway Space & Grid FX (Displayed Third) */}
        {activeSection === 'background' && (
          <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Grid className="w-4 h-4 text-cyan-500" />
                  Runway Background & Perspective Space
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Configure pitch lanes, octave boundary dividers, and time distance divisions
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Synthesia Space</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vertical Pitch Lanes */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Vertical Pitch Lanes</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Vertical divider lines matching piano keys</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showVerticalPitchLanes}
                  onChange={(e) => setBgConfigParam('showVerticalPitchLanes', e.target.checked)}
                  className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Key Region Zebra Tinting */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Key Region Zebra Tinting</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Darker obsidian lanes behind black keys</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showKeyRegions}
                  onChange={(e) => setBgConfigParam('showKeyRegions', e.target.checked)}
                  className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Octave Boundary Dividers */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Octave Boundary Dividers</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Vivid boundary laser columns at every C note</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showOctaveDividers}
                  onChange={(e) => setBgConfigParam('showOctaveDividers', e.target.checked)}
                  className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Horizontal Measure Lines */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Horizontal Beat & Measure Lines</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Horizontal distance lines moving into perspective</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showHorizontalBeatLines}
                  onChange={(e) => setBgConfigParam('showHorizontalBeatLines', e.target.checked)}
                  className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Subtle Grid Subdivisions */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Subtle Intermediate Grid</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Subdivisions between measure bars</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showSubtleGrid}
                  onChange={(e) => setBgConfigParam('showSubtleGrid', e.target.checked)}
                  className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Animated Scrolling Grid */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Animated Scrolling Grid</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Syncs perspective grid velocity with tempo</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.scrollGrid}
                  onChange={(e) => setBgConfigParam('scrollGrid', e.target.checked)}
                  className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* NEW: Custom Grid & Runway Color Palette Pickers */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-500" />
                Custom Runway & Grid Color Themes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Grid Lines Color */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Grid Lines:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bgConfig.gridColor || '#6366f1'}
                      onChange={(e) => setBgConfigParam('gridColor', e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500">{bgConfig.gridColor || '#6366f1'}</span>
                  </div>
                </div>

                {/* Pitch Lanes Color */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Pitch Lanes:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bgConfig.laneColor || '#38bdf8'}
                      onChange={(e) => setBgConfigParam('laneColor', e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500">{bgConfig.laneColor || '#38bdf8'}</span>
                  </div>
                </div>

                {/* Atmospheric Haze Glow */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">Runway Haze:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bgConfig.hazeColor || '#a855f7'}
                      onChange={(e) => setBgConfigParam('hazeColor', e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-500">{bgConfig.hazeColor || '#a855f7'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Right Column: Unified Visual Sync Presets & Hardware Sync (4 Cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        
        {/* Unified Visual Sync Color Presets (Top card) */}
        <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-indigo-500" />
                Unified Visual Sync
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Syncs flow keys, key press glow & LED strip
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold">
              1-CLICK
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {(Object.keys(COLOR_SYNC_PRESETS) as ColorSyncPresetId[]).map((presetId) => {
              const p = COLOR_SYNC_PRESETS[presetId];
              const isSelected = flowKeyConfig.colorPreset === presetId;
              return (
                <button
                  key={presetId}
                  onClick={() => applyColorPreset(presetId)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-zinc-800/90 border-indigo-500 dark:border-indigo-400 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Dual Swatch Pill */}
                    <div className="flex items-center -space-x-1">
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm" 
                        style={{ backgroundColor: presetId === 'custom' ? (flowKeyConfig.customColor || effectConfig.primaryColor) : p.primary }} 
                      />
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm" 
                        style={{ backgroundColor: presetId === 'custom' ? (flowKeyConfig.customSecondaryColor || effectConfig.secondaryColor) : p.secondary }} 
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                          {p.name}
                        </h4>
                        {presetId === 'custom' && (
                          <span className="text-[9px] font-mono px-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold">
                            ACTIVE USER
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
                        {presetId === 'custom' ? 'User-tuned colors & parameters' : p.desc}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hardware Sync Card */}
        <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col gap-3.5 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-500" />
              M5Stack Hardware Sync
            </h2>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setProtocolFormat('cli')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                  protocolFormat === 'cli'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                CLI
              </button>
              <button
                onClick={() => setProtocolFormat('json')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                  protocolFormat === 'json'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
            {getPayloadString()}
          </pre>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleSendToDevice}
              disabled={sending}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-emerald-500/20 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Pushing...' : 'Push to Strip'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
