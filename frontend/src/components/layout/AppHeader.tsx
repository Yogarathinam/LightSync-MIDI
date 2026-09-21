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
  Radio, 
  Settings as SettingsIcon,
  SlidersHorizontal,
  Minus,
  Plus
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { useTheme } from '../../context/ThemeContext';
import { StudioTab } from '../../types';

export const AppHeader: React.FC<{
  onHoverMenu?: (tab: StudioTab | 'quick_settings' | 'settings' | null) => void;
}> = ({ onHoverMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const { 
    activeOverlay,
    setActiveOverlay,
    closeOverlay,
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

  const hoverTimerRef = useRef<number | null>(null);

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: 'play', label: 'Play', icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'effects', label: 'Effect Studio', icon: <Sliders className="w-3.5 h-3.5 text-indigo-500" /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'practice', label: 'Practice', icon: <Activity className="w-3.5 h-3.5 text-sky-500" /> },
    { id: 'analyze', label: 'Analyze', icon: <BarChart2 className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'aicoach', label: 'AI Coach', icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" /> },
    { id: 'device', label: 'Hardware', icon: <Cpu className="w-3.5 h-3.5 text-teal-500" /> },
  ];

  // Hover triggers smooth overlay open
  const handleMouseEnter = (target: StudioTab | 'quick_settings' | 'settings') => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setActiveOverlay(target);
    if (onHoverMenu) onHoverMenu(target);
  };

  const handleMouseLeave = () => {
    hoverTimerRef.current = window.setTimeout(() => {
      closeOverlay();
      if (onHoverMenu) onHoverMenu(null);
    }, 240); // 240ms grace period so user can comfortably move mouse into the card
  };

  const handleTabClick = (tabId: StudioTab) => {
    if (activeOverlay === tabId) {
      closeOverlay();
    } else {
      setActiveOverlay(tabId);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 transition-colors shadow-sm">
      <div className="max-w-[1850px] mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2.5">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/25">
            <span className="font-mono text-xs tracking-wider">LS</span>
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

        {/* Center: Studio Tabs with Hover-to-Open Overlay */}
        <nav 
          onMouseLeave={handleMouseLeave}
          className="hidden md:flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800"
        >
          {tabs.map((tab) => {
            const isOpen = activeOverlay === tab.id;
            return (
              <button
                key={tab.id}
                onMouseEnter={() => handleMouseEnter(tab.id)}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all select-none ${
                  isOpen
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Universal Actions Bar */}
        <div className="flex items-center gap-2 shrink-0 select-none">
          
          {/* Live Chord Badge */}
          {currentChord && (
            <div className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-zinc-900 border border-indigo-200 dark:border-zinc-800 text-xs text-indigo-700 dark:text-indigo-300 font-bold font-mono animate-pulse">
              <span>{currentChord.chord}</span>
            </div>
          )}

          {/* Active Note Key Count */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300">
            <span className={`w-2 h-2 rounded-full transition-colors ${activeNotes.size > 0 ? 'bg-indigo-500 animate-ping' : 'bg-slate-400 dark:bg-zinc-600'}`} />
            <span className="font-mono text-[11px]">
              {activeNotes.size > 0 ? `${activeNotes.size} Keys` : 'Idle'}
            </span>
          </div>

          {/* Octave Switching: [-] [Oct 0] [+] with no hard limit */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-0.5">
            <button
              onClick={decrementOctave}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title="Shift Octave Down (-12 st)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div 
              className="px-2 font-mono font-bold text-xs text-slate-800 dark:text-zinc-200 min-w-[50px] text-center"
              title={`Current Octave: ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
            >
              {octaveShift === 0 ? 'Oct 0' : `Oct ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
            </div>
            <button
              onClick={incrementOctave}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title="Shift Octave Up (+12 st)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Settings Dropdown Trigger */}
          <div 
            onMouseLeave={handleMouseLeave}
            className="relative"
          >
            <button
              onMouseEnter={() => handleMouseEnter('quick_settings')}
              onClick={() => {
                if (activeOverlay === 'quick_settings') closeOverlay();
                else setActiveOverlay('quick_settings');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                activeOverlay === 'quick_settings'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
              }`}
              title="Quick Settings (Keyboard, Transpose, Octave, Diffuser)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xl:inline text-xs">Quick Settings</span>
            </button>
          </div>

          {/* M5Stack Hardware Badge */}
          <button 
            onMouseEnter={() => handleMouseEnter('device')}
            onClick={() => handleTabClick('device')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              deviceStatus.connected
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
            }`}
            title="Hardware Device Monitor"
          >
            <Radio className="w-3 h-3" />
            <span className="font-mono text-[11px] hidden md:inline">
              {deviceStatus.connected ? (deviceStatus.simulated ? 'M5 Sim' : `${deviceStatus.port}`) : 'No Device'}
            </span>
          </button>

          {/* Metronome Quick Toggle */}
          <button
            onClick={() => setMetronomeActive(!metronomeActive)}
            title={`Metronome (${metronomeBpm} BPM)`}
            className={`p-2 rounded-xl border text-xs font-medium transition-all ${
              metronomeActive
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          {/* Volume / Mute Toggle */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-1">
            <button
              onClick={toggleMute}
              className="p-1 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
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

          {/* Full Settings Modal Button */}
          <button
            onMouseEnter={() => handleMouseEnter('settings')}
            onClick={() => {
              if (activeOverlay === 'settings') closeOverlay();
              else setActiveOverlay('settings');
            }}
            className={`p-2 rounded-xl border transition-all ${
              activeOverlay === 'settings'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
            }`}
            title="Studio Preferences & Configuration"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>

          {/* Application-Wide Light / Pure-Black Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all shadow-sm"
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

      {/* Mobile Single Tab Bar */}
      <div 
        onMouseLeave={handleMouseLeave}
        className="md:hidden flex items-center justify-around px-2 py-1.5 bg-slate-50 dark:bg-black border-t border-slate-200 dark:border-zinc-800 overflow-x-auto"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`p-1 rounded-lg text-xs flex flex-col items-center gap-0.5 shrink-0 ${
              activeOverlay === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-zinc-500'
            }`}
          >
            {tab.icon}
            <span className="text-[9px]">{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
