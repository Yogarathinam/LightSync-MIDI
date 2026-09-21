import React, { useState, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useWebSocketBridge } from './hooks/useWebSocketBridge';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { useLightSyncStore } from './store/useLightSyncStore';

import { AppHeader } from './components/layout/AppHeader';
import { StatusBar } from './components/layout/StatusBar';
import { OverlayContainer } from './components/layout/OverlayContainer';
import { StudioCanvas } from './components/visualizer/StudioCanvas';

const MainApp: React.FC = () => {
  // Real-time hooks
  useWebSocketBridge();
  useKeyboardInput();

  const [fps, setFps] = useState(60);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 antialiased transition-colors duration-200 selection:bg-indigo-500 selection:text-white">
      
      {/* 1. Single Unified Top Navigation Bar */}
      <AppHeader />

      {/* 2. Main Immersive Visualizer Engine (Single Viewport) */}
      <main className="flex-1 max-w-[1850px] w-full mx-auto p-1 sm:p-2 flex flex-col min-h-0">
        <StudioCanvas onFpsUpdate={setFps} />
      </main>

      {/* 3. Floating Elevated Hover Card Overlays with Autohide */}
      <OverlayContainer />

      {/* 4. Bottom Real-time Engine Status Bar */}
      <StatusBar fps={fps} />

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
