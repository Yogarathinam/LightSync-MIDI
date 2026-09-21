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
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === 'NOTE_ON') {
            triggerNoteOn(data.pitch, data.velocity, false);
            if (data.chord) setCurrentChord(data.chord);
          } else if (type === 'NOTE_OFF') {
            triggerNoteOff(data.pitch, false);
            if (data.chord) setCurrentChord(data.chord);
          } else if (type === 'DEVICE_STATUS') {
            setDeviceStatus({
              connected: data.connected,
              port: data.port,
              simulated: data.simulated
            });
            addConsoleLog(`Device Status: ${data.connected ? 'Connected' : 'Disconnected'} (${data.port || 'None'})`);
          } else if (type === 'SESSION_RESULT') {
            if (data.summary) addSessionResult(data.summary);
            if (data.coach) setAiCoachFeedback(data.coach);
          } else if (type === 'INITIAL_STATE') {
            if (data.device) setDeviceStatus(data.device);
          } else if (type === 'PONG') {
            setDeviceStatus({ latency_ms: data.latency_ms || 1 });
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
