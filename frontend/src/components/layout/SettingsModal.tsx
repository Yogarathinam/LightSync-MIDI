import React from 'react';
import { 
  Moon, 
  Sun, 
  Play, 
  Square, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Eye, 
  Sparkles, 
  RotateCcw,
  Zap,
  Activity,
  Music,
  Minus,
  Plus
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { useTheme } from '../../context/ThemeContext';
import { InstrumentType } from '../../types';

export const SettingsModal: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const {
    isAutoDemo,
    toggleAutoDemo,
    fallingNotes,
    setFallingNotes,
    flowSpeed,
    setFlowSpeed,
    diffuseBlur,
    setDiffuseBlur,
    keyboardSize,
    setKeyboardSize,
    keyLabels,
    setKeyLabels,
    octaveShift,
    setOctaveShift,
    incrementOctave,
    decrementOctave,
    transpose,
    setTranspose,
    incrementTranspose,
    decrementTranspose,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    instrument,
    setInstrument,
    addConsoleLog
  } = useLightSyncStore();

  const handleResetDefaults = () => {
    setTheme('dark');
    setFallingNotes(true);
    setFlowSpeed(1.2);
    setDiffuseBlur(true);
    setKeyboardSize(61);
    setKeyLabels('notes');
    setOctaveShift(0);
    setVolume(0.7);
    setInstrument('acoustic_grand');
    addConsoleLog('Settings restored to factory defaults.');
  };

  const instruments: { id: InstrumentType; label: string }[] = [
    { id: 'acoustic_grand', label: 'Concert Grand Piano' },
    { id: 'electric_rhodes', label: 'Vintage Electric Rhodes' },
    { id: 'warm_synth', label: 'Warm Analog Saw Synth' },
    { id: 'marimba', label: 'Percussive Marimba Pluck' },
  ];

  return (
    <div className="space-y-6 text-sm">
      
      {/* 1. App-Wide Theme (Daylight vs Pure Black OLED) */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              Application Theme
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Switch entire application between Pure Black OLED and Clean Daylight
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold uppercase">
            {theme === 'dark' ? 'Pure Black' : 'Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
              theme === 'dark'
                ? 'bg-black text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
              <Moon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-xs text-white">Pure Black (Night)</div>
              <div className="text-[11px] text-zinc-400">#000000 True OLED</div>
            </div>
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
              theme === 'light'
                ? 'bg-white text-slate-900 border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0">
              <Sun className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-900">Daylight (Light)</div>
              <div className="text-[11px] text-slate-500">Crisp high contrast</div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Auto Demo Mode (Moved under Settings as requested) */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isAutoDemo 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Auto Demo Mode
                {isAutoDemo && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                    STREAMING
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Automatically plays cascading melodic streams and triggers reactive LED strip animations
              </p>
            </div>
          </div>

          <button
            onClick={toggleAutoDemo}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isAutoDemo
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
            }`}
          >
            {isAutoDemo ? (
              <>
                <Square className="w-4 h-4" />
                <span>Stop Demo</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Auto Demo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Visualizer Waterfall & Flow Keys Options */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 transition-colors space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          Waterfall Flow Keys Engine
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Falling notes toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-slate-900 dark:text-zinc-200">Waterfall Falling Bars</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">Cascading note rectangles</div>
            </div>
            <input
              type="checkbox"
              checked={fallingNotes}
              onChange={(e) => setFallingNotes(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </label>

          {/* Diffuser blur toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 cursor-pointer">
            <div>
              <div className="font-semibold text-xs text-slate-900 dark:text-zinc-200">WS2812B Diffuser Glow</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">Silicone optical tube blur</div>
            </div>
            <input
              type="checkbox"
              checked={diffuseBlur}
              onChange={(e) => setDiffuseBlur(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Falling Speed Slider */}
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-700 dark:text-zinc-300">Flow Descent Speed</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{flowSpeed.toFixed(1)}x</span>
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
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
            <span>0.5x Slow (Beginner)</span>
            <span>1.2x Normal</span>
            <span>3.0x Fast (Pro)</span>
          </div>
        </div>
      </div>

      {/* 4. Keyboard Layout & Labels */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 transition-colors space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Music className="w-4 h-4 text-indigo-500" />
          Bottom Piano Keyboard Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Key Size */}
          <div>
            <label className="text-xs text-slate-500 dark:text-zinc-400 font-medium block mb-1.5">
              Keyboard Range:
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
              {([25, 49, 61, 88] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setKeyboardSize(size)}
                  className={`py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
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

          {/* Key Labels */}
          <div>
            <label className="text-xs text-slate-500 dark:text-zinc-400 font-medium block mb-1.5">
              Key Overlay Labels:
            </label>
            <select
              value={keyLabels}
              onChange={(e) => setKeyLabels(e.target.value as any)}
              className="w-full bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="notes">Musical Notes (C4, D4, E4)</option>
              <option value="solfege">Solfège (Do, Re, Mi)</option>
              <option value="qwerty">Computer QWERTY (A, W, S)</option>
              <option value="none">No Labels (Minimal Clean)</option>
            </select>
          </div>
        </div>

        {/* Octave & Pitch Transpose Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-zinc-400 font-medium block mb-1.5">
              Octave Shift:
            </label>
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={decrementOctave}
                className="w-8 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                title="Shift Down 1 Octave"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                {octaveShift === 0 ? 'Oct 0 (Default)' : `Oct ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
              </div>
              <button
                onClick={incrementOctave}
                className="w-8 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                title="Shift Up 1 Octave"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-zinc-400 font-medium block mb-1.5">
              Pitch Transpose:
            </label>
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={decrementTranspose}
                className="w-8 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                title="Transpose -1 Semitone"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                {transpose === 0 ? '0 Semitones' : `${transpose > 0 ? `+${transpose}` : transpose} st`}
              </div>
              <button
                onClick={incrementTranspose}
                className="w-8 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                title="Transpose +1 Semitone"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Audio Synthesizer Presets */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 transition-colors space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-500" />
          Sound Engine & Master Synth
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {instruments.map((inst) => (
            <button
              key={inst.id}
              onClick={() => setInstrument(inst.id)}
              className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                instrument === inst.id
                  ? 'bg-indigo-50 dark:bg-zinc-900 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm'
                  : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300'
              }`}
            >
              {inst.label}
            </button>
          ))}
        </div>

        {/* Volume & Mute */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-zinc-400">Master Volume</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 6. Restore Defaults */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 select-none">
          <img src="/Logo.svg" alt="LightSync Logo" className="w-5 h-5 object-contain" />
          <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">
            LightSync Studio v2.0 • Hardware Spec Rev 2
          </span>
        </div>
        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition-all font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

    </div>
  );
};
