// Web Audio API procedural sound synthesis for NCR ESCAPE (spec §22).
// Zero external sound files required — works offline, instantaneous load, no asset fetching.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.tireGain = null;
    this.tireNoise = null;
    this.tireFilter = null;
    this.enabled = true;
    this.isMuted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupTireSynth();
      this.initialized = true;
    } catch {
      /* Web Audio not supported in environment */
    }
  }

  unlock() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.engineGain.connect(this.masterGain);

    // Two oscillators for rich rumble & motor harmonics
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.engineOsc1.connect(filter);
    this.engineOsc2.connect(filter);
    filter.connect(this.engineGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineFilter = filter;
  }

  setupTireSynth() {
    if (!this.ctx) return;
    // White noise generator for tire screech
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(900, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    whiteNoise.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    whiteNoise.start();
  }

  update(speed, throttle, isDrifting, dt) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const absSpeed = Math.abs(speed);
    const rpmFactor = Math.min(absSpeed / 50, 1);
    const throttleBoost = throttle > 0 ? 1.25 : 0.85;

    // Modulate engine pitch
    const baseFreq = 42 + rpmFactor * 130 * throttleBoost;
    if (this.engineOsc1 && this.engineOsc2 && this.engineFilter) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.05, this.ctx.currentTime, 0.05);
      this.engineFilter.frequency.setTargetAtTime(280 + rpmFactor * 750, this.ctx.currentTime, 0.05);
      const volume = (0.05 + Math.min(absSpeed / 60, 0.12) + (throttle > 0 ? 0.04 : 0));
      this.engineGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }

    // Modulate tire screech
    if (this.tireGain) {
      const screechVol = isDrifting && absSpeed > 5 ? Math.min(0.22, (absSpeed / 40) * 0.22) : 0.0001;
      this.tireGain.gain.setTargetAtTime(screechVol, this.ctx.currentTime, 0.04);
    }
  }

  playCollision(impactForce = 1) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

      gain.gain.setValueAtTime(Math.min(0.35 * impactForce, 0.45), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  playBeep(isHigh = false) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isHigh ? 880 : 440, now); // A5 or A4

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  playChime() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteTime = now + i * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.18, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.36);
      });
    } catch {}
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

export const audioEngine = new AudioEngine();
