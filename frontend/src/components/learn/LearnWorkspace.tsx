import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Music,
  Eye,
  Volume2,
  CircleDot,
  Download,
  Disc,
  Palette,
  Zap,
  Info,
  X,
  Sliders,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SongItem, SongNote, LearnSubView, SessionResult } from '../../types';
import { SongTimelineScrubber } from '../layout/SongTimelineScrubber';

export const LearnWorkspace: React.FC = () => {
  const { 
    currentSong, 
    setCurrentSong,
    songsList,
    learnSubView, 
    setLearnSubView, 
    closeWorkspace,
    activeNotes, 
    setExpectedPitch, 
    addSessionResult,
    sessionHistory,
    handFilter,
    setHandFilter,
    leftHandColor,
    setLeftHandColor,
    rightHandColor,
    setRightHandColor,
    effectConfig,
    setEffectParam,
    isSongPlaying,
    startSongPlayback,
    stopSongPlayback,
    isWaitingAtHitline,
    waitingPitch,
    setLearnMode,
    isRecording,
    startRecording,
    stopRecording,
    downloadRecording,
    playRecording,
    isPlayingRecording,
    openWorkspace,
    currentTelemetry,
    resetTelemetry,
    geminiRelayUrl,
    miraCurriculum,
    setMiraCurriculum,
    playbackBeat,
    openSessionAnalysis,
    completePracticeSession
  } = useLightSyncStore();

  // If no song is selected, default to the first song in library (e.g. Ode to Joy)
  useEffect(() => {
    if (!currentSong && songsList.length > 0) {
      setCurrentSong(songsList[0]);
    }
  }, [currentSong, songsList, setCurrentSong]);

  const song = currentSong || (songsList.length > 0 ? songsList[0] : null);

  // Play & Learning State
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'watch_listen' | 'wait_for_key' | 'flow'>('watch_listen');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [score, setScore] = useState({ hits: 0, misses: 0, streak: 0 });
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  
  // Practice settings
  const [tempoScale, setTempoScale] = useState(100);
  const [loopSection, setLoopSection] = useState<'all' | 'm1_4' | 'm5_8'>('all');
  const [isMiraLoading, setIsMiraLoading] = useState(false);

  const sessionStartTimeRef = useRef<number>(0);
  const flowTimerRef = useRef<number | null>(null);

  const [flowNoteIndex, setFlowNoteIndex] = useState(0);

  // Synchronize currentNoteIndex with actual playback beat from StudioCanvas
  const currentNoteIndex = useMemo(() => {
    if (mode === 'flow') return flowNoteIndex;
    if (!song || !song.notes || song.notes.length === 0) return 0;
    const idx = song.notes.findIndex(n => (n.time + n.duration) > playbackBeat);
    return idx === -1 ? song.notes.length - 1 : idx;
  }, [mode, flowNoteIndex, song, playbackBeat]);

  const currentNote: SongNote | undefined = song?.notes[currentNoteIndex];

  // Listen to telemetry updates from StudioCanvas for real-time rating flash
  useEffect(() => {
    if (currentTelemetry.lastRating) {
      setLastFeedback(currentTelemetry.lastRating);
      const timer = window.setTimeout(() => setLastFeedback(null), 800);
      return () => clearTimeout(timer);
    }
  }, [currentTelemetry.lastRating, currentTelemetry.hits]);

  // Real-time Flow mode timer
  useEffect(() => {
    if (!isPlaying || mode !== 'flow' || !song) return;

    const note = song.notes[flowNoteIndex];
    if (!note) {
      handleSongComplete();
      return;
    }

    const beatDurationMs = (60 / song.bpm) * 1000 * (100 / tempoScale);
    const noteTimeMs = Math.max(250, (note.duration || 1) * beatDurationMs);

    flowTimerRef.current = window.setTimeout(() => {
      // Check if user hit the note during its duration window
      if (!activeNotes.has(note.pitch)) {
        setScore(prev => ({
          hits: prev.hits,
          misses: prev.misses + 1,
          streak: 0
        }));
        setLastFeedback('MISS');
      }

      if (flowNoteIndex + 1 < song.notes.length) {
        setFlowNoteIndex(prev => prev + 1);
      } else {
        handleSongComplete();
      }
    }, noteTimeMs);

    return () => {
      if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
    };
  }, [isPlaying, mode, flowNoteIndex, song, tempoScale, activeNotes]);

  const handleStart = () => {
    setIsPlaying(true);
    setFlowNoteIndex(0);
    setScore({ hits: 0, misses: 0, streak: 0 });
    setSessionCompleted(false);
    setLastFeedback(null);
    sessionStartTimeRef.current = Date.now();

    if ((mode === 'watch_listen' || mode === 'wait_for_key') && song) {
      startSongPlayback(song);
    } else {
      stopSongPlayback();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    stopSongPlayback();
    setExpectedPitch(null);
    if (flowTimerRef.current) {
      clearTimeout(flowTimerRef.current);
      flowTimerRef.current = null;
    }
  };

  const handleSongComplete = () => {
    handleStop();
    setSessionCompleted(true);
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });

    const result = completePracticeSession(mode);
    openSessionAnalysis(result);
  };

  const handleSelectSong = (newSong: SongItem) => {
    handleStop();
    setCurrentSong(newSong);
    resetTelemetry(newSong.title, newSong.id);
    setShowSongPicker(false);
  };

  const handleAskMira = async () => {
    setIsMiraLoading(true);
    try {
      const res = await fetch('/api/ai/mira/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song,
          telemetry: currentTelemetry,
          relay_url: geminiRelayUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMiraCurriculum(data);
        setShowDrawer(true);
      }
    } catch (err) {
      console.warn('MIRA course request error:', err);
    } finally {
      setIsMiraLoading(false);
    }
  };

  const totalNotes = song?.notes.length || 1;
  const progressPct = Math.round(((currentNoteIndex + 1) / totalNotes) * 100);
  const accuracyPct = score.hits + score.misses > 0 
    ? Math.round((score.hits / (score.hits + score.misses)) * 100) 
    : 100;

  return (
    <div className="w-full h-full pointer-events-none flex flex-col justify-between p-2 sm:p-3.5 relative select-none">
      
      {/* ============================================================ */}
      {/* 1. TOP FLOATING STAGE HUD: COMPREHENSIVE LEARNING CONTROLLER */}
      {/* ============================================================ */}
      <div className="w-full pointer-events-auto flex flex-col gap-2 z-40 max-w-7xl mx-auto">
        
        {/* Main Glassmorphic HUD Bar */}
        <div className="w-full p-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white/95 dark:bg-[#0c0c0e]/95 border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl flex flex-wrap items-center justify-between gap-2.5">
          
          {/* A. Song Capsule & Piece Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[160px] sm:max-w-[220px]">
                  {song ? song.title : 'Select a Piece'}
                </span>
                {song && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 font-bold">
                    {song.difficulty}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                <span>{song ? `${song.bpm} BPM` : '--'}</span>
                <span>•</span>
                <span>{song ? song.key : '--'}</span>
                <span>•</span>
                <button
                  onClick={() => setShowSongPicker(!showSongPicker)}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <span>Switch Piece</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* B. Learning Mode Selector Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs shrink-0">
            <button
              onClick={() => {
                setMode('watch_listen');
                setLearnMode('watch_listen');
                if (isPlaying && song) startSongPlayback(song);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'watch_listen'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Watch Synthesia waterfall notes fall from top to bottom and listen to audio"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Watch & Listen</span>
            </button>
            <button
              onClick={() => {
                setMode('wait_for_key');
                setLearnMode('wait_for_key');
                setIsPlaying(true);
                if (song) startSongPlayback(song);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'wait_for_key'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Pauses at each note until you strike and hold the correct key"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Wait For Key</span>
            </button>
            <button
              onClick={() => {
                setMode('flow');
                setLearnMode('flow');
                stopSongPlayback();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'flow'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Real-time tempo streaming with accuracy scoring"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Flow</span>
            </button>
          </div>

          {/* C. Hand Isolation Filter & Hand Color Swatches */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs">
              <button
                onClick={() => setHandFilter('both')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  handFilter === 'both' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                }`}
                title="Practice both hands"
              >
                Both
              </button>
              <button
                onClick={() => setHandFilter('left')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  handFilter === 'left' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                }`}
                title="Isolate Left Hand only"
              >
                Left
              </button>
              <button
                onClick={() => setHandFilter('right')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  handFilter === 'right' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'
                }`}
                title="Isolate Right Hand only"
              >
                Right
              </button>
            </div>

            {/* Hand Color Swatch Pickers */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-1" title="Left hand waterfall note color">
                <span className="text-[10px] font-mono text-slate-400">L:</span>
                <input
                  type="color"
                  value={leftHandColor || '#38bdf8'}
                  onChange={(e) => setLeftHandColor(e.target.value)}
                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                />
              </div>
              <span className="text-slate-300 dark:text-zinc-700">|</span>
              <div className="flex items-center gap-1" title="Right hand waterfall note color">
                <span className="text-[10px] font-mono text-slate-400">R:</span>
                <input
                  type="color"
                  value={rightHandColor || '#10b981'}
                  onChange={(e) => setRightHandColor(e.target.value)}
                  className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                />
              </div>
            </div>
          </div>

          {/* D. Static Key Light Recommendation Capsule */}
          <div className="hidden xl:flex items-center shrink-0">
            {effectConfig.effect === 'static' ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Static Key Light Active</span>
              </span>
            ) : (
              <button
                onClick={() => setEffectParam('effect', 'static')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold transition-all cursor-pointer"
                title="Switch hardware LED strip to Static Single Key light (recommended for learning)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Apply Static LED (Rec.)</span>
              </button>
            )}
          </div>

          {/* E. MIDI Recording (.mid) Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-zinc-300 hover:text-rose-600 border border-slate-200 dark:border-zinc-800 text-xs font-bold transition-all cursor-pointer"
                title="Record practice session into standard .mid MIDI file"
              >
                <CircleDot className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Record .mid</span>
              </button>
            ) : (
              <button
                onClick={() => stopRecording()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer animate-pulse"
                title="Stop recording"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Recording...</span>
              </button>
            )}

            {useLightSyncStore.getState().recordedEvents.length > 0 && !isRecording && (
              <>
                <button
                  onClick={() => {
                    if (isPlayingRecording) {
                      useLightSyncStore.getState().stopPlayback();
                    } else {
                      playRecording();
                    }
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
                  title={isPlayingRecording ? 'Stop Playback' : 'Play back recorded performance'}
                >
                  <Disc className="w-4 h-4" />
                </button>
                <button
                  onClick={() => downloadRecording(`${song ? song.title : 'practice'}.mid`)}
                  className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 transition-all cursor-pointer"
                  title="Download .mid file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            
            {/* Ask MIRA AI Coach Button */}
            <button
              onClick={handleAskMira}
              disabled={isMiraLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer group disabled:opacity-50"
              title="Ask MIRA — Musical Intelligence & Rhythm Assistant for personalized advice and course generation"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isMiraLoading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
              <span>{isMiraLoading ? 'MIRA Thinking...' : 'Ask MIRA'}</span>
            </button>
          </div>

          {/* F. Transport Controls & Drawer Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {!isPlaying ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{mode === 'watch_listen' ? 'Watch' : 'Start'}</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            )}

            <button
              onClick={handleStart}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
              title="Restart piece from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                showDrawer
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-zinc-800'
              }`}
              title="Toggle Drills & Deep Analysis Drawer"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={closeWorkspace}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
              title="Exit learning mode to live visualizer (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Floating Sub-HUD Timeline Scrubber (Docked neatly under top bar, 100% free keyboard runway) */}
        <div className="w-full max-w-2xl mx-auto pointer-events-auto">
          <SongTimelineScrubber showPieceTitle={false} compact={true} autoHide={true} className="w-full shadow-lg" />
        </div>

      </div>

      {/* ============================================================ */}
      {/* 2. ON-STAGE LIVE TARGET & SCORING FLOATING POD */}
      {/* ============================================================ */}
      <div className="w-full flex justify-between items-start pointer-events-none px-2 sm:px-4 z-30">
        
        {/* Left Floating Target Key Badge */}
        {isPlaying && mode !== 'watch_listen' && currentNote && (
          <div className="pointer-events-auto p-3.5 rounded-2xl bg-white/95 dark:bg-[#0c0c0e]/95 border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl flex items-center gap-3.5">
            <div 
              className="w-14 h-14 rounded-2xl text-white flex flex-col items-center justify-center shadow-lg font-mono font-black"
              style={{
                backgroundColor: currentNote.hand === 'left' 
                  ? (leftHandColor || '#38bdf8') 
                  : (rightHandColor || '#10b981')
              }}
            >
              <span className="text-2xl leading-none">{currentNote.name}</span>
              <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5 opacity-90">
                {currentNote.hand}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono block">
                {isWaitingAtHitline ? 'WAITING AT HITLINE' : 'TARGET PIANO KEY'}
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {isWaitingAtHitline ? (
                  <span className="text-amber-500 dark:text-amber-400 font-extrabold animate-pulse">
                    Strike & Hold {currentNote.name}
                  </span>
                ) : (
                  <span>Strike {currentNote.name}</span>
                )}
              </span>
              {lastFeedback && (
                <span className="text-xs font-bold text-emerald-500 font-mono block animate-bounce mt-0.5">
                  ✓ {lastFeedback}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Right Floating Score & Streak Pod */}
        <div className="pointer-events-auto p-3 rounded-2xl bg-white/95 dark:bg-[#0c0c0e]/95 border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl flex items-center gap-3 ml-auto">
          {/* Streak */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60">
            <Flame className="w-4 h-4 text-amber-500 fill-current" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-amber-700/80 dark:text-amber-400/80 uppercase font-bold leading-none">Streak</span>
              <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400 leading-tight">{score.streak}</span>
            </div>
          </div>

          {/* Accuracy */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60">
            <Award className="w-4 h-4 text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-indigo-700/80 dark:text-indigo-400/80 uppercase font-bold leading-none">Accuracy</span>
              <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 leading-tight">{accuracyPct}%</span>
            </div>
          </div>

          {/* Hits Counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-emerald-700/80 dark:text-emerald-400/80 uppercase font-bold leading-none">Hits</span>
              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 leading-tight">{score.hits}/{totalNotes}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 3. ZERO OBSTRUCTION BOTTOM RUNWAY (Unobstructed Piano Keys) */}
      {/* ============================================================ */}
      <div className="pointer-events-none h-4" />

      {/* ============================================================ */}
      {/* 4. SLIDE-OUT DRILLS & DEEP ANALYSIS DRAWER */}
      {/* ============================================================ */}
      {showDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 z-50 pointer-events-auto bg-white dark:bg-[#0c0c0e] border-l border-slate-200 dark:border-zinc-800 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-855">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Drills & Analysis</h3>
              </div>
              <button 
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tempo Scaling */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Practice Tempo</span>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{tempoScale}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={tempoScale}
                onChange={(e) => setTempoScale(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>50% (Slow)</span>
                <span>100% (Standard)</span>
                <span>150% (Fast)</span>
              </div>
            </div>

            {/* Measure Looping */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Measure Looping</span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['all', 'm1_4', 'm5_8'] as const).map(sec => (
                  <button
                    key={sec}
                    onClick={() => setLoopSection(sec)}
                    className={`py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      loopSection === sec 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    {sec === 'all' ? 'Entire' : sec === 'm1_4' ? 'M 1-4' : 'M 5-8'}
                  </button>
                ))}
              </div>
            </div>

            {/* MIRA Personalized Learning Course */}
            {miraCurriculum && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    MIRA Course: {miraCurriculum.songTitle}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold">
                    Custom Plan
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-tight">
                  {miraCurriculum.summary}
                </p>

                <div className="flex flex-col gap-1.5 mt-1">
                  {miraCurriculum.steps.map((st) => (
                    <div
                      key={st.step}
                      className="p-2 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-indigo-100 dark:border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col pr-2">
                        <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                          Phase {st.step}: {st.title}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                          {st.tempoScale}% • {st.hand} hand • {st.loopSection === 'all' ? 'Full piece' : st.loopSection === 'm1_4' ? 'Bars 1-4' : 'Bars 5-8'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setTempoScale(st.tempoScale);
                          setLoopSection(st.loopSection);
                          setHandFilter(st.hand);
                        }}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-xs transition-colors"
                        title="Load tempo, loop, and hand filter for this phase"
                      >
                        Apply Drill
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session History Stats */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Recent Runs ({sessionHistory.length})
              </span>
              {sessionHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Complete a practice run to log accuracy metrics.</p>
              ) : (
                sessionHistory.slice(0, 4).map((hist, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-850 flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{hist.song_title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{Math.round(hist.duration_sec)}s run</span>
                    </div>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {hist.accuracy_pct}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => setShowDrawer(false)}
            className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
          >
            Resume Learning Stage
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. QUICK PIECE SWITCHER POPOVER */}
      {/* ============================================================ */}
      {showSongPicker && (
        <div className="fixed inset-0 z-50 pointer-events-auto bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c0c0e] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-850">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Piece to Learn</h3>
              </div>
              <button 
                onClick={() => setShowSongPicker(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {songsList.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSong(s)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    song?.id === s.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-semibold">
                        {s.difficulty}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {s.composer} • {s.bpm} BPM • {s.notes.length} notes
                    </span>
                  </div>

                  {song?.id === s.id && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Selected
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
