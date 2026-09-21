import React, { useState, useRef } from 'react';
import { 
  Music, 
  GraduationCap, 
  Activity, 
  Play, 
  Upload, 
  Search, 
  Filter, 
  Clock, 
  FileMusic, 
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SongItem, SongNote } from '../../types';

export const SongsWorkspace: React.FC = () => {
  const { 
    songsList, 
    addSong, 
    selectSongAndLearn, 
    currentSong, 
    triggerNoteOn, 
    triggerNoteOff,
    closeWorkspace 
  } = useLightSyncStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');
  const [isDragging, setIsDragging] = useState(false);
  const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const demoTimersRef = useRef<number[]>([]);

  // Filter songs based on search and difficulty
  const filteredSongs = songsList.filter(song => {
    const matchesSearch = 
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.composer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = 
      difficultyFilter === 'All' || song.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  // Play short song demo in visualizer + synth
  const handlePlayDemo = (song: SongItem) => {
    // Clear any running demo
    demoTimersRef.current.forEach(t => clearTimeout(t));
    demoTimersRef.current = [];

    if (playingDemoId === song.id) {
      setPlayingDemoId(null);
      return;
    }

    setPlayingDemoId(song.id);

    const beatDurationMs = (60 / song.bpm) * 1000;
    const maxNotesToPlay = Math.min(song.notes.length, 32);

    for (let i = 0; i < maxNotesToPlay; i++) {
      const note = song.notes[i];
      const noteStartMs = note.time * beatDurationMs;
      const noteDurMs = Math.max(150, note.duration * beatDurationMs * 0.9);

      const onTimer = window.setTimeout(() => {
        triggerNoteOn(note.pitch, 95);
      }, noteStartMs);

      const offTimer = window.setTimeout(() => {
        triggerNoteOff(note.pitch);
      }, noteStartMs + noteDurMs);

      demoTimersRef.current.push(onTimer, offTimer);
    }

    // Stop demo indicator after piece completes
    const totalDurationMs = (song.notes[maxNotesToPlay - 1]?.time || 10) * beatDurationMs + 1000;
    const endTimer = window.setTimeout(() => {
      setPlayingDemoId(null);
    }, totalDurationMs);
    demoTimersRef.current.push(endTimer);
  };

  // Handle MIDI File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processMidiFile(file);
  };

  const processMidiFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) return;

        // Basic MIDI header and event parser for client-side demo import
        const title = file.name.replace(/\.(mid|midi)$/i, '').replace(/[-_]/g, ' ');
        const importedSong: SongItem = {
          id: `custom_${Date.now()}`,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          composer: 'User Import',
          difficulty: 'Intermediate',
          bpm: 120,
          time_signature: '4/4',
          key: 'C Major',
          notes: generateNotesFromBuffer(buffer)
        };

        addSong(importedSong);
        selectSongAndLearn(importedSong, 'follow');
      } catch (err) {
        console.error('Failed to parse MIDI file:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Fallback procedural note generator from MIDI bytes for preview
  const generateNotesFromBuffer = (buffer: ArrayBuffer): SongNote[] => {
    const bytes = new Uint8Array(buffer);
    const notes: SongNote[] = [];
    let currentTime = 0;
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    for (let i = 0; i < bytes.length && notes.length < 80; i++) {
      // Look for Note-On bytes (0x90)
      if ((bytes[i] & 0xf0) === 0x90 && i + 2 < bytes.length) {
        const pitch = bytes[i + 1];
        const velocity = bytes[i + 2];
        if (pitch >= 21 && pitch <= 108 && velocity > 0) {
          notes.push({
            pitch,
            name: `${noteNames[pitch % 12]}${Math.floor(pitch / 12) - 1}`,
            time: currentTime,
            duration: 1.0,
            hand: pitch >= 60 ? 'right' : 'left'
          });
          currentTime += 1.0;
        }
      }
    }

    if (notes.length === 0) {
      // Fallback scale if parsing sparse file
      return [
        { pitch: 60, name: 'C4', time: 0, duration: 1.0, hand: 'right' },
        { pitch: 62, name: 'D4', time: 1, duration: 1.0, hand: 'right' },
        { pitch: 64, name: 'E4', time: 2, duration: 1.0, hand: 'right' },
        { pitch: 65, name: 'F4', time: 3, duration: 1.0, hand: 'right' },
        { pitch: 67, name: 'G4', time: 4, duration: 1.0, hand: 'right' },
      ];
    }
    return notes;
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Top Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search piece, composer, or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {/* Difficulty Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mr-1 hidden sm:inline">
            Level:
          </span>
          {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficultyFilter(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                difficultyFilter === level
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* MIDI Import Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".mid,.midi"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import MIDI (.mid)</span>
          </button>
        </div>

      </div>

      {/* Song Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map((song) => {
          const isCurrent = currentSong?.id === song.id;
          const isPlaying = playingDemoId === song.id;

          const difficultyBadgeColor = 
            song.difficulty === 'Beginner' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
            song.difficulty === 'Intermediate' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
            'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';

          return (
            <div
              key={song.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                isCurrent
                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                  : 'bg-white dark:bg-black/60 border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm'
              }`}
            >
              {/* Header Info */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      {song.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      {song.composer}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold shrink-0 ${difficultyBadgeColor}`}>
                    {song.difficulty}
                  </span>
                </div>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">{song.key}</span>
                  </span>
                  <span>•</span>
                  <span>{song.bpm} BPM</span>
                  <span>•</span>
                  <span>{song.time_signature}</span>
                  <span>•</span>
                  <span>{song.notes.length} notes</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-850">
                {/* Learn / Follow Button */}
                <button
                  onClick={() => selectSongAndLearn(song, 'follow')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  title="Open in interactive Learn & Follow mode"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Learn</span>
                </button>

                {/* Practice Button */}
                <button
                  onClick={() => selectSongAndLearn(song, 'practice')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold border border-slate-200/80 dark:border-zinc-800 transition-all cursor-pointer"
                  title="Open targeted drills & sub-tempo practice"
                >
                  <Activity className="w-3.5 h-3.5 text-sky-500" />
                  <span>Practice</span>
                </button>

                {/* Demo Listen Button */}
                <button
                  onClick={() => handlePlayDemo(song)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border-slate-200/80 dark:border-zinc-800'
                  }`}
                  title={isPlaying ? 'Stop Demo' : 'Preview Demo in Visualizer'}
                >
                  <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-current' : ''}`} />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {filteredSongs.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-zinc-600">
          <FileMusic className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">No matching songs found</p>
          <p className="text-xs mt-1">Try adjusting your search query or upload a custom MIDI file.</p>
        </div>
      )}

    </div>
  );
};
