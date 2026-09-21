import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useLightSyncStore } from './store/useLightSyncStore';
import { useWebSocketBridge } from './hooks/useWebSocketBridge';
import { useKeyboardInput } from './hooks/useKeyboardInput';

import { AppHeader } from './components/layout/AppHeader';
import { StatusBar } from './components/layout/StatusBar';
import { StudioCanvas } from './components/visualizer/StudioCanvas';
import { VisualizerToolbar } from './components/visualizer/VisualizerToolbar';

import { PlayStudio } from './components/play/PlayStudio';
import { EffectStudio } from './components/effects/EffectStudio';
import { LearnStudio } from './components/learn/LearnStudio';
import { PracticeStudio } from './components/practice/PracticeStudio';
import { AnalyzeStudio } from './components/analyze/AnalyzeStudio';
import { AICoachStudio } from './components/aicoach/AICoachStudio';
import { DeviceMonitor } from './components/device/DeviceMonitor';

const MainApp: React.FC = () => {
  // Hooks
  useWebSocketBridge();
  useKeyboardInput();

  const { activeTab } = useLightSyncStore();
  const [fps, setFps] = useState(60);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 antialiased transition-colors duration-200">
      
      {/* Top Universal App Navigation */}
      <AppHeader />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-4">
        
        {/* Real-time 60 FPS Visualizer Engine Section */}
        <section className="flex flex-col gap-2.5">
          <VisualizerToolbar />
          <StudioCanvas onFpsUpdate={setFps} />
        </section>

        {/* Dynamic Studio Mode Tabs */}
        <section className="flex-1">
          {activeTab === 'play' && <PlayStudio />}
          {activeTab === 'effects' && <EffectStudio />}
          {activeTab === 'learn' && <LearnStudio />}
          {activeTab === 'practice' && <PracticeStudio />}
          {activeTab === 'analyze' && <AnalyzeStudio />}
          {activeTab === 'aicoach' && <AICoachStudio />}
          {activeTab === 'device' && <DeviceMonitor />}
        </section>

      </main>

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
