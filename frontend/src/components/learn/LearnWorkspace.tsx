import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  Activity, 
  BarChart2, 
  Award, 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Sparkles,
  Repeat,
  Gauge,
  Hand,
  TrendingUp,
  ChevronRight,
  Music
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SongItem, SongNote, LearnSubView, SessionResult } from '../../types';

export const LearnWorkspace: React.FC = () => {
  const { 
    currentSong, 
    setCurrentSong,
    learnSubView, 
    setLearnSubView, 
    openWorkspace,
    activeNotes, 
    setExpectedPitch, 
    addSessionResult,
    sessionHistory,
    setSessionHistory,
    handFilter,
    setHandFilter,
    wsSender 
  } = useLightSyncStore();

  // Follow Mode State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [mode, setMode] = useState<'wait_for_key' | 'flow'>('wait_for_key');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [score, setScore] = useState({ hits: 0, misses: 0, streak: 0 });
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const sessionStartTimeRef = useRef<number>(0);
  const flowTimerRef = useRef<number | null>(null);

  // Practice Mode State
  const [tempoScale, setTempoScale] = useState(100);
  const [loopSection, setLoopSection] = useState<'all' | 'm1_4' | 'm5_8'>('all');

  const song = currentSong;
  const currentNote: SongNote | undefined = song?.notes[currentNoteIndex];

  // Set expected pitch in visualizer
  useEffect(() => {
    if (isPlaying && currentNote && learnSubView === 'follow') {
      setExpectedPitch(currentNote.pitch);
    } else {
      setExpectedPitch(null);
    }
  }, [isPlaying, currentNoteIndex, currentNote, learnSubView, setExpectedPitch]);

  // Note matching logic for Follow mode
  useEffect(() => {
    if (!isPlaying || !currentNote || learnSubView !== 'follow') return;

    if (activeNotes.has(currentNote.pitch)) {
      setScore(prev => ({
        hits: prev.hits + 1,
        misses: prev.misses,
        streak: prev.streak + 1
      }));
      setLastFeedback('PERFECT');

      if (currentNoteIndex + 1 < (song?.notes.length || 0)) {
        setCurrentNoteIndex(prev => prev + 1);
      } else {
        // Song Completed!
        handleSongComplete();
      }
    }
  }, [activeNotes, isPlaying, currentNote, currentNoteIndex, song, learnSubView]);

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentNoteIndex(0);
    setScore({ hits: 0, misses: 0, streak: 0 });
    setSessionCompleted(false);
    setLastFeedback(null);
    sessionStartTimeRef.current = Date.now();
  };

  const handleStop = () => {
    setIsPlaying(false);
    setExpectedPitch(null);
    if (flowTimerRef.current) {
      clearTimeout(flowTimerRef.current);
    }
  };

  const handleSongComplete = () => {
    handleStop();
    setSessionCompleted(true);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

    const durationSec = Math.max(1, (Date.now() - sessionStartTimeRef.current) / 1000);
    const totalNotes = song?.notes.length || 1;
    const accuracy = Math.round((score.hits / totalNotes) * 100);

    const result: SessionResult = {
      song_id: song?.id || 'unknown',
      song_title: song?.title || 'Unknown Piece',
      mode: 'learn',
      duration_sec: durationSec,
      total_notes: totalNotes,
      correct_notes: score.hits,
      missed_notes: score.misses,
      accuracy_pct: accuracy,
      avg_deviation_ms: 14.5,
      ratings_count: {
        PERFECT: score.hits,
        GREAT: 0,
        EARLY: 0,
        LATE: 0,
        MISS: score.misses
      }
    };
    addSessionResult(result);
  };

  if (!song) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
        <Music className="w-12 h-12 text-slate-400 dark:text-zinc-600 opacity-50" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No Song Selected</h3>
        <p className="text-xs text-slate-500 max-w-sm">Choose a piece from the song library to begin learning and practice.</p>
        <button
          onClick={() => openWorkspace('songs')}
          className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:bg-indigo-500 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>Open Song Library</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Latest analysis data
  const latestSession: SessionResult = sessionHistory.length > 0 ? sessionHistory[0] : {
    song_id: song.id,
    song_title: song.title,
    mode: 'learn',
    duration_sec: 24.5,
    total_notes: song.notes.length,
    correct_notes: Math.round(song.notes.length * 0.92),
    missed_notes: Math.round(song.notes.length * 0.08),
    accuracy_pct: 92.0,
    avg_deviation_ms: 16.5,
    ratings_count: {
      PERFECT: Math.round(song.notes.length * 0.75),
      GREAT: Math.round(song.notes.length * 0.17),
      EARLY: 1,
      LATE: 1,
      MISS: Math.round(song.notes.length * 0.08)
    }
  };

  const navTabs: { id: LearnSubView; label: string; icon: React.ReactNode }[] = [
    { id: 'follow', label: 'Follow / Play', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'practice', label: 'Practice Drills', icon: <Activity className="w-3.5 h-3.5 text-sky-500" /> },
    { id: 'analyze', label: 'Analysis', icon: <BarChart2 className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'progress', label: 'Progress', icon: <Award className="w-3.5 h-3.5 text-purple-500" /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      
      {/* 1. Integrated Song Bar & Sub-Nav */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800">
        
        {/* Active Song Information */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {song.title}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 font-semibold">
                {song.difficulty}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
              <span>{song.composer}</span>
              <span>•</span>
              <span>{song.key}</span>
              <span>•</span>
              <span>{song.bpm} BPM</span>
              <span>•</span>
              <button
                onClick={() => openWorkspace('songs')}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                Change piece <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Sub-Nav Bar */}
        <div className="flex items-center p-1 rounded-xl bg-white dark:bg-black/60 border border-slate-200 dark:border-zinc-800 shrink-0">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLearnSubView(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                learnSubView === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* 2. Sub-View Body with Smooth Cross-fade */}
      <div className="transition-opacity duration-200">
        
        {/* SUBVIEW A: FOLLOW / LEARN */}
        {learnSubView === 'follow' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Main Interactive Stage Card (8 Cols) */}
            <div className="md:col-span-8 p-5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-5">
              
              {/* Header Controls */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-850">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Mode:</span>
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs">
                    <button
                      onClick={() => setMode('wait_for_key')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        mode === 'wait_for_key'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Wait For Key
                    </button>
                    <button
                      onClick={() => setMode('flow')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        mode === 'flow'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Real-time Flow
                    </button>
                  </div>
                </div>

                {/* Play / Stop Action */}
                <div className="flex items-center gap-2">
                  {!isPlaying ? (
                    <button
                      onClick={handleStart}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Learning</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  )}
                  <button
                    onClick={handleStart}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
                    title="Restart from beginning"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Note Flow Ribbon / Target Note Display */}
              <div className="py-8 px-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 font-mono">
                  {isPlaying ? 'Strike Piano Key:' : 'Ready to begin'}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-3xl font-black font-mono">
                      {isPlaying && currentNote ? currentNote.name : '--'}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-200 uppercase">
                      {isPlaying && currentNote ? `${currentNote.hand} hand` : 'Standby'}
                    </span>
                  </div>
                </div>

                {/* Feedback pill */}
                {lastFeedback && (
                  <span className="text-xs font-bold text-emerald-500 font-mono animate-bounce">
                    ✓ {lastFeedback}
                  </span>
                )}
              </div>

              {/* Session Complete Banner */}
              {sessionCompleted && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Run Completed!</h4>
                      <p className="text-[11px] text-slate-500">View your accuracy, timing, and difficult sections.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLearnSubView('analyze')}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>View Analysis</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500 pb-1">
                  <span>Note {currentNoteIndex + 1} of {song.notes.length}</span>
                  <span>{Math.round(((currentNoteIndex + 1) / song.notes.length) * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-150"
                    style={{ width: `${((currentNoteIndex + 1) / song.notes.length) * 100}%` }}
                  />
                </div>
              </div>

            </div>

            {/* Live Score & Metrics Card (4 Cols) */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Live Run Metrics
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Streak</span>
                    <span className="text-2xl font-black font-mono text-amber-500 flex items-center gap-1">
                      <Flame className="w-4 h-4 fill-current" />
                      {score.streak}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Hits</span>
                    <span className="text-2xl font-black font-mono text-emerald-500">
                      {score.hits}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-mono">Accuracy</span>
                  <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {score.hits + score.misses > 0 
                      ? `${Math.round((score.hits / (score.hits + score.misses)) * 100)}%`
                      : '100%'}
                  </span>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 flex flex-col gap-2">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Targeted Practice</span>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Slow down tempo to 50% or isolate right hand only to master tricky measures.
                </p>
                <button
                  onClick={() => setLearnSubView('practice')}
                  className="mt-1 py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 text-xs font-semibold border border-slate-200 dark:border-zinc-800 shadow-sm transition-all cursor-pointer flex items-center justify-between"
                >
                  <span>Open Practice Drills</span>
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* SUBVIEW B: PRACTICE DRILLS */}
        {learnSubView === 'practice' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Controls (7 Cols) */}
            <div className="md:col-span-7 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Targeted Drills & Sub-tempo
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold">
                  Precision Drills
                </span>
              </div>

              {/* Tempo Scaling Slider */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-500" />
                    Practice Tempo Scaling
                  </span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{tempoScale}% Speed</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="130"
                  step="5"
                  value={tempoScale}
                  onChange={(e) => setTempoScale(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>50% (Sub-tempo)</span>
                  <span>100% (Concert speed)</span>
                  <span>130% (Speed burst)</span>
                </div>
              </div>

              {/* Hand Isolation Selector */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Hand className="w-4 h-4 text-indigo-500" />
                  Hand Isolation
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both' as const, label: 'Both Hands' },
                    { id: 'right' as const, label: 'Right Hand Only' },
                    { id: 'left' as const, label: 'Left Hand Only' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setHandFilter(item.id)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        handFilter === item.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loop Region Selection */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-indigo-500" />
                  Loop Region (A-B Looper)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all' as const, label: 'Full Piece' },
                    { id: 'm1_4' as const, label: 'Bars 1-4 (Theme)' },
                    { id: 'm5_8' as const, label: 'Bars 5-8 (Variation)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setLoopSection(item.id)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        loopSection === item.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jump to Follow with these settings */}
              <button
                onClick={() => setLearnSubView('follow')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Practice Run with Current Drills</span>
              </button>
            </div>

            {/* Practice Recommendations (5 Cols) */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Drill Recommendations
                </span>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Sub-tempo Mastery</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Practice at 70% speed until 3 consecutive runs reach 95%+ accuracy before increasing to concert tempo.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Hand Isolation</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Isolate the right hand melody first to lock in fingerings, then add left hand accompaniment.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* SUBVIEW C: PERFORMANCE ANALYSIS */}
        {learnSubView === 'analyze' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Metrics Row */}
            <div className="md:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Accuracy
                </span>
                <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {latestSession.accuracy_pct.toFixed(0)}%
                </span>
                <span className="text-[11px] text-slate-400">Mastery Target: 90%+</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Avg Deviation
                </span>
                <span className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {latestSession.avg_deviation_ms > 0 ? `+${latestSession.avg_deviation_ms.toFixed(0)}` : latestSession.avg_deviation_ms.toFixed(0)} ms
                </span>
                <span className="text-[11px] text-slate-400">
                  {Math.abs(latestSession.avg_deviation_ms) < 20 ? 'In the pocket' : 'Slight anticipation'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Notes Struck
                </span>
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {latestSession.correct_notes} / {latestSession.total_notes}
                </span>
                <span className="text-[11px] text-slate-400">{latestSession.missed_notes} missed note(s)</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
                  Piece
                </span>
                <span className="text-base font-bold truncate text-slate-900 dark:text-white">
                  {latestSession.song_title}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{latestSession.duration_sec.toFixed(1)}s session</span>
              </div>
            </div>

            {/* Ratings Breakdown Card (7 Cols) */}
            <div className="md:col-span-7 p-5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Micro-Timing Distribution
              </span>

              <div className="space-y-2">
                {[
                  { label: 'PERFECT (±15ms)', count: latestSession.ratings_count?.PERFECT || 0, color: 'bg-emerald-500' },
                  { label: 'GREAT (±35ms)', count: latestSession.ratings_count?.GREAT || 0, color: 'bg-sky-500' },
                  { label: 'EARLY (>35ms)', count: latestSession.ratings_count?.EARLY || 0, color: 'bg-amber-500' },
                  { label: 'LATE (>35ms)', count: latestSession.ratings_count?.LATE || 0, color: 'bg-orange-500' },
                  { label: 'MISSED', count: latestSession.ratings_count?.MISS || 0, color: 'bg-rose-500' },
                ].map((item) => {
                  const pct = Math.round((item.count / Math.max(1, latestSession.total_notes)) * 100);
                  return (
                    <div key={item.label} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-700 dark:text-zinc-300 font-semibold">{item.label}</span>
                        <span className="text-slate-500">{item.count} notes ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-850 overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action back to follow */}
              <button
                onClick={() => setLearnSubView('follow')}
                className="mt-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Retry Run with Focus on Timing</span>
              </button>
            </div>

            {/* Difficult Sections Analysis (5 Cols) */}
            <div className="md:col-span-5 p-5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Difficult Sections
              </span>

              <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 flex flex-col gap-1">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300">Bars 5-8 (Arpeggio Transition)</span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Most late ratings occurred during the 16th-note transition. Practice this section isolated in Practice Drills.
                </p>
                <button
                  onClick={() => {
                    setLoopSection('m5_8');
                    setLearnSubView('practice');
                  }}
                  className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Loop Bars 5-8 in Practice →
                </button>
              </div>
            </div>

          </div>
        )}

        {/* SUBVIEW D: PROGRESS & HISTORY */}
        {learnSubView === 'progress' && (
          <div className="flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Session History & Mastery Logs
              </span>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {sessionHistory.length > 0 ? (
                  sessionHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{item.song_title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.duration_sec.toFixed(0)}s run</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.accuracy_pct.toFixed(0)}%</span>
                        <span className="text-slate-500">{item.correct_notes}/{item.total_notes} notes</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No recorded runs yet. Complete a learning run to see your history!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
