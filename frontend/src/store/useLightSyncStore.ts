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
  SessionResult, 
  AICoachFeedback, 
  DeviceStatus,
  FlowKeyConfig,
  VisualizerBackgroundConfig,
  ColorSyncPresetId
} from '../types';
import { synthEngine } from '../audio/synthEngine';

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
  triggerNoteOn: (pitch: number, velocity?: number, sendWs?: boolean) => void;
  triggerNoteOff: (pitch: number, sendWs?: boolean) => void;
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
  midiFolderPath: string | null;
  isScanningMidi: boolean;
  fetchSongs: () => Promise<void>;
  rescanMidiFolder: () => Promise<void>;
  uploadMidiFile: (file: File) => Promise<SongItem | null>;
  deleteMidiSong: (songId: string) => Promise<boolean>;

  // AI Coach Feedback
  aiCoachFeedback: AICoachFeedback | null;
  setAiCoachFeedback: (feedback: AICoachFeedback | null) => void;

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

  // Outgoing WS message callback hook
  wsSender: ((msg: object) => void) | null;
  setWsSender: (sender: (msg: object) => void) => void;
}


let overlayTimer: number | null = null;

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
  keyboardHeight: 220,
  octaveShift: 0,
  transpose: 0,
  keyLabels: 'notes',
  diffuseBlur: true,
  fallingNotes: true,
  flowSpeed: 1.2,
  isAutoDemo: false,
  setKeyboardSize: (size) => {
    set({ keyboardSize: size });
    const { wsSender } = get();
    if (wsSender) {
      wsSender({ type: 'KEY_COUNT_CHANGED', key_count: size });
    }
  },
  setKeyboardHeight: (height) => set({ keyboardHeight: Math.max(100, Math.min(420, height)) }),
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

  // Flow Key Visualizer & Background FX
  flowKeyConfig: {
    trailDuration: 1.8,
    flowSpeed: 1.2,
    trailStyle: 'neon_bar',
    colorPreset: 'cyberpunk',
    glowIntensity: 85,
    showParticles: true,
    bloomGlow: true
  },
  setFlowKeyParam: (param, value) => {
    set((state) => ({
      flowKeyConfig: { ...state.flowKeyConfig, [param]: value }
    }));
  },
  bgConfig: {
    showVerticalPitchLanes: true,
    showKeyRegions: true,
    showOctaveDividers: true,
    showHorizontalBeatLines: true,
    showSubtleGrid: true,
    scrollGrid: true
  },
  setBgConfigParam: (param, value) => {
    set((state) => ({
      bgConfig: { ...state.bgConfig, [param]: value }
    }));
  },
  applyColorPreset: (presetId) => {
    const preset = COLOR_SYNC_PRESETS[presetId];
    if (!preset) return;
    set((state) => ({
      flowKeyConfig: { ...state.flowKeyConfig, colorPreset: presetId },
      effectConfig: {
        ...state.effectConfig,
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        rainbow: preset.rainbow,
        effect: preset.effect
      }
    }));
    const { wsSender } = get();
    if (wsSender) {
      wsSender({ type: 'COLOR_PRESET_CHANGED', preset: preset.name });
      wsSender({ type: 'EFFECT_CHANGED', effect: preset.effect });
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
      learnSubView: subView,
      activeWorkspace: 'learn',
      activeOverlay: 'learn',
      activeTab: 'learn'
    });
  },
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

  midiFolderPath: null,
  isScanningMidi: false,
  fetchSongs: async () => {
    try {
      const res = await fetch('http://localhost:8000/api/songs');
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
      const res = await fetch('http://localhost:8000/api/songs/rescan', { method: 'POST' });
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
      const res = await fetch('http://localhost:8000/api/songs/upload', {
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
      await fetch(`http://localhost:8000/api/songs/${encodeURIComponent(songId)}`, {
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
        set({ devicePorts: data.ports || [] });
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

