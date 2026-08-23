// In-Car Sound System & High-Fidelity Music Deck for NCR ESCAPE.
// Features 90s Bollywood Classics, 2000s Bollywood Anthems, Punjabi Power Bass, Latest NCR Hits, and AUX MP3 playback.

export const SOUND_PLAYLISTS = [
  {
    id: '90s-bollywood',
    title: 'NCR GOLD',
    category: '90s BOLLYWOOD',
    badge: 'NCR GOLD',
    color: '#ff7a18',
    tempo: 118,
    tracks: [
      { id: 'ddlj', title: 'Tujhe Dekha Toh (DDLJ Riff)', artist: 'Lata Mangeshkar & Kumar Sanu', era: '1995', style: 'classic' },
      { id: 'chaiyya', title: 'Chaiyya Chaiyya (Expressway Train Beat)', artist: 'Sukhwinder Singh & A.R. Rahman', era: '1998', style: 'high-energy' },
      { id: 'tiptip', title: 'Tip Tip Barsa Paani (Monsoon Drive)', artist: 'Alka Yagnik & Udit Narayan', era: '1994', style: 'monsoon' },
      { id: 'pardesi', title: 'Pardesi Pardesi (Highway Anthem)', artist: 'Udit Narayan & Alka Yagnik', era: '1996', style: 'folk' },
      { id: 'baazigar', title: 'Baazigar O Baazigar (Synth Groove)', artist: 'Kumar Sanu & Alka Yagnik', era: '1993', style: 'synth' },
    ]
  },
  {
    id: '2000s-anthems',
    title: '2000s DRIVE',
    category: '2000s BOLLYWOOD',
    badge: '2000s DRIVE',
    color: '#00ffff',
    tempo: 128,
    tracks: [
      { id: 'dhoom', title: 'Dhoom Machale (Pursuit Turbo Mix)', artist: 'Sunidhi Chauhan & Pritam', era: '2004', style: 'pursuit' },
      { id: 'woh-lamhe', title: 'Woh Lamhe (Highway Rock Guitar)', artist: 'Atif Aslam & Jal', era: '2005', style: 'rock' },
      { id: 'dus-bahane', title: 'Dus Bahane (Club Street Beat)', artist: 'KK, Shaan & Vishal-Shekhar', era: '2005', style: 'club' },
      { id: 'mauja', title: 'Mauja Hi Mauja (Bhangra Club)', artist: 'Mika Singh & Pritam', era: '2007', style: 'dance' },
      { id: 'aankhen', title: 'Aankhen Khuli (Campus Celebration)', artist: 'Lata Mangeshkar & Udit Narayan', era: '2000', style: 'classic-2000' },
    ]
  },
  {
    id: 'punjabi-power',
    title: 'DESI BASS',
    category: 'PUNJABI HITS',
    badge: 'DESI BASS',
    color: '#ffd166',
    tempo: 132,
    tracks: [
      { id: 'mundian', title: 'Mundian To Bach Ke (Iconic Tumbi Riff)', artist: 'Panjabi MC & Labh Janjua', era: '2002', style: 'tumbi' },
      { id: 'amplifier', title: 'Amplifier (Subwoofer Street Cruise)', artist: 'Imran Khan', era: '2009', style: 'subwoofer' },
      { id: 'brown-rang', title: 'Brown Rang (Delhi City Flow)', artist: 'Yo Yo Honey Singh', era: '2011', style: 'delhi-flow' },
      { id: 'high-rated', title: 'High Rated Gabru (Bhangra Trap)', artist: 'Guru Randhawa', era: '2017', style: 'trap' },
      { id: 'jogi', title: 'Jogi (Street Racing Dholak)', artist: 'Panjabi MC', era: '2003', style: 'dhol' },
    ]
  },
  {
    id: 'midnight-lofi',
    title: 'NCR MIDNIGHT',
    category: 'CHILL / LO-FI',
    badge: 'NCR MIDNIGHT',
    color: '#a855f7',
    tempo: 88,
    tracks: [
      { id: 'pehla-nasha', title: 'Pehla Nasha (Acoustic Midnight)', artist: 'Udit Narayan Lo-Fi Chill', era: '1992', style: 'lofi' },
      { id: 'zara-zara', title: 'Zara Zara (Monsoon Sunset Chords)', artist: 'Bombay Jayashri Ambient Mix', era: '2001', style: 'ambient' },
      { id: 'tum-hi-ho', title: 'Tum Hi Ho (Expressway Sunset)', artist: 'Arijit Singh Acoustic Piano', era: '2013', style: 'piano' },
    ]
  },
  {
    id: 'aux-mode',
    title: 'MY RADIO',
    category: 'CUSTOM MP3',
    badge: 'MY RADIO',
    color: '#38ef7d',
    tempo: 120,
    tracks: [
      { id: 'custom', title: 'Connected Device / Local MP3', artist: 'User Audio File', era: 'Custom', style: 'aux' }
    ]
  }
];

export class SoundSystem {
  constructor(audioEngine) {
    this.audio = audioEngine;
    
    // Radio memory persistence (Step 16)
    const savedPlaylistIndex = localStorage.getItem('ncr_radio_station_index');
    const savedTrackIndex = localStorage.getItem('ncr_radio_track_index');
    const savedVolume = localStorage.getItem('ncr_radio_volume');
    const savedMute = localStorage.getItem('ncr_radio_mute');

    this.currentPlaylistIndex = savedPlaylistIndex !== null ? Math.min(parseInt(savedPlaylistIndex), SOUND_PLAYLISTS.length - 1) : 0;
    this.currentTrackIndex = savedTrackIndex !== null ? parseInt(savedTrackIndex) : 0;
    this._volume = savedVolume !== null ? parseFloat(savedVolume) : 0.8;
    this.isPlaying = false;
    this.eqMode = 'BASS_BOOST'; // 'NORMAL', 'BASS_BOOST', 'VOCAL', 'CLUB'
    this.timer = null;
    this.step = 0;
    this.bassBoost = 1.35; // Subwoofer multiplier

    if (savedMute === 'true' && this.audio) {
      this.audio.isMuted = true;
    }

    // Callbacks for UI sync
    this.onTrackChange = null;
    this.onStateChange = null;

    // Custom AUX / MP3 file audio player
    this.auxAudio = new Audio();
    this.auxAudio.crossOrigin = 'anonymous';
    this.auxAudio.loop = true;
    this.auxSource = null;

    // Dedicated Radio Audio Player (Step 2 - Actual Songs)
    this.radioAudio = new Audio();
    this.radioAudio.crossOrigin = 'anonymous';
    this.radioAudio.loop = true;
    this.radioSource = null;
  }

  get volume() {
    return this._volume;
  }

  set volume(val) {
    this._volume = Math.max(0, Math.min(1, val));
    localStorage.setItem('ncr_radio_volume', this._volume);
    if (this.auxAudio) this.auxAudio.volume = this._volume;
    if (this.radioAudio) this.radioAudio.volume = this._volume;
  }

  getCurrentPlaylist() {
    return SOUND_PLAYLISTS[this.currentPlaylistIndex];
  }

  getCurrentTrack() {
    const pl = this.getCurrentPlaylist();
    if (!pl.tracks || pl.tracks.length === 0) return { title: 'No Track', artist: '' };
    return pl.tracks[this.currentTrackIndex % pl.tracks.length];
  }

  play() {
    this.isPlaying = true;
    this.audio.unlock();
    this.applyTrack();
    if (this.onStateChange) this.onStateChange(true);
  }

  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.auxAudio) {
      this.auxAudio.pause();
    }
    if (this.radioAudio) {
      this.radioAudio.pause();
    }
    if (this.onStateChange) this.onStateChange(false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  toggle() {
    this.togglePlay();
  }

  nextTrack() {
    const pl = this.getCurrentPlaylist();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % pl.tracks.length;
    this.step = 0;
    localStorage.setItem('ncr_radio_track_index', this.currentTrackIndex);
    if (this.isPlaying) this.applyTrack();
    if (this.onTrackChange) this.onTrackChange(this.getCurrentPlaylist(), this.getCurrentTrack());
  }

  prevTrack() {
    const pl = this.getCurrentPlaylist();
    this.currentTrackIndex = (this.currentTrackIndex - 1 + pl.tracks.length) % pl.tracks.length;
    this.step = 0;
    localStorage.setItem('ncr_radio_track_index', this.currentTrackIndex);
    if (this.isPlaying) this.applyTrack();
    if (this.onTrackChange) this.onTrackChange(this.getCurrentPlaylist(), this.getCurrentTrack());
  }

  selectPlaylist(playlistId) {
    const idx = SOUND_PLAYLISTS.findIndex(p => p.id === playlistId);
    if (idx !== -1) {
      this.currentPlaylistIndex = idx;
      this.currentTrackIndex = 0;
      this.step = 0;
      localStorage.setItem('ncr_radio_station_index', this.currentPlaylistIndex);
      localStorage.setItem('ncr_radio_track_index', this.currentTrackIndex);
      if (this.isPlaying) {
        this.applyTrack();
      } else {
        this.play();
      }
      if (this.onTrackChange) this.onTrackChange(this.getCurrentPlaylist(), this.getCurrentTrack());
    }
  }

  selectTrackByIndex(idx) {
    const pl = this.getCurrentPlaylist();
    if (idx >= 0 && idx < pl.tracks.length) {
      this.currentTrackIndex = idx;
      this.step = 0;
      localStorage.setItem('ncr_radio_track_index', this.currentTrackIndex);
      this.play();
      if (this.onTrackChange) this.onTrackChange(this.getCurrentPlaylist(), this.getCurrentTrack());
    }
  }

  setEqualizerMode(mode) {
    this.eqMode = mode;
    if (mode === 'BASS_BOOST') {
      this.bassBoost = 1.75;
    } else if (mode === 'CLUB') {
      this.bassBoost = 1.45;
    } else if (mode === 'VOCAL') {
      this.bassBoost = 0.95;
    } else {
      this.bassBoost = 1.2;
    }
  }

  loadCustomMP3(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.auxAudio.src = url;
    const auxPl = SOUND_PLAYLISTS.find(p => p.id === 'aux-mode');
    if (auxPl) {
      auxPl.tracks = [{
        id: 'custom-file',
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local Sound System Storage',
        era: 'Custom',
        style: 'aux'
      }];
    }
    this.selectPlaylist('aux-mode');
  }

  applyTrack() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.auxAudio) {
      this.auxAudio.pause();
    }
    if (this.radioAudio) {
      this.radioAudio.pause();
    }

    if (!this.isPlaying) return;

    const playlist = this.getCurrentPlaylist();
    const track = this.getCurrentTrack();

    // Smooth transition: temporary fade-in (Step 7)
    if (this.audio.initialized && this.audio.ctx && this.audio.masterGain) {
      const now = this.audio.ctx.currentTime;
      const baseGain = 0.35 * (this.audio.isMuted ? 0 : 1);
      this.audio.masterGain.gain.setValueAtTime(0.01, now);
      this.audio.masterGain.gain.exponentialRampToValueAtTime(baseGain, now + 0.35);
    }

    if (playlist.id === 'aux-mode') {
      if (this.auxAudio.src) {
        if (!this.auxSource && this.audio.initialized && this.audio.ctx) {
          try {
            this.auxSource = this.audio.ctx.createMediaElementSource(this.auxAudio);
            this.auxSource.connect(this.audio.masterGain);
          } catch (e) {
            console.warn("Could not route AUX element to Web Audio masterGain:", e);
          }
        }
        this.auxAudio.volume = this.volume;
        this.auxAudio.play().catch(() => {});
      }
      if (this.onTrackChange) this.onTrackChange(playlist, track);
      return;
    }

    // Play actual song tracks (Step 2 & 3)
    const files = {
      '90s-bollywood': 'assets/music/ncr_gold.mp3',
      '2000s-anthems': 'assets/music/2000s_drive.mp3',
      'punjabi-power': 'assets/music/desi_bass.mp3',
      'midnight-lofi': 'assets/music/ncr_midnight.mp3'
    };

    const targetFile = files[playlist.id];
    if (targetFile) {
      // Connect to Web Audio masterGain if not already done
      if (!this.radioSource && this.audio.initialized && this.audio.ctx) {
        try {
          this.radioSource = this.audio.ctx.createMediaElementSource(this.radioAudio);
          this.radioSource.connect(this.audio.masterGain);
        } catch (e) {
          console.warn("Could not route radio element to Web Audio masterGain:", e);
        }
      }

      // Check if current source is already playing this station to avoid restarting track unnecessarily (Step 8)
      const currentSrc = this.radioAudio.getAttribute('src');
      if (currentSrc !== targetFile) {
        this.radioAudio.src = targetFile;
      }
      
      this.radioAudio.volume = this.volume;
      this.radioAudio.play().catch(() => {});
    }

    // Setup visualizer ticker fallback (e.g. subwoofer thump heartbeat ticks)
    const tempo = playlist.tempo || 120;
    const intervalMs = (60 / tempo) * 500;
    this.step = 0;

    this.timer = setInterval(() => {
      this.step = (this.step + 1) % 32;
    }, intervalMs);

    if (this.onTrackChange) this.onTrackChange(playlist, track);
  }

  playSynthesizedStep(playlistId, track) {
    if (!this.audio.initialized || !this.audio.ctx || this.audio.isMuted || !this.isPlaying) return;
    const ctx = this.audio.ctx;
    const now = ctx.currentTime;

    switch (playlistId) {
      case '90s-bollywood':
        this.render90sBollywood(ctx, now, track);
        break;
      case '2000s-anthems':
        this.render2000sAnthems(ctx, now, track);
        break;
      case 'punjabi-power':
        this.renderPunjabiPower(ctx, now, track);
        break;
      case 'latest-ncr':
        this.renderLatestNCR(ctx, now, track);
        break;
      case 'midnight-lofi':
        this.renderMidnightLofi(ctx, now, track);
        break;
      default:
        break;
    }
  }

  // --- 1. 90s Bollywood Classics Synthesizer ---
  render90sBollywood(ctx, now, track) {
    const step = this.step;

    // Subwoofer Dholak / Tabla Bass
    if (step % 4 === 0 || step % 8 === 6) {
      this.triggerSubwooferThump(ctx, now, 88, 42, 0.14 * this.bassBoost * this.volume, 0.24);
    }
    // High-pitched Dayan / Tabla rim slap
    if (step % 2 === 1) {
      this.triggerPercClick(ctx, now, 1250, 0.04 * this.volume, 0.04);
    }

    // Melodic Flute & Mandolin Lead
    const dMajScale = [293.66, 329.63, 369.99, 440.00, 493.88, 554.37, 587.33, 440.00];
    const pitch = dMajScale[(step * 3 + (step > 16 ? 1 : 0)) % dMajScale.length];

    if (step % 2 === 0 || step % 8 === 3) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle'; // Flute / Mandolin tone
      osc.frequency.setValueAtTime(pitch, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400 + Math.sin(step) * 350, now);

      gain.gain.setValueAtTime(0.08 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audio.masterGain);

      osc.start(now);
      osc.stop(now + 0.29);
    }

    // Harmonium chord cushion
    if (step % 8 === 0) {
      [146.83, 185.00, 220.00].forEach((f) => {
        const pOsc = ctx.createOscillator();
        const pGain = ctx.createGain();
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(f, now);
        pGain.gain.setValueAtTime(0.035 * this.volume, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);
        pOsc.connect(pGain);
        pGain.connect(this.audio.masterGain);
        pOsc.start(now);
        pOsc.stop(now + 0.95);
      });
    }
  }

  // --- 2. 2000s Bollywood Anthems Synthesizer ---
  render2000sAnthems(ctx, now, track) {
    const step = this.step;

    // 4-on-the-Floor Club Bass Kick
    if (step % 2 === 0) {
      this.triggerSubwooferThump(ctx, now, 125, 38, 0.16 * this.bassBoost * this.volume, 0.19);
    }
    // High Snare / Clap
    if (step % 4 === 2) {
      this.triggerSnare(ctx, now, 0.08 * this.volume);
    }

    // High-Energy Sawtooth Hook (Dhoom / Dus Bahane)
    const brassNotes = [174.61, 196.00, 220.00, 261.63, 293.66, 329.63, 349.23, 392.00];
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

      gain.gain.setValueAtTime(0.09 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audio.masterGain);

      osc.start(now);
      osc.stop(now + 0.23);
    }

    // Heavy Subwoofer Bassline
    if (step % 4 === 0 || step % 8 === 6) {
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(55.0, now); // A1 Sub
      subGain.gain.setValueAtTime(0.14 * this.bassBoost * this.volume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      sub.connect(subGain);
      subGain.connect(this.audio.masterGain);
      sub.start(now);
      sub.stop(now + 0.36);
    }
  }

  // --- 3. Punjab Heavy Dhol & Bass Synthesizer ---
  renderPunjabiPower(ctx, now, track) {
    const step = this.step;

    // Heavy Acoustic Dhol Dagga
    if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
      this.triggerSubwooferThump(ctx, now, 105, 30, 0.18 * this.bassBoost * this.volume, 0.28);
    }
    // Dholak Treble Till
    if (step % 4 === 1 || step % 4 === 3) {
      this.triggerPercClick(ctx, now, 1850, 0.06 * this.volume, 0.05);
    }

    // Iconic Punjabi Tumbi Pluck
    const tumbiRiff = [587.33, 587.33, 659.25, 587.33, 523.25, 587.33, 440.00, 587.33];
    const tumbiNote = tumbiRiff[step % tumbiRiff.length];

    const tOsc = ctx.createOscillator();
    const tGain = ctx.createGain();
    tOsc.type = 'sawtooth';
    tOsc.frequency.setValueAtTime(tumbiNote, now);
    tOsc.frequency.exponentialRampToValueAtTime(tumbiNote * 1.05, now + 0.04);
    tOsc.frequency.exponentialRampToValueAtTime(tumbiNote, now + 0.09);

    tGain.gain.setValueAtTime(0.11 * this.volume, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    tOsc.connect(tGain);
    tGain.connect(this.audio.masterGain);
    tOsc.start(now);
    tOsc.stop(now + 0.15);

    // Deep 808 Slide Sub
    if (step % 8 === 0) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(65.41, now);
      bOsc.frequency.exponentialRampToValueAtTime(43.65, now + 0.38);
      bGain.gain.setValueAtTime(0.17 * this.bassBoost * this.volume, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
      bOsc.connect(bGain);
      bGain.connect(this.audio.masterGain);
      bOsc.start(now);
      bOsc.stop(now + 0.45);
    }
  }

  // --- 4. Latest NCR Street & Desi Drill Synthesizer ---
  renderLatestNCR(ctx, now, track) {
    const step = this.step;

    // Rapid Drill Hi-Hats
    this.triggerPercClick(ctx, now, 3800 + Math.random() * 900, 0.045 * this.volume, 0.02);

    // Aggressive Drill Kick
    if (step % 8 === 0 || step % 8 === 5) {
      this.triggerSubwooferThump(ctx, now, 135, 34, 0.16 * this.bassBoost * this.volume, 0.18);
    }
    if (step % 8 === 4) {
      this.triggerSnare(ctx, now, 0.09 * this.volume);
    }

    // Sliding Drill 808 Bass
    if (step % 8 === 0 || step % 8 === 6) {
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(170, now);

      sub.frequency.setValueAtTime(82.41, now);
      sub.frequency.exponentialRampToValueAtTime(55.00, now + 0.26);

      subGain.gain.setValueAtTime(0.13 * this.bassBoost * this.volume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      sub.connect(filter);
      filter.connect(subGain);
      subGain.connect(this.audio.masterGain);

      sub.start(now);
      sub.stop(now + 0.33);
    }
  }

  // --- 5. Midnight Desi Lo-Fi Synthesizer ---
  renderMidnightLofi(ctx, now, track) {
    const step = this.step;

    if (step % 8 === 0 || step % 16 === 10) {
      this.triggerSubwooferThump(ctx, now, 65, 30, 0.09 * this.bassBoost * this.volume, 0.35);
    }
    if (step % 8 === 4) {
      this.triggerPercClick(ctx, now, 800, 0.03 * this.volume, 0.06);
    }

    // Rhodes / Warm Piano Chords
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
        filter.frequency.setValueAtTime(700, now);

        gain.gain.setValueAtTime(0.065 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audio.masterGain);

        osc.start(now);
        osc.stop(now + 0.9);
      });
    }
  }

  // Percussion Helpers
  triggerSubwooferThump(ctx, now, startFreq, endFreq, vol, dur) {
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
