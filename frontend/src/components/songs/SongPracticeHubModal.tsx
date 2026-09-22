import React, { useState } from 'react';
import { 
  Music, 
  Sparkles, 
  X, 
  GraduationCap, 
  Play, 
  Activity, 
  Eye, 
  Hand, 
  Flame, 
  Clock, 
  Send, 
  Trophy, 
  CheckCircle2, 
  Sliders, 
  Volume2, 
  VolumeX,
  RotateCcw,
  TrendingUp,
  Award
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SongItem, SessionResult } from '../../types';
import { sendPromptWithToken } from '../../utils/geminiRelay';

interface SongPracticeHubModalProps {
  song: SongItem | null;
  onClose: () => void;
}

export const SongPracticeHubModal: React.FC<SongPracticeHubModalProps> = ({ song, onClose }) => {
  const startSongPlayback = useLightSyncStore((s) => s.startSongPlayback);
  const setCurrentSong = useLightSyncStore((s) => s.setCurrentSong);
  const setLearnMode = useLightSyncStore((s) => s.setLearnMode);
  const handFilter = useLightSyncStore((s) => s.handFilter);
  const setHandFilter = useLightSyncStore((s) => s.setHandFilter);
  const closeWorkspace = useLightSyncStore((s) => s.closeWorkspace);
  const sessionHistory = useLightSyncStore((s) => s.sessionHistory);
  const geminiRelayUrl = useLightSyncStore((s) => s.geminiRelayUrl);
  const triggerNoteOn = useLightSyncStore((s) => s.triggerNoteOn);
  const triggerNoteOff = useLightSyncStore((s) => s.triggerNoteOff);

  const [selectedMode, setSelectedMode] = useState<'wait_for_key' | 'watch_listen' | 'flow'>('wait_for_key');
  const [selectedHand, setSelectedHand] = useState<'both' | 'left' | 'right'>('both');
  const [tempoScale, setTempoScale] = useState<number>(100);
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState(false);

  // MIRA Chat state
  const [miraQuestion, setMiraQuestion] = useState('');
  const [miraAnswer, setMiraAnswer] = useState<string | null>(null);
  const [isAskingMira, setIsAskingMira] = useState(false);

  if (!song) return null;

  // Filter history for this song
  const pastAttempts: SessionResult[] = sessionHistory.filter(s => s.song_id === song.id);
  const bestAttempt = pastAttempts.length > 0 
    ? [...pastAttempts].sort((a, b) => b.accuracy_pct - a.accuracy_pct)[0] 
    : null;

  const difficultyColor = 
    song.difficulty === 'Beginner' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
    song.difficulty === 'Intermediate' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
    'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';

  // Audio Preview preview loop
  const handleToggleAudioPreview = () => {
    if (isPlayingAudioPreview) {
      setIsPlayingAudioPreview(false);
      return;
    }

    setIsPlayingAudioPreview(true);
    const beatDurationMs = (60 / song.bpm) * 1000;
    const maxNotesToPlay = Math.min(song.notes.length, 24);

    for (let i = 0; i < maxNotesToPlay; i++) {
      const note = song.notes[i];
      const startMs = note.time * beatDurationMs;
      const durMs = Math.max(160, note.duration * beatDurationMs * 0.9);

      setTimeout(() => {
        triggerNoteOn(note.pitch, 90);
      }, startMs);

      setTimeout(() => {
        triggerNoteOff(note.pitch);
      }, startMs + durMs);
    }

    const totalMs = (song.notes[maxNotesToPlay - 1]?.time || 6) * beatDurationMs + 800;
    setTimeout(() => {
      setIsPlayingAudioPreview(false);
    }, totalMs);
  };

  // Launch practice session
  const handleLaunchPractice = () => {
    setCurrentSong(song);
    setLearnMode(selectedMode);
    setHandFilter(selectedHand);
    onClose();
    closeWorkspace(); // Return to stage visualizer with practice loaded
    startSongPlayback(song, true);
  };

  // Generate automated advice for this piece
  const getSongCoachingTips = () => {
    if (song.id === 'ode_to_joy') {
      return "Focus on steady quarter-note pacing in 4/4 time. Ensure your 3rd finger on E4 remains stable during repeated notes, and hold each note through its full beat duration.";
    } else if (song.id === 'fur_elise') {
      return "The alternating semitone motif (E5 - D#5) requires light finger action. In Wait For Key mode, practice sustaining each 16th note cleanly without rushing into the octave jump to B4.";
    } else if (song.id === 'river_flows_in_you') {
      return "This piece demands expressive dynamics. Practice isolating the right-hand melody first at 75% tempo to get the lyrical phrasing before combining with the arpeggiated bass.";
    } else {
      return `For "${song.title}", begin in "Wait For Key" mode at 75% tempo. Hold each key firmly until the waterfall bar completes before releasing to develop rock-solid timing accuracy.`;
    }
  };

  // Ask MIRA with Gemini Relay endpoint
  const handleAskMiraPrompt = async (promptText: string) => {
    setMiraQuestion(promptText);
    setIsAskingMira(true);
    setMiraAnswer(null);

    const payloadPrompt = `You are MIRA (Musical Intelligence & Rhythm Assistant). The user is preparing to practice the song "${song.title}" by ${song.composer} (Difficulty: ${song.difficulty}, Key: ${song.key}, BPM: ${song.bpm}, ${song.notes.length} notes).
The user asks: "${promptText}".
Provide a concise, encouraging, highly practical piano learning tip (under 3 sentences).`;

    try {
      const relayRes = await sendPromptWithToken(payloadPrompt, geminiRelayUrl || 'http://127.0.0.1:8000', 14);
      if (relayRes && relayRes.text) {
        setMiraAnswer(relayRes.text);
      } else {
        setMiraAnswer(`MIRA Recommendation for ${song.title}: Start with 75% tempo in Wait For Key mode. Keep your fingers curved and maintain gentle arm weight across the key transitions.`);
      }
    } catch {
      setMiraAnswer(`MIRA Recommendation for ${song.title}: Start with 75% tempo in Wait For Key mode. Keep your fingers curved and maintain gentle arm weight across the key transitions.`);
    } finally {
      setIsAskingMira(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 select-none">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-850 flex items-center justify-between gap-3 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-sky-500/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {song.title}
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold shrink-0 ${difficultyColor}`}>
                  {song.difficulty}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                {song.composer} • {song.key} • {song.bpm} BPM • {song.notes.length} Notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAudioPreview}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPlayingAudioPreview
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm animate-pulse'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              }`}
              title="Preview audio melody"
            >
              {isPlayingAudioPreview ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-500" />}
              <span className="hidden sm:inline">{isPlayingAudioPreview ? 'Playing...' : 'Audio Preview'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          
          {/* Section 1: Practice Mode Selection */}
          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Select Practice Mode:</span>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                {selectedMode === 'wait_for_key' ? 'Note-by-note with held duration' : selectedMode === 'watch_listen' ? 'Synthesia audio preview' : 'Real-time tempo stream'}
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Wait For Key Mode */}
              <button
                onClick={() => setSelectedMode('wait_for_key')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 relative ${
                  selectedMode === 'wait_for_key'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Hand className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    Recommended
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                  Wait For Key
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Song pauses at each note until you strike and hold it through its full duration.
                </p>
              </button>

              {/* Watch & Listen Mode */}
              <button
                onClick={() => setSelectedMode('watch_listen')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  selectedMode === 'watch_listen'
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 shadow-sm ring-1 ring-amber-500/30'
                    : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                  Watch & Listen
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Continuous Synthesia waterfall bars with full audio playback.
                </p>
              </button>

              {/* Flow Mode */}
              <button
                onClick={() => setSelectedMode('flow')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  selectedMode === 'flow'
                    ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-500 shadow-sm ring-1 ring-purple-500/30'
                    : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                  Flow Mode
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Real-time tempo streaming with timing rating scoring.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Hand Filter & Tempo Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/80 dark:border-zinc-800/80">
            {/* Hand Isolation */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Hand Isolation:
              </span>
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
                {(['both', 'left', 'right'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setSelectedHand(h)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                      selectedHand === h
                        ? h === 'left' ? 'bg-sky-600 text-white shadow-xs' : h === 'right' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {h === 'both' ? 'Both Hands' : `${h} Hand`}
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo Scaling */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Practice Tempo:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">{tempoScale}% ({Math.round(song.bpm * (tempoScale / 100))} BPM)</span>
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                {[50, 75, 100, 110].map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setTempoScale(scale)}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      tempoScale === scale
                        ? 'bg-slate-900 dark:bg-zinc-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {scale}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: MIRA AI Song Suggestions & Ask MIRA */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-sky-500/10 border border-indigo-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  MIRA AI Practice Advice for "{song.title}"
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                Musical Coach
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
              {getSongCoachingTips()}
            </p>

            {/* MIRA Answer */}
            {miraAnswer && (
              <div className="p-3 rounded-xl bg-purple-50/90 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  MIRA:
                </p>
                <p>{miraAnswer}</p>
              </div>
            )}

            {/* Ask MIRA chips & input */}
            <div className="flex flex-col gap-2 pt-2 border-t border-indigo-500/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ask MIRA about this piece:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'What are the hardest parts of this song?',
                  'What fingerings should I use?',
                  'How should I practice rhythm?'
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleAskMiraPrompt(promptText)}
                    disabled={isAskingMira}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder={`Ask MIRA any question about "${song.title}"...`}
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
                  className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Performance History for This Song */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Your Performance History:</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {pastAttempts.length} previous {pastAttempts.length === 1 ? 'run' : 'runs'}
              </span>
            </span>

            {bestAttempt ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Best Score: {bestAttempt.accuracy_pct}% Accuracy
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {bestAttempt.correct_notes} Hits • Max Streak: {bestAttempt.max_streak || 0} • Latency: ±{bestAttempt.avg_deviation_ms}ms
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                    Completed
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50/60 dark:bg-zinc-900/40 border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-500">
                New piece! No attempts logged yet. Ready for your first practice run.
              </div>
            )}
          </div>

        </div>

        {/* Footer: Big Start Practice Button */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-850 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-zinc-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleLaunchPractice}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer group"
          >
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            <span>Start Practice ({selectedMode === 'wait_for_key' ? 'Wait For Key' : selectedMode === 'watch_listen' ? 'Watch' : 'Flow'})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
