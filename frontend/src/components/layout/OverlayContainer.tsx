import React, { useEffect, useRef } from 'react';
import { 
  X, 
  Music, 
  Sliders, 
  GraduationCap, 
  Activity, 
  BarChart2, 
  Sparkles, 
  Cpu, 
  Settings as SettingsIcon,
  ChevronDown
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { PlayStudio } from '../play/PlayStudio';
import { EffectStudio } from '../effects/EffectStudio';
import { LearnStudio } from '../learn/LearnStudio';
import { PracticeStudio } from '../practice/PracticeStudio';
import { AnalyzeStudio } from '../analyze/AnalyzeStudio';
import { AICoachStudio } from '../aicoach/AICoachStudio';
import { DeviceMonitor } from '../device/DeviceMonitor';
import { SettingsModal } from './SettingsModal';

export const OverlayContainer: React.FC = () => {
  const { activeOverlay, closeOverlay } = useLightSyncStore();
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeOverlay !== null) {
        closeOverlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOverlay, closeOverlay]);

  if (!activeOverlay) return null;

  const getOverlayMeta = () => {
    switch (activeOverlay) {
      case 'play':
        return {
          title: 'Play Studio',
          badge: 'Harmonics & Synth',
          icon: <Music className="w-5 h-5 text-indigo-500" />
        };
      case 'effects':
        return {
          title: 'WS2812B Effect Studio',
          badge: 'Optical Simulation',
          icon: <Sliders className="w-5 h-5 text-indigo-500" />
        };
      case 'learn':
        return {
          title: 'Learn Studio',
          badge: 'Interactive Score',
          icon: <GraduationCap className="w-5 h-5 text-indigo-500" />
        };
      case 'practice':
        return {
          title: 'Practice & Drills',
          badge: 'Real-Time Timing',
          icon: <Activity className="w-5 h-5 text-indigo-500" />
        };
      case 'analyze':
        return {
          title: 'Music Analysis Engine',
          badge: 'Chords & Scales',
          icon: <BarChart2 className="w-5 h-5 text-indigo-500" />
        };
      case 'aicoach':
        return {
          title: 'AI Music Coach',
          badge: 'Copilot Feedback',
          icon: <Sparkles className="w-5 h-5 text-indigo-500" />
        };
      case 'device':
        return {
          title: 'Hardware Controller Bridge',
          badge: 'M5Stack Core Serial',
          icon: <Cpu className="w-5 h-5 text-indigo-500" />
        };
      case 'settings':
        return {
          title: 'Studio Preferences',
          badge: 'System Settings',
          icon: <SettingsIcon className="w-5 h-5 text-indigo-500" />
        };
      default:
        return {
          title: 'Studio Panel',
          badge: 'Overlay',
          icon: <Sliders className="w-5 h-5 text-indigo-500" />
        };
    }
  };

  const meta = getOverlayMeta();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200"
      onClick={(e) => {
        // Autohide on click anywhere outside the card
        if (e.target === e.currentTarget) {
          closeOverlay();
        }
      }}
    >
      <div 
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[86vh] flex flex-col rounded-3xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-2xl elevation-3 overflow-hidden animate-in zoom-in-95 duration-200 transition-colors"
      >
        {/* Gesture Drag-Handle Pill */}
        <div 
          onClick={closeOverlay}
          title="Click or swipe to close overlay"
          className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-pointer group select-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 group-hover:bg-slate-400 dark:group-hover:bg-zinc-500 transition-colors" />
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 font-mono">
            Click to dismiss
          </span>
        </div>

        {/* Modal Card Header */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {meta.title}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-800 font-semibold">
                  {meta.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Tap anywhere outside this card to return to piano
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closeOverlay}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {activeOverlay === 'play' && <PlayStudio />}
          {activeOverlay === 'effects' && <EffectStudio />}
          {activeOverlay === 'learn' && <LearnStudio />}
          {activeOverlay === 'practice' && <PracticeStudio />}
          {activeOverlay === 'analyze' && <AnalyzeStudio />}
          {activeOverlay === 'aicoach' && <AICoachStudio />}
          {activeOverlay === 'device' && <DeviceMonitor />}
          {activeOverlay === 'settings' && <SettingsModal />}
        </div>

        {/* Bottom Gesture / Auto-hide hint */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-850 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500 font-mono shrink-0">
          <span className="flex items-center gap-1">
            <ChevronDown className="w-3.5 h-3.5" /> Click outside to autohide
          </span>
          <span>LightSync v2.0 Material Card</span>
        </div>
      </div>
    </div>
  );
};
