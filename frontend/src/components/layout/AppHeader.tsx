import React from 'react';
import { 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Clock, 
  Cpu, 
  Music, 
  Sliders, 
  GraduationCap, 
  Activity, 
  BarChart2, 
  Sparkles,
  Radio
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { useTheme } from '../../context/ThemeContext';
import { StudioTab } from '../../types';

export const AppHeader: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { 
    activeTab, 
    setActiveTab, 
    deviceStatus, 
    volume, 
    setVolume, 
    isMuted, 
    toggleMute,
    metronomeActive,
    setMetronomeActive,
    metronomeBpm,
    activeNotes
  } = useLightSyncStore();

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: 'play', label: 'Play', icon: <Music className="w-4 h-4" /> },
    { id: 'effects', label: 'Effect Studio', icon: <Sliders className="w-4 h-4" /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'practice', label: 'Practice', icon: <Activity className="w-4 h-4" /> },
    { id: 'analyze', label: 'Analyze', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'aicoach', label: 'AI Coach', icon: <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> },
    { id: 'device', label: 'Hardware', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-[1800px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            <span className="font-mono text-sm tracking-wider">LS</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                LightSync
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-700 font-semibold">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:block">
              Music Interaction Platform
            </p>
          </div>
        </div>

        {/* Center Tab Navigation (Material Segmented Control) */}
        <nav className="hidden md:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white shadow-sm elevation-1 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Universal Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Active Note Live Blink Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300">
            <span className={`w-2 h-2 rounded-full transition-colors ${activeNotes.size > 0 ? 'bg-indigo-500 animate-ping' : 'bg-slate-400 dark:bg-zinc-600'}`} />
            <span className="font-mono text-[11px]">
              {activeNotes.size > 0 ? `${activeNotes.size} Keys` : 'Idle'}
            </span>
          </div>

          {/* M5Stack Status Badge */}
          <button 
            onClick={() => setActiveTab('device')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              deviceStatus.connected
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] hidden sm:inline">
              {deviceStatus.connected ? (deviceStatus.simulated ? 'M5 Sim' : `${deviceStatus.port}`) : 'No Device'}
            </span>
          </button>

          {/* Metronome Quick Toggle */}
          <button
            onClick={() => setMetronomeActive(!metronomeActive)}
            title={`Metronome (${metronomeBpm} BPM)`}
            className={`p-2 rounded-lg border text-xs font-medium transition-all ${
              metronomeActive
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Volume / Mute Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-1">
            <button
              onClick={toggleMute}
              className="p-1 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-14 sm:w-18 h-1.5 accent-indigo-600 cursor-pointer"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Pure Black'} Theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
            )}
          </button>

        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-2 rounded-lg text-xs flex flex-col items-center gap-1 ${
              activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-500 dark:text-zinc-500'
            }`}
          >
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
