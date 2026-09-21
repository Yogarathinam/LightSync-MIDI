import React, { useRef } from 'react';
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
  Play,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Minus,
  Plus
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { useTheme } from '../../context/ThemeContext';
import { StudioTab, TopNavTab } from '../../types';

export const AppHeader: React.FC<{
  onHoverMenu?: (tab: StudioTab | 'quick_settings' | 'settings' | null) => void;
}> = ({ onHoverMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const { 
    activeWorkspace,
    openWorkspace,
    closeWorkspace,
    activeUtilityOverlay,
    openUtilityOverlay,
    closeUtilityOverlay,
    currentSong,
    deviceStatus, 
    volume, 
    setVolume, 
    isMuted, 
    toggleMute,
    metronomeActive,
    setMetronomeActive,
    metronomeBpm,
    activeNotes,
    currentChord,
    octaveShift,
    incrementOctave,
    decrementOctave
  } = useLightSyncStore();

  const tabs: { id: TopNavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'songs', label: 'Songs', icon: <Music className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'visualize', label: 'Visualize', icon: <Play className="w-3.5 h-3.5 text-indigo-500" /> },
    { id: 'effects', label: 'Effect Studio', icon: <Sliders className="w-3.5 h-3.5 text-sky-500" /> },
    { id: 'aicoach', label: 'AI Coach', icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" /> },
  ];

  const handleTabClick = (tabId: TopNavTab) => {
    closeUtilityOverlay();

    if (tabId === 'visualize') {
      // "Visualize" is the home stage. Clicking it always closes workspaces and returns to the live visualizer!
      closeWorkspace();
    } else {
      // Workspace tabs ('songs', 'learn', 'effects', 'aicoach')
      if (activeWorkspace === tabId) {
        closeWorkspace(); // toggle closed -> returns to live visualizer
      } else {
        openWorkspace(tabId);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-black border-b border-slate-200 dark:border-zinc-800 transition-colors shadow-sm">
      <div className="max-w-[1850px] mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2.5">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-zinc-900 border border-slate-700/60 dark:border-zinc-800 flex items-center justify-center shadow-md shadow-indigo-500/10 overflow-hidden p-1 transition-transform hover:scale-105">
            <img src="/Logo.svg" alt="LightSync Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                LightSync
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-800 font-semibold">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 hidden sm:block leading-tight">
              Music Interaction Platform
            </p>
          </div>
        </div>

        {/* Center: Studio Tabs with Click-to-Open Overlay */}
        <nav className="hidden md:flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800">
          {tabs.map((tab) => {
            const isWorkspaceActive = activeWorkspace === tab.id;
            const isDefaultVisualize = tab.id === 'visualize' && activeWorkspace === null;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all select-none cursor-pointer ${
                  isWorkspaceActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : isDefaultVisualize
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60 font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
                }`}
                title={
                  tab.id === 'visualize' 
                    ? 'Live Visualizer & Performance Stage'
                    : `Open ${tab.label}`
                }
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isDefaultVisualize && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                )}
                {tab.id === 'learn' && currentSong && (
                  <span className="hidden xl:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 truncate max-w-[90px]">
                    {currentSong.title}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Universal Actions Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 select-none">
          
          {/* 1. Live Performance Output Capsule (Fixed width, zero layout shift) */}
          <div className="hidden lg:flex items-center h-8.5 px-3 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm shrink-0 select-none">
            {/* Live Chord / Pitch readout */}
            <div className="w-14 text-center">
              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 truncate block">
                {currentChord ? currentChord.chord : '--'}
              </span>
            </div>
            
            {/* Subtle divider */}
            <div className="h-3.5 w-px bg-slate-300 dark:bg-zinc-800 mx-2" />

            {/* Active Keys indicator */}
            <div className="flex items-center gap-1.5 w-16">
              <span className="relative flex h-2 w-2 shrink-0">
                {activeNotes.size > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 transition-colors ${activeNotes.size > 0 ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-400 dark:bg-zinc-600'}`} />
              </span>
              <span className="font-mono text-[11px] tabular-nums text-slate-700 dark:text-zinc-300 truncate">
                {activeNotes.size > 0 ? `${activeNotes.size} ${activeNotes.size === 1 ? 'Key' : 'Keys'}` : 'Idle'}
              </span>
            </div>
          </div>

          {/* 2. Pitch Shift & Quick Settings Pod */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Octave Switching: [-] [Oct 0] [+] */}
            <div className="flex items-center h-8.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-0.5 shadow-sm">
              <button
                onClick={decrementOctave}
                className="w-6 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all"
                title="Shift Octave Down (-12 st)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div 
                className="px-2 font-mono font-bold text-xs text-slate-800 dark:text-zinc-200 min-w-[50px] text-center select-none"
                title={`Current Octave: ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
              >
                {octaveShift === 0 ? 'Oct 0' : `Oct ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
              </div>
              <button
                onClick={incrementOctave}
                className="w-6 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all"
                title="Shift Octave Up (+12 st)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Settings Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  if (activeUtilityOverlay === 'quick_settings') closeUtilityOverlay();
                  else openUtilityOverlay('quick_settings');
                }}
                className={`h-8.5 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-medium transition-all shadow-sm cursor-pointer ${
                  activeUtilityOverlay === 'quick_settings'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
                }`}
                title="Quick Settings (Keyboard, Transpose, Octave, Diffuser)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Quick Settings</span>
              </button>
            </div>
          </div>

          {/* 3. Audio & System Toolbar Pod */}
          <div className="flex items-center h-8.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-0.5 shadow-sm shrink-0">
            {/* Metronome Quick Toggle */}
            <button
              onClick={() => setMetronomeActive(!metronomeActive)}
              title={`Metronome (${metronomeBpm} BPM)`}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                metronomeActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
            </button>

            {/* Volume / Mute Toggle with Mini Slider */}
            <div className="hidden xl:flex items-center gap-1 px-1">
              <button
                onClick={toggleMute}
                className="p-1 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-14 h-1.5 accent-indigo-600 cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>

            {/* Divider */}
            <div className="h-3.5 w-px bg-slate-300 dark:bg-zinc-800 mx-0.5" />

            {/* Full Settings Modal Button */}
            <button
              onClick={() => {
                if (activeUtilityOverlay === 'settings') closeUtilityOverlay();
                else openUtilityOverlay('settings');
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                activeUtilityOverlay === 'settings'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800'
              }`}
              title="Studio Preferences & Configuration"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>

            {/* Application-Wide Light / Pure-Black Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title={`Switch whole application to ${theme === 'dark' ? 'Studio Daylight' : 'Pure Black OLED'} Theme`}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600 transition-transform hover:-rotate-12" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Single Tab Bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-1.5 bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-zinc-800 overflow-x-auto">
        {tabs.map((tab) => {
          const isWorkspaceActive = activeWorkspace === tab.id;
          const isDefaultVisualize = tab.id === 'visualize' && activeWorkspace === null;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`p-1 rounded-lg text-xs flex flex-col items-center gap-0.5 shrink-0 cursor-pointer ${
                isWorkspaceActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : isDefaultVisualize
                  ? 'text-indigo-500 font-semibold'
                  : 'text-slate-500 dark:text-zinc-500'
              }`}
            >
              {tab.icon}
              <span className="text-[9px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
