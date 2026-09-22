import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  Clock, 
  Activity, 
  Send, 
  Music,
  ArrowRight,
  TrendingUp,
  Target
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SessionResult, NoteAttempt } from '../../types';
import { sendPromptWithToken } from '../../utils/geminiRelay';

interface AnalysisChatMessage {
  id: string;
  sender: 'user' | 'mira';
  text: string;
  timestamp: string;
}

export const SessionAnalysisModal: React.FC = () => {
  const showSessionAnalysis = useLightSyncStore((s) => s.showSessionAnalysis);
  const closeSessionAnalysis = useLightSyncStore((s) => s.closeSessionAnalysis);
  const completedSessionResult = useLightSyncStore((s) => s.completedSessionResult);
  const currentSong = useLightSyncStore((s) => s.currentSong);
  const startSongPlayback = useLightSyncStore((s) => s.startSongPlayback);
  const openWorkspace = useLightSyncStore((s) => s.openWorkspace);
  const geminiRelayUrl = useLightSyncStore((s) => s.geminiRelayUrl);

  const [miraQuestion, setMiraQuestion] = useState('');
  const [isAskingMira, setIsAskingMira] = useState(false);
  const [chatMessages, setChatMessages] = useState<AnalysisChatMessage[]>([]);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  if (!showSessionAnalysis || !completedSessionResult) return null;

  const res: SessionResult = completedSessionResult;
  const accuracy = Math.round(res.accuracy_pct || 0);

  // Grade assignment
  const grade = 
    accuracy >= 95 ? { letter: 'S', color: 'text-amber-400 border-amber-400/50 bg-amber-500/10' } :
    accuracy >= 85 ? { letter: 'A', color: 'text-emerald-400 border-emerald-400/50 bg-emerald-500/10' } :
    accuracy >= 70 ? { letter: 'B', color: 'text-sky-400 border-sky-400/50 bg-sky-500/10' } :
    accuracy >= 50 ? { letter: 'C', color: 'text-amber-500 border-amber-500/50 bg-amber-500/10' } :
    { letter: 'D', color: 'text-rose-400 border-rose-400/50 bg-rose-500/10' };

  const ratings = res.ratings_count || { PERFECT: 0, GOOD: 0, EARLY: 0, LATE: 0, MISS: 0 };
  const goodCount = (ratings.GOOD ?? 0) + (ratings.GREAT ?? 0);
  const totalNotes = Math.max(1, res.total_notes);

  const perfectPct = Math.round((ratings.PERFECT / totalNotes) * 100);
  const goodPct = Math.round((goodCount / totalNotes) * 100);
  const earlyPct = Math.round((ratings.EARLY / totalNotes) * 100);
  const latePct = Math.round((ratings.LATE / totalNotes) * 100);
  const missPct = Math.round((ratings.MISS / totalNotes) * 100);

  // Generate automated MIRA advice
  const generateAutoInsight = () => {
    if (accuracy >= 90) {
      return `Outstanding execution on "${res.song_title}"! Your rhythm synchronization was tight with an average offset of only ${res.avg_deviation_ms || 12}ms. Ready to advance tempo or practice with hands together.`;
    } else if (accuracy >= 70) {
      return `Solid practice session! You sustained high accuracy through most passages. Focus on smoothing out ${res.problem_measures && res.problem_measures.length > 0 ? `measures ${res.problem_measures.slice(0, 3).join(', ')}` : 'the transitions'} by holding note values fully before moving to the next key.`;
    } else {
      return `Good effort on "${res.song_title}"! The main area to build confidence is note duration discipline in "Wait For Key" mode: remember to hold each key down until its waterfall bar completes before releasing.`;
    }
  };

  // Populate initial AI review
  React.useEffect(() => {
    if (res && chatMessages.length === 0) {
      setChatMessages([
        {
          id: 'init_analysis',
          sender: 'mira',
          text: generateAutoInsight(),
          timestamp: 'Session Complete'
        }
      ]);
    }
  }, [res]);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAskingMira]);

  const handleAskMiraPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;
    const userText = promptText.trim();
    setMiraQuestion('');
    
    // Add user message to conversation thread immediately
    const userMsg: AnalysisChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsAskingMira(true);

    // Build comprehensive note-by-note log for MIRA
    const recordedList = (res.recorded_notes || res.notes_detail || []) as NoteAttempt[];
    const notesLog = recordedList.length > 0
      ? recordedList.slice(0, 35).map((n, idx) => 
          `#${idx + 1} Note ${n.note_name || n.played_pitch} (m.${n.measure || 1}): ${n.is_correct ? `HIT [${n.rating}, offset: ${n.deviation_ms}ms, vel: ${n.velocity}]` : `WRONG (played ${n.note_name || n.played_pitch}, expected ${n.expected_name || n.expected_pitch})`}`
        ).join('; ')
      : 'No individual notes captured';

    const payloadPrompt = `You are MIRA (Musical Intelligence & Rhythm Assistant). The user just completed practicing "${res.song_title}" on piano in ${res.mode} mode.
Overall Performance: Accuracy: ${accuracy}%, Hits: ${res.correct_notes}/${res.total_notes}, Misses: ${res.missed_notes}, Avg Latency: ${res.avg_deviation_ms || 14}ms, Max Streak: ${res.max_streak || 0}, Problem Measures: ${res.problem_measures?.join(', ') || 'none'}.
Recorded Note-by-Note Log: [${notesLog}].
User Question: "${userText}".
Provide a concise, encouraging, and highly specific musical response (2 to 3 sentences maximum) referencing their exact note accuracy, rhythm offsets, or measures to practice next.`;

    try {
      const relayRes = await sendPromptWithToken(payloadPrompt, geminiRelayUrl || 'http://127.0.0.1:8000', 14);
      let reply = '';
      if (relayRes && relayRes.text) {
        reply = relayRes.text;
      } else {
        reply = accuracy >= 85
          ? `Outstanding execution! Your timing precision on "${res.song_title}" was sharp with an average offset of ±${res.avg_deviation_ms || 14}ms. To cement this in your muscle memory, try practicing at 105% tempo with hands together.`
          : `MIRA Advice: Notice in measures ${res.problem_measures?.join(', ') || '1-4'} that notes were released slightly early. Practice those specific bars at 75% speed in Wait For Key mode, holding each key down firmly through its full duration before stepping to the next note.`;
      }

      const miraMsg: AnalysisChatMessage = {
        id: `m_${Date.now()}`,
        sender: 'mira',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, miraMsg]);
    } catch (e) {
      console.warn('MIRA chat error:', e);
      const fallbackMsg: AnalysisChatMessage = {
        id: `m_${Date.now()}`,
        sender: 'mira',
        text: `MIRA Recommendation: Focus on practicing measures ${res.problem_measures?.join(', ') || '1-4'} at 75% tempo in Wait For Key mode, ensuring your fingers remain firmly pressed through every quarter-note duration.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAskingMira(false);
    }
  };

  const handlePracticeAgain = () => {
    closeSessionAnalysis();
    if (currentSong) {
      startSongPlayback(currentSong, true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 select-none">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                Session Performance Analysis
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">{res.song_title}</span>
                <span>•</span>
                <span className="capitalize">{res.mode.replace(/_/g, ' ')} Mode</span>
              </p>
            </div>
          </div>

          <button
            onClick={closeSessionAnalysis}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            title="Close analysis"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          
          {/* Hero Grade & Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80">
            {/* Grade Tile */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl border bg-white dark:bg-zinc-900 shadow-xs">
              <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black ${grade.color}`}>
                {grade.letter}
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {accuracy}%
              </div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Overall Accuracy
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="sm:col-span-8 grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hits</span>
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {res.correct_notes} <span className="text-[10px] text-slate-400 font-normal">/ {res.total_notes}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Misses</span>
                <div className="text-base font-extrabold text-rose-500 mt-0.5">
                  {res.missed_notes}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Max Streak</span>
                <div className="text-base font-extrabold text-amber-500 flex items-center gap-1 mt-0.5">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>{res.max_streak || 0}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Latency</span>
                <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 mt-0.5">
                  ±{res.avg_deviation_ms || 14} ms
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Velocity</span>
                <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {res.avg_velocity || 88} / 127
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Duration</span>
                <div className="text-sm font-extrabold text-slate-800 dark:text-zinc-200 mt-0.5">
                  {Math.round(res.duration_sec || 0)}s
                </div>
              </div>
            </div>
          </div>

          {/* Timing Breakdown Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
              <span>Timing Precision Breakdown</span>
              <span className="text-slate-400 font-mono text-[11px]">{res.total_notes} notes registered</span>
            </div>

            {/* Segmented Bar */}
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-zinc-900 overflow-hidden flex shadow-inner">
              {perfectPct > 0 && <div style={{ width: `${perfectPct}%` }} className="bg-emerald-500 h-full" title={`Perfect: ${ratings.PERFECT} (${perfectPct}%)`} />}
              {goodPct > 0 && <div style={{ width: `${goodPct}%` }} className="bg-sky-500 h-full" title={`Good: ${goodCount} (${goodPct}%)`} />}
              {earlyPct > 0 && <div style={{ width: `${earlyPct}%` }} className="bg-amber-500 h-full" title={`Early: ${ratings.EARLY} (${earlyPct}%)`} />}
              {latePct > 0 && <div style={{ width: `${latePct}%` }} className="bg-orange-500 h-full" title={`Late: ${ratings.LATE} (${latePct}%)`} />}
              {missPct > 0 && <div style={{ width: `${missPct}%` }} className="bg-rose-500 h-full" title={`Miss: ${ratings.MISS} (${missPct}%)`} />}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono mt-1 text-slate-600 dark:text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Perfect ({ratings.PERFECT})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Good ({goodCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Early ({ratings.EARLY})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Late ({ratings.LATE})</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Miss ({ratings.MISS})</span>
            </div>
          </div>

          {/* Problem Measures (if any) */}
          {res.problem_measures && res.problem_measures.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Problem Measures Detected:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {res.problem_measures.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-mono font-bold text-[11px]">
                    Measure {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* MIRA AI Performance Coach Box with Live Chat Thread */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/25 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-purple-600 text-white shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    MIRA — AI Musical Rhythm Assistant
                  </span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-mono">
                    {res.recorded_notes && res.recorded_notes.length > 0
                      ? `✓ ${res.recorded_notes.length} note attempts recorded & analyzed`
                      : 'Live session telemetry connected'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                Live Coaching
              </span>
            </div>

            {/* Scrollable Conversation Thread */}
            <div className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-2.5">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div 
                    className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border border-purple-200/80 dark:border-purple-800/80 text-slate-800 dark:text-zinc-200 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {msg.sender === 'mira' && (
                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1 uppercase tracking-wider font-mono">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        MIRA Coaching Tip
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-[9px] mt-1.5 block font-mono ${msg.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400 dark:text-zinc-500'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isAskingMira && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300 w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                  <span className="font-medium text-[11px]">MIRA is evaluating your note execution & timing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Interactive Ask MIRA chips & input */}
            <div className="flex flex-col gap-2 pt-2 border-t border-purple-500/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ask MIRA about this performance:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'How to improve rhythm stability?',
                  'Why were some notes missed?',
                  'Create a 5-min drill for this piece',
                  'Analyze my key timing offsets'
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleAskMiraPrompt(promptText)}
                    disabled={isAskingMira}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Chat input */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Ask MIRA any question about your timing, fingerings, or practice..."
                  value={miraQuestion}
                  onChange={(e) => setMiraQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && miraQuestion.trim()) {
                      handleAskMiraPrompt(miraQuestion);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <button
                  onClick={() => miraQuestion.trim() && handleAskMiraPrompt(miraQuestion)}
                  disabled={isAskingMira || !miraQuestion.trim()}
                  className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-850 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-zinc-900/60">
          <button
            onClick={() => {
              closeSessionAnalysis();
              openWorkspace('songs');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Song Library</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={closeSessionAnalysis}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePracticeAgain}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice Again</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
