import { useEffect, useRef } from 'react';
import { useLightSyncStore } from '../store/useLightSyncStore';

export const useWebMidi = () => {
  const { triggerNoteOn, triggerNoteOff } = useLightSyncStore();
  const midiAccessRef = useRef<any>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      return;
    }

    let isMounted = true;

    navigator.requestMIDIAccess({ sysex: false })
      .then((access: any) => {
        if (!isMounted) return;
        midiAccessRef.current = access;

        const updateInputs = () => {
          const inputs = Array.from(access.inputs.values()) as any[];
          if (inputs.length > 0) {
            const portNames = inputs.map((i: any) => i.name || 'MIDI Controller');
            const state = useLightSyncStore.getState();
            if (!state.isMidiConnected) {
              useLightSyncStore.setState({
                activeMidiPort: portNames[0],
                isMidiConnected: true,
                midiPorts: Array.from(new Set([...state.midiPorts, ...portNames]))
              });
              state.addConsoleLog(`WebMIDI Ingest Connected: ${portNames[0]}`);
            }
          }

          inputs.forEach((input: any) => {
            input.onmidimessage = (event: any) => {
              const data = event.data;
              if (!data || data.length < 2) return;
              const status = data[0];
              const pitch = data[1];
              const velocity = data.length > 2 ? data[2] : 0;
              const msgType = status & 0xf0;

              if (msgType === 0x90) {
                if (velocity > 0) {
                  triggerNoteOn(pitch, velocity, true, input.name || 'Physical MIDI');
                } else {
                  triggerNoteOff(pitch, true, input.name || 'Physical MIDI');
                }
              } else if (msgType === 0x80) {
                triggerNoteOff(pitch, true, input.name || 'Physical MIDI');
              }
            };
          });
        };

        updateInputs();
        access.onstatechange = () => {
          updateInputs();
        };
      })
      .catch((err) => {
        console.debug('WebMIDI unavailable or permission not granted:', err);
      });

    return () => {
      isMounted = false;
      if (midiAccessRef.current) {
        try {
          const inputs = Array.from(midiAccessRef.current.inputs.values()) as any[];
          inputs.forEach((input: any) => {
            input.onmidimessage = null;
          });
        } catch {}
      }
    };
  }, [triggerNoteOn, triggerNoteOff]);
};
