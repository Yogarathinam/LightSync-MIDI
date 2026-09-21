import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useWebSocketBridge } from './hooks/useWebSocketBridge';
import { useKeyboardInput } from './hooks/useKeyboardInput';

import { AppHeader } from './components/layout/AppHeader';
import { StatusBar } from './components/layout/StatusBar';
import { OverlayContainer } from './components/layout/OverlayContainer';
import { StudioCanvas } from './components/visualizer/StudioCanvas';
import { VisualizerToolbar } from './components/visualizer/VisualizerToolbar';

const MainApp: React.FC = () => {
  // Real-time hooks
  useWebSocketBridge();
  useKeyboardInput();

  const [fps, setFps] = useState(60);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 antialiased transition-colors duration-200 selection:bg-indigo-500 selection:text-white">
      
      {/* Top Universal App Header & Navigation */}
      <AppHeader />

      {/* Main Immersive Visualizer Viewport */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-3">
        
        {/* Quick Mode & Config Toolbar */}
        <VisualizerToolbar />

        {/* Waterfall Flow Keys Runway & Bottom Piano Keyboard Engine */}
        <div className="flex-1 flex flex-col">
          <StudioCanvas onFpsUpdate={setFps} />
        </div>

      </main>

      {/* Floating Elevated Card Overlay System with Autohide */}
      <OverlayContainer />

      {/* Bottom Real-time Engine Status Bar */}
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
