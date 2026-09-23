import { useEffect, useRef } from 'react';
import { useLightSyncStore } from '../store/useLightSyncStore';

export const useWebSocketBridge = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const {
    triggerNoteOn,
    triggerNoteOff,
    setDeviceStatus,
    addConsoleLog,
    setWsSender,
    setAiCoachFeedback,
    addSessionResult,
    setCurrentChord
  } = useLightSyncStore();

  useEffect(() => {
    const connect = () => {
      // Connect to relative /ws or absolute 127.0.0.1:8765/ws
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '5173' ? '127.0.0.1:8765' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        addConsoleLog(`Connected to LightSync Desktop Core via WebSocket`);
        setDeviceStatus({ connected: true });

        // Provide sender callback to Zustand store
        setWsSender((msg: object) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
          }
        });

        // Send initial octave shift & transpose settings to backend
        const state = useLightSyncStore.getState();
        ws.send(JSON.stringify({ type: 'OCTAVE_SHIFT_CHANGED', octave_shift: state.octaveShift }));
        ws.send(JSON.stringify({ type: 'TRANSPOSE_CHANGED', transpose: state.transpose }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === 'NOTE_ON') {
            triggerNoteOn(data.pitch, data.velocity, false, data.source || 'MIDI In (USB)');
            if (data.chord) setCurrentChord(data.chord);
          } else if (type === 'NOTE_OFF') {
            triggerNoteOff(data.pitch, false, data.source || 'MIDI In (USB)');
            if (data.chord) setCurrentChord(data.chord);
          } else if (type === 'DEVICE_STATUS') {
            setDeviceStatus({
              connected: data.connected,
              port: data.port,
              simulated: data.simulated
            });
            addConsoleLog(`Device Status: ${data.connected ? 'Connected' : 'Disconnected'} (${data.port || 'None'})`);
          } else if (type === 'MIDI_STATUS') {
            useLightSyncStore.setState({
              activeMidiPort: data.port || null,
              isMidiConnected: data.connected
            });
            addConsoleLog(`MIDI Status: ${data.connected ? 'Connected' : 'Disconnected'} (${data.port || 'None'})`);
          } else if (type === 'MIDI_PORTS_CHANGED') {
            useLightSyncStore.setState({
              midiPorts: data.ports || [],
              activeMidiPort: data.active || null,
              isMidiConnected: !!data.active
            });
            addConsoleLog(`MIDI Devices Updated: ${(data.ports || []).join(', ') || 'None'}`);
          } else if (type === 'SESSION_RESULT') {
            if (data.summary) addSessionResult(data.summary);
            if (data.coach) setAiCoachFeedback(data.coach);
          } else if (type === 'INITIAL_STATE') {
            if (data.device) setDeviceStatus(data.device);
            if (data.active_midi) {
              useLightSyncStore.setState({ activeMidiPort: data.active_midi, isMidiConnected: true });
            }
          } else if (type === 'PONG') {
            setDeviceStatus({ latency_ms: data.latency_ms || 1 });
          } else if (type === 'M5_HARDWARE_EVENT') {
            const ev = data.event;
            const val = data.value;
            addConsoleLog(`M5 Hardware Event: ${ev} ${val || ''}`);

            if (ev === 'EFFECT_CHANGED' && val) {
              const effLower = val.toLowerCase().trim();
              let matchedEff: any = 'static';
              if (effLower.includes('static') || effLower.includes('blink')) matchedEff = 'static';
              else if (effLower.includes('bounce')) matchedEff = 'bounce';
              else if (effLower.includes('ripple')) matchedEff = 'ripple';
              else if (effLower.includes('pulse')) matchedEff = 'pulse';
              else if (effLower.includes('hold')) matchedEff = 'hold_beam';
              else if (effLower.includes('glitch')) matchedEff = 'glitch';
              else if (effLower.includes('spark')) matchedEff = 'spark';
              else if (effLower.includes('sprinkle')) matchedEff = 'sprinkle';
              else if (effLower.includes('rain')) matchedEff = 'rain';
              else if (effLower.includes('wave')) matchedEff = 'wave';
              useLightSyncStore.getState().setEffectParam('effect', matchedEff);
            } else if (ev === 'BRIGHTNESS_CHANGED' && val) {
              const b = parseInt(val, 10);
              if (!isNaN(b)) {
                useLightSyncStore.getState().setEffectParam('brightness', b);
              }
            } else if (ev === 'SPEED_CHANGED' && val) {
              const spd = parseFloat(val);
              if (!isNaN(spd)) {
                useLightSyncStore.getState().setEffectParam('speed', spd);
              }
            } else if (ev === 'KEY_COUNT' && val) {
              const keys = parseInt(val, 10);
              if (keys === 25 || keys === 49 || keys === 61 || keys === 88) {
                useLightSyncStore.setState({ keyboardSize: keys });
              }
            } else if (ev === 'PRESET_CHANGED' && val) {
              const pLower = val.toLowerCase();
              if (pLower.includes('cyberpunk')) useLightSyncStore.getState().applyColorPreset('cyberpunk');
              else if (pLower.includes('synthwave')) useLightSyncStore.getState().applyColorPreset('synthwave');
              else if (pLower.includes('emerald')) useLightSyncStore.getState().applyColorPreset('emerald_matrix');
              else if (pLower.includes('sunset')) useLightSyncStore.getState().applyColorPreset('sunset_horizon');
              else if (pLower.includes('indigo')) useLightSyncStore.getState().applyColorPreset('electric_indigo');
              else if (pLower.includes('crimson')) useLightSyncStore.getState().applyColorPreset('crimson_nova');
              else if (pLower.includes('spectrum')) useLightSyncStore.getState().applyColorPreset('rainbow_spectrum');
            } else if (ev === 'NOTE_ON' && val) {
              const parts = val.trim().split(/\s+/);
              const pitch = parseInt(parts[0], 10);
              const vel = parseInt(parts[1], 10) || 90;
              if (!isNaN(pitch)) {
                triggerNoteOn(pitch, vel, false, 'M5Stack Core');
                setTimeout(() => triggerNoteOff(pitch, false, 'M5Stack Core'), 220);
              }
            } else if (ev === 'DEMO_STARTED') {
              addConsoleLog('M5Stack Random Melodic Demo Started');
            } else if (ev === 'DEMO_STOPPED') {
              addConsoleLog('M5Stack Random Melodic Demo Stopped');
            } else if (ev === 'TEST_ARPEGGIO_TRIGGERED') {
              const arpeggioNotes = [60, 64, 67, 72, 76, 79, 84];
              arpeggioNotes.forEach((pitch, i) => {
                setTimeout(() => {
                  triggerNoteOn(pitch, 90, false, 'M5 Arpeggio');
                  setTimeout(() => triggerNoteOff(pitch, false, 'M5 Arpeggio'), 180);
                }, i * 80);
              });
            }
          }

        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onclose = () => {
        setDeviceStatus({ connected: false });
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);
};
