/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio Sound Generator for authentic Billiards sound effects & ambient lounge music
class SoundFXManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private hapticsEnabled: boolean = true;
  private volume: number = 0.8;
  private musicVolume: number = 0.25;
  private musicTimer: any = null;
  private chordIndex: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopProceduralMusic();
    } else if (this.musicEnabled) {
      this.startProceduralMusic();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled && !this.isMuted) {
      this.startProceduralMusic();
    } else {
      this.stopProceduralMusic();
    }
  }

  public getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public getHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public triggerHaptic(pattern: number | number[] = 20) {
    if (!this.hapticsEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors if unsupported or restricted in iframe
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
  }

  // Gentle procedural jazz/lounge pool hall chord progression
  public startProceduralMusic() {
    if (this.musicTimer || !this.musicEnabled || this.isMuted) return;
    this.initContext();

    // Pentatonic jazz chords: Fmaj7, Dm7, Bbmaj7, C7
    const chords = [
      [174.61, 220.0, 261.63, 329.63], // F, A, C, E
      [146.83, 220.0, 261.63, 349.23], // D, A, C, F
      [116.54, 174.61, 233.08, 293.66], // Bb, F, Bb, D
      [130.81, 196.0, 261.63, 311.13], // C, G, C, Eb
    ];

    const playNextChord = () => {
      if (!this.musicEnabled || this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = chords[this.chordIndex % chords.length];
      this.chordIndex++;

      // Soft warm Rhodes electric-piano / marimba style pad
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + 3.2);

        const chordGain = (0.04 + (idx === 0 ? 0.03 : 0.02)) * this.musicVolume;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(chordGain, t + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0005, t + 3.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + idx * 0.06);
        osc.stop(t + 4.0);
      });
    };

    // Play immediately then repeat every 4.2 seconds
    playNextChord();
    this.musicTimer = setInterval(playNextChord, 4200);
  }

  public stopProceduralMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // Wooden Cue Stick striking ceramic Cue Ball
  public playCueHit(powerRatio: number = 0.5) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const p = Math.max(0.1, Math.min(1, powerRatio));

    // High snap of wooden tip contact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 + p * 300, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    gain.gain.setValueAtTime(0.7 * this.volume * p, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    // Noise burst for cue tip chalk friction
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, t);
    noiseFilter.Q.setValueAtTime(3, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * this.volume * p, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
    noise.start(t);
  }

  // Sharp, solid ceramic ball-to-ball clack
  public playBallCollision(relativeSpeed: number = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const speed = Math.max(0.05, Math.min(2.5, relativeSpeed));
    const intensity = Math.min(1, speed / 1.5);

    // Fundamental ceramic resonant frequencies
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1800, t);
    osc1.frequency.exponentialRampToValueAtTime(900, t + 0.04);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2600, t);
    osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.03);

    const vol = Math.min(1, 0.2 + intensity * 0.8) * this.volume;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04 + intensity * 0.03);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.08);
    osc2.stop(t + 0.08);
  }

  // Rubber cushion thud with cloth dampening
  public playCushionBounce(speed: number = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const intensity = Math.min(1, Math.max(0.1, speed / 1.5));

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.09);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);

    gain.gain.setValueAtTime(0.4 * intensity * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Hollow pocket drop and leather net catch
  public playPocketDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Resonant hollow drop sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);

    gain.gain.setValueAtTime(0.6 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);

    // Second faint rumble of ball rolling into leather track
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, t2);
      osc2.frequency.exponentialRampToValueAtTime(50, t2 + 0.15);
      gain2.gain.setValueAtTime(0.3 * this.volume, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.16);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.18);
    }, 60);
  }

  // Foul buzzer / scratch cue ball
  public playFoulSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.setValueAtTime(140, t + 0.12);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  // Victory fanfare chime
  public playVictoryChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.4 * this.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.5);
      }, index * 90);
    });
  }

  // Chalking the cue tip
  public playChalkSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.Q.setValueAtTime(4, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // UI button click
  public playButtonClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const soundFX = new SoundFXManager();
