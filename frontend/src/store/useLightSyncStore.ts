import { create } from 'zustand';
import { 
  StudioTab, 
  OverlayModalType,
  InstrumentType, 
  EffectType, 
  EffectConfig, 
  PresetItem, 
  ActiveNoteState, 
  ChordInfo, 
  SongItem, 
  SessionResult, 
  AICoachFeedback, 
  DeviceStatus 
} from '../types';
import { synthEngine } from '../audio/synthEngine';

interface LightSyncState {
  // Navigation & Overlay Modal
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  activeOverlay: OverlayModalType;
  setActiveOverlay: (overlay: OverlayModalType) => void;
  openOverlay: (overlay: OverlayModalType) => void;
  cancelOverlayClose: () => void;
  scheduleOverlayClose: (delayMs?: number) => void;
  closeOverlay: () => void;

  // Active Key States & Chord
  activeNotes: Map<number, ActiveNoteState>;
  currentChord: ChordInfo | null;
  triggerNoteOn: (pitch: number, velocity?: number, sendWs?: boolean) => void;
  triggerNoteOff: (pitch: number, sendWs?: boolean) => void;
  setCurrentChord: (chord: ChordInfo | null) => void;

  // Keyboard & Visualizer Settings
  keyboardSize: 25 | 49 | 61 | 88;
  octaveShift: number;
  transpose: number;
  keyLabels: 'notes' | 'solfege' | 'qwerty' | 'none';
  diffuseBlur: boolean;
  fallingNotes: boolean;
  flowSpeed: number;
  isAutoDemo: boolean;
  setKeyboardSize: (size: 25 | 49 | 61 | 88) => void;
  setOctaveShift: (shift: number) => void;
  incrementOctave: () => void;
  decrementOctave: () => void;
  setTranspose: (semitones: number) => void;
  incrementTranspose: () => void;
  decrementTranspose: () => void;
  setKeyLabels: (labels: 'notes' | 'solfege' | 'qwerty' | 'none') => void;
  setDiffuseBlur: (enabled: boolean) => void;
  setFallingNotes: (enabled: boolean) => void;
  setFlowSpeed: (speed: number) => void;
  setIsAutoDemo: (active: boolean) => void;
  toggleAutoDemo: () => void;

  // Audio Synth Controls
  volume: number;
  isMuted: boolean;
  instrument: InstrumentType;
  isSustained: boolean;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setInstrument: (inst: InstrumentType) => void;
  toggleSustain: () => void;

  // Metronome State
  metronomeActive: boolean;
  metronomeBpm: number;
  beatsPerMeasure: number;
  currentBeat: number;
  setMetronomeActive: (active: boolean) => void;
  setMetronomeBpm: (bpm: number) => void;
  setCurrentBeat: (beat: number) => void;

  // Effect Studio State
  effectConfig: EffectConfig;
  setEffectParam: <K extends keyof EffectConfig>(param: K, value: EffectConfig[K]) => void;
  setFullEffectConfig: (config: EffectConfig) => void;
  presets: PresetItem[];
  setPresets: (presets: PresetItem[]) => void;
  loadPreset: (preset: PresetItem) => void;

  // Learning & Practice Mode State
  currentSong: SongItem | null;
  setCurrentSong: (song: SongItem | null) => void;
  isSongPlaying: boolean;
  setIsSongPlaying: (playing: boolean) => void;
  practiceMode: 'wait_for_key' | 'flow';
  setPracticeMode: (mode: 'wait_for_key' | 'flow') => void;
  handFilter: 'both' | 'right' | 'left';
  setHandFilter: (filter: 'both' | 'right' | 'left') => void;
  expectedPitch: number | null;
  setExpectedPitch: (pitch: number | null) => void;
  sessionHistory: SessionResult[];
  setSessionHistory: (history: SessionResult[]) => void;
  addSessionResult: (res: SessionResult) => void;

  // AI Coach Feedback
  aiCoachFeedback: AICoachFeedback | null;
  setAiCoachFeedback: (feedback: AICoachFeedback | null) => void;

  // Hardware Device & Status
  deviceStatus: DeviceStatus;
  setDeviceStatus: (status: Partial<DeviceStatus>) => void;
  consoleLogs: string[];
  addConsoleLog: (msg: string) => void;

  // Outgoing WS message callback hook
  wsSender: ((msg: object) => void) | null;
  setWsSender: (sender: (msg: object) => void) => void;
}

let overlayTimer: number | null = null;

export const useLightSyncStore = create<LightSyncState>((set, get) => ({
  // Navigation & Overlay
  activeTab: 'play',
  setActiveTab: (tab) => set({ activeTab: tab, activeOverlay: tab }),
  activeOverlay: null,
  setActiveOverlay: (overlay) => {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = null;
    }
    set({ activeOverlay: overlay });
  },
  openOverlay: (overlay) => {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = null;
    }
    set({ activeOverlay: overlay });
  },
  cancelOverlayClose: () => {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = null;
    }
  },
  scheduleOverlayClose: (delayMs = 320) => {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
    }
    overlayTimer = window.setTimeout(() => {
      set({ activeOverlay: null });
      overlayTimer = null;
    }, delayMs);
  },
  closeOverlay: () => {
    if (overlayTimer) {
      clearTimeout(overlayTimer);
      overlayTimer = null;
    }
    set({ activeOverlay: null });
  },

  // Notes & Chord
  activeNotes: new Map(),
  currentChord: null,
  setCurrentChord: (chord) => set({ currentChord: chord }),

  triggerNoteOn: (pitch, velocity = 100, sendWs = true) => {
    const { activeNotes, keyboardSize, octaveShift, transpose, effectConfig, wsSender } = get();
    if (activeNotes.has(pitch)) return;

    // Calculate normalized LED center
    const baseStartMidi = keyboardSize === 25 ? 48 : keyboardSize === 49 ? 36 : keyboardSize === 61 ? 36 : 21;
    const startMidi = baseStartMidi + (octaveShift * 12) + transpose;
    const keyIdx = Math.max(0, Math.min(keyboardSize - 1, pitch - startMidi));
    const centerLed = Math.floor((keyIdx / (keyboardSize - 1)) * 143);

    // Audio synth
    synthEngine.noteOn(pitch, velocity);

    const newMap = new Map(activeNotes);
    newMap.set(pitch, {
      pitch,
      velocity,
      centerLed,
      startTime: performance.now()
    });

    set({ activeNotes: newMap });

    // Send to backend via WS if connected
    if (sendWs && wsSender) {
      wsSender({
        type: 'NOTE_ON',
        pitch,
        velocity
      });
    }
  },

  triggerNoteOff: (pitch, sendWs = true) => {
    const { activeNotes, wsSender } = get();
    if (!activeNotes.has(pitch)) return;

    synthEngine.noteOff(pitch);

    const newMap = new Map(activeNotes);
    newMap.delete(pitch);
    set({ activeNotes: newMap });

    if (sendWs && wsSender) {
      wsSender({
        type: 'NOTE_OFF',
        pitch
      });
    }
  },

  // Keyboard Viewport
  keyboardSize: 61,
  octaveShift: 0,
  transpose: 0,
  keyLabels: 'notes',
  diffuseBlur: true,
  fallingNotes: true,
  flowSpeed: 1.2,
  isAutoDemo: false,
  setKeyboardSize: (size) => set({ keyboardSize: size }),
  setOctaveShift: (shift) => set({ octaveShift: Math.max(-4, Math.min(4, shift)) }),
  incrementOctave: () => set((state) => ({ octaveShift: Math.max(-4, Math.min(4, state.octaveShift + 1)) })),
  decrementOctave: () => set((state) => ({ octaveShift: Math.max(-4, Math.min(4, state.octaveShift - 1)) })),
  setTranspose: (semitones) => set({ transpose: Math.max(-12, Math.min(12, semitones)) }),
  incrementTranspose: () => set((state) => ({ transpose: Math.max(-12, Math.min(12, state.transpose + 1)) })),
  decrementTranspose: () => set((state) => ({ transpose: Math.max(-12, Math.min(12, state.transpose - 1)) })),
  setKeyLabels: (labels) => set({ keyLabels: labels }),
  setDiffuseBlur: (enabled) => set({ diffuseBlur: enabled }),
  setFallingNotes: (enabled) => set({ fallingNotes: enabled }),
  setFlowSpeed: (speed) => set({ flowSpeed: Math.max(0.2, Math.min(3.0, speed)) }),
  setIsAutoDemo: (active) => set({ isAutoDemo: active }),
  toggleAutoDemo: () => set((state) => ({ isAutoDemo: !state.isAutoDemo })),

  // Audio Controls
  volume: 0.7,
  isMuted: false,
  instrument: 'acoustic_grand',
  isSustained: false,
  setVolume: (vol) => {
    synthEngine.setVolume(vol);
    set({ volume: vol });
  },
  toggleMute: () => {
    const newMute = !get().isMuted;
    synthEngine.setMuted(newMute);
    set({ isMuted: newMute });
  },
  setInstrument: (inst) => {
    synthEngine.setInstrument(inst);
    set({ instrument: inst });
  },
  toggleSustain: () => {
    const newSustain = !get().isSustained;
    synthEngine.setSustain(newSustain);
    set({ isSustained: newSustain });
  },

  // Metronome
  metronomeActive: false,
  metronomeBpm: 100,
  beatsPerMeasure: 4,
  currentBeat: 0,
  setMetronomeActive: (active) => set({ metronomeActive: active }),
  setMetronomeBpm: (bpm) => set({ metronomeBpm: Math.max(30, Math.min(260, bpm)) }),
  setCurrentBeat: (beat) => set({ currentBeat: beat }),

  // Effect Studio
  effectConfig: {
    effect: 'bounce',
    speed: 1.2,
    decay: 0.85,
    spread: 3.0,
    brightness: 200,
    rainbow: false,
    primaryColor: '#00f0ff',
    secondaryColor: '#6366f1'
  },
  setEffectParam: (param, value) => {
    const newConfig = { ...get().effectConfig, [param]: value };
    set({ effectConfig: newConfig });
    const { wsSender } = get();
    if (wsSender) {
      if (param === 'effect') {
        wsSender({ type: 'EFFECT_CHANGED', effect: value });
      } else {
        wsSender({ type: 'PARAM_CHANGED', param, value });
      }
    }
  },
  setFullEffectConfig: (config) => {
    set({ effectConfig: config });
    const { wsSender } = get();
    if (wsSender) {
      wsSender({ type: 'EFFECT_CHANGED', effect: config.effect });
      wsSender({ type: 'PARAM_CHANGED', param: 'speed', value: config.speed });
      wsSender({ type: 'PARAM_CHANGED', param: 'decay', value: config.decay });
      wsSender({ type: 'PARAM_CHANGED', param: 'spread', value: config.spread });
      wsSender({ type: 'PARAM_CHANGED', param: 'brightness', value: config.brightness });
    }
  },
  presets: [],
  setPresets: (presets) => set({ presets }),
  loadPreset: (preset) => {
    get().setFullEffectConfig({
      effect: preset.effect,
      speed: preset.speed,
      decay: preset.decay,
      spread: preset.spread,
      brightness: preset.brightness,
      rainbow: preset.rainbow,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor
    });
    get().addConsoleLog(`Loaded preset: "${preset.name}" [${preset.effect.toUpperCase()}]`);
  },

  // Learning & Practice
  currentSong: null,
  setCurrentSong: (song) => set({ currentSong: song }),
  isSongPlaying: false,
  setIsSongPlaying: (playing) => set({ isSongPlaying: playing }),
  practiceMode: 'wait_for_key',
  setPracticeMode: (mode) => set({ practiceMode: mode }),
  handFilter: 'both',
  setHandFilter: (filter) => set({ handFilter: filter }),
  expectedPitch: null,
  setExpectedPitch: (pitch) => set({ expectedPitch: pitch }),
  sessionHistory: [],
  setSessionHistory: (history) => set({ sessionHistory: history }),
  addSessionResult: (res) => set((state) => ({ sessionHistory: [res, ...state.sessionHistory] })),

  // AI Coach Feedback
  aiCoachFeedback: null,
  setAiCoachFeedback: (feedback) => set({ aiCoachFeedback: feedback }),

  // Device & Status
  deviceStatus: {
    connected: true,
    port: 'SIMULATED',
    simulated: true,
    latency_ms: 2,
    info: {
      name: 'Virtual M5Stack Core',
      firmware: 'v2.0-sim',
      fps: 60,
      led_count: 144
    }
  },
  setDeviceStatus: (status) => set((state) => ({ deviceStatus: { ...state.deviceStatus, ...status } })),
  consoleLogs: [
    `[${new Date().toLocaleTimeString()}] LightSync v2 Studio initialized. Ready.`,
    `[${new Date().toLocaleTimeString()}] Virtual M5Stack Core connected on SIMULATED port.`
  ],
  addConsoleLog: (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    set((state) => ({
      consoleLogs: [...state.consoleLogs.slice(-100), `[${timestamp}] ${msg}`]
    }));
  },

  // WS
  wsSender: null,
  setWsSender: (sender) => set({ wsSender: sender })
}));
