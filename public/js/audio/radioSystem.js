// In-Game Procedural Radio Stations for NCR ESCAPE (spec §22).
// Web Audio API procedural melodic patterns & basslines with zero external MP3s.

export const RADIO_STATIONS = [
  { id: 'off', name: 'Radio: OFF', freq: '---' },
  { id: 'synthwave', name: 'NCR Synthwave FM', freq: '98.4 FM', tempo: 120 },
  { id: 'desibass', name: 'Delhi Desi Bass', freq: '104.2 FM', tempo: 130 },
  { id: 'cyberchill', name: 'Cyber Chillout', freq: '91.1 FM', tempo: 90 },
];

export class RadioSystem {
  constructor(audioEngine) {
    this.audio = audioEngine;
    this.currentStationIndex = 0; // default OFF
    this.timer = null;
    this.step = 0;
  }

  getCurrentStation() {
    return RADIO_STATIONS[this.currentStationIndex];
  }

  nextStation() {
    this.currentStationIndex = (this.currentStationIndex + 1) % RADIO_STATIONS.length;
    this.applyStation();
    return this.getCurrentStation();
  }

  prevStation() {
    this.currentStationIndex = (this.currentStationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    this.applyStation();
    return this.getCurrentStation();
  }

  applyStation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const station = this.getCurrentStation();
    if (station.id === 'off') return;

    this.audio.unlock();
    const intervalMs = (60 / station.tempo) * 500; // 8th note interval

    this.step = 0;
    this.timer = setInterval(() => {
      this.playStep(station.id);
      this.step = (this.step + 1) % 16;
    }, intervalMs);
  }

  playStep(stationId) {
    if (!this.audio.initialized || !this.audio.ctx || this.audio.isMuted) return;
    const ctx = this.audio.ctx;
    const now = ctx.currentTime;

    if (stationId === 'synthwave') {
      // 80s Synthwave Bass Arp & Pad Chords
      const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]; // A2, C3, D3, E3
      const freq = bassNotes[this.step % bassNotes.length];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + Math.sin(this.step) * 200, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audio.masterGain);

      osc.start(now);
      osc.stop(now + 0.23);
    } else if (stationId === 'desibass') {
      // Punchy Electronic Bass & Sub Rhythm
      if (this.step % 4 === 0 || this.step % 4 === 2) {
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();

        sub.type = 'sine';
        sub.frequency.setValueAtTime(this.step % 8 === 0 ? 65.41 : 73.42, now); // C2 / D2

        subGain.gain.setValueAtTime(0.09, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        sub.connect(subGain);
        subGain.connect(this.audio.masterGain);

        sub.start(now);
        sub.stop(now + 0.29);
      }
    } else if (stationId === 'cyberchill') {
      // Ambient Chillout Minor Chords
      if (this.step % 8 === 0) {
        const chord = this.step === 0 ? [220, 261.63, 329.63] : [174.61, 220, 261.63]; // Am / F
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

          osc.connect(gain);
          gain.connect(this.audio.masterGain);

          osc.start(now);
          osc.stop(now + 1.25);
        });
      }
    }
  }
}
