import React, { useState } from 'react';
import { Sparkles, Bot, Wand2, ArrowRight, CheckCircle2, Target, Check } from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { EffectType } from '../../types';

export const AICoachStudio: React.FC = () => {
  const { 
    aiCoachFeedback, 
    setFullEffectConfig, 
    addConsoleLog,
    setActiveTab 
  } = useLightSyncStore();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copilotResult, setCopilotResult] = useState<any>(null);
  const [applied, setApplied] = useState(false);

  // Default feedback if none generated yet
  const feedback = aiCoachFeedback || {
    headline: "Great Progress on Ode to Joy!",
    tone: "Promising",
    summary: "Your finger coordination across the C-D-E triad transitions is solid. However, the ascending leap towards G4 shows slight micro-timing variance (+22ms anticipation).",
    timing_diagnosis: "You tend to anticipate ascending phrases slightly early. Relax your wrist and let the metronome beat lead your hand.",
    accuracy_score: 93.3,
    avg_deviation_ms: 18.2,
    drills: [
      {
        title: "Sub-Tempo Articulation Drill",
        action: "Lower the tempo to 70% in Practice Mode and isolate bars 4-8 using Right Hand only."
      },
      {
        title: "Metronome Pocket Sync",
        action: "Set the metronome to subdivide eighth notes and count '1-and-2-and' aloud to solidify downbeats."
      }
    ],
    coach_signature: "LightSync AI Mentor"
  };

  const handleGenerateCopilot = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setApplied(false);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setCopilotResult(data);
    } catch {
      // Fallback local heuristic generator if backend not connected
      const p = prompt.toLowerCase();
      let eff: EffectType = 'ripple';
      let col = '#00f0ff';
      let sec = '#6366f1';
      let spd = 1.2;

      if (p.includes('fire') || p.includes('warm') || p.includes('sunset')) {
        eff = 'spark';
        col = '#f59e0b';
        sec = '#ef4444';
        spd = 1.6;
      } else if (p.includes('rain') || p.includes('storm')) {
        eff = 'rain';
        col = '#38bdf8';
        sec = '#0ea5e9';
        spd = 1.5;
      } else if (p.includes('pulse') || p.includes('breathe') || p.includes('calm')) {
        eff = 'pulse';
        col = '#a855f7';
        sec = '#ec4899';
        spd = 0.8;
      }

      setCopilotResult({
        name: `AI: ${prompt}`,
        effect: eff,
        speed: spd,
        decay: 0.86,
        spread: 3.5,
        brightness: 220,
        rainbow: p.includes('rainbow'),
        primary_color: col,
        secondary_color: sec,
        ai_reasoning: `Selected ${eff.toUpperCase()} with ${col} aesthetics for prompt: "${prompt}".`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyCopilot = () => {
    if (!copilotResult) return;
    setFullEffectConfig({
      effect: copilotResult.effect,
      speed: copilotResult.speed,
      decay: copilotResult.decay,
      spread: copilotResult.spread,
      brightness: copilotResult.brightness,
      rainbow: copilotResult.rainbow || false,
      primaryColor: copilotResult.primary_color || copilotResult.primaryColor,
      secondaryColor: copilotResult.secondary_color || copilotResult.secondaryColor
    });
    setApplied(true);
    addConsoleLog(`Applied AI Copilot Visual Configuration: [${copilotResult.name}]`);
  };

  const examplePrompts = [
    "Warm fireplace sunset with gentle sparks",
    "Deep space galaxy with purple pulsing nebula",
    "Cyberpunk matrix glitch with green digital noise",
    "Neon meteor shower with blue trailing rain"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      
      {/* Left Column: AI Performance Coach (7 Cols) */}
      <div className="lg:col-span-7 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-500" />
              AI Performance Coach
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold">
              {feedback.tone}
            </span>
          </div>

          <div className="my-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-zinc-950 border border-indigo-100 dark:border-zinc-800/80">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {feedback.headline}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2 leading-relaxed">
              {feedback.summary}
            </p>
            <div className="mt-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300">
              <strong className="text-indigo-600 dark:text-indigo-400">Timing Diagnosis: </strong>
              {feedback.timing_diagnosis}
            </div>
          </div>

          <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-500" /> Recommended Practice Drills
          </h4>
          <div className="flex flex-col gap-2">
            {feedback.drills.map((drill: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1"
              >
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                  {drill.title}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 pl-5 leading-relaxed">
                  {drill.action}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-3 border-t border-slate-100 dark:border-zinc-800">
          <span>{feedback.coach_signature}</span>
          <button
            onClick={() => setActiveTab('practice')}
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Open in Practice Mode</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Column: Visual Copilot (5 Cols) */}
      <div className="lg:col-span-5 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-indigo-500" />
              AI Visual Copilot
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Natural Language $\rightarrow$ LEDs</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400 my-3">
            Describe the mood or aesthetic you want, and the AI will configure and tune the physical LED algorithms:
          </p>

          <div className="flex flex-col gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Warm amber fireplace with gentle flickering sparks..."
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 text-xs focus:outline-none focus:border-indigo-500 resize-none"
            />

            <div className="flex flex-wrap gap-1.5 my-1">
              {examplePrompts.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-[10px] text-slate-600 dark:text-zinc-400 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateCopilot}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Generating...' : 'Synthesize Visual Configuration'}</span>
            </button>
          </div>

          {copilotResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-zinc-200">
                <span>{copilotResult.name}</span>
                <span className="font-mono text-indigo-500 uppercase">{copilotResult.effect}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">{copilotResult.ai_reasoning}</p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleApplyCopilot}
                  disabled={applied}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  {applied ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{applied ? 'Applied to LEDs!' : 'Apply to Strip & Canvas'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
