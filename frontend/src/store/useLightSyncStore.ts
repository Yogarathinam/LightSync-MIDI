import { create } from 'zustand';
import { 
  StudioTab, 
  TopNavTab,
  WorkspaceId,
  UtilityOverlayId,
  LearnSubView,
  OverlayModalType,
  InstrumentType, 
  EffectType, 
  EffectConfig, 
  PresetItem, 
  ActiveNoteState, 
  ChordInfo, 
  SongItem, 
  SongNote,
  SessionResult, 
  AICoachFeedback, 
  DeviceStatus,
  FlowKeyConfig,
  VisualizerBackgroundConfig,
  ColorSyncPresetId,
  RawMidiLog,
  RecordedMidiEvent,
  SessionTelemetry,
  MiraCurriculum,
  MiraChatMessage
} from '../types';
import { synthEngine } from '../audio/synthEngine';
import { createMidiFile, downloadMidiFile } from '../utils/midi_recorder';

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.port === '5173' || window.location.port === '3000') {
      return `http://127.0.0.1:8765${cleanPath}`;
    }
    if (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file://')) {
      return `${window.location.origin}${cleanPath}`;
    }
  }
  return `http://127.0.0.1:8765${cleanPath}`;
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const getMidiNoteName = (pitch: number) => {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[pitch % 12];
  return `${name}${octave}`;
};

export const getLedPosition = (keyIdx: number, keyboardSize: number = 61) => {
  const ledsPerKey = 2; // Step of 2 LEDs (Key 0 = LED 11, Key 1 = LED 13, Key 2 = LED 15 -> 1 LED spacer gap!)
  let leftMargin = 11;
  if (keyboardSize === 61) leftMargin = 11;
  else if (keyboardSize === 88) leftMargin = 0;
  else if (keyboardSize === 49) leftMargin = 23;
  else if (keyboardSize === 25) leftMargin = 47;

  const ledStart = leftMargin + keyIdx * ledsPerKey;
  return { ledStart, ledEnd: ledStart, centerLed: ledStart };
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 99, g: 102, b: 241 };
}

export const COLOR_SYNC_PRESETS: Record<ColorSyncPresetId, {
  name: string;
  desc: string;
  primary: string;
  secondary: string;
  rainbow: boolean;
  effect: EffectType;
}> = {
  cyberpunk: {
    name: 'Cyberpunk Neon',
    desc: 'Electric Cyan & Hot Magenta',
    primary: '#00f0ff',
    secondary: '#ec4899',
    rainbow: false,
    effect: 'spark'
  },
  synthwave: {
    name: 'Synthwave Sunset',
    desc: 'Golden Amber & Deep Violet',
    primary: '#f59e0b',
    secondary: '#8b5cf6',
    rainbow: false,
    effect: 'pulse'
  },
  emerald_matrix: {
    name: 'Emerald Matrix',
    desc: 'Digital Mint & Luminous Teal',
    primary: '#10b981',
    secondary: '#06b6d4',
    rainbow: false,
    effect: 'glitch'
  },
  sunset_horizon: {
    name: 'Sunset Horizon',
    desc: 'Rose Red & Warm Peach',
    primary: '#f43f5e',
    secondary: '#fb923c',
    rainbow: false,
    effect: 'ripple'
  },
  electric_indigo: {
    name: 'Electric Indigo',
    desc: 'Deep Indigo & Cobalt Sky',
    primary: '#6366f1',
    secondary: '#38bdf8',
    rainbow: false,
    effect: 'wave'
  },
  crimson_nova: {
    name: 'Crimson Nova',
    desc: 'Intense Flame & Blaze Orange',
    primary: '#ef4444',
    secondary: '#f97316',
    rainbow: false,
    effect: 'bounce'
  },
  rainbow_spectrum: {
    name: 'Pitch Spectrum',
    desc: 'Dynamic Chromatic Frequencies',
    primary: '#6366f1',
    secondary: '#ec4899',
    rainbow: true,
    effect: 'rain'
  },
  custom: {
    name: 'Custom',
    desc: 'User Tuned Palette & Effect',
    primary: '#00f0ff',
    secondary: '#ec4899',
    rainbow: false,
    effect: 'static'
  }
};

export const DEFAULT_SONGS: SongItem[] = [
  {
    id: 'ode_to_joy',
    title: 'Ode to Joy',
    composer: 'L. v. Beethoven',
    difficulty: 'Beginner',
    bpm: 100,
    time_signature: '4/4',
    key: 'C Major',
    notes: [
      { pitch: 64, name: 'E4', time: 0.0, duration: 1.0, hand: 'right' },
      { pitch: 64, name: 'E4', time: 1.0, duration: 1.0, hand: 'right' },
      { pitch: 65, name: 'F4', time: 2.0, duration: 1.0, hand: 'right' },
      { pitch: 67, name: 'G4', time: 3.0, duration: 1.0, hand: 'right' },
      { pitch: 67, name: 'G4', time: 4.0, duration: 1.0, hand: 'right' },
      { pitch: 65, name: 'F4', time: 5.0, duration: 1.0, hand: 'right' },
      { pitch: 64, name: 'E4', time: 6.0, duration: 1.0, hand: 'right' },
      { pitch: 62, name: 'D4', time: 7.0, duration: 1.0, hand: 'right' },
      { pitch: 60, name: 'C4', time: 8.0, duration: 1.0, hand: 'right' },
      { pitch: 60, name: 'C4', time: 9.0, duration: 1.0, hand: 'right' },
      { pitch: 62, name: 'D4', time: 10.0, duration: 1.0, hand: 'right' },
      { pitch: 64, name: 'E4', time: 11.0, duration: 1.0, hand: 'right' },
      { pitch: 64, name: 'E4', time: 12.0, duration: 1.5, hand: 'right' },
      { pitch: 62, name: 'D4', time: 13.5, duration: 0.5, hand: 'right' },
      { pitch: 62, name: 'D4', time: 14.0, duration: 2.0, hand: 'right' },
    ]
  },
  {
    id: 'fur_elise',
    title: 'Für Elise (Theme)',
    composer: 'L. v. Beethoven',
    difficulty: 'Intermediate',
    bpm: 120,
    time_signature: '3/8',
    key: 'A Minor',
    notes: [
      { pitch: 76, name: 'E5', time: 0.0, duration: 0.5, hand: 'right' },
      { pitch: 75, name: 'D#5', time: 0.5, duration: 0.5, hand: 'right' },
      { pitch: 76, name: 'E5', time: 1.0, duration: 0.5, hand: 'right' },
      { pitch: 75, name: 'D#5', time: 1.5, duration: 0.5, hand: 'right' },
      { pitch: 76, name: 'E5', time: 2.0, duration: 0.5, hand: 'right' },
      { pitch: 71, name: 'B4', time: 2.5, duration: 0.5, hand: 'right' },
      { pitch: 74, name: 'D5', time: 3.0, duration: 0.5, hand: 'right' },
      { pitch: 72, name: 'C5', time: 3.5, duration: 0.5, hand: 'right' },
      { pitch: 69, name: 'A4', time: 4.0, duration: 1.5, hand: 'right' },
    ]
  },
  {
    id: 'river_flows_in_you',
    title: 'River Flows in You',
    composer: 'Yiruma',
    difficulty: 'Intermediate',
    bpm: 75,
    time_signature: '4/4',
    key: 'A Major',
    notes: [
      { pitch: 69, name: 'A4', time: 0.0, duration: 0.5, hand: 'right' },
      { pitch: 73, name: 'C#5', time: 0.5, duration: 0.5, hand: 'right' },
      { pitch: 76, name: 'E5', time: 1.0, duration: 1.0, hand: 'right' },
      { pitch: 74, name: 'D5', time: 2.0, duration: 0.5, hand: 'right' },
      { pitch: 73, name: 'C#5', time: 2.5, duration: 0.5, hand: 'right' },
      { pitch: 71, name: 'B4', time: 3.0, duration: 1.0, hand: 'right' },
      { pitch: 69, name: 'A4', time: 4.0, duration: 0.5, hand: 'right' },
      { pitch: 71, name: 'B4', time: 4.5, duration: 0.5, hand: 'right' },
      { pitch: 73, name: 'C#5', time: 5.0, duration: 1.0, hand: 'right' },
      { pitch: 71, name: 'B4', time: 6.0, duration: 2.0, hand: 'right' },
    ]
  },
  {
    id: 'c_major_scale',
    title: 'C Major Scale Drill',
    composer: 'Technique Drill',
    difficulty: 'Beginner',
    bpm: 90,
    time_signature: '4/4',
    key: 'C Major',
    notes: [
      { pitch: 60, name: 'C4', time: 0.0, duration: 1.0, hand: 'right' },
      { pitch: 62, name: 'D4', time: 1.0, duration: 1.0, hand: 'right' },
      { pitch: 64, name: 'E4', time: 2.0, duration: 1.0, hand: 'right' },
      { pitch: 65, name: 'F4', time: 3.0, duration: 1.0, hand: 'right' },
      { pitch: 67, name: 'G4', time: 4.0, duration: 1.0, hand: 'right' },
      { pitch: 69, name: 'A4', time: 5.0, duration: 1.0, hand: 'right' },
      { pitch: 71, name: 'B4', time: 6.0, duration: 1.0, hand: 'right' },
      { pitch: 72, name: 'C5', time: 7.0, duration: 1.0, hand: 'right' },
    ]
  },
  {
    id: 'minuet_in_g',
    title: 'Minuet in G Major',
    composer: 'J. S. Bach',
    difficulty: 'Beginner',
    bpm: 110,
    time_signature: '3/4',
    key: 'G Major',
    notes: [
      { pitch: 67, name: 'G4', time: 0.0, duration: 1.0, hand: 'right' },
      { pitch: 72, name: 'C5', time: 1.0, duration: 0.5, hand: 'right' },
      { pitch: 74, name: 'D5', time: 1.5, duration: 0.5, hand: 'right' },
      { pitch: 76, name: 'E5', time: 2.0, duration: 0.5, hand: 'right' },
      { pitch: 77, name: 'F#5', time: 2.5, duration: 0.5, hand: 'right' },
      { pitch: 79, name: 'G5', time: 3.0, duration: 1.0, hand: 'right' },
      { pitch: 67, name: 'G4', time: 4.0, duration: 1.0, hand: 'right' },
      { pitch: 67, name: 'G4', time: 5.0, duration: 1.0, hand: 'right' },
    ]
  }
];

interface LightSyncState {
  // Navigation & Spatial Workspace / Overlay Modal
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  activeWorkspace: WorkspaceId | null;
  openWorkspace: (ws: WorkspaceId) => void;
  closeWorkspace: () => void;
  activeUtilityOverlay: UtilityOverlayId | null;
  openUtilityOverlay: (id: UtilityOverlayId) => void;
  closeUtilityOverlay: () => void;
  activeOverlay: OverlayModalType;
  setActiveOverlay: (overlay: OverlayModalType) => void;
  openOverlay: (overlay: OverlayModalType) => void;
  cancelOverlayClose: () => void;
  scheduleOverlayClose: (delayMs?: number) => void;
  closeOverlay: () => void;

  // Active Key States & Chord
  activeNotes: Map<number, ActiveNoteState>;
  currentChord: ChordInfo | null;
  triggerNoteOn: (pitch: number, velocity?: number, sendWs?: boolean, source?: string) => void;
  triggerNoteOff: (pitch: number, sendWs?: boolean, source?: string) => void;
  setCurrentChord: (chord: ChordInfo | null) => void;

  // Keyboard & Visualizer Settings
  keyboardSize: 25 | 49 | 61 | 88;
  keyboardHeight: number;
  octaveShift: number;
  transpose: number;
  keyLabels: 'notes' | 'solfege' | 'qwerty' | 'none';
  diffuseBlur: boolean;
  fallingNotes: boolean;
  flowSpeed: number;
  isAutoDemo: boolean;
  setKeyboardSize: (size: 25 | 49 | 61 | 88) => void;
  setKeyboardHeight: (height: number) => void;
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

  // Flow Key & Background FX State
  flowKeyConfig: FlowKeyConfig;
  setFlowKeyParam: <K extends keyof FlowKeyConfig>(param: K, value: FlowKeyConfig[K]) => void;
  bgConfig: VisualizerBackgroundConfig;
  setBgConfigParam: <K extends keyof VisualizerBackgroundConfig>(param: K, value: VisualizerBackgroundConfig[K]) => void;
  applyColorPreset: (presetId: ColorSyncPresetId) => void;

  // Songs Catalog & Unified Learning Workspace State
  songsList: SongItem[];
  setSongsList: (songs: SongItem[]) => void;
  addSong: (song: SongItem) => void;
  currentSong: SongItem | null;
  setCurrentSong: (song: SongItem | null) => void;
  learnSubView: LearnSubView;
  setLearnSubView: (view: LearnSubView) => void;
  selectSongAndLearn: (song: SongItem, subView?: LearnSubView) => void;
  isSongActive: boolean;
  setIsSongActive: (active: boolean) => void;
  isSongPlaying: boolean;
  setIsSongPlaying: (playing: boolean) => void;
  songPlaybackId: number;
  startSongPlayback: (song?: SongItem, forceRestart?: boolean) => void;
  restartSongPlayback: (song?: SongItem) => void;
  stopSongPlayback: () => void;
  closeSongSession: () => void;
  playbackBeat: number;
  playbackTotalBeats: number;
  seekEpoch: number;
  targetSeekBeat: number;
  seekToBeat: (beat: number) => void;
  setPlaybackBeat: (beat: number, totalBeats?: number) => void;
  isWaitingAtHitline: boolean;
  waitingPitch: number | null;
  setWaitingState: (waiting: boolean, pitch: number | null) => void;
  practiceMode: 'wait_for_key' | 'flow';
  setPracticeMode: (mode: 'wait_for_key' | 'flow') => void;
  handFilter: 'both' | 'right' | 'left';
  setHandFilter: (filter: 'both' | 'right' | 'left') => void;
  leftHandColor: string;
  rightHandColor: string;
  setLeftHandColor: (color: string) => void;
  setRightHandColor: (color: string) => void;
  learnMode: 'watch_listen' | 'wait_for_key' | 'flow';
  setLearnMode: (mode: 'watch_listen' | 'wait_for_key' | 'flow') => void;

  // MIDI Performance Recording (.mid) & Playback
  isRecording: boolean;
  recordingStartTime: number | null;
  recordedEvents: RecordedMidiEvent[];
  isPlayingRecording: boolean;
  showSaveRecordingModal: boolean;
  startRecording: () => void;
  recordEvent: (event: RecordedMidiEvent) => void;
  stopRecording: () => RecordedMidiEvent[];
  stopRecordingAndPrompt: () => void;
  openSaveRecordingModal: () => void;
  closeSaveRecordingModal: () => void;
  playRecording: () => void;
  stopPlayback: () => void;
  downloadRecording: (filename?: string) => void;
  saveRecordingAsSong: (title?: string) => Promise<SongItem | null>;
  expectedPitch: number | null;
  setExpectedPitch: (pitch: number | null) => void;
  sessionHistory: SessionResult[];
  setSessionHistory: (history: SessionResult[]) => void;
  addSessionResult: (res: SessionResult) => void;
  showSessionAnalysis: boolean;
  completedSessionResult: SessionResult | null;
  openSessionAnalysis: (result?: SessionResult) => void;
  closeSessionAnalysis: () => void;
  completePracticeSession: (mode?: string) => SessionResult;
  midiFolderPath: string | null;
  isScanningMidi: boolean;
  fetchSongs: () => Promise<void>;
  rescanMidiFolder: () => Promise<void>;
  uploadMidiFile: (file: File) => Promise<SongItem | null>;
  deleteMidiSong: (songId: string) => Promise<boolean>;

  // AI Coach Feedback & MIRA System
  aiCoachFeedback: AICoachFeedback | null;
  setAiCoachFeedback: (feedback: AICoachFeedback | null) => void;
  geminiRelayUrl: string;
  setGeminiRelayUrl: (url: string) => void;
  currentTelemetry: SessionTelemetry;
  updateTelemetry: (partial: Partial<SessionTelemetry>) => void;
  resetTelemetry: (songTitle?: string, songId?: string) => void;
  recordNoteAttempt: (attempt: {
    pitch: number;
    expectedPitch: number;
    timeOffsetMs: number;
    velocity: number;
    hand: 'left' | 'right';
    measure: number;
    hit: boolean;
  }) => void;
  miraChatMessages: MiraChatMessage[];
  addMiraChatMessage: (msg: { role: 'user' | 'assistant'; text: string }) => void;
  clearMiraChat: () => void;
  miraCurriculum: MiraCurriculum | null;
  setMiraCurriculum: (curriculum: MiraCurriculum | null) => void;

  // Ports & Hardware Connection State
  midiPorts: string[];
  activeMidiPort: string | null;
  isMidiConnected: boolean;
  devicePorts: Array<{ port: string; desc: string }>;
  fetchMidiPorts: () => Promise<void>;
  connectMidiPort: (port: string) => Promise<boolean>;
  disconnectMidiPort: () => Promise<boolean>;
  fetchDevicePorts: () => Promise<void>;
  connectDevicePort: (port: string, baud?: number) => Promise<boolean>;
  disconnectDevicePort: () => Promise<boolean>;

  // Hardware Device & Status
  deviceStatus: DeviceStatus;
  setDeviceStatus: (status: Partial<DeviceStatus>) => void;
  consoleLogs: string[];
  addConsoleLog: (msg: string) => void;
  rawMidiLogs: RawMidiLog[];
  addRawMidiLog: (log: RawMidiLog) => void;
  clearRawMidiLogs: () => void;

  // Settings File & Local Storage Persistence
  loadSettingsFromFile: () => Promise<void>;

  // Outgoing WS message callback hook
  wsSender: ((msg: object) => void) | null;
  setWsSender: (sender: (msg: object) => void) => void;
}

const SETTINGS_STORAGE_KEY = 'LIGHTSYNC_USER_PREFERENCES_V2';

interface PersistedSettingsSnapshot {
  effectConfig?: Partial<EffectConfig>;
  flowKeyConfig?: Partial<FlowKeyConfig>;
  bgConfig?: Partial<VisualizerBackgroundConfig>;
  volume?: number;
  keyboardSize?: 25 | 49 | 61 | 88;
  octaveShift?: number;
  transpose?: number;
  leftHandColor?: string;
  rightHandColor?: string;
}

function getInitialPersistedSettings(): PersistedSettingsSnapshot | null {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

const savedSettings = getInitialPersistedSettings();

let saveTimer: any = null;
function persistSettings(snapshot: PersistedSettingsSnapshot) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {}

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });
    } catch (e) {}
  }, 500);
}

function triggerPersist(state: any) {
  persistSettings({
    effectConfig: state.effectConfig,
    flowKeyConfig: state.flowKeyConfig,
    bgConfig: state.bgConfig,
    volume: state.volume,
    keyboardSize: state.keyboardSize,
    octaveShift: state.octaveShift,
    transpose: state.transpose,
    leftHandColor: state.leftHandColor,
    rightHandColor: state.rightHandColor
  });
}

let overlayTimer: number | null = null;
let recordingPlaybackTimers: number[] = [];

export const useLightSyncStore = create<LightSyncState>((set, get) => ({
  // Navigation & Spatial Workspace / Overlay State
  activeTab: 'play',
  setActiveTab: (tab) => set({ 
    activeTab: tab, 
    activeOverlay: (tab === 'play' || tab === 'visualize') ? null : (tab as WorkspaceId),
    activeWorkspace: (tab === 'play' || tab === 'visualize') ? null : (tab as WorkspaceId)
  }),
  activeWorkspace: null,
  activeUtilityOverlay: null,
  activeOverlay: null,

  openWorkspace: (ws) => {
    set({
      activeWorkspace: ws,
      activeUtilityOverlay: null,
      activeOverlay: ws,
      activeTab: ws,
    });
  },

  closeWorkspace: () => {
    set({
      activeWorkspace: null,
      activeOverlay: get().activeUtilityOverlay,
      activeTab: 'play',
    });
  },

  openUtilityOverlay: (id) => {
    set({
      activeUtilityOverlay: id,
      activeOverlay: id,
    });
  },

  closeUtilityOverlay: () => {
    set({
      activeUtilityOverlay: null,
      activeOverlay: get().activeWorkspace,
    });
  },

  // Universal / Legacy compat
  setActiveOverlay: (overlay) => {
    if (!overlay) {
      set({
        activeWorkspace: null,
        activeUtilityOverlay: null,
        activeOverlay: null,
      });
      return;
    }
    const UTILITY_IDS: UtilityOverlayId[] = ['quick_settings', 'settings'];
    if (UTILITY_IDS.includes(overlay as UtilityOverlayId)) {
      set({
        activeUtilityOverlay: overlay as UtilityOverlayId,
        activeOverlay: overlay,
      });
    } else {
      set({
        activeWorkspace: overlay as WorkspaceId,
        activeUtilityOverlay: null,
        activeOverlay: overlay,
        activeTab: overlay as StudioTab,
      });
    }
  },

  openOverlay: (overlay) => {
    get().setActiveOverlay(overlay);
  },

  cancelOverlayClose: () => {},
  scheduleOverlayClose: () => {},

  closeOverlay: () => {
    set({
      activeWorkspace: null,
      activeUtilityOverlay: null,
      activeOverlay: null,
    });
  },

  // Notes & Chord
  activeNotes: new Map(),
  currentChord: null,
  setCurrentChord: (chord) => set({ currentChord: chord }),

  triggerNoteOn: (pitch, velocity = 100, sendWs = true, source = 'Keyboard') => {
    const { activeNotes, keyboardSize, octaveShift, transpose, wsSender, currentChord } = get();
    if (activeNotes.has(pitch)) return;

    // Calculate normalized LED center (2 LEDs per note for 61 keys on 144-LED strip with 22 margin LEDs)
    const baseStartMidi = keyboardSize === 25 ? 48 : keyboardSize === 49 ? 36 : keyboardSize === 61 ? 36 : 21;
    const keyIdx = Math.max(0, Math.min(keyboardSize - 1, pitch - baseStartMidi));
    const centerLed = getLedPosition(keyIdx, keyboardSize).centerLed;

    // Audio synth
    synthEngine.noteOn(pitch, velocity);

    const newMap = new Map(activeNotes);
    newMap.set(pitch, {
      pitch,
      velocity,
      centerLed,
      startTime: performance.now()
    });

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const logItem: RawMidiLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      type: 'NOTE_ON',
      channel: 1,
      pitch,
      noteName: getMidiNoteName(pitch),
      velocity,
      chord: currentChord?.chord,
      source: source || 'Keyboard'
    };

    set((state) => ({ 
      activeNotes: newMap,
      rawMidiLogs: [logItem, ...state.rawMidiLogs.slice(0, 199)]
    }));

    // Record note on if recording session is active
    if (get().isRecording) {
      const startTime = get().recordingStartTime || performance.now();
      const time_ms = Math.round(performance.now() - startTime);
      get().recordEvent({
        type: 'note_on',
        pitch,
        velocity,
        time_ms
      });
    }

    // Send to backend via WS if connected
    if (sendWs && wsSender) {
      wsSender({
        type: 'NOTE_ON',
        pitch,
        velocity
      });
    }
  },

  triggerNoteOff: (pitch, sendWs = true, source = 'Keyboard') => {
    const { activeNotes, wsSender } = get();
    if (!activeNotes.has(pitch)) return;

    synthEngine.noteOff(pitch);

    const newMap = new Map(activeNotes);
    newMap.delete(pitch);

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const logItem: RawMidiLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      type: 'NOTE_OFF',
      channel: 1,
      pitch,
      noteName: getMidiNoteName(pitch),
      velocity: 0,
      source: source || 'Keyboard'
    };

    set((state) => ({ 
      activeNotes: newMap,
      rawMidiLogs: [logItem, ...state.rawMidiLogs.slice(0, 199)]
    }));

    // Record note off if recording session is active
    if (get().isRecording) {
      const startTime = get().recordingStartTime || performance.now();
      const time_ms = Math.round(performance.now() - startTime);
      get().recordEvent({
        type: 'note_off',
        pitch,
        velocity: 0,
        time_ms
      });
    }

    if (sendWs && wsSender) {
      wsSender({
        type: 'NOTE_OFF',
        pitch
      });
    }
  },

  // Keyboard Viewport
  keyboardSize: savedSettings?.keyboardSize ?? 61,
  keyboardHeight: 220,
  octaveShift: savedSettings?.octaveShift ?? 0,
  transpose: savedSettings?.transpose ?? 0,
  keyLabels: 'notes',
  diffuseBlur: true,
  fallingNotes: true,
  flowSpeed: 1.2,
  isAutoDemo: false,
  setKeyboardSize: (size) => {
    set({ keyboardSize: size });
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) {
      wsSender({ type: 'KEY_COUNT_CHANGED', key_count: size });
    }
  },
  setKeyboardHeight: (height) => set({ keyboardHeight: Math.max(100, Math.min(420, height)) }),
  setOctaveShift: (shift) => {
    const val = Math.max(-4, Math.min(4, shift));
    set({ octaveShift: val });
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) wsSender({ type: 'OCTAVE_SHIFT_CHANGED', octave_shift: val });
  },
  incrementOctave: () => {
    const val = Math.max(-4, Math.min(4, get().octaveShift + 1));
    set({ octaveShift: val });
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) wsSender({ type: 'OCTAVE_SHIFT_CHANGED', octave_shift: val });
  },
  decrementOctave: () => {
    const val = Math.max(-4, Math.min(4, get().octaveShift - 1));
    set({ octaveShift: val });
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) wsSender({ type: 'OCTAVE_SHIFT_CHANGED', octave_shift: val });
  },
  setTranspose: (semitones) => {
    const val = Math.max(-12, Math.min(12, semitones));
    set({ transpose: val });
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) wsSender({ type: 'TRANSPOSE_CHANGED', transpose: val });
  },
  incrementTranspose: () => {
    const val = Math.max(-12, Math.min(12, get().transpose + 1));
    set({ transpose: val });
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) wsSender({ type: 'TRANSPOSE_CHANGED', transpose: val });
  },
  decrementTranspose: () => {
    const val = Math.max(-12, Math.min(12, get().transpose - 1));
    set({ transpose: val });
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) wsSender({ type: 'TRANSPOSE_CHANGED', transpose: val });
  },
  setKeyLabels: (labels) => set({ keyLabels: labels }),
  setDiffuseBlur: (enabled) => set({ diffuseBlur: enabled }),
  setFallingNotes: (enabled) => set({ fallingNotes: enabled }),
  setFlowSpeed: (speed) => set({ flowSpeed: Math.max(0.2, Math.min(3.0, speed)) }),
  setIsAutoDemo: (active) => set({ isAutoDemo: active }),
  toggleAutoDemo: () => set((state) => ({ isAutoDemo: !state.isAutoDemo })),

  // Audio Controls
  volume: savedSettings?.volume ?? 0.7,
  isMuted: false,
  instrument: 'acoustic_grand',
  isSustained: false,
  setVolume: (vol) => {
    synthEngine.setVolume(vol);
    set({ volume: vol });
    triggerPersist(get());
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
    effect: ((savedSettings?.effectConfig?.effect === 'blink' ? 'static' : savedSettings?.effectConfig?.effect) as EffectType) || 'static',
    speed: savedSettings?.effectConfig?.speed ?? 1.2,
    decay: savedSettings?.effectConfig?.decay ?? 0.85,
    spread: savedSettings?.effectConfig?.spread ?? 3.0,
    brightness: savedSettings?.effectConfig?.brightness ?? 15,
    rainbow: savedSettings?.effectConfig?.rainbow ?? false,
    primaryColor: savedSettings?.effectConfig?.primaryColor || '#00f0ff',
    secondaryColor: savedSettings?.effectConfig?.secondaryColor || '#6366f1'
  },
  setEffectParam: (param, value) => {
    const prevConfig = get().effectConfig;
    const newConfig = { ...prevConfig, [param]: value };
    let newFlowKey = get().flowKeyConfig;

    if (param === 'primaryColor' || param === 'secondaryColor' || param === 'rainbow') {
      newFlowKey = {
        ...newFlowKey,
        colorPreset: 'custom',
        customColor: param === 'primaryColor' ? (value as string) : newConfig.primaryColor,
        customSecondaryColor: param === 'secondaryColor' ? (value as string) : newConfig.secondaryColor
      };
      if (COLOR_SYNC_PRESETS.custom) {
        COLOR_SYNC_PRESETS.custom.primary = newFlowKey.customColor || newConfig.primaryColor;
        COLOR_SYNC_PRESETS.custom.secondary = newFlowKey.customSecondaryColor || newConfig.secondaryColor;
        COLOR_SYNC_PRESETS.custom.rainbow = newConfig.rainbow;
      }
    }

    set({ effectConfig: newConfig, flowKeyConfig: newFlowKey });
    triggerPersist(get());

    const { wsSender } = get();
    if (wsSender) {
      if (param === 'effect') {
        wsSender({ type: 'EFFECT_CHANGED', effect: value });
      } else {
        wsSender({ type: 'PARAM_CHANGED', param, value });
      }

      // Also forward hex color to hardware device via CLI command "color=r,g,b"
      if (param === 'primaryColor' && typeof value === 'string') {
        const rgb = hexToRgb(value);
        wsSender({ type: 'CLI_COMMAND', command: `color=${rgb.r},${rgb.g},${rgb.b}` });
        wsSender({ type: 'COLOR_PRESET_CHANGED', preset: 'Custom' });
      } else if (param === 'secondaryColor' && typeof value === 'string') {
        const rgb = hexToRgb(value);
        wsSender({ type: 'CLI_COMMAND', command: `color2=${rgb.r},${rgb.g},${rgb.b}` });
      }
    }
  },
  setFullEffectConfig: (config) => {
    set({ effectConfig: config });
    triggerPersist(get());
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

  // Flow Key Visualizer & Background FX
  flowKeyConfig: {
    trailDuration: savedSettings?.flowKeyConfig?.trailDuration ?? 1.8,
    flowSpeed: savedSettings?.flowKeyConfig?.flowSpeed ?? 1.2,
    trailStyle: savedSettings?.flowKeyConfig?.trailStyle || 'neon_bar',
    colorPreset: savedSettings?.flowKeyConfig?.colorPreset || 'cyberpunk',
    glowIntensity: savedSettings?.flowKeyConfig?.glowIntensity ?? 85,
    showParticles: savedSettings?.flowKeyConfig?.showParticles ?? true,
    bloomGlow: savedSettings?.flowKeyConfig?.bloomGlow ?? true,
    customColor: savedSettings?.flowKeyConfig?.customColor || '#00f0ff',
    customSecondaryColor: savedSettings?.flowKeyConfig?.customSecondaryColor || '#ec4899',
    flowDirection: savedSettings?.flowKeyConfig?.flowDirection || 'down'
  },
  setFlowKeyParam: (param, value) => {
    set((state) => ({
      flowKeyConfig: { ...state.flowKeyConfig, [param]: value }
    }));
    triggerPersist(get());
  },
  bgConfig: {
    showVerticalPitchLanes: savedSettings?.bgConfig?.showVerticalPitchLanes ?? true,
    showKeyRegions: savedSettings?.bgConfig?.showKeyRegions ?? true,
    showOctaveDividers: savedSettings?.bgConfig?.showOctaveDividers ?? true,
    showHorizontalBeatLines: savedSettings?.bgConfig?.showHorizontalBeatLines ?? true,
    showSubtleGrid: savedSettings?.bgConfig?.showSubtleGrid ?? true,
    scrollGrid: savedSettings?.bgConfig?.scrollGrid ?? true,
    gridColor: savedSettings?.bgConfig?.gridColor || '#6366f1',
    laneColor: savedSettings?.bgConfig?.laneColor || '#38bdf8',
    hazeColor: savedSettings?.bgConfig?.hazeColor || '#a855f7'
  },
  setBgConfigParam: (param, value) => {
    set((state) => ({
      bgConfig: { ...state.bgConfig, [param]: value }
    }));
    triggerPersist(get());
  },
  loadSettingsFromFile: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          const updates: any = {};
          if (data.effectConfig) updates.effectConfig = { ...get().effectConfig, ...data.effectConfig };
          if (data.flowKeyConfig) updates.flowKeyConfig = { ...get().flowKeyConfig, ...data.flowKeyConfig };
          if (data.bgConfig) updates.bgConfig = { ...get().bgConfig, ...data.bgConfig };
          if (typeof data.volume === 'number') updates.volume = data.volume;
          if (data.keyboardSize) updates.keyboardSize = data.keyboardSize;
          if (typeof data.octaveShift === 'number') updates.octaveShift = data.octaveShift;
          if (typeof data.transpose === 'number') updates.transpose = data.transpose;
          if (data.leftHandColor) updates.leftHandColor = data.leftHandColor;
          if (data.rightHandColor) updates.rightHandColor = data.rightHandColor;
          set(updates);
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
          } catch (e) {}
        }
      }
    } catch (e) {}
  },
  applyColorPreset: (presetId) => {
    const preset = COLOR_SYNC_PRESETS[presetId];
    if (!preset) return;
    set((state) => ({
      flowKeyConfig: { 
        ...state.flowKeyConfig, 
        colorPreset: presetId,
        customColor: preset.primary,
        customSecondaryColor: preset.secondary
      },
      effectConfig: {
        ...state.effectConfig,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        rainbow: preset.rainbow,
        effect: preset.effect
      }
    }));
    triggerPersist(get());
    const { wsSender } = get();
    if (wsSender) {
      wsSender({ type: 'COLOR_PRESET_CHANGED', preset: preset.name });
      wsSender({ type: 'EFFECT_CHANGED', effect: preset.effect });
      const pRgb = hexToRgb(preset.primary);
      const sRgb = hexToRgb(preset.secondary);
      wsSender({ type: 'CLI_COMMAND', command: `color=${pRgb.r},${pRgb.g},${pRgb.b}` });
      wsSender({ type: 'CLI_COMMAND', command: `color2=${sRgb.r},${sRgb.g},${sRgb.b}` });
    }
    get().addConsoleLog(`Applied Visual Sync Preset: ${preset.name}`);
  },

  // Songs Catalog & Unified Learning Workspace
  songsList: DEFAULT_SONGS,
  setSongsList: (songs) => set({ songsList: songs }),
  addSong: (song) => set((state) => ({ songsList: [song, ...state.songsList] })),
  currentSong: DEFAULT_SONGS[0],
  setCurrentSong: (song) => set({ currentSong: song }),
  learnSubView: 'follow',
  setLearnSubView: (view) => set({ learnSubView: view }),
  selectSongAndLearn: (song, subView = 'follow') => {
    set({
      currentSong: song,
      isSongActive: true,
      learnSubView: subView,
      activeWorkspace: 'learn',
      activeOverlay: 'learn',
      activeTab: 'learn'
    });
  },
  isSongActive: false,
  setIsSongActive: (active) => set({ isSongActive: active }),
  isSongPlaying: false,
  setIsSongPlaying: (playing) => set({ isSongPlaying: playing }),
  songPlaybackId: 0,
  startSongPlayback: (song, forceRestart = false) => {
    try {
      synthEngine.initContext();
    } catch (_) {}
    const current = song || get().currentSong;
    if (!current) return;
    // Release any previous active notes
    const { activeNotes, triggerNoteOff, currentSong, playbackBeat, playbackTotalBeats } = get();
    for (const pitch of activeNotes.keys()) {
      triggerNoteOff(pitch);
    }
    const isNewSong = !currentSong || currentSong.id !== current.id;
    const maxBeats = (current.notes && current.notes.length > 0)
      ? Math.max(...current.notes.map(n => n.time + n.duration))
      : (playbackTotalBeats || 100);
    const hasEnded = playbackBeat >= maxBeats;
    const shouldRestart = forceRestart || isNewSong || hasEnded;

    set((state) => ({
      currentSong: current,
      isSongActive: true,
      isSongPlaying: true,
      playbackBeat: shouldRestart ? 0 : state.playbackBeat,
      targetSeekBeat: shouldRestart ? 0 : state.targetSeekBeat,
      playbackTotalBeats: maxBeats,
      songPlaybackId: shouldRestart ? (state.songPlaybackId || 0) + 1 : state.songPlaybackId
    }));
  },
  restartSongPlayback: (song) => {
    get().seekToBeat(0);
    get().startSongPlayback(song, true);
  },
  stopSongPlayback: () => {
    const { activeNotes, triggerNoteOff } = get();
    for (const pitch of activeNotes.keys()) {
      triggerNoteOff(pitch);
    }
    // When paused, isSongActive stays true: notes freeze where they were, scrubber remains visible!
    set({ isSongPlaying: false, isWaitingAtHitline: false, waitingPitch: null });
  },
  closeSongSession: () => {
    const { activeNotes, triggerNoteOff } = get();
    for (const pitch of activeNotes.keys()) {
      triggerNoteOff(pitch);
    }
    // Completely closes song mode and returns to clean Normal Play Mode
    set({
      isSongActive: false,
      isSongPlaying: false,
      playbackBeat: 0,
      targetSeekBeat: 0,
      isWaitingAtHitline: false,
      waitingPitch: null
    });
  },
  playbackBeat: 0,
  playbackTotalBeats: 100,
  seekEpoch: 0,
  targetSeekBeat: 0,
  seekToBeat: (beat) => {
    set((state) => ({
      targetSeekBeat: Math.max(0, beat),
      playbackBeat: Math.max(0, beat),
      seekEpoch: state.seekEpoch + 1
    }));
  },
  setPlaybackBeat: (beat, totalBeats) => {
    set((state) => ({
      playbackBeat: beat,
      playbackTotalBeats: totalBeats !== undefined ? totalBeats : state.playbackTotalBeats
    }));
  },
  isWaitingAtHitline: false,
  waitingPitch: null,
  setWaitingState: (waiting, pitch) => set({ isWaitingAtHitline: waiting, waitingPitch: pitch }),
  practiceMode: 'wait_for_key',
  setPracticeMode: (mode) => set({ practiceMode: mode }),
  handFilter: 'both',
  setHandFilter: (filter) => set({ handFilter: filter }),
  leftHandColor: savedSettings?.leftHandColor || '#38bdf8',
  rightHandColor: savedSettings?.rightHandColor || '#10b981',
  setLeftHandColor: (color) => {
    set({ leftHandColor: color });
    triggerPersist(get());
  },
  setRightHandColor: (color) => {
    set({ rightHandColor: color });
    triggerPersist(get());
  },
  learnMode: 'watch_listen',
  setLearnMode: (mode) => set({ learnMode: mode }),

  // MIDI Performance Recording (.mid) & Playback Implementation
  isRecording: false,
  recordingStartTime: null,
  recordedEvents: [],
  isPlayingRecording: false,
  showSaveRecordingModal: false,

  startRecording: () => {
    recordingPlaybackTimers.forEach(t => clearTimeout(t));
    recordingPlaybackTimers = [];
    set({
      isRecording: true,
      recordingStartTime: performance.now(),
      recordedEvents: [],
      isPlayingRecording: false,
      showSaveRecordingModal: false
    });
    get().addConsoleLog('Started Live MIDI Recording (.mid)...');
  },

  recordEvent: (event) => {
    set((state) => ({
      recordedEvents: [...state.recordedEvents, event]
    }));
  },

  stopRecording: () => {
    const events = get().recordedEvents;
    set({ isRecording: false, recordingStartTime: null });
    get().addConsoleLog(`Stopped MIDI Recording. Captured ${events.length} events.`);
    return events;
  },

  stopRecordingAndPrompt: () => {
    get().stopRecording();
    set({ showSaveRecordingModal: true });
  },

  openSaveRecordingModal: () => set({ showSaveRecordingModal: true }),
  closeSaveRecordingModal: () => set({ showSaveRecordingModal: false }),

  playRecording: () => {
    const { recordedEvents, triggerNoteOn, triggerNoteOff } = get();
    if (recordedEvents.length === 0) return;

    recordingPlaybackTimers.forEach(t => clearTimeout(t));
    recordingPlaybackTimers = [];
    set({ isPlayingRecording: true });

    recordedEvents.forEach((ev) => {
      const timer = window.setTimeout(() => {
        if (ev.type === 'note_on') {
          triggerNoteOn(ev.pitch, ev.velocity, false, 'Playback');
        } else {
          triggerNoteOff(ev.pitch, false, 'Playback');
        }
      }, ev.time_ms);
      recordingPlaybackTimers.push(timer);
    });

    const lastEventTime = recordedEvents[recordedEvents.length - 1]?.time_ms || 1000;
    const endTimer = window.setTimeout(() => {
      set({ isPlayingRecording: false });
    }, lastEventTime + 600);
    recordingPlaybackTimers.push(endTimer);
  },

  stopPlayback: () => {
    recordingPlaybackTimers.forEach(t => clearTimeout(t));
    recordingPlaybackTimers = [];
    set({ isPlayingRecording: false });
  },

  downloadRecording: (filename = 'LightSync_Performance.mid') => {
    const { recordedEvents } = get();
    if (recordedEvents.length === 0) return;
    const midiBytes = createMidiFile(recordedEvents, filename.replace(/\.mid$/i, ''), 120);
    downloadMidiFile(midiBytes, filename);
    get().addConsoleLog(`Downloaded ${filename} (${midiBytes.length} bytes)`);
  },

  saveRecordingAsSong: async (title = 'My Live Performance') => {
    const { recordedEvents, addSong, setCurrentSong } = get();
    if (recordedEvents.length === 0) return null;

    const activeNoteStarts = new Map<number, { startTimeMs: number; velocity: number }>();
    const songNotes: SongNote[] = [];
    const msPerBeat = 500; // 120 BPM

    recordedEvents.forEach((ev) => {
      if (ev.type === 'note_on') {
        activeNoteStarts.set(ev.pitch, { startTimeMs: ev.time_ms, velocity: ev.velocity });
      } else if (ev.type === 'note_off') {
        const start = activeNoteStarts.get(ev.pitch);
        if (start) {
          const durationMs = Math.max(100, ev.time_ms - start.startTimeMs);
          const beatTime = parseFloat((start.startTimeMs / msPerBeat).toFixed(2));
          const beatDuration = parseFloat((durationMs / msPerBeat).toFixed(2));
          songNotes.push({
            pitch: ev.pitch,
            name: getMidiNoteName(ev.pitch),
            time: beatTime,
            duration: beatDuration,
            hand: ev.pitch < 60 ? 'left' : 'right'
          });
          activeNoteStarts.delete(ev.pitch);
        }
      }
    });

    activeNoteStarts.forEach((start, pitch) => {
      const beatTime = parseFloat((start.startTimeMs / msPerBeat).toFixed(2));
      songNotes.push({
        pitch,
        name: getMidiNoteName(pitch),
        time: beatTime,
        duration: 1.0,
        hand: pitch < 60 ? 'left' : 'right'
      });
    });

    songNotes.sort((a, b) => a.time - b.time);

    const songId = `rec_${Date.now()}`;
    const newSong: SongItem = {
      id: songId,
      title: title || 'Recorded Performance',
      composer: 'Live User Session',
      difficulty: 'Beginner',
      bpm: 120,
      time_signature: '4/4',
      key: 'C Major',
      notes: songNotes,
      source: 'imported'
    };

    addSong(newSong);
    setCurrentSong(newSong);
    get().addConsoleLog(`Saved recorded session as song: "${newSong.title}" with ${songNotes.length} notes.`);

    try {
      await fetch(getApiUrl('/api/midi/record/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSong.title,
          events: recordedEvents,
          bpm: 120
        })
      });
    } catch (e) {}

    return newSong;
  },
  expectedPitch: null,
  setExpectedPitch: (pitch) => set({ expectedPitch: pitch }),
  sessionHistory: [],
  setSessionHistory: (history) => set({ sessionHistory: history }),
  addSessionResult: (res) => set((state) => ({ sessionHistory: [res, ...state.sessionHistory] })),
  showSessionAnalysis: false,
  completedSessionResult: null,
  openSessionAnalysis: (result) => {
    if (result) {
      set({ completedSessionResult: result, showSessionAnalysis: true });
    } else {
      const res = get().completePracticeSession();
      set({ completedSessionResult: res, showSessionAnalysis: true });
    }
  },
  closeSessionAnalysis: () => set({ showSessionAnalysis: false }),
  completePracticeSession: (mode = 'learn') => {
    const { currentTelemetry, currentSong, addSessionResult } = get();
    const totalNotes = currentSong?.notes?.length || currentTelemetry.totalNotes || 1;
    const correctNotes = currentTelemetry.hits;
    const accuracy = Math.round((correctNotes / Math.max(1, totalNotes)) * 100);

    const result: SessionResult = {
      id: Date.now(),
      song_id: currentSong?.id || currentTelemetry.songId || 'unknown',
      song_title: currentSong?.title || currentTelemetry.songTitle || 'Practice Piece',
      mode,
      duration_sec: currentTelemetry.durationSec || 60,
      total_notes: totalNotes,
      correct_notes: correctNotes,
      missed_notes: currentTelemetry.misses,
      accuracy_pct: accuracy,
      avg_deviation_ms: currentTelemetry.avgDeviationMs,
      ratings_count: {
        PERFECT: currentTelemetry.timingRatings.PERFECT,
        GOOD: currentTelemetry.timingRatings.GOOD,
        EARLY: currentTelemetry.timingRatings.EARLY,
        LATE: currentTelemetry.timingRatings.LATE,
        MISS: currentTelemetry.timingRatings.MISS
      },
      max_streak: currentTelemetry.streak,
      avg_velocity: currentTelemetry.avgVelocity,
      problem_measures: currentTelemetry.problemMeasures,
      notes_detail: currentTelemetry.recordedNotes || [],
      recorded_notes: currentTelemetry.recordedNotes || [],
      created_at: new Date().toISOString()
    };

    addSessionResult(result);
    set({ completedSessionResult: result, showSessionAnalysis: true });
    return result;
  },

  midiFolderPath: null,
  isScanningMidi: false,
  fetchSongs: async () => {
    try {
      const res = await fetch(getApiUrl('/api/songs'));
      if (!res.ok) return;
      const data = await res.json();
      if (data.songs && Array.isArray(data.songs)) {
        set({ 
          songsList: data.songs,
          midiFolderPath: data.midi_folder || null
        });
      }
    } catch (e) {
      console.warn('Could not fetch songs from backend:', e);
    }
  },
  rescanMidiFolder: async () => {
    set({ isScanningMidi: true });
    try {
      const res = await fetch(getApiUrl('/api/songs/rescan'), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.songs) {
          set({ 
            songsList: data.songs,
            midiFolderPath: data.midi_folder || null
          });
          get().addConsoleLog(`Rescanned MIDI folder: ${data.songs.length} songs loaded.`);
        }
      }
    } catch (e) {
      console.error('Failed to rescan MIDI folder:', e);
      get().addConsoleLog('Failed to rescan MIDI folder (backend offline).');
    } finally {
      set({ isScanningMidi: false });
    }
  },
  uploadMidiFile: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(getApiUrl('/api/songs/upload'), {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.song) {
          const song = data.song as SongItem;
          get().addSong(song);
          get().addConsoleLog(`Imported MIDI: "${song.title}" (${song.notes.length} notes)`);
          return song;
        }
      }
    } catch (e) {
      console.warn('Backend upload failed, falling back to client-side parsing:', e);
    }
    return null;
  },
  deleteMidiSong: async (songId: string) => {
    try {
      await fetch(getApiUrl(`/api/songs/${encodeURIComponent(songId)}`), {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed to delete on backend:', e);
    }
    set((state) => ({
      songsList: state.songsList.filter((s) => s.id !== songId),
      currentSong: state.currentSong?.id === songId ? state.songsList[0] || null : state.currentSong
    }));
    get().addConsoleLog(`Removed song: ${songId}`);
    return true;
  },

  // Ports & Hardware Connection State & Actions
  midiPorts: [],
  activeMidiPort: null,
  isMidiConnected: false,
  devicePorts: [{ port: 'SIMULATED', desc: 'Virtual M5Stack Strip Simulator' }],

  fetchMidiPorts: async () => {
    try {
      const res = await fetch('/api/midi/ports');
      if (res.ok) {
        const data = await res.json();
        set({
          midiPorts: data.ports || [],
          activeMidiPort: data.active || null,
          isMidiConnected: !!data.active
        });
      }
    } catch (e) {
      console.warn('Could not fetch MIDI ports:', e);
    }
  },

  connectMidiPort: async (port: string) => {
    try {
      const res = await fetch('/api/midi/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      if (res.ok) {
        const data = await res.json();
        set({
          activeMidiPort: data.active_port || null,
          isMidiConnected: !!data.active_port
        });
        get().addConsoleLog(`Connected MIDI Input Port: ${data.active_port || 'Virtual'}`);
        return !!data.active_port;
      }
    } catch (e) {
      get().addConsoleLog(`Failed to connect MIDI port ${port}`);
    }
    return false;
  },

  disconnectMidiPort: async () => {
    try {
      await fetch('/api/midi/disconnect', { method: 'POST' });
    } catch {}
    set({ activeMidiPort: null, isMidiConnected: false });
    get().addConsoleLog('Disconnected MIDI Input Port.');
    return true;
  },

  fetchDevicePorts: async () => {
    try {
      const res = await fetch('/api/device/ports');
      if (res.ok) {
        const data = await res.json();
        const ports: Array<{ port: string; desc: string }> = data.ports || [];
        set({ devicePorts: ports });

        const cp210xPort = ports.find((p) => {
          const d = (p.desc || '').toLowerCase();
          return p.port !== 'STANDALONE' && (d.includes('silicon') || d.includes('cp210') || d.includes('m5stack') || d.includes('ch340'));
        });
        const bestPort = cp210xPort ? cp210xPort.port : (ports.find((p) => p.port !== 'STANDALONE')?.port || 'STANDALONE');
        if (bestPort && bestPort !== 'STANDALONE') {
          set((state) => ({
            deviceStatus: {
              ...state.deviceStatus,
              port: state.deviceStatus.port && state.deviceStatus.port !== 'STANDALONE' ? state.deviceStatus.port : bestPort
            }
          }));
        }
      }
    } catch (e) {
      console.warn('Could not fetch device COM ports:', e);
    }
  },

  connectDevicePort: async (port: string, baud = 115200) => {
    try {
      const res = await fetch('/api/device/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, baud })
      });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          deviceStatus: {
            ...state.deviceStatus,
            connected: data.success,
            port: data.port,
            simulated: data.simulated
          }
        }));
        get().addConsoleLog(`Connected LightSync Module Port: ${data.port} (simulated=${data.simulated})`);
        return data.success;
      }
    } catch (e) {
      get().addConsoleLog(`Failed to connect LightSync Module Port ${port}`);
    }
    return false;
  },

  disconnectDevicePort: async () => {
    try {
      await fetch('/api/device/disconnect', { method: 'POST' });
    } catch {}
    set((state) => ({
      deviceStatus: {
        ...state.deviceStatus,
        connected: false,
        port: 'SIMULATED',
        simulated: true
      }
    }));
    get().addConsoleLog('Disconnected LightSync Module Port.');
    return true;
  },

  // AI Coach Feedback & MIRA System
  aiCoachFeedback: null,
  setAiCoachFeedback: (feedback) => set({ aiCoachFeedback: feedback }),
  geminiRelayUrl: 'http://127.0.0.1:8000',
  setGeminiRelayUrl: (url) => set({ geminiRelayUrl: url }),

  currentTelemetry: {
    songId: 'ode_to_joy',
    songTitle: 'Ode to Joy',
    totalNotes: 0,
    hits: 0,
    misses: 0,
    streak: 0,
    accuracyPct: 100,
    avgDeviationMs: 0,
    timingRatings: { PERFECT: 0, GOOD: 0, EARLY: 0, LATE: 0, MISS: 0 },
    handAccuracy: { left: 100, right: 100 },
    avgVelocity: 85,
    problemMeasures: [],
    durationSec: 0,
    recordedNotes: []
  },

  updateTelemetry: (partial) =>
    set((state) => ({ currentTelemetry: { ...state.currentTelemetry, ...partial } })),

  resetTelemetry: (songTitle = 'Ode to Joy', songId = 'ode_to_joy') =>
    set({
      currentTelemetry: {
        songId,
        songTitle,
        totalNotes: 0,
        hits: 0,
        misses: 0,
        streak: 0,
        accuracyPct: 100,
        avgDeviationMs: 0,
        timingRatings: { PERFECT: 0, GOOD: 0, EARLY: 0, LATE: 0, MISS: 0 },
        handAccuracy: { left: 100, right: 100 },
        avgVelocity: 85,
        problemMeasures: [],
        durationSec: 0,
        recordedNotes: []
      }
    }),

  recordNoteAttempt: ({ pitch, expectedPitch, timeOffsetMs, velocity, hand, measure, hit }) =>
    set((state) => {
      const prev = state.currentTelemetry;
      const totalNotes = prev.totalNotes + 1;
      const hits = prev.hits + (hit ? 1 : 0);
      const misses = prev.misses + (hit ? 0 : 1);
      const streak = hit ? prev.streak + 1 : 0;
      const accuracyPct = Math.round((hits / totalNotes) * 100);

      const absOffset = Math.abs(timeOffsetMs);
      const avgDeviationMs = hit
        ? Math.round((prev.avgDeviationMs * prev.hits + timeOffsetMs) / hits)
        : prev.avgDeviationMs;

      let lastRating: 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS' = 'PERFECT';
      const ratings = { ...prev.timingRatings };
      if (!hit) {
        ratings.MISS++;
        lastRating = 'MISS';
      } else if (absOffset <= 25) {
        ratings.PERFECT++;
        lastRating = 'PERFECT';
      } else if (absOffset <= 60) {
        ratings.GOOD++;
        lastRating = 'GOOD';
      } else if (timeOffsetMs < 0) {
        ratings.EARLY++;
        lastRating = 'EARLY';
      } else {
        ratings.LATE++;
        lastRating = 'LATE';
      }

      const problemMeasures = !hit && !prev.problemMeasures.includes(measure)
        ? [...prev.problemMeasures, measure].sort((a, b) => a - b)
        : prev.problemMeasures;

      const avgVelocity = Math.round((prev.avgVelocity * (totalNotes - 1) + velocity) / totalNotes);

      const noteAttempt = {
        timestamp: Date.now(),
        expected_pitch: expectedPitch || pitch,
        played_pitch: pitch,
        is_correct: hit,
        deviation_ms: timeOffsetMs,
        velocity,
        rating: lastRating,
        note_name: getMidiNoteName(pitch),
        expected_name: expectedPitch ? getMidiNoteName(expectedPitch) : getMidiNoteName(pitch),
        measure,
        hand
      };

      return {
        currentTelemetry: {
          ...prev,
          totalNotes,
          hits,
          misses,
          streak,
          accuracyPct,
          avgDeviationMs,
          timingRatings: ratings,
          problemMeasures,
          avgVelocity,
          lastRating,
          recordedNotes: [...(prev.recordedNotes || []), noteAttempt]
        }
      };
    }),

  miraChatMessages: [
    {
      id: 'mira_welcome',
      role: 'assistant',
      text: 'Hello! I am MIRA — Musical Intelligence & Rhythm Assistant. I listen to your tempo, finger timing, and velocity in real time. Ask me anything about your playing, or click "Ask MIRA" to generate a personalized practice course for your song!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ],

  addMiraChatMessage: (msg) =>
    set((state) => ({
      miraChatMessages: [
        ...state.miraChatMessages,
        {
          id: Math.random().toString(36).substring(2, 9),
          role: msg.role,
          text: msg.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    })),

  clearMiraChat: () =>
    set({
      miraChatMessages: [
        {
          id: 'mira_welcome',
          role: 'assistant',
          text: 'Chat history cleared. How can I help with your practice session?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    }),

  miraCurriculum: null,
  setMiraCurriculum: (curriculum) => set({ miraCurriculum: curriculum }),

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
  rawMidiLogs: [],
  addRawMidiLog: (log) => set((state) => ({ rawMidiLogs: [log, ...state.rawMidiLogs.slice(0, 199)] })),
  clearRawMidiLogs: () => set({ rawMidiLogs: [] }),

  // WS
  wsSender: null,
  setWsSender: (sender) => set({ wsSender: sender })
}));

