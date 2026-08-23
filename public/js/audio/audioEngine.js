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
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenActive = false;
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
      this.setupSirenSynth();
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

  setupSirenSynth() {
    if (!this.ctx) return;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.sirenGain.connect(this.masterGain);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenOsc.start();
  }

  setSiren(active) {
    if (!this.initialized || !this.ctx || this.isMuted || !this.sirenGain) return;
    this.sirenActive = active;
    this.sirenGain.gain.setTargetAtTime(active ? 0.12 : 0.0001, this.ctx.currentTime, 0.1);
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

    // Modulate police siren wail
    if (this.sirenActive && this.sirenOsc) {
      const sirenFreq = 650 + Math.sin(performance.now() * 0.006) * 280;
      this.sirenOsc.frequency.setValueAtTime(sirenFreq, this.ctx.currentTime);
    }
  }

  playCameraShutter() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
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
      osc.frequency.setValueAtTime(isHigh ? 880 : 440, now);

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
      const notes = [523.25, 659.25, 783.99, 1046.5];
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

  playBackfire() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.07);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  playHorn(tone = 0) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      if (tone === 0) {
        // Iconic Indian Musical Pressure Horn (Tri-Tone Blast)
        const notes = [
          { f: 440.00, t: 0, d: 0.14 },
          { f: 554.37, t: 0.10, d: 0.15 },
          { f: 659.25, t: 0.22, d: 0.32 },
          { f: 880.00, t: 0.22, d: 0.32 },
        ];
        notes.forEach((n) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n.f, now + n.t);

          gain.gain.setValueAtTime(0.24, now + n.t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d + 0.01);
        });
      } else if (tone === 1) {
        // High-Pitch Twin Disc Horn
        [440.00, 523.25].forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.29);
        });
      } else {
        // Heavy Pneumatic Highway Blast
        [164.81, 220.00].forEach((f) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.46);
        });
      }
    } catch {}
  }

  playRadarChirp(intensity = 0.5) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450 + intensity * 600, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.08);
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
