import React, { useState } from 'react';
import { Activity, Repeat, Gauge, Hand, Target } from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';

export const PracticeStudio: React.FC = () => {
  const { handFilter, setHandFilter } = useLightSyncStore();
  const [tempoScale, setTempoScale] = useState(100);
  const [loopSection, setLoopSection] = useState<'all' | 'm1_4' | 'm5_8'>('all');

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      
      {/* Practice Controls Card (7 Cols) */}
      <div className="md:col-span-7 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Targeted Practice Studio
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold">
              Precision Drills
            </span>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            
            {/* Tempo Scaling Slider */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-indigo-500" />
                  Practice Tempo Scaling
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{tempoScale}% Speed</span>
              </div>
              <input
                type="range"
                min="50"
                max="130"
                step="5"
                value={tempoScale}
                onChange={(e) => setTempoScale(parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>50% (Sub-tempo)</span>
                <span>100% (Concert speed)</span>
                <span>130% (Speed burst)</span>
              </div>
            </div>

            {/* Hand Isolation Selector */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Hand className="w-4 h-4 text-indigo-500" />
                Hand Isolation
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'both' as const, label: 'Both Hands' },
                  { id: 'right' as const, label: 'Right Hand Only' },
                  { id: 'left' as const, label: 'Left Hand Only' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setHandFilter(item.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      handFilter === item.id
                        ? 'bg-indigo-600 text-white border-indigo-600 elevation-1'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loop Region Selection */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-indigo-500" />
                Loop Region (A-B Looper)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all' as const, label: 'Full Song' },
                  { id: 'm1_4' as const, label: 'Bars 1-4 (Theme)' },
                  { id: 'm5_8' as const, label: 'Bars 5-8 (Variation)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setLoopSection(item.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      loopSection === item.id
                        ? 'bg-indigo-600 text-white border-indigo-600 elevation-1'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Right Column: Practice Tips & Drills (5 Cols) */}
      <div className="md:col-span-5 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Practice Methodology
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Pedagogical Tips</span>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {[
              {
                step: '1',
                title: 'The Slow-Motion Rule',
                body: 'Play tricky transitional sections at 60% tempo until you can play them with zero physical tension in your forearms.'
              },
              {
                step: '2',
                title: 'Eyes-Free Spatial Awareness',
                body: 'Use the physical LEDs above each key as visual peripherals so you can focus on reading ahead without staring at your fingers.'
              },
              {
                step: '3',
                title: 'Rhythmic Subdivisions',
                body: 'Set the metronome to subdivide eighth notes to anchor your downbeats during syncopated phrases.'
              }
            ].map((tip) => (
              <div key={tip.step} className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {tip.step}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{tip.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
