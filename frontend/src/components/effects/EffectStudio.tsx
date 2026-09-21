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
  Layers
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { EffectType } from '../../types';

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

export const EffectStudio: React.FC = () => {
  const { 
    effectConfig, 
    setEffectParam, 
    presets, 
    loadPreset, 
    addConsoleLog,
    wsSender 
  } = useLightSyncStore();

  const [protocolFormat, setProtocolFormat] = useState<'cli' | 'json'>('cli');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // Generate payload string
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
      
      {/* Left Column: Effect Catalog & Parameters (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
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

            {/* Palette & Dynamic Rainbow Mode */}
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

              {/* Quick Swatches & Rainbow */}
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

      {/* Right Column: Preset Cards & Hardware Sync Terminal (4 Cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        
        {/* Hardware Sync Card */}
        <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col gap-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              M5Stack Hardware Sync
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold">
              READY
            </span>
          </div>

          <button
            onClick={handleSendToDevice}
            disabled={sending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {sending ? <Check className="w-4 h-4 text-emerald-300" /> : <Send className="w-4 h-4" />}
            <span>{sending ? 'Parameters Synced!' : 'Apply to M5Stack Strip'}</span>
          </button>

          {/* Protocol Format Switcher */}
          <div className="flex items-center justify-between text-xs bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
            <span className="text-slate-500 dark:text-zinc-400 px-2 font-medium">Format:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setProtocolFormat('cli')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
                  protocolFormat === 'cli' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white font-bold elevation-1' : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                CLI Text
              </button>
              <button
                onClick={() => setProtocolFormat('json')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
                  protocolFormat === 'json' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white font-bold elevation-1' : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {/* Command Payload Area */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
              <span className="font-mono">Generated Command Payload:</span>
              <button
                onClick={handleCopy}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={getPayloadString()}
              className="w-full h-36 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-emerald-400 font-mono text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-800 resize-none focus:outline-none select-all"
            />
          </div>
        </div>

        {/* Factory Presets Card */}
        <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-500" />
              Presets
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Quick Themes</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {[
              { id: 'p1', name: 'Ethereal Echo', effect: 'ripple' as const, speed: 1.2, decay: 0.88, spread: 3.5, brightness: 200, rainbow: false, primaryColor: '#00f0ff', secondaryColor: '#6366f1' },
              { id: 'p2', name: 'Neon Pulse', effect: 'pulse' as const, speed: 0.9, decay: 0.82, spread: 4.0, brightness: 220, rainbow: false, primaryColor: '#a855f7', secondaryColor: '#ec4899' },
              { id: 'p3', name: 'Starlight Rain', effect: 'rain' as const, speed: 1.4, decay: 0.92, spread: 5.0, brightness: 240, rainbow: true, primaryColor: '#f59e0b', secondaryColor: '#38bdf8' },
              { id: 'p4', name: 'Cyber Spark', effect: 'spark' as const, speed: 1.6, decay: 0.80, spread: 2.5, brightness: 255, rainbow: false, primaryColor: '#10b981', secondaryColor: '#06b6d4' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.primaryColor }} />
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{p.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">{p.effect}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
