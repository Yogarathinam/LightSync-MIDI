import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Bookmark, 
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
  CheckCircle2
} from 'lucide-react';
import { useLightSyncStore, COLOR_SYNC_PRESETS } from '../../store/useLightSyncStore';
import { EffectType, ColorSyncPresetId, FlowKeyTrailStyle } from '../../types';

const EFFECTS_CATALOG: { id: EffectType; name: string; desc: string }[] = [
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
    presets, 
    loadPreset, 
    addConsoleLog,
    wsSender 
  } = useLightSyncStore();

  const [activeSection, setActiveSection] = useState<'flow' | 'background' | 'led'>('flow');
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

  const quickColors = ['#00f0ff', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8', '#8b5cf6'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      
      {/* Left Column: Visualizer & Engine Controls (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* Navigation Tabs for Studio Sub-Sections */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900/90 rounded-2xl border border-slate-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveSection('flow')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeSection === 'flow'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>Flow Key Trails</span>
          </button>

          <button
            onClick={() => setActiveSection('background')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeSection === 'background'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-cyan-500" />
            <span>Runway & Grid FX</span>
          </button>

          <button
            onClick={() => setActiveSection('led')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeSection === 'led'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm border border-slate-200/80 dark:border-zinc-700'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>WS2812B Hardware LED</span>
          </button>
        </div>

        {/* SECTION 1: Flow Key Visualizer & Trails */}
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
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
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
                    onChange={(e) => setFlowKeyParam('glowIntensity', parseInt(e.target.value))}
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
            </div>

          </div>
        )}

        {/* SECTION 2: Runway Space & Grid FX */}
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
                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Key Region Zebra Tinting */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Key Region Zebra Tinting</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Distinct column tinting for black vs white keys</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showKeyRegions}
                  onChange={(e) => setBgConfigParam('showKeyRegions', e.target.checked)}
                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Octave Dividers & C-Markers */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Octave Boundaries & Markers</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Prominent dividers & C1, C2, C3 badges</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showOctaveDividers}
                  onChange={(e) => setBgConfigParam('showOctaveDividers', e.target.checked)}
                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Horizontal Time & Measure Divisions */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Horizontal Time & Measure Bars</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Horizontal lines giving sense of distance/time</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showHorizontalBeatLines}
                  onChange={(e) => setBgConfigParam('showHorizontalBeatLines', e.target.checked)}
                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Subtle Intermediate Beat Grid */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Subtle Beat Grid Lines</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Fine sub-measure rhythm grid lines</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.showSubtleGrid}
                  onChange={(e) => setBgConfigParam('showSubtleGrid', e.target.checked)}
                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Animated Moving Time Grid */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Flowing Time-Space Motion</h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Moving grid synchronized to music tempo</p>
                </div>
                <input
                  type="checkbox"
                  checked={bgConfig.scrollGrid}
                  onChange={(e) => setBgConfigParam('scrollGrid', e.target.checked)}
                  className="accent-indigo-600 w-4 h-4 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: FastLED Strip Engine */}
        {activeSection === 'led' && (
          <div className="flex flex-col gap-4">
            
            {/* Effect Selector Grid */}
            <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Effect Engine Selection
                </h2>
                <span className="text-[11px] font-mono text-slate-400">9 FastLED Renderers</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2.5">
                {EFFECTS_CATALOG.map((eff) => {
                  const isActive = effectConfig.effect === eff.id;
                  return (
                    <button
                      key={eff.id}
                      onClick={() => setEffectParam('effect', eff.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        isActive
                          ? 'bg-indigo-50/70 dark:bg-zinc-800 border-indigo-500 dark:border-zinc-600 elevation-1'
                          : 'bg-slate-50/50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                          {eff.name}
                        </span>
                        {isActive && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
                        {eff.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Parameter Sliders */}
            <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-4">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Hardware Parameter Sliders
                </h2>
                <span className="text-[11px] font-mono text-slate-400">Target: WS2812B 144/m</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Speed */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-indigo-500" /> Speed
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
                      <Flame className="w-3.5 h-3.5 text-amber-500" /> Decay / Fade
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
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-500" /> Spread Width
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
                      <Sun className="w-3.5 h-3.5 text-yellow-500" /> Strip Brightness
                    </span>
                    <span className="font-mono text-yellow-600 dark:text-yellow-400 font-bold">{effectConfig.brightness} / 255</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="255"
                    step="5"
                    value={effectConfig.brightness}
                    onChange={(e) => setEffectParam('brightness', parseInt(e.target.value))}
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
                          className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                          title={hex}
                        />
                      ))}
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer pl-3 border-l border-slate-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        checked={effectConfig.rainbow}
                        onChange={(e) => setEffectParam('rainbow', e.target.checked)}
                        className="accent-indigo-600 rounded"
                      />
                      <span>Rainbow</span>
                    </label>
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
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-zinc-800/90 border-indigo-500 dark:border-indigo-400 shadow-sm'
                      : 'bg-slate-50/50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Dual Swatch Pill */}
                    <div className="flex items-center -space-x-1">
                      <span className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: p.primary }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: p.secondary }} />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
                        {p.desc}
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
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold">
              READY
            </span>
          </div>

          <button
            onClick={handleSendToDevice}
            disabled={sending}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {sending ? <Check className="w-4 h-4 text-emerald-300" /> : <Send className="w-3.5 h-3.5" />}
            <span>{sending ? 'Parameters Synced!' : 'Apply to M5Stack Strip'}</span>
          </button>

          {/* Protocol Format Switcher */}
          <div className="flex items-center justify-between text-xs bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-slate-500 dark:text-zinc-400 px-1.5 text-[11px] font-medium">Format:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setProtocolFormat('cli')}
                className={`px-2 py-0.5 rounded-lg font-mono text-[10px] transition-all ${
                  protocolFormat === 'cli' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white font-bold elevation-1' : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                CLI Text
              </button>
              <button
                onClick={() => setProtocolFormat('json')}
                className={`px-2 py-0.5 rounded-lg font-mono text-[10px] transition-all ${
                  protocolFormat === 'json' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white font-bold elevation-1' : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {/* Command Payload Area */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-zinc-400">
              <span className="font-mono">Payload:</span>
              <button
                onClick={handleCopy}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={getPayloadString()}
              className="w-full h-24 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-emerald-400 font-mono text-[10px] p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 resize-none focus:outline-none select-all leading-tight"
            />
          </div>
        </div>

      </div>

    </div>
  );
};
