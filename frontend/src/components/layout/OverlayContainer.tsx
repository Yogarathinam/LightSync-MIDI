import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  X, 
  Settings as SettingsIcon,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { UtilityOverlayId } from '../../types';
import { QuickSettingsDropdown } from './QuickSettingsDropdown';
import { SettingsModal } from './SettingsModal';

export const OverlayContainer: React.FC = () => {
  const { 
    activeUtilityOverlay, 
    closeUtilityOverlay 
  } = useLightSyncStore();
  
  const [renderedOverlay, setRenderedOverlay] = useState<UtilityOverlayId | null>(activeUtilityOverlay);
  const [animPhase, setAnimPhase] = useState<'enter' | 'static' | 'exit'>('enter');
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeUtilityOverlay) {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setRenderedOverlay(activeUtilityOverlay);
      setAnimPhase('enter');
    } else if (renderedOverlay) {
      setAnimPhase('exit');
      exitTimerRef.current = window.setTimeout(() => {
        setRenderedOverlay(null);
        exitTimerRef.current = null;
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        window.focus();
      }, 150);
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, [activeUtilityOverlay, renderedOverlay]);

  // Request close
  const handleRequestClose = useCallback(() => {
    closeUtilityOverlay();
  }, [closeUtilityOverlay]);

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
          title: 'Preferences',
          badge: 'Settings',
          icon: <SettingsIcon className="w-4 h-4 text-indigo-500" />
        };
    }
  };

  const meta = getOverlayMeta();
  const isCompact = renderedOverlay === 'quick_settings';

  const animClass = 
    animPhase === 'enter' ? 'utility-popover-enter' :
    animPhase === 'exit' ? 'utility-popover-exit' :
    'utility-popover-static';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Click-away backdrop */}
      <div 
        onClick={handleRequestClose}
        className={`absolute top-16 inset-x-0 bottom-0 bg-black/60 dark:bg-black/80 pointer-events-auto transition-opacity duration-150 ${
          animPhase !== 'exit' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Centered Floating Card */}
      <div className="absolute top-16 inset-x-0 bottom-0 flex justify-center items-start pt-2 sm:pt-3 pointer-events-none overflow-hidden">
        <div 
          onClick={(e) => e.stopPropagation()}
          onAnimationEnd={() => {
            if (animPhase === 'enter') {
              setAnimPhase('static');
            }
          }}
          className={`pointer-events-auto ${
            isCompact ? 'max-w-md w-[92vw]' : 'max-w-4xl w-[94vw]'
          } max-h-[82vh] flex flex-col rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-300 dark:border-zinc-800 shadow-2xl overflow-hidden ${animClass}`}
        >
          {/* Top Gesture Pill Handle */}
          <div 
            onClick={handleRequestClose}
            className="w-full pt-2 pb-1 flex flex-col items-center justify-center cursor-pointer group select-none shrink-0"
            title="Click to dismiss"
          >
            <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 group-hover:bg-indigo-500 transition-colors" />
          </div>

          {/* Card Header (for settings modal) */}
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Card Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
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
