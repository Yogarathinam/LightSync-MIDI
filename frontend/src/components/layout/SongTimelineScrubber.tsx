import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause,
  Square, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Music, 
  Clock, 
  Sparkles,
  Repeat
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';

interface SongTimelineScrubberProps {
  compact?: boolean;
  showPieceTitle?: boolean;
  className?: string;
}

export const SongTimelineScrubber: React.FC<SongTimelineScrubberProps> = ({
  compact = false,
  showPieceTitle = true,
  className = ''
}) => {
  const {
    currentSong,
    isSongPlaying,
    startSongPlayback,
    stopSongPlayback,
    playbackBeat,
    playbackTotalBeats,
    seekToBeat
  } = useLightSyncStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragBeat, setDragBeat] = useState(playbackBeat);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  // Sync dragBeat when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragBeat(playbackBeat);
    }
  }, [playbackBeat, isDragging]);

  if (!currentSong) return null;

  const bpm = currentSong.bpm || 120;
  const beatsPerSecond = bpm / 60;
  const effectiveTotalBeats = Math.max(
    1,
    playbackTotalBeats || 
    (currentSong.notes.length > 0 
      ? Math.max(...currentSong.notes.map(n => n.time + n.duration)) 
      : 32)
  );

  const displayBeat = isDragging ? dragBeat : playbackBeat;
  const currentSeconds = Math.max(0, displayBeat / beatsPerSecond);
  const totalSeconds = Math.max(1, effectiveTotalBeats / beatsPerSecond);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (displayBeat / effectiveTotalBeats) * 100));
  const currentMeasure = Math.floor(displayBeat / 4) + 1;
  const currentBeatInMeasure = (Math.floor(displayBeat) % 4) + 1;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && e.type !== 'pointerdown') return;
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newBeat = ratio * effectiveTotalBeats;
    setDragBeat(newBeat);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    seekToBeat(dragBeat);
  };

  const handleSkip = (deltaBeats: number) => {
    const newBeat = Math.max(0, Math.min(effectiveTotalBeats, playbackBeat + deltaBeats));
    seekToBeat(newBeat);
  };

  const handleTogglePlay = () => {
    if (isSongPlaying) {
      stopSongPlayback();
    } else {
      startSongPlayback(currentSong);
    }
  };

  return (
    <div 
      className={`select-none rounded-2xl bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl p-2 sm:px-3.5 sm:py-2 flex flex-col gap-1.5 transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        
        {/* Left: Play/Pause, Rewind, Skip Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleTogglePlay}
            className={`p-1.5 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              isSongPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
            title={isSongPlaying ? 'Pause Playback (Space)' : 'Play Song (Space)'}
          >
            {isSongPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          <button
            onClick={() => seekToBeat(0)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
            title="Restart piece from beginning (Beat 0)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleSkip(-4)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
            title="Rewind 1 measure / -4 beats (Left Arrow)"
          >
            <SkipBack className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleSkip(4)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 transition-all cursor-pointer"
            title="Forward 1 measure / +4 beats (Right Arrow)"
          >
            <SkipForward className="w-3 h-3" />
          </button>
        </div>

        {/* Center: Piece Title & Measure readout */}
        {showPieceTitle && (
          <div className="hidden sm:flex items-center gap-2 truncate text-center">
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {currentSong.title}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60 font-semibold shrink-0">
              Measure {currentMeasure}.{currentBeatInMeasure}
            </span>
          </div>
        )}

        {/* Right: Timestamp Clock */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400 shrink-0">
          <span className="text-indigo-600 dark:text-indigo-400">
            {formatTime(currentSeconds)}
          </span>
          <span>/</span>
          <span>{formatTime(totalSeconds)}</span>
        </div>

      </div>

      {/* Scrubber Track with Drag & Scrubbing interaction */}
      <div 
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-3.5 py-1 cursor-pointer touch-none group flex items-center relative"
        title="Click or drag to scrub forward / reverse"
      >
        {/* Background Track */}
        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden relative">
          {/* Active Gradient Fill */}
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-teal-500 to-emerald-500 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Draggable Scrubber Thumb */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-100 border-2 border-indigo-600 shadow-md transition-transform pointer-events-none ${
            isDragging ? 'scale-125' : 'group-hover:scale-110'
          }`}
          style={{ left: `${progressPercent}%` }}
        />
      </div>

    </div>
  );
};
