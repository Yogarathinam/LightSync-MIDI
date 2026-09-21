import React, { useState, useEffect } from 'react';
import { Play, Square, Eye, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';

export const VisualizerToolbar: React.FC = () => {
  const {
    keyboardSize,
    setKeyboardSize,
    octaveShift,
    setOctaveShift,
    keyLabels,
    setKeyLabels,
    diffuseBlur,
    setDiffuseBlur,
    triggerNoteOn,
    triggerNoteOff
  } = useLightSyncStore();

  const [isDemoRunning, setIsDemoRunning] = useState(false);

  // Auto demo arpeggiator
  useEffect(() => {
    if (!isDemoRunning) return;
    const demoNotes = [60, 64, 67, 72, 76, 79, 76, 72, 67, 64];
    let step = 0;

    const interval = setInterval(() => {
      const prev = demoNotes[(step - 1 + demoNotes.length) % demoNotes.length];
      const curr = demoNotes[step % demoNotes.length];
      triggerNoteOff(prev);
      triggerNoteOn(curr, 105);
      step++;
    }, 220);

    return () => {
      clearInterval(interval);
      demoNotes.forEach(p => triggerNoteOff(p));
    };
  }, [isDemoRunning, triggerNoteOn, triggerNoteOff]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-black p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs shadow-sm transition-colors">
      
      {/* Keyboard Size Segmented Control */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-zinc-400 font-medium">Keys:</span>
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-900 p-0.5 border border-slate-200 dark:border-zinc-800">
          {([25, 49, 61, 88] as const).map((size) => (
            <button
              key={size}
              onClick={() => setKeyboardSize(size)}
              className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-all ${
                keyboardSize === size
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white font-bold elevation-1'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {size}k
            </button>
          ))}
        </div>
      </div>

      {/* Octave Shift Control */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-zinc-400 font-medium">Octave:</span>
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-900 p-0.5 border border-slate-200 dark:border-zinc-800">
          {([-2, -1, 0, 1, 2]).map((shift) => (
            <button
              key={shift}
              onClick={() => setOctaveShift(shift)}
              className={`w-7 py-1 rounded-lg font-mono text-xs transition-all ${
                octaveShift === shift
                  ? 'bg-indigo-600 text-white font-bold elevation-1'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {shift > 0 ? `+${shift}` : shift}
            </button>
          ))}
        </div>
      </div>

      {/* Key Labels Selector */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-zinc-400 font-medium">Labels:</span>
        <select
          value={keyLabels}
          onChange={(e) => setKeyLabels(e.target.value as any)}
          className="bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 text-xs"
        >
          <option value="notes">Notes (C4, D4)</option>
          <option value="solfege">Solfège (Do, Re)</option>
          <option value="qwerty">QWERTY (A, W, S)</option>
          <option value="none">Hidden</option>
        </select>
      </div>

      {/* Diffuser Simulation & Demo Buttons */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={diffuseBlur}
            onChange={(e) => setDiffuseBlur(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative" />
          <span className="text-slate-600 dark:text-zinc-300 font-medium text-xs">Diffuser Glow</span>
        </label>

        {/* Demo Button */}
        <button
          onClick={() => setIsDemoRunning(!isDemoRunning)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
            isDemoRunning
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'
              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
          }`}
        >
          {isDemoRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isDemoRunning ? 'Stop Demo' : 'Auto Demo'}</span>
        </button>
      </div>

    </div>
  );
};
