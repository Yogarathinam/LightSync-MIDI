import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  SlidersHorizontal,
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
import { QuickSettingsDropdown } from './QuickSettingsDropdown';
import { SettingsModal } from './SettingsModal';

export const OverlayContainer: React.FC = () => {
  const { 
    activeOverlay, 
    closeOverlay 
  } = useLightSyncStore();
  
  const [renderedOverlay, setRenderedOverlay] = useState(activeOverlay);
  const [isClosing, setIsClosing] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Sync activeOverlay state with smooth exit animation
  useEffect(() => {
    if (activeOverlay) {
      setRenderedOverlay(activeOverlay);
      setIsClosing(false);
    } else if (renderedOverlay) {
      setIsClosing(true);
      const timer = window.setTimeout(() => {
        setRenderedOverlay(null);
        setIsClosing(false);
        // Ensure keyboard focus returns to window
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [activeOverlay, renderedOverlay]);

  // Request close
  const handleRequestClose = useCallback(() => {
    closeOverlay();
  }, [closeOverlay]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && renderedOverlay !== null) {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renderedOverlay, handleRequestClose]);

  if (!renderedOverlay) return null;

  const getOverlayMeta = () => {
    switch (renderedOverlay) {
      case 'play':
        return {
          title: 'Play Studio',
          badge: 'Live Harmonics & Synth',
          icon: <Music className="w-4 h-4 text-indigo-500" />
        };
      case 'effects':
        return {
          title: 'WS2812B Effect Studio',
          badge: 'Optical Simulation Engine',
          icon: <Sliders className="w-4 h-4 text-indigo-500" />
        };
      case 'learn':
        return {
          title: 'Learn Studio',
          badge: 'Interactive Score Curriculum',
          icon: <GraduationCap className="w-4 h-4 text-indigo-500" />
        };
      case 'practice':
        return {
          title: 'Practice Studio & Drills',
          badge: 'Sub-tempo & A-B Looper',
          icon: <Activity className="w-4 h-4 text-indigo-500" />
        };
      case 'analyze':
        return {
          title: 'Performance Analysis',
          badge: 'Micro-timing & Chords',
          icon: <BarChart2 className="w-4 h-4 text-indigo-500" />
        };
      case 'aicoach':
        return {
          title: 'LightSync AI Coach',
          badge: 'Offline Heuristic Copilot',
          icon: <Sparkles className="w-4 h-4 text-indigo-500" />
        };
      case 'device':
        return {
          title: 'Hardware Controller Bridge',
          badge: 'M5Stack Serial Protocol',
          icon: <Cpu className="w-4 h-4 text-indigo-500" />
        };
      case 'quick_settings':
        return {
          title: 'Quick Settings',
          badge: 'Live Adjustments',
          icon: <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
        };
      case 'settings':
        return {
          title: 'Studio Preferences',
          badge: 'Theme, Hardware & Engine',
          icon: <SettingsIcon className="w-4 h-4 text-indigo-500" />
        };
      default:
        return {
          title: 'Studio Panel',
          badge: 'Controls',
          icon: <Sliders className="w-4 h-4 text-indigo-500" />
        };
    }
  };

  const meta = getOverlayMeta();
  const isCompact = renderedOverlay === 'quick_settings';

  return (
    <div 
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Click-away backdrop: starts below header, smoothly fades in/out with soft blur */}
      <div 
        onClick={handleRequestClose}
        className={`absolute top-16 inset-x-0 bottom-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm pointer-events-auto ${
          isClosing ? 'animate-backdrop-exit' : 'animate-backdrop-enter'
        }`}
      />

      {/* Centered Floating Card: integer-aligned flexbox centering without subpixel translate jitter */}
      <div className="absolute top-16 inset-x-0 bottom-0 flex justify-center items-start pt-2 sm:pt-3 pointer-events-none overflow-hidden">
        <div 
          ref={cardRef}
          onClick={(e) => e.stopPropagation()}
          className={`pointer-events-auto ${
            isCompact ? 'max-w-md w-[92vw]' : 'max-w-4xl w-[94vw]'
          } max-h-[82vh] flex flex-col rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-300 dark:border-zinc-800 shadow-2xl overflow-hidden ${
            isClosing ? 'animate-overlay-exit' : 'animate-overlay-enter'
          }`}
          style={{
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(120, 120, 140, 0.18)'
          }}
        >
        {/* Top Gesture Pill Handle */}
        <div 
          onClick={handleRequestClose}
          className="w-full pt-2 pb-1 flex flex-col items-center justify-center cursor-pointer group select-none shrink-0"
          title="Click to dismiss"
        >
          <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 group-hover:bg-indigo-500 transition-colors" />
        </div>

        {/* Card Header (unless compact) */}
        {!isCompact && (
          <div className="px-5 py-2.5 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                {meta.icon}
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  {meta.title}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-800 font-semibold">
                  {meta.badge}
                </span>
              </div>
            </div>

            <button
              onClick={handleRequestClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Card Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {renderedOverlay === 'play' && <PlayStudio />}
          {renderedOverlay === 'effects' && <EffectStudio />}
          {renderedOverlay === 'learn' && <LearnStudio />}
          {renderedOverlay === 'practice' && <PracticeStudio />}
          {renderedOverlay === 'analyze' && <AnalyzeStudio />}
          {renderedOverlay === 'aicoach' && <AICoachStudio />}
          {renderedOverlay === 'device' && <DeviceMonitor />}
          {renderedOverlay === 'quick_settings' && <QuickSettingsDropdown />}
          {renderedOverlay === 'settings' && <SettingsModal />}
        </div>

        {/* Footer info */}
        <div className="px-5 py-1.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-850 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono shrink-0 select-none">
          <span className="flex items-center gap-1">
            <ChevronDown className="w-3 h-3" /> Click outside or press Esc to close
          </span>
          <span>LightSync v2.0</span>
        </div>
        </div>
      </div>
    </div>
  );
};
