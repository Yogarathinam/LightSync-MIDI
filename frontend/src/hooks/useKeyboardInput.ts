import { useEffect, useRef } from 'react';
import { useLightSyncStore } from '../store/useLightSyncStore';

const QWERTY_MAP: Record<string, number> = {
  'a': 0,   // C
  'w': 1,   // C#
  's': 2,   // D
  'e': 3,   // D#
  'd': 4,   // E
  'f': 5,   // F
  't': 6,   // F#
  'g': 7,   // G
  'y': 8,   // G#
  'h': 9,   // A
  'u': 10,  // A#
  'j': 11,  // B
  'k': 12,  // C+1
  'o': 13,  // C#+1
  'l': 14,  // D+1
  'p': 15,  // D#+1
  ';': 16   // E+1
};

export const useKeyboardInput = () => {
  const { 
    triggerNoteOn, 
    triggerNoteOff, 
    octaveShift, 
    toggleSustain,
    currentSong,
    isSongPlaying,
    startSongPlayback,
    stopSongPlayback,
    playbackBeat,
    playbackTotalBeats,
    seekToBeat
  } = useLightSyncStore();

  const octaveShiftRef = useRef(octaveShift);
  octaveShiftRef.current = octaveShift;
  const triggerNoteOnRef = useRef(triggerNoteOn);
  triggerNoteOnRef.current = triggerNoteOn;
  const triggerNoteOffRef = useRef(triggerNoteOff);
  triggerNoteOffRef.current = triggerNoteOff;
  const toggleSustainRef = useRef(toggleSustain);
  toggleSustainRef.current = toggleSustain;

  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const isSongPlayingRef = useRef(isSongPlaying);
  isSongPlayingRef.current = isSongPlaying;
  const playbackBeatRef = useRef(playbackBeat);
  playbackBeatRef.current = playbackBeat;
  const playbackTotalBeatsRef = useRef(playbackTotalBeats);
  playbackTotalBeatsRef.current = playbackTotalBeats;

  const activeWorkspace = useLightSyncStore((s) => s.activeWorkspace);
  const activeWorkspaceRef = useRef(activeWorkspace);
  activeWorkspaceRef.current = activeWorkspace;

  useEffect(() => {
    // Map key string -> actual played pitch (so pitch changes don't orphan held keys)
    const activeKeysPitchMap = new Map<string, number>();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isSongContext = isSongPlayingRef.current || activeWorkspaceRef.current === 'songs' || activeWorkspaceRef.current === 'learn';

      // Spacebar: Play / Pause toggle when song is playing or in song/learn workspace; otherwise toggles sustain in normal play mode
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (target && target.tagName === 'BUTTON') {
          target.blur();
        }
        if (isSongContext && currentSongRef.current) {
          if (isSongPlayingRef.current) {
            stopSongPlayback();
          } else {
            startSongPlayback(currentSongRef.current);
          }
        } else {
          toggleSustainRef.current();
        }
        return;
      }

      // ArrowLeft: Step backward in song (only active in song/learn context)
      if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        if (isSongContext && currentSongRef.current) {
          e.preventDefault();
          if (target && target.tagName === 'BUTTON') {
            target.blur();
          }
          const step = e.shiftKey ? 1 : 4;
          const newBeat = Math.max(0, playbackBeatRef.current - step);
          seekToBeat(newBeat);
          return;
        }
      }

      // ArrowRight: Step forward in song (only active in song/learn context)
      if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        if (isSongContext && currentSongRef.current) {
          e.preventDefault();
          if (target && target.tagName === 'BUTTON') {
            target.blur();
          }
          const maxBeats = playbackTotalBeatsRef.current || 100;
          const step = e.shiftKey ? 1 : 4;
          const newBeat = Math.min(maxBeats, playbackBeatRef.current + step);
          seekToBeat(newBeat);
          return;
        }
      }

      if (e.repeat) return;

      const key = e.key.toLowerCase();
      if (key in QWERTY_MAP && !activeKeysPitchMap.has(key)) {
        // Base C4 is MIDI 60
        const basePitch = 60 + octaveShiftRef.current * 12;
        const pitch = basePitch + QWERTY_MAP[key];
        activeKeysPitchMap.set(key, pitch);
        triggerNoteOnRef.current(pitch, 100);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (activeKeysPitchMap.has(key)) {
        const pitch = activeKeysPitchMap.get(key)!;
        activeKeysPitchMap.delete(key);
        triggerNoteOffRef.current(pitch);
      }
    };

    // Release all held notes when window loses focus (e.g. alt-tab or click away)
    const handleBlur = () => {
      activeKeysPitchMap.forEach((pitch) => {
        triggerNoteOffRef.current(pitch);
      });
      activeKeysPitchMap.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      handleBlur();
    };
  }, []);
};
