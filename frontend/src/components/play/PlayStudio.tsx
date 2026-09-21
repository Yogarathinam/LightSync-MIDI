import React, { useState, useEffect, useRef } from 'react';
import { Music, Clock, Volume2, Radio, Sliders, Play, Square } from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { synthEngine } from '../../audio/synthEngine';
import { InstrumentType } from '../../types';

export const PlayStudio: React.FC = () => {
  const {
    currentChord,
    activeNotes,
    instrument,
    setInstrument,
    isSustained,
    toggleSustain,
    metronomeActive,
    setMetronomeActive,
    metronomeBpm,
    setMetronomeBpm
  } = useLightSyncStore();

  const [currentBeat, setCurrentBeat] = useState(0);
  const tapTimesRef = useRef<number[]>([]);

  // Metronome tick loop
  useEffect(() => {
    if (!metronomeActive) {
      setCurrentBeat(0);
      return;
    }

    const intervalMs = (60 / metronomeBpm) * 1000;
    const interval = setInterval(() => {
      setCurrentBeat((prev) => {
        const next = (prev % 4) + 1;
        synthEngine.playClick(next === 1);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [metronomeActive, metronomeBpm]);

  // Tap Tempo Handler
  const handleTapTempo = () => {
    const now = performance.now();
    const times = tapTimesRef.current;
    times.push(now);

    if (times.length > 4) times.shift();

    if (times.length >= 2) {
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 40 && bpm <= 240) {
        setMetronomeBpm(bpm);
      }
    }
  };

  const instruments: { id: InstrumentType; label: string; desc: string }[] = [
    { id: 'acoustic_grand', label: 'Grand Piano', desc: 'Warm acoustic concert tone' },
    { id: 'electric_rhodes', label: 'Electric Rhodes', desc: 'Smooth vintage bell chime' },
    { id: 'warm_synth', label: 'Analog Synth', desc: 'Dual saw with resonant filter' },
    { id: 'marimba', label: 'Marimba Pluck', desc: 'Percussive wooden strike' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      
      {/* Chord & Harmonic Analysis Card (5 Cols) */}
      <div className="md:col-span-5 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-indigo-500" />
              Harmonic Analysis
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold">
              Live Polyphony
            </span>
          </div>

          <div className="my-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800/80">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-1 uppercase tracking-wider">
              Detected Chord
            </span>
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-mono">
              {currentChord ? currentChord.chord : (activeNotes.size > 0 ? `${activeNotes.size} Notes` : 'Play Notes')}
            </span>
            {currentChord && (
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-zinc-300">
                <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  Root: <strong>{currentChord.root}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  Type: <strong>{currentChord.type}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sustain Pedal Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Sustain Pedal</span>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">Hold notes indefinitely (Spacebar)</span>
          </div>
          <button
            onClick={toggleSustain}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isSustained
                ? 'bg-amber-500 text-white shadow-sm elevation-1'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isSustained ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Center: Instrument Engine Selection (4 Cols) */}
      <div className="md:col-span-4 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              Sound Engine
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Web Audio</span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-3">
            {instruments.map((inst) => {
              const isSelected = instrument === inst.id;
              return (
                <button
                  key={inst.id}
                  onClick={() => setInstrument(inst.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-zinc-800 border-indigo-500 dark:border-zinc-600 elevation-1'
                      : 'bg-slate-50/50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-white' : 'text-slate-700 dark:text-zinc-300'}`}>
                      {inst.label}
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">{inst.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono mt-3">
          Zero external dependencies. Runs 100% offline.
        </div>
      </div>

      {/* Right: Metronome Studio (3 Cols) */}
      <div className="md:col-span-3 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Metronome
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              4/4 Time
            </span>
          </div>

          <div className="my-4 flex flex-col items-center">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {metronomeBpm} <span className="text-xs font-normal text-slate-400">BPM</span>
            </div>

            {/* Visual Beat Indicator Dots */}
            <div className="flex items-center gap-2 my-3">
              {[1, 2, 3, 4].map((b) => (
                <div
                  key={b}
                  className={`w-3 h-3 rounded-full transition-all duration-75 ${
                    currentBeat === b
                      ? (b === 1 ? 'bg-indigo-600 scale-125' : 'bg-sky-500 scale-110')
                      : 'bg-slate-200 dark:bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* BPM Slider */}
            <input
              type="range"
              min="40"
              max="220"
              step="1"
              value={metronomeBpm}
              onChange={(e) => setMetronomeBpm(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => setMetronomeActive(!metronomeActive)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              metronomeActive
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500'
            }`}
          >
            {metronomeActive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{metronomeActive ? 'Stop' : 'Start'}</span>
          </button>

          <button
            onClick={handleTapTempo}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 active:scale-95"
          >
            TAP
          </button>
        </div>
      </div>

    </div>
  );
};
