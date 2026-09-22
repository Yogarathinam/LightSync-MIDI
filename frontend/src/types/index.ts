export type ThemeMode = 'light' | 'dark';

export type TopNavTab = 'songs' | 'learn' | 'play' | 'visualize' | 'effects' | 'aicoach' | 'hardware';

export type WorkspaceId = 'songs' | 'learn' | 'effects' | 'aicoach' | 'play' | 'hardware';
export type UtilityOverlayId = 'quick_settings' | 'settings';

export type LearnSubView = 'follow' | 'practice' | 'analyze' | 'progress';

export type StudioTab = TopNavTab | 'play' | 'practice' | 'analyze' | 'device' | 'hardware';

export interface RawMidiLog {
  id: string;
  timestamp: string;
  type: 'NOTE_ON' | 'NOTE_OFF';
  channel: number;
  pitch: number;
  noteName: string;
  velocity: number;
  chord?: string;
  source: string;
}

export type OverlayModalType = WorkspaceId | UtilityOverlayId | null;

export type InstrumentType = 'acoustic_grand' | 'electric_rhodes' | 'warm_synth' | 'marimba';

export type EffectType = 
  | 'bounce' 
  | 'ripple' 
  | 'pulse' 
  | 'hold_beam' 
  | 'glitch' 
  | 'spark' 
  | 'sprinkle' 
  | 'rain' 
  | 'wave'
  | 'static'
  | 'blink';

export interface EffectConfig {
  effect: EffectType;
  speed: number;
  decay: number;
  spread: number;
  brightness: number;
  rainbow: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export type FlowKeyTrailStyle = 'neon_bar' | 'glow_laser' | 'particle_cascade' | 'gradient_ribbon';

export type ColorSyncPresetId = 
  | 'cyberpunk' 
  | 'synthwave' 
  | 'emerald_matrix' 
  | 'sunset_horizon' 
  | 'electric_indigo' 
  | 'crimson_nova' 
  | 'rainbow_spectrum'
  | 'custom';

export interface RecordedMidiEvent {
  type: 'note_on' | 'note_off';
  pitch: number;
  velocity: number;
  time_ms: number;
}

export interface FlowKeyConfig {
  trailDuration: number;          // in seconds: 0.5 to 4.0
  flowSpeed: number;              // 0.5 to 3.0
  trailStyle: FlowKeyTrailStyle;
  colorPreset: ColorSyncPresetId;
  glowIntensity: number;          // 0 to 100
  showParticles: boolean;         // Sparks at impact/head
  bloomGlow: boolean;             // Outer glow aura
  customColor?: string;           // Custom FlowKey Primary Color (hex)
  customSecondaryColor?: string;  // Custom FlowKey Secondary Color (hex)
  flowDirection?: 'up' | 'down';  // 'down' (top-to-bottom waterfall) or 'up' (bottom-to-top trail)
}

export interface VisualizerBackgroundConfig {
  showVerticalPitchLanes: boolean;    // Vertical lines corresponding to piano keys / pitches
  showKeyRegions: boolean;            // Key/pitch regions aligned with keyboard (subtle zebra tint)
  showOctaveDividers: boolean;        // Stronger markings around important divisions (C1, C2...)
  showHorizontalBeatLines: boolean;   // Horizontal divisions giving sense of distance/time
  showSubtleGrid: boolean;            // Subtle intermediate grid lines
  scrollGrid: boolean;                // Animated moving time grid
  gridColor?: string;                 // Custom Horizon & Beat Grid Line Color (hex)
  laneColor?: string;                 // Custom Vertical Pitch Lane Divider Color (hex)
  hazeColor?: string;                 // Custom Volumetric Atmosphere Glow Color (hex)
}

export interface PresetItem extends EffectConfig {
  id: string;
  name: string;
  is_factory?: boolean;
}

export interface ActiveNoteState {
  pitch: number;
  velocity: number;
  centerLed: number;
  startTime: number;
}

export interface ChordInfo {
  chord: string;
  root: string;
  type: string;
  bass: string;
  pitches: number[];
}

export interface SongNote {
  pitch: number;
  name: string;
  time: number;       // In beats
  duration: number;   // In beats
  hand: 'left' | 'right';
}

export interface SongItem {
  id: string;
  title: string;
  composer: string;
  difficulty: string;
  bpm: number;
  time_signature: string;
  key: string;
  notes: SongNote[];
  source?: 'curated' | 'local_midi' | 'imported';
  filename?: string;
}

export interface NoteAttempt {
  timestamp: number;
  expected_pitch: number;
  played_pitch: number;
  is_correct: boolean;
  deviation_ms: number;
  velocity: number;
  rating: 'PERFECT' | 'GREAT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS';
  note_name?: string;
  expected_name?: string;
  measure?: number;
  hand?: string;
}

export interface SessionResult {
  id?: number;
  song_id: string;
  song_title: string;
  mode: string;
  duration_sec: number;
  total_notes: number;
  correct_notes: number;
  missed_notes: number;
  accuracy_pct: number;
  avg_deviation_ms: number;
  ratings_count: {
    PERFECT: number;
    GOOD?: number;
    GREAT?: number;
    EARLY: number;
    LATE: number;
    MISS: number;
  };
  max_streak?: number;
  avg_velocity?: number;
  problem_measures?: number[];
  notes_detail?: NoteAttempt[];
  recorded_notes?: NoteAttempt[];
  created_at?: string;
}

export interface AICoachFeedback {
  headline: string;
  tone: string;
  summary: string;
  timing_diagnosis: string;
  accuracy_score: number;
  avg_deviation_ms: number;
  drills: Array<{
    title: string;
    action: string;
  }>;
  coach_signature: string;
}

export interface SessionTelemetry {
  songId: string;
  songTitle: string;
  totalNotes: number;
  hits: number;
  misses: number;
  streak: number;
  accuracyPct: number;
  avgDeviationMs: number;
  timingRatings: {
    PERFECT: number;
    GOOD: number;
    EARLY: number;
    LATE: number;
    MISS: number;
  };
  handAccuracy: { left: number; right: number };
  avgVelocity: number;
  problemMeasures: number[];
  durationSec: number;
  lastRating?: 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISS' | null;
  recordedNotes?: NoteAttempt[];
}

export interface MiraCurriculumStep {
  step: number;
  title: string;
  description: string;
  tempoScale: number;
  hand: 'both' | 'left' | 'right';
  loopSection: 'all' | 'm1_4' | 'm5_8';
  targetGoal: string;
}

export interface MiraCurriculum {
  songTitle: string;
  headline: string;
  summary: string;
  steps: MiraCurriculumStep[];
  aiReasoning: string;
  generatedAt: string;
}

export interface MiraChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface DeviceStatus {
  connected: boolean;
  port: string | null;
  simulated: boolean;
  latency_ms: number;
  info?: {
    name: string;
    firmware: string;
    fps: number;
    led_count: number;
  };
}
