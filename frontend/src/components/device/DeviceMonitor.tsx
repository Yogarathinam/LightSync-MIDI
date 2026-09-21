import React, { useState, useEffect } from 'react';
import { Cpu, Radio, RefreshCw, Terminal, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';
import { useLightSyncStore } from '../../store/useLightSyncStore';

export const DeviceMonitor: React.FC = () => {
  const { 
    deviceStatus, 
    setDeviceStatus, 
    consoleLogs, 
    addConsoleLog,
    effectConfig,
    setEffectParam,
    triggerNoteOn,
    triggerNoteOff,
    wsSender 
  } = useLightSyncStore();

  const [availablePorts, setAvailablePorts] = useState<Array<{ port: string; desc: string }>>([
    { port: 'SIMULATED', desc: 'Virtual M5Stack Strip Simulator' }
  ]);
  const [selectedPort, setSelectedPort] = useState(deviceStatus.port || 'SIMULATED');
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const fetchPorts = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/device/ports');
      const data = await res.json();
      if (data.ports) {
        setAvailablePorts(data.ports);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/device/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort, baud: 115200 })
      });
      const data = await res.json();
      setDeviceStatus({
        connected: data.success,
        port: data.port,
        simulated: data.simulated
      });
      addConsoleLog(`Connected to device: ${data.port} (simulated=${data.simulated})`);
    } catch {
      addConsoleLog(`Could not reach backend device API. Running in local simulation.`);
      setDeviceStatus({ connected: true, port: 'SIMULATED', simulated: true });
    }
  };

  const handleDisconnect = () => {
    setDeviceStatus({ connected: false, port: null });
    addConsoleLog('Disconnected from hardware device.');
  };

  const handlePing = () => {
    if (wsSender) {
      wsSender({ type: 'PING' });
    }
    addConsoleLog('Sent PING to M5Stack hardware...');
  };

  // M5Stack Simulated Button Handlers
  const handleBtnA = () => {
    // Cycle effect
    const effects = ['bounce', 'ripple', 'pulse', 'hold_beam', 'glitch', 'spark', 'sprinkle', 'rain', 'wave'] as const;
    const currIdx = effects.indexOf(effectConfig.effect);
    const nextEff = effects[(currIdx + 1) % effects.length];
    setEffectParam('effect', nextEff);
    addConsoleLog(`[M5Stack BtnA Pressed] Cycled effect to ${nextEff.toUpperCase()}`);
  };

  const handleBtnB = () => {
    // Cycle brightness: 50 -> 100 -> 150 -> 200 -> 255 -> 50
    const nextBrt = effectConfig.brightness >= 240 ? 50 : effectConfig.brightness + 50;
    setEffectParam('brightness', nextBrt);
    addConsoleLog(`[M5Stack BtnB Pressed] Cycled brightness to ${nextBrt}/255`);
  };

  const handleBtnC = () => {
    // Test note Middle C
    triggerNoteOn(60, 110);
    setTimeout(() => triggerNoteOff(60), 400);
    addConsoleLog('[M5Stack BtnC Pressed] Fired local test note: C4 (60)');
  };

  const copyConsole = () => {
    navigator.clipboard.writeText(consoleLogs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      
      {/* Left Column: Device Connection & Settings (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        
        {/* Connection Box */}
        <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col gap-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-500" />
              Serial Port Manager
            </h2>
            <button
              onClick={fetchPorts}
              disabled={isScanning}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Rescan</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Select COM Port:</label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {availablePorts.map((p) => (
                <option key={p.port} value={p.port}>
                  {p.port} - {p.desc}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
              <span className="text-slate-400 block text-[10px]">BAUD RATE</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">115200</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
              <span className="text-slate-400 block text-[10px]">ROUNDTRIP</span>
              <span className="font-bold text-emerald-500">{deviceStatus.latency_ms} ms</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {!deviceStatus.connected ? (
              <button
                onClick={handleConnect}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
              >
                Connect Device
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                Disconnect
              </button>
            )}

            <button
              onClick={handlePing}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200"
            >
              Ping
            </button>
          </div>
        </div>

        {/* M5Stack Simulated Screen Mirror */}
        <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col gap-3 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" />
              M5Stack Core LCD Screen Mirror
            </h2>
            <span className="text-[10px] font-mono text-slate-400">320x240 TFT</span>
          </div>

          {/* Simulated M5Stack Device Body */}
          <div className="p-4 rounded-2xl bg-slate-900 border-4 border-slate-800 shadow-xl flex flex-col items-center gap-3">
            
            {/* Screen Inner */}
            <div className="w-full bg-black rounded-lg p-3 font-mono text-xs text-white border border-slate-700 flex flex-col gap-2">
              {/* Header */}
              <div className="flex justify-between items-center bg-indigo-950 text-indigo-200 px-2 py-1 rounded text-[11px] font-bold">
                <span>LIGHTSYNC</span>
                <span className={deviceStatus.connected ? 'text-emerald-400' : 'text-slate-400'}>
                  {deviceStatus.connected ? 'ONLINE' : 'STANDALONE'}
                </span>
              </div>

              {/* Body */}
              <div className="py-1">
                <span className="text-[10px] text-indigo-400 block font-bold">ACTIVE EFFECT:</span>
                <span className="text-lg font-black text-white uppercase">{effectConfig.effect}</span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 border-t border-zinc-800 pt-1">
                <div>Speed: {effectConfig.speed.toFixed(2)}</div>
                <div>Decay: {effectConfig.decay.toFixed(2)}</div>
                <div>Spread: {effectConfig.spread.toFixed(1)}</div>
                <div>Brt: {effectConfig.brightness}</div>
              </div>

              <div className="text-[9px] text-slate-500 pt-1 border-t border-zinc-800">
                WS2812B @ Pin 21 &bull; 144 LEDs
              </div>
            </div>

            {/* Physical Button Replicas */}
            <div className="w-full flex items-center justify-between gap-3 pt-1">
              <button
                onClick={handleBtnA}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[10px] font-mono font-bold text-slate-200 border border-slate-600 shadow transition-all"
              >
                [A] EFFECT
              </button>
              <button
                onClick={handleBtnB}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[10px] font-mono font-bold text-slate-200 border border-slate-600 shadow transition-all"
              >
                [B] BRIGHT
              </button>
              <button
                onClick={handleBtnC}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-[10px] font-mono font-bold text-slate-200 border border-slate-600 shadow transition-all"
              >
                [C] NOTE C4
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Right Column: Serial Console Logs (7 Cols) */}
      <div className="lg:col-span-7 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between gap-3 transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-500" />
              Serial & Event Bus Console
            </h2>
            <button
              onClick={copyConsole}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Logs'}</span>
            </button>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs h-96 overflow-y-auto flex flex-col gap-1 border border-slate-800 shadow-inner">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between">
          <span>Non-blocking event listener active</span>
          <span>115200 8-N-1</span>
        </div>
      </div>

    </div>
  );
};
