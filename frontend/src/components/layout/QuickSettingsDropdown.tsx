import React from 'react';
import { 
  Sliders, 
  Minus, 
  Plus, 
  Settings as SettingsIcon,
  Activity,
  Layers
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';

export const QuickSettingsDropdown: React.FC = () => {
  const {
    keyboardSize,
    setKeyboardSize,
    octaveShift,
    incrementOctave,
    decrementOctave,
    transpose,
    incrementTranspose,
    decrementTranspose,
    keyLabels,
    setKeyLabels,
    diffuseBlur,
    setDiffuseBlur,
    flowSpeed,
    setFlowSpeed,
    setActiveOverlay
  } = useLightSyncStore();

  return (
    <div className="w-[360px] p-4 space-y-4 text-xs select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-zinc-800/80">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-500" />
          Quick Studio Settings
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold">
          Live Controls
        </span>
      </div>

      {/* 1. Keyboard Layout Selection (Moved to settings/quick settings) */}
      <div className="space-y-1.5">
        <label className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          Keyboard Range:
        </label>
        <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
          {([25, 49, 61, 88] as const).map((size) => (
            <button
              key={size}
              onClick={() => setKeyboardSize(size)}
              className={`py-1 rounded-lg font-mono font-bold text-xs transition-all ${
                keyboardSize === size
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {size}k
            </button>
          ))}
        </div>
      </div>

      {/* 2. Octave Shift with [-] [Oct 0] [+] */}
      <div className="space-y-1.5">
        <label className="text-slate-500 dark:text-zinc-400 font-medium">
          Octave Shift:
        </label>
        <div className="flex items-center justify-between bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
          <button
            onClick={decrementOctave}
            className="w-8 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-sm"
            title="Shift Down 1 Octave (-12 semitones)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
            {octaveShift === 0 ? 'Oct 0 (Default)' : `Oct ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
          </div>

          <button
            onClick={incrementOctave}
            className="w-8 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-sm"
            title="Shift Up 1 Octave (+12 semitones)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Pitch Transpose with [-] [0 st] [+] */}
      <div className="space-y-1.5">
        <label className="text-slate-500 dark:text-zinc-400 font-medium">
          Pitch Transpose:
        </label>
        <div className="flex items-center justify-between bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
          <button
            onClick={decrementTranspose}
            className="w-8 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-sm"
            title="Transpose -1 Semitone"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
            {transpose === 0 ? '0 Semitones' : `${transpose > 0 ? `+${transpose}` : transpose} st`}
          </div>

          <button
            onClick={incrementTranspose}
            className="w-8 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-sm"
            title="Transpose +1 Semitone"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Key Labels */}
      <div className="space-y-1.5">
        <label className="text-slate-500 dark:text-zinc-400 font-medium">
          Key Overlay Labels:
        </label>
        <select
          value={keyLabels}
          onChange={(e) => setKeyLabels(e.target.value as any)}
          className="w-full bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="notes">Notes (C4, D4, E4)</option>
          <option value="solfege">Solfège (Do, Re, Mi)</option>
          <option value="qwerty">QWERTY (A, W, S)</option>
          <option value="none">No Labels (Clean Minimal)</option>
        </select>
      </div>

      {/* 5. Diffuser Glow Toggle */}
      <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 cursor-pointer">
        <div>
          <div className="font-semibold text-slate-900 dark:text-zinc-200">WS2812B Diffuser Glow</div>
          <div className="text-[10px] text-slate-500 dark:text-zinc-400">Silicone optical tube blur</div>
        </div>
        <input
          type="checkbox"
          checked={diffuseBlur}
          onChange={(e) => setDiffuseBlur(e.target.checked)}
          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
        />
      </label>

      {/* 6. Waterfall Speed */}
      <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-slate-600 dark:text-zinc-300 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            Waterfall Descent Speed
          </span>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{flowSpeed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="3.0"
          step="0.1"
          value={flowSpeed}
          onChange={(e) => setFlowSpeed(parseFloat(e.target.value))}
          className="w-full h-1.5 accent-indigo-600 cursor-pointer"
        />
      </div>

      {/* 7. Footer: Link to Full Settings */}
      <button
        onClick={() => setActiveOverlay('settings')}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all text-xs"
      >
        <SettingsIcon className="w-3.5 h-3.5" />
        <span>Open Full Settings Modal</span>
      </button>

    </div>
  );
};
