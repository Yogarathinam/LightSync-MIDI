import React, { useState, useEffect } from 'react';
import { 
  CircleDot, 
  Save, 
  Download, 
  Trash2, 
  Play, 
  Square, 
  Clock, 
  Music, 
  Sparkles, 
  X,
  Check
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { RecordedMidiEvent } from '../../types';

interface SaveRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveRecordingModal: React.FC<SaveRecordingModalProps> = ({ isOpen, onClose }) => {
  const { 
    recordedEvents, 
    isPlayingRecording, 
    playRecording, 
    stopPlayback, 
    downloadRecording, 
    saveRecordingAsSong,
    stopRecording
  } = useLightSyncStore();

  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState(120);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const defaultName = `My Recording ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setTitle(defaultName);
      setIsSaving(false);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalEvents = recordedEvents.length;
  const noteOnEvents = recordedEvents.filter(e => e.type === 'note_on' && e.velocity > 0);
  const lastEventMs = recordedEvents.length > 0 ? recordedEvents[recordedEvents.length - 1].time_ms : 0;
  const durationSec = (lastEventMs / 1000).toFixed(1);

  const handleSaveToLibrary = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await saveRecordingAsSong(title.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Failed to save recording as song:', e);
      setIsSaving(false);
    }
  };

  const handleDownloadFile = () => {
    const filename = `${title.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'recording'}.mid`;
    downloadRecording(filename);
  };

  const handleDiscard = () => {
    if (confirm('Discard this MIDI recording? The recorded notes will be deleted.')) {
      stopPlayback();
      useLightSyncStore.setState({ recordedEvents: [] });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <CircleDot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Recording Complete
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Confirm title to save in library or download .mid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5">
          
          {/* Metrics summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Duration</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-zinc-100 font-mono mt-0.5">{durationSec}s</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Total Notes</span>
              <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{noteOnEvents.length}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">MIDI Events</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{totalEvents}</span>
            </div>
          </div>

          {/* Title & BPM Inputs */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Recording Name / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Piano Improvisation 1"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Playback Tempo (BPM)
                </label>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 text-xs font-semibold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Preview listen button */}
              <div className="flex flex-col justify-end">
                <span className="block text-xs font-semibold text-transparent mb-1">Listen</span>
                <button
                  onClick={isPlayingRecording ? stopPlayback : playRecording}
                  disabled={totalEvents === 0}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isPlayingRecording 
                      ? 'bg-amber-500 text-white shadow-xs' 
                      : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
                  }`}
                >
                  {isPlayingRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlayingRecording ? 'Stop Preview' : 'Listen Back'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 dark:bg-zinc-900/80 border-t border-slate-100 dark:border-zinc-800/80">
          
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer"
            title="Discard recording without saving"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadFile}
              disabled={totalEvents === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Download standard MIDI (.mid) file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .mid</span>
            </button>

            <button
              onClick={handleSaveToLibrary}
              disabled={isSaving || totalEvents === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved to Library!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save to Library'}</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
