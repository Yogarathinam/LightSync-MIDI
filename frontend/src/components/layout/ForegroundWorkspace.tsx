import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  X, 
  Music, 
  Sliders, 
  GraduationCap, 
  Activity, 
  BarChart2, 
  Sparkles, 
  Cpu, 
  ChevronDown 
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { WorkspaceId } from '../../types';

import { PlayStudio } from '../play/PlayStudio';
import { EffectStudio } from '../effects/EffectStudio';
import { LearnStudio } from '../learn/LearnStudio';
import { PracticeStudio } from '../practice/PracticeStudio';
import { AnalyzeStudio } from '../analyze/AnalyzeStudio';
import { AICoachStudio } from '../aicoach/AICoachStudio';
import { DeviceMonitor } from '../device/DeviceMonitor';

export const ForegroundWorkspace: React.FC = () => {
  const { activeWorkspace, closeWorkspace } = useLightSyncStore();

  const [displayedWorkspace, setDisplayedWorkspace] = useState<WorkspaceId | null>(activeWorkspace);
  const [isOpen, setIsOpen] = useState(activeWorkspace !== null);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setDisplayedWorkspace(activeWorkspace);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      // Wait for CSS exit transition (300ms) before unmounting studio contents
      exitTimerRef.current = window.setTimeout(() => {
        setDisplayedWorkspace(null);
        exitTimerRef.current = null;
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
      }, 310);
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, [activeWorkspace]);

  // Close on Escape key
  const handleRequestClose = useCallback(() => {
    closeWorkspace();
  }, [closeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && displayedWorkspace !== null) {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedWorkspace, handleRequestClose]);

  if (!displayedWorkspace && !isOpen) return null;

  const getWorkspaceMeta = (ws: WorkspaceId | null) => {
    switch (ws) {
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
          icon: <GraduationCap className="w-4 h-4 text-emerald-500" />
        };
      case 'practice':
        return {
          title: 'Practice Studio & Drills',
          badge: 'Sub-tempo & A-B Looper',
          icon: <Activity className="w-4 h-4 text-sky-500" />
        };
      case 'analyze':
        return {
          title: 'Performance Analysis',
          badge: 'Micro-timing & Chords',
          icon: <BarChart2 className="w-4 h-4 text-amber-500" />
        };
      case 'aicoach':
        return {
          title: 'LightSync AI Coach',
          badge: 'Offline Heuristic Copilot',
          icon: <Sparkles className="w-4 h-4 text-purple-500" />
        };
      case 'device':
        return {
          title: 'Hardware Controller Bridge',
          badge: 'M5Stack Serial Protocol',
          icon: <Cpu className="w-4 h-4 text-teal-500" />
        };
      default:
        return {
          title: 'Studio Workspace',
          badge: 'Active Layer',
          icon: <Sliders className="w-4 h-4 text-indigo-500" />
        };
    }
  };

  const meta = getWorkspaceMeta(displayedWorkspace);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-2 sm:p-4 md:p-5">
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`pointer-events-auto max-w-5xl w-[95vw] h-[92%] flex flex-col rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden spatial-fg-workspace ${
          isOpen ? 'spatial-fg-workspace--enter' : 'spatial-fg-workspace--hidden'
        }`}
        style={{
          boxShadow: '0 25px 65px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(120, 120, 140, 0.2)'
        }}
      >
        {/* Top Gesture Dismiss Pill */}
        <div 
          onClick={handleRequestClose}
          className="w-full pt-2 pb-1 flex flex-col items-center justify-center cursor-pointer group select-none shrink-0"
          title="Click to dismiss to visualizer"
        >
          <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 group-hover:bg-indigo-500 transition-colors" />
        </div>

        {/* Workspace Header */}
        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 select-none">
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
            title="Return to visualizer (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Workspace Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {displayedWorkspace === 'play' && <PlayStudio />}
          {displayedWorkspace === 'effects' && <EffectStudio />}
          {displayedWorkspace === 'learn' && <LearnStudio />}
          {displayedWorkspace === 'practice' && <PracticeStudio />}
          {displayedWorkspace === 'analyze' && <AnalyzeStudio />}
          {displayedWorkspace === 'aicoach' && <AICoachStudio />}
          {displayedWorkspace === 'device' && <DeviceMonitor />}
        </div>

        {/* Workspace Footer */}
        <div className="px-5 py-2 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 font-mono shrink-0 select-none">
          <span className="flex items-center gap-1">
            <ChevronDown className="w-3 h-3" /> Click background or press Esc to return to visualizer
          </span>
          <span className="font-semibold text-slate-500 dark:text-zinc-400">LightSync v2.0</span>
        </div>
      </div>
    </div>
  );
};
