import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Music, 
  GraduationCap, 
  Activity, 
  Play, 
  Square,
  Upload, 
  Search, 
  Filter, 
  Clock, 
  FileMusic, 
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Folder,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Eye,
  CircleDot,
  Trophy,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  ListFilter
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { SongItem, SongNote } from '../../types';
import { SongPracticeHubModal } from './SongPracticeHubModal';
import { SaveRecordingModal } from './SaveRecordingModal';

export const SongsWorkspace: React.FC = () => {
  const { 
    songsList, 
    addSong, 
    selectSongAndLearn, 
    currentSong, 
    setCurrentSong,
    isSongPlaying,
    setIsSongPlaying,
    startSongPlayback,
    stopSongPlayback,
    isRecording,
    startRecording,
    stopRecordingAndPrompt,
    showSaveRecordingModal,
    closeSaveRecordingModal,
    triggerNoteOn, 
    triggerNoteOff,
    closeWorkspace,
    setLearnMode,
    midiFolderPath,
    isScanningMidi,
    fetchSongs,
    rescanMidiFolder,
    uploadMidiFile,
    deleteMidiSong,
    sessionHistory
  } = useLightSyncStore();

  const handleWatchAndListen = (song: SongItem) => {
    setLearnMode('watch_listen');
    startSongPlayback(song, true);
    closeWorkspace();
  };

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Beginner' | 'Intermediate' | 'Advanced'>('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'curated' | 'local_midi'>('All');
  const [sortBy, setSortBy] = useState<'title' | 'notes' | 'bpm' | 'difficulty'>('title');
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const demoTimersRef = useRef<number[]>([]);
  const [selectedPracticeSong, setSelectedPracticeSong] = useState<SongItem | null>(null);

  // Auto-fetch songs on mount
  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Filter & sort songs
  const filteredSongs = useMemo(() => {
    const list = songsList.filter(song => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        song.title.toLowerCase().includes(query) ||
        song.composer.toLowerCase().includes(query) ||
        song.key.toLowerCase().includes(query) ||
        (song.filename && song.filename.toLowerCase().includes(query));
      
      const matchesDifficulty = 
        difficultyFilter === 'All' || song.difficulty === difficultyFilter;

      const matchesSource = 
        sourceFilter === 'All' || 
        (sourceFilter === 'curated' && (song.source === 'curated' || !song.source)) ||
        (sourceFilter === 'local_midi' && (song.source === 'local_midi' || song.source === 'imported'));

      return matchesSearch && matchesDifficulty && matchesSource;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'notes') {
        return (b.notes?.length || 0) - (a.notes?.length || 0);
      } else if (sortBy === 'bpm') {
        return b.bpm - a.bpm;
      } else if (sortBy === 'difficulty') {
        const order: Record<string, number> = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
        return (order[a.difficulty] || 0) - (order[b.difficulty] || 0);
      }
      return 0;
    });
  }, [songsList, searchQuery, difficultyFilter, sourceFilter, sortBy]);

  // Copy MIDI folder path
  const handleCopyPath = () => {
    const path = midiFolderPath || 'backend/data/midi';
    navigator.clipboard.writeText(path).then(() => {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    });
  };

  // Play short song demo in visualizer + synth
  const handlePlayDemo = (song: SongItem) => {
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

    const totalDurationMs = (song.notes[maxNotesToPlay - 1]?.time || 10) * beatDurationMs + 1000;
    const endTimer = window.setTimeout(() => {
      setPlayingDemoId(null);
    }, totalDurationMs);
    demoTimersRef.current.push(endTimer);
  };

  // Process MIDI file upload
  const handleImportFile = async (file: File) => {
    if (!file.name.match(/\.(mid|midi)$/i)) {
      alert('Please select a valid .mid or .midi file.');
      return;
    }

    const uploadedSong = await uploadMidiFile(file);
    if (uploadedSong) {
      selectSongAndLearn(uploadedSong, 'follow');
      return;
    }

    processMidiFileClient(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImportFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImportFile(files[0]);
    }
  };

  // Client-side parser fallback
  const processMidiFileClient = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) return;

        const title = file.name.replace(/\.(mid|midi)$/i, '').replace(/[-_]/g, ' ');
        const importedSong: SongItem = {
          id: `custom_${Date.now()}`,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          composer: 'User Import',
          difficulty: 'Intermediate',
          bpm: 120,
          time_signature: '4/4',
          key: 'C Major',
          source: 'imported',
          filename: file.name,
          notes: generateNotesFromBuffer(buffer)
        };

        addSong(importedSong);
        selectSongAndLearn(importedSong, 'follow');
      } catch (err) {
        console.error('Failed to parse MIDI file client-side:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const generateNotesFromBuffer = (buffer: ArrayBuffer): SongNote[] => {
    const bytes = new Uint8Array(buffer);
    const notes: SongNote[] = [];
    let currentTime = 0;
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    for (let i = 0; i < bytes.length && notes.length < 80; i++) {
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
    <div 
      className={`flex flex-col gap-4 relative transition-all ${
        isDraggingOver ? 'ring-2 ring-indigo-500 rounded-3xl bg-indigo-50/20 dark:bg-indigo-950/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 rounded-3xl border-2 border-dashed border-indigo-500 bg-slate-900/90 flex flex-col items-center justify-center text-white pointer-events-none gap-2">
          <Upload className="w-10 h-10 text-indigo-400 animate-bounce" />
          <p className="text-base font-bold">Drop MIDI (.mid / .midi) file to import</p>
          <p className="text-xs text-slate-300">File will be added to your backend MIDI library</p>
        </div>
      )}

      {/* Backend Media Folder Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800/90 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Folder className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
              <span>Backend MIDI Folder</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                Auto-scanned ({songsList.length} total)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-mono mt-0.5" title={midiFolderPath || 'backend/data/midi'}>
              {midiFolderPath || 'backend/data/midi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={handleCopyPath}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Copy MIDI folder path"
          >
            {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPath ? 'Copied!' : 'Copy Path'}</span>
          </button>

          <button
            onClick={() => rescanMidiFolder()}
            disabled={isScanningMidi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Rescan folder for newly dropped MIDI files"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanningMidi ? 'animate-spin' : ''}`} />
            <span>{isScanningMidi ? 'Scanning...' : 'Rescan Folder'}</span>
          </button>
        </div>
      </div>

      {/* Top Search, Filter & View Controls */}
      <div className="flex flex-col gap-3 pb-2 border-b border-slate-200 dark:border-zinc-800">
        
        {/* Row 1: Search Bar & Primary Actions */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by piece title, composer, key, or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          {/* Buttons: Record & Import */}
          <div className="flex items-center gap-2 shrink-0">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-zinc-300 hover:text-rose-600 border border-slate-200 dark:border-zinc-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Record live MIDI session into .mid"
              >
                <CircleDot className="w-3.5 h-3.5 text-rose-500" />
                <span>Record .mid</span>
              </button>
            ) : (
              <button
                onClick={() => stopRecordingAndPrompt()}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer animate-pulse"
                title="Stop live recording and prompt save"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Finish Recording</span>
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".mid,.midi"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import MIDI</span>
            </button>
          </div>

        </div>

        {/* Row 2: Filter Tabs, Sort, & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Left: Source & Difficulty Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Source Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200/80 dark:border-zinc-800">
              {(['All', 'local_midi', 'curated'] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    sourceFilter === src
                      ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {src === 'All' ? 'All Songs' : src === 'local_midi' ? 'Local MIDI' : 'Curated'}
                </button>
              ))}
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-1">
              {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficultyFilter(level)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    difficultyFilter === level
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

          </div>

          {/* Right: Sort By & View Mode Switcher */}
          <div className="flex items-center gap-3">
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="title">Sort: Title (A-Z)</option>
                <option value="notes">Sort: Note Count</option>
                <option value="bpm">Sort: Tempo (BPM)</option>
                <option value="difficulty">Sort: Difficulty</option>
              </select>
            </div>

            {/* View Mode Toggle: List (Default) vs Grid */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200/80 dark:border-zinc-800">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                }`}
                title="Table List View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Showing counter */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 px-1">
        <span>Showing {filteredSongs.length} of {songsList.length} songs</span>
        {searchQuery && <span>Filter active: &quot;{searchQuery}&quot;</span>}
      </div>

      {/* LIST VIEW (Table Layout) */}
      {viewMode === 'list' && (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/60 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* Table Header */}
            <thead className="sticky top-0 z-10 shadow-xs">
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4">Song Title & Composer</th>
                <th className="py-3 px-3">Key & BPM</th>
                <th className="py-3 px-3">Difficulty</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
              {filteredSongs.map((song, index) => {
                const isCurrent = currentSong?.id === song.id;
                const isLocalOrImported = song.source === 'local_midi' || song.source === 'imported';
                const isPlayingDemo = playingDemoId === song.id;

                const songAttempts = sessionHistory.filter(s => s.song_id === song.id);
                const bestAttempt = songAttempts.length > 0 
                  ? [...songAttempts].sort((a, b) => b.accuracy_pct - a.accuracy_pct)[0] 
                  : null;

                const difficultyBadgeColor = 
                  song.difficulty === 'Beginner' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                  song.difficulty === 'Intermediate' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                  'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';

                return (
                  <tr 
                    key={song.id}
                    className={`transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 ${
                      isCurrent ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    
                    {/* Index & Demo Play */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handlePlayDemo(song)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isPlayingDemo 
                            ? 'bg-amber-500 text-white animate-pulse' 
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                        title="Play 10-second stage preview demo"
                      >
                        {isPlayingDemo ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                      </button>
                    </td>

                    {/* Title & Composer */}
                    <td className="py-3 px-4 min-w-[220px]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white tracking-tight" title={song.title}>
                            {song.title}
                          </span>
                          {bestAttempt && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-0.5">
                              <Trophy className="w-2.5 h-2.5" />
                              <span>{bestAttempt.accuracy_pct}%</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-[11px] mt-0.5">
                          <span>{song.composer}</span>
                          {song.filename && (
                            <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-[160px]" title={song.filename}>
                              • {song.filename}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Key & BPM */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-zinc-300">
                      <div>{song.key}</div>
                      <div className="text-[10px] text-slate-400">{song.bpm} BPM • {song.time_signature}</div>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${difficultyBadgeColor}`}>
                        {song.difficulty}
                      </span>
                    </td>

                    {/* Notes count */}
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-zinc-300">
                      {song.notes?.length || 0} notes
                    </td>

                    {/* Source Badge */}
                    <td className="py-3 px-3">
                      {song.source === 'local_midi' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800">
                          Local MIDI
                        </span>
                      )}
                      {song.source === 'imported' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                          Imported
                        </span>
                      )}
                      {(song.source === 'curated' || !song.source) && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700">
                          Curated
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Practice with MIRA Primary */}
                        <button
                          onClick={() => setSelectedPracticeSong(song)}
                          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          title="Open MIRA Practice Hub"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Practice</span>
                        </button>

                        {/* Watch */}
                        <button
                          onClick={() => handleWatchAndListen(song)}
                          className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          title="Watch falling note visualization"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Watch</span>
                        </button>

                        {/* Learn */}
                        <button
                          onClick={() => selectSongAndLearn(song, 'follow')}
                          className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                          title="Open Interactive Follow Mode"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Learn</span>
                        </button>

                        {/* Delete for local/imported */}
                        {isLocalOrImported && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remove "${song.title}" from library?`)) {
                                deleteMidiSong(song.id);
                              }
                            }}
                            className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* GRID VIEW (Cards Layout) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map((song) => {
            const isCurrent = currentSong?.id === song.id;
            const isLocalOrImported = song.source === 'local_midi' || song.source === 'imported';

            const songAttempts = sessionHistory.filter(s => s.song_id === song.id);
            const bestAttempt = songAttempts.length > 0 
              ? [...songAttempts].sort((a, b) => b.accuracy_pct - a.accuracy_pct)[0] 
              : null;

            const difficultyBadgeColor = 
              song.difficulty === 'Beginner' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
              song.difficulty === 'Intermediate' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
              'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';

            return (
              <div
                key={song.id}
                className={`p-4 rounded-2xl border transition-colors duration-150 flex flex-col justify-between gap-4 relative group ${
                  isCurrent
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-white dark:bg-black/60 border-slate-200/90 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate" title={song.title}>
                        {song.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                        {song.composer}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {bestAttempt && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <Trophy className="w-2.5 h-2.5 text-amber-500" />
                          <span>{bestAttempt.accuracy_pct}%</span>
                        </span>
                      )}
                      {song.source === 'local_midi' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                          <Folder className="w-2.5 h-2.5" />
                          <span>Local MIDI</span>
                        </span>
                      )}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold shrink-0 ${difficultyBadgeColor}`}>
                        {song.difficulty}
                      </span>
                    </div>
                  </div>

                  {song.filename && (
                    <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate mt-1">
                      📁 {song.filename}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">{song.key}</span>
                    <span>•</span>
                    <span>{song.bpm} BPM</span>
                    <span>•</span>
                    <span>{song.notes?.length || 0} notes</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-zinc-850">
                  <button
                    onClick={() => setSelectedPracticeSong(song)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer group"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Practice with MIRA</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleWatchAndListen(song)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Watch</span>
                    </button>

                    <button
                      onClick={() => selectSongAndLearn(song, 'follow')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Learn</span>
                    </button>

                    {isLocalOrImported && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove "${song.title}" from library?`)) {
                            deleteMidiSong(song.id);
                          }
                        }}
                        className="p-1.5 rounded-xl border border-rose-200/60 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredSongs.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-zinc-600">
          <FileMusic className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">No matching songs found</p>
          <p className="text-xs mt-1">Try adjusting your filters, drop a .mid file here, or copy .mid files to your MIDI folder.</p>
        </div>
      )}

      {/* Song Practice & MIRA Hub Modal */}
      <SongPracticeHubModal 
        song={selectedPracticeSong} 
        onClose={() => setSelectedPracticeSong(null)} 
      />

      {/* Save Recording Confirmation Modal */}
      <SaveRecordingModal
        isOpen={showSaveRecordingModal}
        onClose={closeSaveRecordingModal}
      />

    </div>
  );
};
