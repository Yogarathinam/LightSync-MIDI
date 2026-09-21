import { InstrumentType } from '../types';

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  releaseTime: number;
}

class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voices: Map<number, ActiveVoice> = new Map();
  private sustainedPitches: Set<number> = new Set();
  public isSustained: boolean = false;
  public instrument: InstrumentType = 'acoustic_grand';
  public isMuted: boolean = false;
  public volume: number = 0.7;

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setInstrument(inst: InstrumentType) {
    this.instrument = inst;
  }

  public setSustain(sustain: boolean) {
    this.isSustained = sustain;
    if (!sustain) {
      // Release all sustained pitches that are no longer pressed
      for (const pitch of this.sustainedPitches) {
        this.stopVoice(pitch, true);
      }
      this.sustainedPitches.clear();
    }
  }

  public noteOn(pitch: number, velocity: number = 100) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Stop existing voice for pitch if any
    if (this.voices.has(pitch)) {
      this.stopVoice(pitch, true);
    }

    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const now = this.ctx.currentTime;
    const velFactor = Math.max(0.1, velocity / 127);

    const voiceGain = this.ctx.createGain();
    const oscs: OscillatorNode[] = [];
    let filter: BiquadFilterNode | undefined;

    switch (this.instrument) {
      case 'acoustic_grand': {
        // Warm piano: fundamental triangle + subtle octave sine + lowpass filter
        filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000 * velFactor + 800, now);
        filter.Q.setValueAtTime(1.0, now);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, now);

        const osc2Gain = this.ctx.createGain();
        osc2Gain.gain.setValueAtTime(0.25, now);

        osc1.connect(voiceGain);
        osc2.connect(osc2Gain);
        osc2Gain.connect(voiceGain);

        voiceGain.connect(filter);
        filter.connect(this.masterGain);

        // Acoustic ADSR envelope
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(0.45 * velFactor, now + 0.015);
        voiceGain.gain.exponentialRampToValueAtTime(0.28 * velFactor, now + 0.3);

        osc1.start(now);
        osc2.start(now);
        oscs.push(osc1, osc2);
        break;
      }

      case 'electric_rhodes': {
        // Rhodes tine: sine + chime bell harmonic
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 3, now); // 3rd harmonic bell

        const chimeGain = this.ctx.createGain();
        chimeGain.gain.setValueAtTime(0.18, now);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc1.connect(voiceGain);
        osc2.connect(chimeGain);
        chimeGain.connect(voiceGain);
        voiceGain.connect(this.masterGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(0.35 * velFactor, now + 0.02);
        voiceGain.gain.exponentialRampToValueAtTime(0.22 * velFactor, now + 0.8);

        osc1.start(now);
        osc2.start(now);
        oscs.push(osc1, osc2);
        break;
      }

      case 'warm_synth': {
        // Analog poly synth: slightly detuned sawtooth pair
        filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400 * velFactor + 400, now);
        filter.Q.setValueAtTime(4.0, now);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.004, now); // Detuned

        osc1.connect(voiceGain);
        osc2.connect(voiceGain);
        voiceGain.connect(filter);
        filter.connect(this.masterGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(0.22 * velFactor, now + 0.04);

        osc1.start(now);
        osc2.start(now);
        oscs.push(osc1, osc2);
        break;
      }

      case 'marimba': {
        // Wooden pluck: Sine with rapid percussive decay
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(voiceGain);
        voiceGain.connect(this.masterGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(0.55 * velFactor, now + 0.008);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.start(now);
        oscs.push(osc);
        break;
      }
    }

    this.voices.set(pitch, {
      oscillators: oscs,
      gainNode: voiceGain,
      filterNode: filter,
      releaseTime: now
    });
  }

  public noteOff(pitch: number) {
    if (this.isSustained) {
      this.sustainedPitches.add(pitch);
      return;
    }
    this.stopVoice(pitch);
  }

  private stopVoice(pitch: number, immediate: boolean = false) {
    const voice = this.voices.get(pitch);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    const releaseDuration = immediate ? 0.05 : 0.25;

    try {
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
      voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseDuration);

      setTimeout(() => {
        voice.oscillators.forEach(osc => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        });
        voice.gainNode.disconnect();
        if (voice.filterNode) voice.filterNode.disconnect();
      }, releaseDuration * 1000 + 50);
    } catch {}

    this.voices.delete(pitch);
  }

  public playClick(highPitch: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(highPitch ? 1200 : 800, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const synthEngine = new SynthEngine();
