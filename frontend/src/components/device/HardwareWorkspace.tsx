import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Cable, 
  RefreshCw, 
  Terminal, 
  Copy, 
  Check, 
  Trash2, 
  Play, 
  Activity, 
  CheckCircle2, 
  XCircle,
  Clock,
  Sparkles,
  Cpu
} from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';
import { RawMidiLog } from '../../types';

export const HardwareWorkspace: React.FC = () => {
  const {
    deviceStatus,
    devicePorts,
    fetchDevicePorts,
    connectDevicePort,
    disconnectDevicePort,
    activeMidiPort,
    midiPorts,
    isMidiConnected,
    fetchMidiPorts,
    connectMidiPort,
    disconnectMidiPort,
    currentChord,
    activeNotes,
    triggerNoteOn,
    triggerNoteOff,
    rawMidiLogs,
    clearRawMidiLogs,
    wsSender
  } = useLightSyncStore();

  const [selectedModulePort, setSelectedModulePort] = useState(deviceStatus.port || 'STANDALONE');
  const [selectedMidiPort, setSelectedMidiPort] = useState(activeMidiPort || '');
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'NOTE_ON' | 'NOTE_OFF'>('ALL');

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchDevicePorts();
    fetchMidiPorts();
  }, [fetchDevicePorts, fetchMidiPorts]);

  useEffect(() => {
    if (devicePorts.length > 0) {
      const cp210x = devicePorts.find((p) => {
        const d = (p.desc || '').toLowerCase();
        return p.port !== 'STANDALONE' && (d.includes('silicon') || d.includes('cp210') || d.includes('m5stack') || d.includes('ch340'));
      });
      if (cp210x) {
        setSelectedModulePort(cp210x.port);
      } else if (deviceStatus.port) {
        setSelectedModulePort(deviceStatus.port);
      } else {
        const firstReal = devicePorts.find((p) => p.port !== 'STANDALONE');
        if (firstReal) setSelectedModulePort(firstReal.port);
      }
    } else if (deviceStatus.port) {
      setSelectedModulePort(deviceStatus.port);
    }
  }, [devicePorts, deviceStatus.port]);

  useEffect(() => {
    if (activeMidiPort) setSelectedMidiPort(activeMidiPort);
  }, [activeMidiPort]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawMidiLogs, autoScroll]);

  const handleRescanAll = async () => {
    setIsScanning(true);
    try {
      await Promise.all([fetchDevicePorts(), fetchMidiPorts()]);
    } finally {
      setTimeout(() => setIsScanning(false), 300);
    }
  };

  const handlePing = () => {
    if (wsSender) {
      wsSender({ type: 'PING' });
    }
  };

  const handleTestNote = (pitch: number = 60) => {
    triggerNoteOn(pitch, 105, true, 'Test Button');
    setTimeout(() => {
      triggerNoteOff(pitch, true, 'Test Button');
    }, 280);
  };

  const copyTerminalLogs = () => {
    const text = rawMidiLogs
      .map(
        (l) =>
          `[${l.timestamp}] ${l.type.padEnd(8)} Ch:${l.channel} Note:${l.noteName} (${l.pitch}) Vel:${l.velocity} ${
            l.chord ? `Chord:${l.chord}` : ''
          } Src:${l.source}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filteredLogs = rawMidiLogs.filter((log) => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-500" />
            Hardware Setup & Port Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Configure physical LightSync M5Stack module, MIDI keyboards, and monitor real-time MIDI packet streams.
          </p>
        </div>

        <button
          onClick={handleRescanAll}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-750 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 shadow-sm transition-all cursor-pointer select-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-indigo-500' : ''}`} />
          <span>{isScanning ? 'Scanning...' : 'Rescan Ports'}</span>
        </button>
      </div>

      {/* 2. Dual Port Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: LightSync Module Connection */}
        <div className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">LightSync Module</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Serial USB Controller (Pin 26)</span>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                deviceStatus.connected && !deviceStatus.simulated
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${deviceStatus.connected && !deviceStatus.simulated ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {deviceStatus.connected && !deviceStatus.simulated ? 'CONNECTED' : 'STANDALONE'}
              </span>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  Serial COM Port
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedModulePort}
                    onChange={(e) => setSelectedModulePort(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {devicePorts.length > 0 ? (
                      devicePorts.map((p) => (
                        <option key={p.port} value={p.port} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                          {p.port} {p.desc ? `(${p.desc})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="STANDALONE" className="bg-white dark:bg-zinc-900">STANDALONE (Optical Engine)</option>
                    )}
                  </select>

                  {deviceStatus.connected && !deviceStatus.simulated ? (
                    <button
                      onClick={disconnectDevicePort}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => connectDevicePort(selectedModulePort)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Hardware Specs Pills */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850">
                  <span className="text-[10px] text-slate-400 block">BAUD RATE</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">115200 8-N-1</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">LATENCY</span>
                    <span className="font-bold text-emerald-500">{deviceStatus.latency_ms} ms</span>
                  </div>
                  <button
                    onClick={handlePing}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-[10px] font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Ping
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Data Output: Pin 26 (Port B)</span>
            <span className="text-emerald-500 font-semibold">{deviceStatus.info?.name || 'M5 Core Ready'}</span>
          </div>
        </div>

        {/* Card 2: MIDI Input Keyboard Connection */}
        <div className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Cable className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">MIDI Input Controller</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Piano / Keyboard Ingest</span>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                isMidiConnected
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isMidiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isMidiConnected ? 'CONNECTED' : 'VIRTUAL'}
              </span>
            </div>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  Physical MIDI Input Device
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMidiPort}
                    onChange={(e) => setSelectedMidiPort(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-zinc-900">Virtual / None (On-Screen & QWERTY)</option>
                    {midiPorts.map((mp) => (
                      <option key={mp} value={mp} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                        {mp}
                      </option>
                    ))}
                  </select>

                  {isMidiConnected ? (
                    <button
                      onClick={disconnectMidiPort}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => connectMidiPort(selectedMidiPort)}
                      disabled={!selectedMidiPort}
                      className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition-all ${
                        selectedMidiPort
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* MIDI Telemetry Readouts */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850">
                  <span className="text-[10px] text-slate-400 block">DETECTED CHORD</span>
                  <span className="font-bold text-indigo-500 dark:text-indigo-400 truncate block">
                    {currentChord?.chord || 'Listening...'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">ACTIVE KEYS</span>
                    <span className="font-bold text-emerald-500">{activeNotes.size} Active</span>
                  </div>
                  <button
                    onClick={() => handleTestNote(60)}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-[10px] font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    title="Send Test Note C4"
                  >
                    Test C4
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Ingest: Physical USB MIDI</span>
            <span className="text-indigo-500 font-semibold">{isMidiConnected ? 'Stream Active' : 'Ready'}</span>
          </div>
        </div>

      </div>

      {/* 3. Live Raw MIDI Event Stream Terminal */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
        
        {/* Terminal Header & Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Raw MIDI Event Stream
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-700">
                  {rawMidiLogs.length} Events
                </span>
              </h3>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10px] font-mono">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2 py-0.5 rounded cursor-pointer ${filterType === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('NOTE_ON')}
                className={`px-2 py-0.5 rounded cursor-pointer ${filterType === 'NOTE_ON' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
              >
                Note On
              </button>
              <button
                onClick={() => setFilterType('NOTE_OFF')}
                className={`px-2 py-0.5 rounded cursor-pointer ${filterType === 'NOTE_OFF' ? 'bg-slate-600 text-white font-bold' : 'text-slate-500 dark:text-zinc-400'}`}
              >
                Note Off
              </button>
            </div>

            {/* Auto-scroll checkbox */}
            <label className="flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
              />
              <span>Auto-scroll</span>
            </label>

            {/* Copy Button */}
            <button
              onClick={copyTerminalLogs}
              disabled={rawMidiLogs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-[11px] font-mono font-medium text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Clear Button */}
            <button
              onClick={clearRawMidiLogs}
              disabled={rawMidiLogs.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-mono font-medium text-slate-600 dark:text-zinc-400 hover:text-rose-600 border border-slate-200 dark:border-zinc-700 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Terminal Screen Viewport */}
        <div className="h-64 sm:h-72 rounded-xl bg-[#09090b] border border-zinc-800/80 p-3 font-mono text-[11px] overflow-y-auto flex flex-col gap-1 select-text">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 select-none">
              <Terminal className="w-8 h-8 opacity-40 animate-pulse" />
              <p className="text-xs">Waiting for incoming MIDI messages...</p>
              <span className="text-[10px] text-zinc-600">
                Play keys on your connected MIDI piano or click virtual keys to see raw stream packets.
              </span>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isNoteOn = log.type === 'NOTE_ON';
              return (
                <div 
                  key={log.id} 
                  className="flex items-center gap-2 py-0.5 px-1.5 rounded hover:bg-zinc-900/80 transition-colors border-b border-zinc-900/40"
                >
                  {/* Timestamp */}
                  <span className="text-zinc-500 shrink-0 w-24">[{log.timestamp}]</span>

                  {/* Type Badge */}
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 w-18 text-center ${
                    isNoteOn 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>
                    {log.type}
                  </span>

                  {/* Channel */}
                  <span className="text-zinc-400 shrink-0 w-12">Ch:{log.channel}</span>

                  {/* Pitch / Note Name */}
                  <span className="text-cyan-400 font-bold shrink-0 w-20">
                    {log.noteName} ({log.pitch})
                  </span>

                  {/* Velocity */}
                  <span className="text-amber-300 shrink-0 w-16">
                    Vel:{log.velocity}
                  </span>

                  {/* Chord if available */}
                  {log.chord && (
                    <span className="text-purple-400 shrink-0 hidden sm:inline">
                      [{log.chord}]
                    </span>
                  )}

                  {/* Ingest Source */}
                  <span className="text-zinc-600 text-[10px] ml-auto shrink-0 hidden md:inline">
                    via {log.source}
                  </span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

      </div>

    </div>
  );
};
