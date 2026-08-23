// In-Car Audio & Radio System for NCR ESCAPE (spec §22).
// Features authentic 90s & 2000s Bollywood Melodies, Punjabi Dhol/Tumbi Basslines, Lo-Fi, and AUX MP3 playback.

export const RADIO_STATIONS = [
  {
    id: 'off',
    name: 'Radio: OFF',
    freq: '---',
    era: 'OFF',
    tracks: [{ title: 'Engine Sound Only', artist: 'NCR Radio Off' }]
  },
  {
    id: '90s-bollywood',
    name: '90s Bollywood Classics',
    freq: '92.7 FM',
    era: '90s NOSTALGIA',
    tempo: 116,
    tracks: [
      { title: 'Tujhe Dekha Toh (DDLJ Riff)', artist: 'Lata & Kumar Sanu Vibe', scale: 'major' },
      { title: 'Chaiyya Chaiyya (Expressway Train Beat)', artist: 'Sukhwinder & Rahman Groove', scale: 'minor' },
      { title: 'Tip Tip Barsa (Monsoon Rain Mix)', artist: 'Alka & Udit Melodic Lead', scale: 'major' },
      { title: 'Pardesi Pardesi (Highway Anthem)', artist: '90s Flute & Harmonium', scale: 'folk' },
    ]
  },
  {
    id: '2000s-anthems',
    name: '2000s Bollywood Anthems',
    freq: '98.3 FM',
    era: '2000s HITS',
    tempo: 128,
    tracks: [
      { title: 'Dhoom Machale (Pursuit Turbo Mix)', artist: 'Sunidhi High-Speed Drive', scale: 'dhoom' },
      { title: 'Woh Lamhe (Aravalli Rock Chords)', artist: 'Atif Aslam Highway Lead', scale: 'rock' },
      { title: 'Dus Bahane (Club Street Beat)', artist: 'KK & Shaan Synth Brass', scale: 'club' },
      { title: 'Mauja Hi Mauja (Desi Dance)', artist: 'Mika Singh Club Bass', scale: 'dance' },
    ]
  },
  {
    id: 'punjabi-power',
    name: 'Punjab Power Bass',
    freq: '104.8 FM',
    era: 'PUNJABI BEATS',
    tempo: 132,
    tracks: [
      { title: 'Mundian To Bach Ke (Tumbi Riff)', artist: 'Panjabi MC & Labh Janjua', scale: 'tumbi' },
      { title: 'Amplifier (Subwoofer Bass Cruise)', artist: 'Imran Khan Street Beat', scale: 'amplifier' },
      { title: 'Brown Rang (Delhi City Flow)', artist: 'Yo Yo Honey Singh 808s', scale: 'honey' },
      { title: 'High Rated Gabru (Bhangra Trap)', artist: 'Guru Randhawa Dholak Mix', scale: 'bhangra' },
    ]
  },
  {
    id: 'midnight-lofi',
    name: 'NCR Midnight Desi Lo-Fi',
    freq: '101.1 FM',
    era: 'DESI LO-FI',
    tempo: 88,
    tracks: [
      { title: 'Pehla Nasha (Midnight Chillwave)', artist: 'Udit Soft Acoustic Lo-Fi', scale: 'lofi1' },
      { title: 'Zara Zara (Sunset Rain Chords)', artist: 'Bombay Jayashri Ambient', scale: 'lofi2' },
      { title: 'Tum Hi Ho (Expressway Night Cruising)', artist: 'Arijit Mellow Piano', scale: 'lofi3' },
    ]
  },
  {
    id: 'delhi-drill',
    name: 'Delhi NCR Drill & Bass',
    freq: '95.0 FM',
    era: 'LATEST NCR',
    tempo: 140,
    tracks: [
      { title: 'Sector 143 Underground', artist: 'Delhi Underground Drill', scale: 'drill' },
      { title: 'Connaught Midnight Riser', artist: 'NCR Electronic Fusion', scale: 'fusion' },
    ]
  },
  {
    id: 'aux-mode',
    name: 'AUX / Bluetooth Input',
    freq: 'AUX IN',
    era: 'CUSTOM MP3',
    tracks: [{ title: 'User Audio Stream', artist: 'Connected Device / File' }]
  }
];

export class RadioSystem {
  constructor(audioEngine) {
    this.audio = audioEngine;
    this.currentStationIndex = 0; // default OFF
    this.currentTrackIndex = 0;
    this.timer = null;
    this.step = 0;
    this.bassBoost = 1.25;
    this.isPlaying = false;
    this.onTrackChange = null;

    // Custom AUX audio element
    this.auxAudio = new Audio();
    this.auxAudio.crossOrigin = 'anonymous';
    this.auxAudio.loop = true;
    this.auxSource = null;
  }

  getCurrentStation() {
    return RADIO_STATIONS[this.currentStationIndex];
  }

  getCurrentTrack() {
    const stn = this.getCurrentStation();
    if (!stn.tracks || stn.tracks.length === 0) return { title: stn.name, artist: '' };
    return stn.tracks[this.currentTrackIndex % stn.tracks.length];
  }

  nextStation() {
    this.currentStationIndex = (this.currentStationIndex + 1) % RADIO_STATIONS.length;
    this.currentTrackIndex = 0;
    this.applyStation();
    return this.getCurrentStation();
  }

  prevStation() {
    this.currentStationIndex = (this.currentStationIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    this.currentTrackIndex = 0;
    this.applyStation();
    return this.getCurrentStation();
  }

  nextTrack() {
    const stn = this.getCurrentStation();
    if (stn.tracks && stn.tracks.length > 1) {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % stn.tracks.length;
      this.step = 0;
      if (this.onTrackChange) this.onTrackChange(this.getCurrentStation(), this.getCurrentTrack());
    }
  }

  prevTrack() {
    const stn = this.getCurrentStation();
    if (stn.tracks && stn.tracks.length > 1) {
      this.currentTrackIndex = (this.currentTrackIndex - 1 + stn.tracks.length) % stn.tracks.length;
      this.step = 0;
      if (this.onTrackChange) this.onTrackChange(this.getCurrentStation(), this.getCurrentTrack());
    }
  }

  setStationById(id) {
    const idx = RADIO_STATIONS.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.currentStationIndex = idx;
      this.currentTrackIndex = 0;
      this.applyStation();
    }
  }

  loadCustomAudioFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.auxAudio.src = url;
    const auxStation = RADIO_STATIONS.find(s => s.id === 'aux-mode');
    if (auxStation) {
      auxStation.tracks = [{ title: file.name.replace(/\.[^/.]+$/, ''), artist: 'Local Audio File' }];
    }
    this.setStationById('aux-mode');
    this.auxAudio.play().catch(() => {});
  }

  applyStation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.auxAudio) {
      this.auxAudio.pause();
    }

    const station = this.getCurrentStation();
    if (station.id === 'off') {
      this.isPlaying = false;
      if (this.onTrackChange) this.onTrackChange(station, this.getCurrentTrack());
      return;
    }

    this.isPlaying = true;
    this.audio.unlock();

    if (station.id === 'aux-mode') {
      if (this.auxAudio.src) {
        this.auxAudio.play().catch(() => {});
      }
      if (this.onTrackChange) this.onTrackChange(station, this.getCurrentTrack());
      return;
    }

    const tempo = station.tempo || 120;
    const intervalMs = (60 / tempo) * 500; // 8th-note tick

    this.step = 0;
    if (this.onTrackChange) this.onTrackChange(station, this.getCurrentTrack());

    this.timer = setInterval(() => {
      this.playStep(station.id);
      this.step = (this.step + 1) % 32; // 32-step phrase
    }, intervalMs);
  }

  playStep(stationId) {
    if (!this.audio.initialized || !this.audio.ctx || this.audio.isMuted) return;
    const ctx = this.audio.ctx;
    const now = ctx.currentTime;
    const track = this.getCurrentTrack();

    switch (stationId) {
      case '90s-bollywood':
        this.synth90sBollywood(ctx, now, track);
        break;
      case '2000s-anthems':
        this.synth2000sAnthems(ctx, now, track);
        break;
      case 'punjabi-power':
        this.synthPunjabiPower(ctx, now, track);
        break;
      case 'midnight-lofi':
        this.synthMidnightLofi(ctx, now, track);
        break;
      case 'delhi-drill':
        this.synthDelhiDrill(ctx, now, track);
        break;
      default:
        break;
    }
  }

  // --- 1. 90s Bollywood Classics Synthesizer (Flute, Mandolin, Tabla & Harmonium) ---
  synth90sBollywood(ctx, now, track) {
    const step = this.step;

    // A. Dholak / Tabla Bass & Slap
    if (step % 4 === 0 || step % 8 === 6) {
      this.triggerDrumThump(ctx, now, 85, 42, 0.12 * this.bassBoost, 0.22); // Tabla 'Ge'
    }
    if (step % 2 === 1) {
      this.triggerPercClick(ctx, now, 1200, 0.04, 0.04); // Tabla 'Na' / Dayan rim
    }

    // B. Nostalgic 90s Melodic Lead (Flute/Mandolin pluck)
    // Iconic Bollywood chord notes: D maj / G maj / A maj (D4, F#4, G4, A4, B4, C#5, D5)
    const melodyD = [293.66, 329.63, 369.99, 440.00, 493.88, 554.37, 587.33, 440.00];
    const noteIdx = (step * 3 + (step > 16 ? 2 : 0)) % melodyD.length;
    const leadFreq = melodyD[noteIdx];

    if (step % 2 === 0 || (step % 8 === 3 || step % 8 === 7)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle'; // Smooth Indian flute / mandolin timbre
      osc.frequency.setValueAtTime(leadFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 + Math.sin(step) * 400, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audio.masterGain);

      osc.start(now);
      osc.stop(now + 0.29);
    }

    // C. Harmonium / Synth String Pad Bed
    if (step % 8 === 0) {
      const padFreqs = [146.83, 185.00, 220.00]; // D-chord pad
      padFreqs.forEach((f) => {
        const pOsc = ctx.createOscillator();
        const pGain = ctx.createGain();
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(f, now);
        pGain.gain.setValueAtTime(0.03, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
        pOsc.connect(pGain);
        pGain.connect(this.audio.masterGain);
        pOsc.start(now);
        pOsc.stop(now + 1.0);
      });
    }
  }

  // --- 2. 2000s Bollywood Anthems Synthesizer (Dhoom, High-Energy Synth Brass & Rock) ---
  synth2000sAnthems(ctx, now, track) {
    const step = this.step;

    // A. 4-on-the-Floor Club Kick
    if (step % 2 === 0) {
      this.triggerDrumThump(ctx, now, 120, 38, 0.14 * this.bassBoost, 0.18);
    }
    // Clap / Snare on 2 and 4
    if (step % 4 === 2) {
      this.triggerSnare(ctx, now, 0.08);
    }

    // B. High-Energy Synth Brass / Overdriven Hook (Dhoom / Dus Bahane style)
    const brassNotes = [174.61, 196.00, 220.00, 261.63, 293.66, 329.63, 349.23, 392.00]; // F minor / Bb
    const pitch = brassNotes[(step * 2) % brassNotes.length];

    if (step % 2 === 0 || step % 4 === 3) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitch * 2, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audio.masterGain);

      osc.start(now);
      osc.stop(now + 0.23);
    }

    // C. Sub-Bassline Groove
    if (step % 4 === 0 || step % 8 === 6) {
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(55.0, now); // A1 sub
      subGain.gain.setValueAtTime(0.12 * this.bassBoost, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      sub.connect(subGain);
      subGain.connect(this.audio.masterGain);
      sub.start(now);
      sub.stop(now + 0.36);
    }
  }

  // --- 3. Punjab Power Bass Synthesizer (Tumbi, Dhol & 808 Bass) ---
  synthPunjabiPower(ctx, now, track) {
    const step = this.step;

    // A. Acoustic Dhol Thump (Heavy Chaal beat)
    if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
      this.triggerDrumThump(ctx, now, 100, 32, 0.16 * this.bassBoost, 0.26); // Dhol Dagga
    }
    // Dholak Till (Crisp Treble strike)
    if (step % 4 === 1 || step % 4 === 3) {
      this.triggerPercClick(ctx, now, 1800, 0.06, 0.05); // Dholak Till
    }

    // B. Iconic High Tumbi Pluck Sequence (Mundian / Amplifier Riff)
    const tumbiRiff = [587.33, 587.33, 659.25, 587.33, 523.25, 587.33, 440.00, 587.33]; // D5, E5, C5, A4
    const tumbiNote = tumbiRiff[step % tumbiRiff.length];

    const tOsc = ctx.createOscillator();
    const tGain = ctx.createGain();

    tOsc.type = 'sawtooth';
    tOsc.frequency.setValueAtTime(tumbiNote, now);
    // Tumbi pitch slide ornament
    tOsc.frequency.exponentialRampToValueAtTime(tumbiNote * 1.04, now + 0.04);
    tOsc.frequency.exponentialRampToValueAtTime(tumbiNote, now + 0.09);

    tGain.gain.setValueAtTime(0.11, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    tOsc.connect(tGain);
    tGain.connect(this.audio.masterGain);

    tOsc.start(now);
    tOsc.stop(now + 0.15);

    // C. 808 Heavy Gliding Bass
    if (step % 8 === 0) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(65.41, now); // C2
      bOsc.frequency.exponentialRampToValueAtTime(43.65, now + 0.4); // F1 slide
      bGain.gain.setValueAtTime(0.15 * this.bassBoost, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      bOsc.connect(bGain);
      bGain.connect(this.audio.masterGain);
      bOsc.start(now);
      bOsc.stop(now + 0.46);
    }
  }

  // --- 4. NCR Midnight Desi Lo-Fi Synthesizer (Acoustic Guitars, Ambient Vinyl) ---
  synthMidnightLofi(ctx, now, track) {
    const step = this.step;

    // A. Soft Dusty Kick & Rimshot
    if (step % 8 === 0 || step % 16 === 10) {
      this.triggerDrumThump(ctx, now, 60, 30, 0.08 * this.bassBoost, 0.35);
    }
    if (step % 8 === 4) {
      this.triggerPercClick(ctx, now, 800, 0.03, 0.06);
    }

    // B. Warm Lo-Fi Rhodes / Acoustic Melody
    const lofiChords = [220.00, 261.63, 329.63, 392.00, 246.94, 293.66, 369.99, 440.00];
    if (step % 4 === 0) {
      const chord = [lofiChords[step % 4], lofiChords[(step % 4) + 2]];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audio.masterGain);

        osc.start(now);
        osc.stop(now + 0.9);
      });
    }
  }

  // --- 5. Delhi NCR Drill & Bass Synthesizer (808 Slides & Aggressive Hi-Hats) ---
  synthDelhiDrill(ctx, now, track) {
    const step = this.step;

    // Fast Drill Hi-Hats with triplets
    this.triggerPercClick(ctx, now, 3500 + Math.random() * 800, 0.04, 0.02);

    // Hard Drill Kick
    if (step % 8 === 0 || step % 8 === 5) {
      this.triggerDrumThump(ctx, now, 130, 35, 0.15 * this.bassBoost, 0.18);
    }
    if (step % 8 === 4) {
      this.triggerSnare(ctx, now, 0.09);
    }

    // Sliding Drill 808
    if (step % 8 === 0 || step % 8 === 6) {
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, now);

      sub.frequency.setValueAtTime(82.41, now); // E2
      sub.frequency.exponentialRampToValueAtTime(55.00, now + 0.25); // A1 slide

      subGain.gain.setValueAtTime(0.12 * this.bassBoost, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      sub.connect(filter);
      filter.connect(subGain);
      subGain.connect(this.audio.masterGain);

      sub.start(now);
      sub.stop(now + 0.33);
    }
  }

  // Helper Percussion Utilities
  triggerDrumThump(ctx, now, startFreq, endFreq, vol, dur) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur * 0.7);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(this.audio.masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch {}
  }

  triggerPercClick(ctx, now, freq, vol, dur) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.audio.masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch {}
  }

  triggerSnare(ctx, now, vol) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.audio.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }
}
