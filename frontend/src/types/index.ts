export type ThemeMode = 'light' | 'dark';

export type StudioTab = 'play' | 'effects' | 'learn' | 'practice' | 'analyze' | 'aicoach' | 'device';

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
  | 'wave';

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
}

export interface NoteAttempt {
  timestamp: number;
  expected_pitch: number;
  played_pitch: number;
  is_correct: boolean;
  deviation_ms: number;
  velocity: number;
  rating: 'PERFECT' | 'GREAT' | 'EARLY' | 'LATE' | 'MISS';
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
    GREAT: number;
    EARLY: number;
    LATE: number;
    MISS: number;
  };
  notes_detail?: NoteAttempt[];
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
