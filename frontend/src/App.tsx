import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useWebSocketBridge } from './hooks/useWebSocketBridge';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { useWebMidi } from './hooks/useWebMidi';
import { useLightSyncStore } from './store/useLightSyncStore';

import { AppHeader } from './components/layout/AppHeader';
import { StatusBar } from './components/layout/StatusBar';
import { ForegroundWorkspace } from './components/layout/ForegroundWorkspace';
import { OverlayContainer } from './components/layout/OverlayContainer';
import { StudioCanvas } from './components/visualizer/StudioCanvas';
import { StartupSplash } from './components/layout/StartupSplash';
import { SessionAnalysisModal } from './components/analysis/SessionAnalysisModal';

const MainApp: React.FC = () => {
  // Real-time hooks
  useWebSocketBridge();
  useKeyboardInput();
  useWebMidi();

  const [fps, setFps] = useState(60);
  const [showSplash, setShowSplash] = useState(true);
  
  const activeWorkspace = useLightSyncStore((s) => s.activeWorkspace);
  const closeWorkspace = useLightSyncStore((s) => s.closeWorkspace);
  const loadSettingsFromFile = useLightSyncStore((s) => s.loadSettingsFromFile);

  useEffect(() => {
    loadSettingsFromFile();
  }, [loadSettingsFromFile]);

  const handleFpsUpdate = React.useCallback((val: number) => {
    setFps(val);
  }, []);

  const isReceded = activeWorkspace !== null && activeWorkspace !== 'learn';

  return (
    <div className="h-screen w-full max-h-screen max-w-full overflow-hidden flex flex-col relative bg-black text-slate-900 dark:text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white select-none">
      
      {/* 0. STARTUP BOOT ANIMATION SPLASH */}
      {showSplash && (
        <StartupSplash onComplete={() => setShowSplash(false)} />
      )}

      {/* 1. TOP NAVIGATION BAR (Always stationary, sharp, and interactive) */}
      <AppHeader />

      {/* 2. SPATIAL STAGE AREA */}
      <div className="flex-1 w-full min-h-0 relative overflow-hidden">
        {/* Background Layer: Visualizer & Status bar recedes smoothly */}
        <div 
          className={`absolute inset-0 flex flex-col bg-slate-50 dark:bg-black transition-colors duration-200 spatial-bg-layer ${
            isReceded ? 'spatial-bg-layer--receded' : 'spatial-bg-layer--active'
          }`}
        >
          {/* Main Immersive Visualizer Engine Stage */}
          <main className="flex-1 w-full min-h-0 flex flex-col items-center justify-center p-0.5 sm:px-3 sm:py-1.5 overflow-hidden bg-black relative">
            <StudioCanvas onFpsUpdate={handleFpsUpdate} />
          </main>

          {/* Bottom Real-time Engine Status Bar */}
          <StatusBar fps={fps} />
        </div>

        {/* Spatial Scrim: Dismiss workspace on click-outside */}
        <div 
          onClick={closeWorkspace}
          className={`absolute inset-0 z-20 bg-black/40 dark:bg-black/60 spatial-scrim ${
            isReceded ? 'spatial-scrim--active' : 'spatial-scrim--hidden'
          }`}
          title="Click to return to visualizer"
        />

        {/* Foreground Layer: Elevated Spatial Workspace (z-30) */}
        <ForegroundWorkspace />
      </div>

      {/* 3. UTILITY OVERLAY: Quick Settings & Settings Modal Popovers (z-50) */}
      <OverlayContainer />

      {/* 4. PERFORMANCE & PRACTICE SESSION ANALYSIS MODAL (z-50) */}
      <SessionAnalysisModal />

    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
