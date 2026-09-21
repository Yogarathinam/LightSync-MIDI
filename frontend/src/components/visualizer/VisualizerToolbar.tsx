import React from 'react';
import { 
  Sliders, 
  Music, 
  GraduationCap, 
  Activity, 
  BarChart2, 
  Sparkles, 
  Cpu, 
  Settings as SettingsIcon,
  Zap
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { StudioTab } from '../../types';

export const VisualizerToolbar: React.FC = () => {
  const {
    keyboardSize,
    setKeyboardSize,
    octaveShift,
    setOctaveShift,
    diffuseBlur,
    setDiffuseBlur,
    activeOverlay,
    setActiveOverlay,
    isAutoDemo
  } = useLightSyncStore();

  const studioShortcuts: { id: StudioTab | 'settings'; label: string; icon: React.ReactNode }[] = [
    { id: 'play', label: 'Play', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'effects', label: 'Effect Studio', icon: <Sliders className="w-3.5 h-3.5 text-indigo-500" /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'practice', label: 'Practice', icon: <Activity className="w-3.5 h-3.5 text-sky-500" /> },
    { id: 'analyze', label: 'Analyze', icon: <BarChart2 className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'aicoach', label: 'AI Coach', icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" /> },
    { id: 'device', label: 'Hardware', icon: <Cpu className="w-3.5 h-3.5 text-teal-500" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" /> },
  ];

  const handleToggleOverlay = (id: StudioTab | 'settings') => {
    if (activeOverlay === id) {
      setActiveOverlay(null);
    } else {
      setActiveOverlay(id);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-black p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs shadow-sm transition-colors">
      
      {/* Quick Launch Card Overlays */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-slate-400 dark:text-zinc-500 font-medium text-[11px] hidden sm:inline mr-1">
          Studios:
        </span>
        {studioShortcuts.map((item) => {
          const isOpen = activeOverlay === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleToggleOverlay(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 ${
                isOpen
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20 font-bold'
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-zinc-800'
              }`}
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
              {item.id === 'settings' && isAutoDemo && (
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Controls: Keys & Octave */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Keyboard Size Segmented Control */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-medium hidden md:inline">Keys:</span>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-900 p-0.5 border border-slate-200 dark:border-zinc-800">
            {([25, 49, 61, 88] as const).map((size) => (
              <button
                key={size}
                onClick={() => setKeyboardSize(size)}
                className={`px-2 py-0.5 rounded-lg font-mono text-[11px] transition-all ${
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

        {/* Octave Shift */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-medium hidden md:inline">Octave:</span>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-900 p-0.5 border border-slate-200 dark:border-zinc-800">
            {([-1, 0, 1]).map((shift) => (
              <button
                key={shift}
                onClick={() => setOctaveShift(shift)}
                className={`w-6 py-0.5 rounded-lg font-mono text-[11px] transition-all ${
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

        {/* Diffuser Toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={diffuseBlur}
            onChange={(e) => setDiffuseBlur(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-7 h-4 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative" />
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium hidden lg:inline">Glow</span>
        </label>

      </div>

    </div>
  );
};
