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
  Plus,
  Radio,
  Cable,
  CheckCircle2,
  XCircle,
  CircleDot,
  Square
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
    devicePorts,
    fetchDevicePorts,
    connectDevicePort,
    disconnectDevicePort,
    activeMidiPort,
    midiPorts,
    isMidiConnected,
    fetchMidiPorts,
    connectMidiPort,
    disconnectMidiPort, 
    volume, 
    setVolume, 
    isMuted, 
    toggleMute,
    effectConfig,
    setEffectParam,
    metronomeActive,
    setMetronomeActive,
    metronomeBpm,
    activeNotes,
    currentChord,
    octaveShift,
    incrementOctave,
    decrementOctave,
    isRecording,
    startRecording,
    stopRecording
  } = useLightSyncStore();


  const tabs: { id: TopNavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'songs', label: 'Songs', icon: <Music className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'play', label: 'Play', icon: <Play className="w-3.5 h-3.5 text-indigo-500" /> },
    { id: 'effects', label: 'Effects', icon: <Sliders className="w-3.5 h-3.5 text-sky-500" /> },
    { id: 'aicoach', label: 'AI Coach', icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" /> },
    { id: 'hardware', label: 'Hardware', icon: <Radio className="w-3.5 h-3.5 text-cyan-500" /> },
  ];

  const handleTabClick = (tabId: TopNavTab) => {
    closeUtilityOverlay();

    if (tabId === 'play' || tabId === 'visualize') {
      if (activeWorkspace === null) {
        // Already on default visualizer stage -> open PlayStudio!
        openWorkspace('play');
      } else if (activeWorkspace === 'play') {
        // PlayStudio is already open -> close it back to default visualizer
        closeWorkspace();
      } else {
        // In another workspace (songs, learn, effects, aicoach) -> return to default stage!
        closeWorkspace();
      }
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
    <header className="sticky top-0 z-40 bg-white dark:bg-black border-b border-slate-200 dark:border-zinc-800 transition-colors shadow-sm w-full">
      <div className="w-full px-2 sm:px-3 lg:px-4 h-14 sm:h-15 flex items-center justify-between gap-1.5 sm:gap-2 select-none overflow-hidden">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 select-none">
          <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-slate-900 dark:bg-zinc-900 border border-slate-700/60 dark:border-zinc-800 flex items-center justify-center shadow-md shadow-indigo-500/10 overflow-hidden p-1 transition-transform hover:scale-105">
            <img src="/Logo.svg" alt="LightSync Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                LightSync
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-800 font-semibold whitespace-nowrap">
                v2.0
              </span>
            </div>
            {/* Subtitle hidden on smaller screens to prevent header cut-off */}
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 hidden 2xl:block leading-tight whitespace-nowrap">
              Music Interaction Platform
            </p>
          </div>
        </div>

        {/* Center: Studio Tabs with Click-to-Open Overlay */}
        <nav className="hidden md:flex items-center p-1 sm:p-1.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 shrink-0 gap-1 lg:gap-1.5 shadow-sm">
          {tabs.map((tab) => {
            const isWorkspaceActive = activeWorkspace === tab.id;
            const isDefaultPlay = (tab.id === 'play' || tab.id === 'visualize') && activeWorkspace === null;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs lg:text-[13px] font-semibold transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  isWorkspaceActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-bold'
                    : isDefaultPlay
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60'
                }`}
                title={
                  tab.id === 'play' || tab.id === 'visualize'
                    ? activeWorkspace === null
                      ? 'Live Visualizer & Play Stage (Click to open Play Studio)'
                      : 'Return to live Play visualizer'
                    : `Open ${tab.label}`
                }
              >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
                {isDefaultPlay && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
                {tab.id === 'learn' && currentSong && (
                  <span className="hidden 2xl:inline text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 truncate max-w-[80px]">
                    {currentSong.title}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Universal Actions Bar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 select-none">
          
          {/* 1. Live Performance Output Capsule (Compact: Real-time Chord & Active Keys) */}
          <div className="hidden xl:flex items-center h-8.5 px-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm shrink-0 select-none">
            {/* Live Chord / Pitch readout */}
            <div className="min-w-[34px] max-w-[50px] text-center">
              <span className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400 truncate block" title={currentChord ? `Chord: ${currentChord.chord}` : 'No active chord'}>
                {currentChord ? currentChord.chord : '--'}
              </span>
            </div>
            
            {/* Subtle divider */}
            <div className="h-3.5 w-px bg-slate-300 dark:bg-zinc-800 mx-1.5" />

            {/* Active Keys indicator */}
            <div className="flex items-center gap-1.5 min-w-[36px]">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {activeNotes.size > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 transition-colors ${activeNotes.size > 0 ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-slate-400 dark:bg-zinc-600'}`} />
              </span>
              <span className="font-mono text-[10px] tabular-nums text-slate-700 dark:text-zinc-300 truncate">
                {activeNotes.size > 0 ? `${activeNotes.size}K` : 'Idle'}
              </span>
            </div>
          </div>

          {/* 2. Pitch Shift & Quick Settings Pod */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Octave Switching: [-] [Oct 0] [+] */}
            <div className="flex items-center h-8.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-0.5 shadow-sm">
              <button
                onClick={decrementOctave}
                className="w-6 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                title="Shift Octave Down (-12 st)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div 
                className="px-1.5 sm:px-2 font-mono font-bold text-xs text-slate-800 dark:text-zinc-200 min-w-[42px] sm:min-w-[46px] text-center select-none"
                title={`Current Octave: ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
              >
                {octaveShift === 0 ? 'Oct 0' : `Oct ${octaveShift > 0 ? `+${octaveShift}` : octaveShift}`}
              </div>
              <button
                onClick={incrementOctave}
                className="w-6 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                title="Shift Octave Up (+12 st)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Settings Icon-Only Trigger (No text words) */}
            <button
              onClick={() => {
                if (activeUtilityOverlay === 'quick_settings') closeUtilityOverlay();
                else openUtilityOverlay('quick_settings');
              }}
              className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl border text-xs font-medium transition-all shadow-sm cursor-pointer ${
                activeUtilityOverlay === 'quick_settings'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800'
              }`}
              title="Quick Settings (Keyboard, Transpose, Octave, Diffuser)"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* 3. Audio, Brightness & System Toolbar Pod */}
          <div className="flex items-center h-8.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-0.5 shadow-sm shrink-0">
            
            {/* Brightness Control Slider (Optical WS2812B & Visualizer, Default 15, Scroll Wheel Enabled) */}
            <div 
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 5 : -5;
                const nextBrt = Math.max(5, Math.min(255, effectConfig.brightness + delta));
                setEffectParam('brightness', nextBrt);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 cursor-ew-resize select-none" 
              title={`Hardware & Visualizer Brightness: ${effectConfig.brightness}/255 (${Math.round((effectConfig.brightness / 255) * 100)}%) — Scroll wheel adjusts`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <input
                type="range"
                min="5"
                max="255"
                step="5"
                value={effectConfig.brightness}
                onChange={(e) => setEffectParam('brightness', parseInt(e.target.value, 10))}
                className="w-11 sm:w-13 md:w-16 h-1.5 accent-amber-500 cursor-pointer"
                title={`Brightness: ${effectConfig.brightness}/255 (${Math.round((effectConfig.brightness / 255) * 100)}%) — Scroll wheel adjusts`}
              />
              <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-zinc-400 min-w-[24px] sm:min-w-[28px] tabular-nums select-none">
                {Math.round((effectConfig.brightness / 255) * 100)}%
              </span>
            </div>

            {/* Divider between Brightness and Sound */}
            <div className="h-3.5 w-px bg-slate-300 dark:bg-zinc-800 mx-0.5" />

            {/* Volume / Sound Control Slider (Scroll Wheel Enabled) */}
            <div 
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.05 : -0.05;
                const nextVol = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100));
                setVolume(nextVol);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 cursor-ew-resize select-none"
              title={`Volume: ${Math.round(volume * 100)}% — Scroll wheel adjusts`}
            >
              <button
                onClick={toggleMute}
                className="p-0.5 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-500" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-11 sm:w-13 md:w-16 h-1.5 accent-indigo-600 cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}% — Scroll wheel adjusts`}
              />
              <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-zinc-400 min-w-[24px] sm:min-w-[28px] tabular-nums select-none">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* Divider */}
            <div className="h-3.5 w-px bg-slate-300 dark:bg-zinc-800 mx-0.5" />

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

            {/* Quick MIDI Record Button */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                title="Record Live Performance into .mid format"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
              >
                <CircleDot className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => stopRecording()}
                title="Stop Recording Live Session"
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-600 text-white animate-pulse transition-all cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            )}

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
          const isDefaultPlay = (tab.id === 'play' || tab.id === 'visualize') && activeWorkspace === null;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`p-1 rounded-lg text-xs flex flex-col items-center gap-0.5 shrink-0 cursor-pointer whitespace-nowrap ${
                isWorkspaceActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : isDefaultPlay
                  ? 'text-indigo-500 font-semibold'
                  : 'text-slate-500 dark:text-zinc-500'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
