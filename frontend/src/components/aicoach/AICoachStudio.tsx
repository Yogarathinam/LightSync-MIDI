import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Radio, 
  Award, 
  Flame, 
  Play, 
  Clock, 
  ArrowRight, 
  Music, 
  Trash2,
  Cpu,
  Layers,
  Check,
  Zap,
  Gauge
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { MiraCurriculumStep } from '../../types';

export const AICoachStudio: React.FC = () => {
  const { 
    currentSong,
    currentTelemetry,
    resetTelemetry,
    geminiRelayUrl,
    setGeminiRelayUrl,
    miraChatMessages,
    addMiraChatMessage,
    clearMiraChat,
    miraCurriculum,
    setMiraCurriculum,
    openWorkspace,
    setLearnMode
  } = useLightSyncStore();

  // Relay status state
  const [relayStatus, setRelayStatus] = useState<{
    online: boolean;
    status: string;
    latency_ms: number;
    url: string;
  } | null>(null);
  const [isCheckingRelay, setIsCheckingRelay] = useState(false);
  const [customRelayInput, setCustomRelayInput] = useState(geminiRelayUrl);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Course generation state
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [courseGoal, setCourseGoal] = useState('');
  const [appliedStep, setAppliedStep] = useState<number | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [miraChatMessages, isChatLoading]);

  // Check relay connection on mount
  useEffect(() => {
    checkRelay(geminiRelayUrl);
  }, []);

  const checkRelay = async (url: string) => {
    setIsCheckingRelay(true);
    try {
      const res = await fetch('/api/ai/mira/check-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relay_url: url })
      });
      if (res.ok) {
        const data = await res.json();
        setRelayStatus(data);
      }
    } catch {
      setRelayStatus({ online: false, status: 'offline', latency_ms: 0, url });
    } finally {
      setIsCheckingRelay(false);
    }
  };

  const handleUpdateRelayUrl = (newUrl: string) => {
    setGeminiRelayUrl(newUrl);
    setCustomRelayInput(newUrl);
    checkRelay(newUrl);
  };

  // Generate Personalized Learning Course
  const handleGenerateCourse = async () => {
    setIsCourseLoading(true);
    try {
      const res = await fetch('/api/ai/mira/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song: currentSong,
          telemetry: currentTelemetry,
          prompt: courseGoal,
          relay_url: geminiRelayUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMiraCurriculum(data);
        addMiraChatMessage({
          role: 'assistant',
          text: `I have generated your customized 4-phase learning course for "${data.songTitle}"! Each phase focuses on your specific timing offsets and difficult transitions. Check the curriculum on the left to launch each drill.`
        });
      }
    } catch (e) {
      console.warn('Failed to generate MIRA course:', e);
    } finally {
      setIsCourseLoading(false);
    }
  };

  // Send message to MIRA Chatbot
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || isChatLoading) return;

    // Add user message
    addMiraChatMessage({ role: 'user', text });
    setChatInput('');
    setIsChatLoading(true);

    try {
      const updatedMessages = [
        ...miraChatMessages.map(m => ({ role: m.role, text: m.text })),
        { role: 'user', text }
      ];

      const res = await fetch('/api/ai/mira/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          telemetry: currentTelemetry,
          current_song: currentSong,
          relay_url: geminiRelayUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        addMiraChatMessage({
          role: 'assistant',
          text: data.text
        });
      } else {
        addMiraChatMessage({
          role: 'assistant',
          text: "I experienced a brief connection hiccup reaching the Gemini Relay, but I am still actively analyzing your practice data! Feel free to ask about your timing tendencies or request practice drills."
        });
      }
    } catch {
      addMiraChatMessage({
        role: 'assistant',
        text: "I am currently using local music intelligence. Your note accuracy is logged and ready for review!"
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleApplyDrillToLearning = (step: MiraCurriculumStep) => {
    setAppliedStep(step.step);
    setLearnMode('wait_for_key');
    openWorkspace('learn');
  };

  const quickPrompts = [
    "Why am I anticipating the beat?",
    "How can I balance my left hand volume?",
    "Give me technique tips for difficult bars",
    "Generate a 3-day practice plan for this piece"
  ];

  const songTitle = currentSong ? currentSong.title : 'Selected Piece';

  return (
    <div className="flex flex-col gap-4 w-full h-full pb-4">
      
      {/* 1. MIRA Control & Gemini Relay Endpoint Banner */}
      <div className="p-3.5 sm:px-4 sm:py-3 rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-500/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                MIRA — Musical Intelligence & Rhythm Assistant
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 font-bold">
                Live Piano Mentor
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Real-time parameter analysis, customized song courses, and interactive AI chat
            </p>
          </div>
        </div>

        {/* Gemini Relay Connection Config & Status */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
            <Radio className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-mono text-slate-500">Relay URL:</span>
            <input
              type="text"
              value={customRelayInput}
              onChange={(e) => setCustomRelayInput(e.target.value)}
              onBlur={() => handleUpdateRelayUrl(customRelayInput)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateRelayUrl(customRelayInput)}
              className="w-36 sm:w-44 text-[10px] font-mono bg-transparent text-slate-800 dark:text-zinc-200 focus:outline-none border-b border-transparent focus:border-indigo-500"
              placeholder="http://127.0.0.1:8000"
              title="Configurable Gemini Relay endpoint (e.g. http://127.0.0.1:8000 or ngrok public URL)"
            />
            <button
              onClick={() => handleUpdateRelayUrl(customRelayInput)}
              disabled={isCheckingRelay}
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
              title="Test connection to Gemini Relay"
            >
              <RotateCcw className={`w-3 h-3 ${isCheckingRelay ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Online / Offline status badge */}
          <div 
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border transition-colors ${
              relayStatus?.online
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
            }`}
            title={relayStatus?.online ? `Gemini Relay is online (${relayStatus.latency_ms}ms latency)` : 'Using local heuristic music engine'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${relayStatus?.online ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500'}`} />
            <span>{relayStatus?.online ? `Relay Online (${relayStatus.latency_ms}ms)` : 'Local MIRA Engine'}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* Left Column: Live Telemetry & Personalized Course (7 Cols) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-4">
          
          {/* A. Live Practice Run Telemetry Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-850">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-500" />
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Recorded Performance Telemetry
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                  {songTitle}
                </span>
                <button
                  onClick={() => resetTelemetry(currentSong?.title, currentSong?.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                  title="Reset recorded session parameters"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">Accuracy</span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {currentTelemetry.accuracyPct}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">Deviation</span>
                <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {currentTelemetry.avgDeviationMs > 0 ? `+${currentTelemetry.avgDeviationMs}` : currentTelemetry.avgDeviationMs}ms
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">Hits / Miss</span>
                <span className="text-base font-black font-mono text-slate-800 dark:text-zinc-200 mt-0.5">
                  {currentTelemetry.hits}/{currentTelemetry.misses}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col items-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">Streak</span>
                <span className="text-base font-black font-mono text-amber-500 mt-0.5 flex items-center gap-0.5">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  {currentTelemetry.streak}
                </span>
              </div>
            </div>

            {/* Timing Breakdown Badges */}
            <div className="flex items-center justify-between text-[10px] font-mono p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-slate-500 dark:text-zinc-400">Timing Distribution:</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {currentTelemetry.timingRatings.PERFECT} Perfect (&lt;25ms)
                </span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">
                  {currentTelemetry.timingRatings.GOOD} Good
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {currentTelemetry.timingRatings.EARLY} Early
                </span>
                <span className="text-rose-500 font-bold">
                  {currentTelemetry.timingRatings.LATE} Late
                </span>
              </div>
            </div>

            {/* Problematic Measures Flag */}
            {currentTelemetry.problemMeasures.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Attention needed on measures: <strong>{currentTelemetry.problemMeasures.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* B. MIRA Personalized Learning Course Generator */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3.5 flex-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-850">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Personalized Learning Course for {songTitle}
                </h3>
              </div>
              <button
                onClick={handleGenerateCourse}
                disabled={isCourseLoading}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 ${isCourseLoading ? 'animate-spin' : ''}`} />
                <span>{isCourseLoading ? 'Synthesizing...' : 'Generate Plan'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              MIRA analyzes your exact tempo drifts, problematic measures, and velocity spread to create a step-by-step custom curriculum:
            </p>

            {/* Custom focus input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={courseGoal}
                onChange={(e) => setCourseGoal(e.target.value)}
                placeholder="Optional goal: e.g. Smooth out measure 4 transition & relax right hand..."
                className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Generated Course Cards */}
            {miraCurriculum ? (
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[360px] pr-1">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/50">
                  <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    {miraCurriculum.headline}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-1 leading-snug">
                    {miraCurriculum.summary}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {miraCurriculum.steps.map((step) => (
                    <div
                      key={step.step}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs hover:border-indigo-400 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                            Phase {step.step}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">
                            {step.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {step.description}
                        </p>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Goal: {step.targetGoal}
                        </span>
                      </div>

                      <button
                        onClick={() => handleApplyDrillToLearning(step)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                          appliedStep === step.step
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                        title="Load drill parameters and launch in Interactive Learning Studio"
                      >
                        {appliedStep === step.step ? <Check className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{appliedStep === step.step ? 'Loaded' : 'Launch Drill'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center gap-2 text-slate-400 my-auto">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <p className="text-xs">Click "Generate Plan" above to create an AI-tailored course for {songTitle}.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Interactive MIRA AI Chatbot (6 Cols) */}
        <div className="lg:col-span-6 xl:col-span-6 p-4 rounded-2xl bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-full min-h-[540px]">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-850 shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-500" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  MIRA Interactive Chat
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Context: {songTitle} • {currentTelemetry.accuracyPct}% Acc • {currentTelemetry.avgDeviationMs}ms Dev
                </span>
              </div>
            </div>

            <button
              onClick={clearMiraChat}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chat Message Thread */}
          <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-3 pr-1 min-h-[300px]">
            {miraChatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[88%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-slate-700 dark:bg-zinc-700'
                      : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                  }`}
                >
                  {msg.role === 'user' ? 'U' : <Sparkles className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 rounded-tl-xs border border-slate-200/80 dark:border-zinc-800/80'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span
                    className={`text-[9px] font-mono mt-1 block opacity-70 ${
                      msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-2.5 mr-auto max-w-[88%]">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-tr from-purple-600 to-indigo-600 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  <span>MIRA is analyzing your parameters...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1.5 py-2 border-t border-slate-100 dark:border-zinc-850 shrink-0">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp)}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-zinc-400 text-[10px] font-medium transition-all cursor-pointer border border-slate-200/70 dark:border-zinc-800/70"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="flex items-center gap-2 pt-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask MIRA about technique, tempo, or ${songTitle}...`}
              className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim() || isChatLoading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
              title="Send message to MIRA"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
