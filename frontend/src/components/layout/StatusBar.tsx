import React from 'react';
import { Sparkles, Layers, Activity, Music } from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';

export const StatusBar: React.FC<{ fps: number }> = ({ fps }) => {
  const { 
    currentChord, 
    activeNotes, 
    effectConfig, 
    isSustained, 
    keyboardSize 
  } = useLightSyncStore();

  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const formatPitches = Array.from(activeNotes.keys())
    .sort((a, b) => a - b)
    .map(p => `${noteNames[p % 12]}${Math.floor(p / 12) - 1}`)
    .join(', ');

  return (
    <footer className="bg-white dark:bg-black border-t border-slate-200 dark:border-zinc-800 px-4 py-2 text-xs font-mono transition-colors">
      <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-500 dark:text-zinc-400">
        
        {/* Left: Real-time Chord Detection */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-zinc-900 border border-indigo-200 dark:border-zinc-700 text-indigo-700 dark:text-indigo-300 font-semibold">
            <Music className="w-3.5 h-3.5" />
            <span>Chord:</span>
            <span className="text-slate-900 dark:text-white font-bold">
              {currentChord ? currentChord.chord : (activeNotes.size > 0 ? formatPitches : 'None')}
            </span>
          </div>

          {currentChord && currentChord.type !== 'Single Note' && (
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
              {currentChord.type} {currentChord.bass !== currentChord.root ? `(Bass ${currentChord.bass})` : ''}
            </span>
          )}

          {isSustained && (
            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold">
              SUSTAIN ON
            </span>
          )}
        </div>

        {/* Center: Active Keys & Hardware Mapping */}
        <div className="hidden md:flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Layout:</span>
            <span className="text-slate-800 dark:text-zinc-200 font-semibold">{keyboardSize} Keys</span>
            <span className="text-slate-400">/ 144 LEDs</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Effect:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase">{effectConfig.effect}</span>
            <span className="text-slate-400 font-mono">({effectConfig.speed.toFixed(1)}x)</span>
          </div>
        </div>

        {/* Right: Engine Metrics */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>FPS:</span>
            <span className={`font-bold ${fps >= 55 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
              {fps}
            </span>
          </div>
          <span className="text-slate-300 dark:text-zinc-700">|</span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
            LightSync FastLED Engine
          </span>
        </div>

      </div>
    </footer>
  );
};
