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
    isRecording,
    startRecording,
    stopRecording,
    downloadRecording,
    playRecording,
    isPlayingRecording 
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
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [mode, setMode] = useState<'watch_listen' | 'wait_for_key' | 'flow'>('watch_listen');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [score, setScore] = useState({ hits: 0, misses: 0, streak: 0 });
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  
  // Practice settings
  const [tempoScale, setTempoScale] = useState(100);
  const [loopSection, setLoopSection] = useState<'all' | 'm1_4' | 'm5_8'>('all');

  const sessionStartTimeRef = useRef<number>(0);
  const flowTimerRef = useRef<number | null>(null);

  const currentNote: SongNote | undefined = song?.notes[currentNoteIndex];

  // Set expected pitch in visualizer for target key highlight
  useEffect(() => {
    if (isPlaying && currentNote && mode !== 'watch_listen') {
      setExpectedPitch(currentNote.pitch);
    } else {
      setExpectedPitch(null);
    }
  }, [isPlaying, currentNoteIndex, currentNote, mode, setExpectedPitch]);

  // Note matching logic for Wait For Key mode
  useEffect(() => {
    if (!isPlaying || !currentNote || mode === 'watch_listen') return;

    if (activeNotes.has(currentNote.pitch)) {
      setScore(prev => ({
        hits: prev.hits + 1,
        misses: prev.misses,
        streak: prev.streak + 1
      }));
      setLastFeedback('PERFECT');

      // Clear feedback after 900ms
      const fbTimer = window.setTimeout(() => setLastFeedback(null), 900);

      if (currentNoteIndex + 1 < (song?.notes.length || 0)) {
        setCurrentNoteIndex(prev => prev + 1);
      } else {
        handleSongComplete();
      }

      return () => clearTimeout(fbTimer);
    }
  }, [activeNotes, isPlaying, currentNote, currentNoteIndex, song, mode]);

  // Real-time Flow mode timer
  useEffect(() => {
    if (!isPlaying || mode !== 'flow' || !song) return;

    const note = song.notes[currentNoteIndex];
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

      if (currentNoteIndex + 1 < song.notes.length) {
        setCurrentNoteIndex(prev => prev + 1);
      } else {
        handleSongComplete();
      }
    }, noteTimeMs);

    return () => {
      if (flowTimerRef.current) clearTimeout(flowTimerRef.current);
    };
  }, [isPlaying, mode, currentNoteIndex, song, tempoScale, activeNotes]);

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentNoteIndex(0);
    setScore({ hits: 0, misses: 0, streak: 0 });
    setSessionCompleted(false);
    setLastFeedback(null);
    sessionStartTimeRef.current = Date.now();

    if (mode === 'watch_listen' && song) {
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

  const handleSelectSong = (newSong: SongItem) => {
    handleStop();
    setCurrentSong(newSong);
    setShowSongPicker(false);
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
        <div className="w-full p-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl flex flex-wrap items-center justify-between gap-2.5">
          
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
                stopSongPlayback();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'wait_for_key'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Pauses at each note until you strike the correct key"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Wait For Key</span>
            </button>
            <button
              onClick={() => {
                setMode('flow');
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

      </div>

      {/* ============================================================ */}
      {/* 2. ON-STAGE LIVE TARGET & SCORING FLOATING POD */}
      {/* ============================================================ */}
      <div className="w-full flex justify-between items-start pointer-events-none px-2 sm:px-4 z-30">
        
        {/* Left Floating Target Key Badge */}
        {isPlaying && mode !== 'watch_listen' && currentNote && (
          <div className="pointer-events-auto p-3.5 rounded-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl flex items-center gap-3.5 animate-in fade-in slide-in-from-left duration-200">
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
                Target Piano Key
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Strike {currentNote.name}
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
        <div className="pointer-events-auto p-3 rounded-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl flex items-center gap-3 ml-auto">
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
      {/* 3. BOTTOM PROGRESS TRACKER */}
      {/* ============================================================ */}
      <div className="w-full max-w-4xl mx-auto pointer-events-auto z-30 mb-1">
        <div className="w-full p-2.5 rounded-2xl bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 shadow-lg flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 dark:text-zinc-400 px-1">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {song ? song.title : 'Ready'}
            </span>
            <span>Note {Math.min(currentNoteIndex + 1, totalNotes)} of {totalNotes} ({progressPct}%)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 pointer-events-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
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
