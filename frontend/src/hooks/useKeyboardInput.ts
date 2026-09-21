import { useEffect } from 'react';
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
  const { triggerNoteOn, triggerNoteOff, octaveShift, toggleSustain } = useLightSyncStore();

  useEffect(() => {
    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleSustain();
        return;
      }

      const key = e.key.toLowerCase();
      if (key in QWERTY_MAP && !activeKeys.has(key)) {
        activeKeys.add(key);
        // Base C4 is MIDI 60
        const basePitch = 60 + octaveShift * 12;
        const pitch = basePitch + QWERTY_MAP[key];
        triggerNoteOn(pitch, 100);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key in QWERTY_MAP && activeKeys.has(key)) {
        activeKeys.delete(key);
        const basePitch = 60 + octaveShift * 12;
        const pitch = basePitch + QWERTY_MAP[key];
        triggerNoteOff(pitch);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [octaveShift, triggerNoteOn, triggerNoteOff, toggleSustain]);
};
