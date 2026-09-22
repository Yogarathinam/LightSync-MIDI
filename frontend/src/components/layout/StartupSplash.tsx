import React, { useEffect, useState } from 'react';
import { Sparkles, Cpu, Music, Check, Zap } from 'lucide-react';

interface StartupSplashProps {
  onComplete: () => void;
}

export const StartupSplash: React.FC<StartupSplashProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const bootSteps = [
    { label: 'Initializing High-Resolution Audio Synthesizer Engine...', icon: <Music className="w-3.5 h-3.5 text-indigo-400" /> },
    { label: 'Detecting Physical MIDI Inputs & M5Stack Hardware...', icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" /> },
    { label: 'Calibrating WS2812B Optical Diffuser & Spatial Runway...', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
    { label: 'Restoring Studio Preferences & Color Profiles...', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> },
    { label: 'LightSync Studio v2.0 Ready.', icon: <Check className="w-3.5 h-3.5 text-emerald-400" /> }
  ];

  useEffect(() => {
    // Smooth progress progression
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return next > 100 ? 100 : next;
      });
    }, 45);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 25) setStepIndex(0);
    else if (progress < 50) setStepIndex(1);
    else if (progress < 75) setStepIndex(2);
    else if (progress < 95) setStepIndex(3);
    else setStepIndex(4);

    if (progress >= 100) {
      const timeout = setTimeout(() => {
        setIsFadingOut(true);
        const exitTimeout = setTimeout(() => {
          onComplete();
        }, 450);
        return () => clearTimeout(exitTimeout);
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white select-none transition-all duration-500 ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Volumetric Neon Glow Orbs */}
      <div className="absolute w-96 h-96 rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute w-80 h-80 rounded-full bg-cyan-500/15 blur-[100px] pointer-events-none translate-x-24 -translate-y-20" />
      <div className="absolute w-72 h-72 rounded-full bg-purple-600/15 blur-[90px] pointer-events-none -translate-x-24 translate-y-20" />

      {/* Center Startup Pod */}
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        
        {/* Animated Glowing Logo with Ring Pulse */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Pulsing Outer Neon Ring */}
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-indigo-500 via-cyan-400 to-purple-500 opacity-40 blur-md animate-pulse" />
          
          {/* Logo Frame */}
          <div className="relative w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-700/80 flex items-center justify-center shadow-2xl shadow-indigo-500/30 overflow-hidden p-3 transition-transform hover:scale-105">
            <img src="/Logo.svg" alt="LightSync Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          </div>
        </div>

        {/* Brand Typography */}
        <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 mb-1">
          LightSync
        </h1>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-indigo-400 border border-zinc-800 font-bold tracking-wider">
            VERSION 2.0
          </span>
          <span className="text-[11px] text-zinc-400 font-medium tracking-wide">
            Music Interaction Platform
          </span>
        </div>

        {/* High-Precision Progress Bar */}
        <div className="w-64 h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden relative mb-3 shadow-inner">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-75 ease-out shadow-[0_0_10px_rgba(99,102,241,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Percentage & Step Status */}
        <div className="w-64 flex items-center justify-between text-[11px] font-mono mb-4 text-zinc-400">
          <span className="flex items-center gap-1.5 text-zinc-300 font-medium truncate max-w-[200px]">
            {bootSteps[stepIndex].icon}
            <span className="truncate">{bootSteps[stepIndex].label}</span>
          </span>
          <span className="font-bold text-indigo-400 tabular-nums">
            {progress}%
          </span>
        </div>

        {/* Quick Skip Button */}
        <button
          onClick={() => {
            setIsFadingOut(true);
            setTimeout(onComplete, 200);
          }}
          className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest cursor-pointer px-3 py-1 rounded-md hover:bg-zinc-900"
        >
          [ Skip Loading ]
        </button>

      </div>
    </div>
  );
};
