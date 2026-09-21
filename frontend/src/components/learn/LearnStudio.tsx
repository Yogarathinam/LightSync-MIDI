import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  Award, 
  Sparkles,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SongItem, SongNote } from '../../types';

export const LearnStudio: React.FC = () => {
  const { 
    setExpectedPitch, 
    activeNotes, 
    addSessionResult, 
    setActiveTab, 
    wsSender 
  } = useLightSyncStore();

  const [songs, setSongs] = useState<SongItem[]>([
    {
      id: 'ode_to_joy',
      title: 'Ode to Joy',
      composer: 'L. v. Beethoven',
      difficulty: 'Beginner',
      bpm: 100,
      time_signature: '4/4',
      key: 'C Major',
      notes: [
        { pitch: 64, name: 'E4', time: 0.0, duration: 1.0, hand: 'right' },
        { pitch: 64, name: 'E4', time: 1.0, duration: 1.0, hand: 'right' },
        { pitch: 65, name: 'F4', time: 2.0, duration: 1.0, hand: 'right' },
        { pitch: 67, name: 'G4', time: 3.0, duration: 1.0, hand: 'right' },
        { pitch: 67, name: 'G4', time: 4.0, duration: 1.0, hand: 'right' },
        { pitch: 65, name: 'F4', time: 5.0, duration: 1.0, hand: 'right' },
        { pitch: 64, name: 'E4', time: 6.0, duration: 1.0, hand: 'right' },
        { pitch: 62, name: 'D4', time: 7.0, duration: 1.0, hand: 'right' },
        { pitch: 60, name: 'C4', time: 8.0, duration: 1.0, hand: 'right' },
        { pitch: 60, name: 'C4', time: 9.0, duration: 1.0, hand: 'right' },
        { pitch: 62, name: 'D4', time: 10.0, duration: 1.0, hand: 'right' },
        { pitch: 64, name: 'E4', time: 11.0, duration: 1.0, hand: 'right' },
        { pitch: 64, name: 'E4', time: 12.0, duration: 1.5, hand: 'right' },
        { pitch: 62, name: 'D4', time: 13.5, duration: 0.5, hand: 'right' },
        { pitch: 62, name: 'D4', time: 14.0, duration: 2.0, hand: 'right' },
      ]
    },
    {
      id: 'c_major_scale',
      title: 'C Major Scale Drill',
      composer: 'Technique Drill',
      difficulty: 'Beginner',
      bpm: 90,
      time_signature: '4/4',
      key: 'C Major',
      notes: [
        { pitch: 60, name: 'C4', time: 0.0, duration: 1.0, hand: 'right' },
        { pitch: 62, name: 'D4', time: 1.0, duration: 1.0, hand: 'right' },
        { pitch: 64, name: 'E4', time: 2.0, duration: 1.0, hand: 'right' },
        { pitch: 65, name: 'F4', time: 3.0, duration: 1.0, hand: 'right' },
        { pitch: 67, name: 'G4', time: 4.0, duration: 1.0, hand: 'right' },
        { pitch: 69, name: 'A4', time: 5.0, duration: 1.0, hand: 'right' },
        { pitch: 71, name: 'B4', time: 6.0, duration: 1.0, hand: 'right' },
        { pitch: 72, name: 'C5', time: 7.0, duration: 1.0, hand: 'right' },
      ]
    },
    {
      id: 'fur_elise',
      title: 'Für Elise (Theme)',
      composer: 'L. v. Beethoven',
      difficulty: 'Intermediate',
      bpm: 120,
      time_signature: '3/8',
      key: 'A Minor',
      notes: [
        { pitch: 76, name: 'E5', time: 0.0, duration: 0.5, hand: 'right' },
        { pitch: 75, name: 'D#5', time: 0.5, duration: 0.5, hand: 'right' },
        { pitch: 76, name: 'E5', time: 1.0, duration: 0.5, hand: 'right' },
        { pitch: 75, name: 'D#5', time: 1.5, duration: 0.5, hand: 'right' },
        { pitch: 76, name: 'E5', time: 2.0, duration: 0.5, hand: 'right' },
        { pitch: 71, name: 'B4', time: 2.5, duration: 0.5, hand: 'right' },
        { pitch: 74, name: 'D5', time: 3.0, duration: 0.5, hand: 'right' },
        { pitch: 72, name: 'C5', time: 3.5, duration: 0.5, hand: 'right' },
        { pitch: 69, name: 'A4', time: 4.0, duration: 1.5, hand: 'right' },
      ]
    }
  ]);

  const [selectedSong, setSelectedSong] = useState<SongItem>(songs[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [mode, setMode] = useState<'wait_for_key' | 'flow'>('wait_for_key');
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [score, setScore] = useState({ hits: 0, misses: 0, streak: 0 });
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const currentExpected = isPlaying && currentNoteIndex < selectedSong.notes.length
    ? selectedSong.notes[currentNoteIndex]
    : null;

  // Sync expected pitch with global store so visualizer highlights key & LED
  useEffect(() => {
    if (currentExpected) {
      setExpectedPitch(currentExpected.pitch);
    } else {
      setExpectedPitch(null);
    }
  }, [currentExpected, setExpectedPitch]);

  // Check user played notes against expected note
  useEffect(() => {
    if (!isPlaying || !currentExpected) return;

    if (activeNotes.has(currentExpected.pitch)) {
      // Hit correct note!
      setLastFeedback('PERFECT');
      setScore(prev => ({ ...prev, hits: prev.hits + 1, streak: prev.streak + 1 }));

      // Advance to next note
      if (currentNoteIndex + 1 < selectedSong.notes.length) {
        setCurrentNoteIndex(prev => prev + 1);
      } else {
        // Complete song!
        setIsPlaying(false);
        setSessionCompleted(true);
        setExpectedPitch(null);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        const accuracy = Math.round(((score.hits + 1) / selectedSong.notes.length) * 100);
        addSessionResult({
          song_id: selectedSong.id,
          song_title: selectedSong.title,
          mode: 'learn',
          duration_sec: 18.5,
          total_notes: selectedSong.notes.length,
          correct_notes: score.hits + 1,
          missed_notes: score.misses,
          accuracy_pct: accuracy,
          avg_deviation_ms: 12.4,
          ratings_count: {
            PERFECT: score.hits + 1,
            GREAT: 0,
            EARLY: 0,
            LATE: 0,
            MISS: score.misses
          }
        });
      }
    } else if (activeNotes.size > 0) {
      // Wrong key pressed
      const wrongPitch = Array.from(activeNotes.keys())[0];
      if (wrongPitch !== currentExpected.pitch) {
        setLastFeedback('MISS');
        setScore(prev => ({ ...prev, misses: prev.misses + 1, streak: 0 }));
      }
    }
  }, [activeNotes, isPlaying, currentExpected, currentNoteIndex, selectedSong, score, setExpectedPitch, addSessionResult]);

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentNoteIndex(0);
    setScore({ hits: 0, misses: 0, streak: 0 });
    setSessionCompleted(false);
    setLastFeedback(null);
    if (wsSender) {
      wsSender({
        type: 'START_SESSION',
        song_id: selectedSong.id,
        song_title: selectedSong.title,
        mode: 'learn'
      });
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setExpectedPitch(null);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentNoteIndex(0);
    setScore({ hits: 0, misses: 0, streak: 0 });
    setSessionCompleted(false);
    setLastFeedback(null);
    setExpectedPitch(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      
      {/* Left Column: Song Catalog Selection (4 Cols) */}
      <div className="lg:col-span-4 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Song Curriculum
          </h2>
          <span className="text-[11px] font-mono text-slate-400">{songs.length} Available</span>
        </div>

        <div className="flex flex-col gap-2">
          {songs.map((song) => {
            const isSelected = selectedSong.id === song.id;
            return (
              <button
                key={song.id}
                onClick={() => {
                  setSelectedSong(song);
                  handleReset();
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-zinc-800 border-indigo-500 dark:border-zinc-600 elevation-1'
                    : 'bg-slate-50/50 dark:bg-zinc-950 border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                    {song.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono">
                    {song.difficulty}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span>{song.composer}</span>
                  <span className="font-mono">{song.notes.length} Notes</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Interactive Practice Board (8 Cols) */}
      <div className="lg:col-span-8 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-5 transition-colors">
        
        <div>
          {/* Header & Mode Switch */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedSong.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {selectedSong.composer} &bull; Key: {selectedSong.key} &bull; Tempo: {selectedSong.bpm} BPM
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-zinc-900 p-0.5 border border-slate-200 dark:border-zinc-800 text-xs">
              <button
                onClick={() => setMode('wait_for_key')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  mode === 'wait_for_key' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white font-bold elevation-1' : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                Wait For Key
              </button>
              <button
                onClick={() => setMode('flow')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  mode === 'flow' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-white font-bold elevation-1' : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                In-Time Flow
              </button>
            </div>
          </div>

          {/* Interactive Note Prompt Display */}
          <div className="my-5 p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col items-center justify-center gap-3">
            {sessionCompleted ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <Award className="w-12 h-12 text-amber-500 animate-bounce" />
                <span className="text-xl font-black text-slate-900 dark:text-white">Piece Completed!</span>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Accuracy: {Math.round((score.hits / selectedSong.notes.length) * 100)}% &bull; Notes Hit: {score.hits}/{selectedSong.notes.length}
                </p>
                <button
                  onClick={() => setActiveTab('aicoach')}
                  className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Get AI Coach Analysis</span>
                </button>
              </div>
            ) : isPlaying ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-widest font-mono text-slate-400 dark:text-zinc-500">
                  NEXT NOTE &bull; STEP {currentNoteIndex + 1} OF {selectedSong.notes.length}
                </span>
                <div className="text-5xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {currentExpected?.name}
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 font-semibold font-mono">
                  Press {currentExpected?.name} (MIDI {currentExpected?.pitch})
                </span>
                {lastFeedback && (
                  <span className={`text-xs font-bold font-mono mt-1 ${lastFeedback === 'PERFECT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {lastFeedback}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-slate-400">
                <GraduationCap className="w-10 h-10 text-slate-300 dark:text-zinc-700" />
                <span className="text-sm font-semibold text-slate-600 dark:text-zinc-300">Ready to Learn</span>
                <span className="text-xs text-slate-400">Click Start below to begin step-by-step interactive guidance</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-zinc-400">
              <span>Progress</span>
              <span>{Math.round((currentNoteIndex / selectedSong.notes.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-200" 
                style={{ width: `${(currentNoteIndex / selectedSong.notes.length) * 100}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Action Controls & Live Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Hits: <strong>{score.hits}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Streak: <strong>{score.streak}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={handleStart}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Practice</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleReset}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300"
              title="Reset Song"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
