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
  const { triggerNoteOn, triggerNoteOff, octaveShift, toggleSustain } = useLightSyncStore();
  const octaveShiftRef = useRef(octaveShift);
  octaveShiftRef.current = octaveShift;

  const triggerNoteOnRef = useRef(triggerNoteOn);
  triggerNoteOnRef.current = triggerNoteOn;
  const triggerNoteOffRef = useRef(triggerNoteOff);
  triggerNoteOffRef.current = triggerNoteOff;
  const toggleSustainRef = useRef(toggleSustain);
  toggleSustainRef.current = toggleSustain;

  useEffect(() => {
    // Map key string -> actual played pitch (so pitch changes don't orphan held keys)
    const activeKeysPitchMap = new Map<string, number>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleSustainRef.current();
        return;
      }

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
