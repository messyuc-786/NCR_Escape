import { SOUND_PLAYLISTS } from '../audio/soundSystem.js';

// In-Car Sound System & Subwoofer Speaker UI for NCR ESCAPE.
// Features tactile media player controls, animated subwoofer bass cone, RGB equalizer, and playlist browsing.

export class SoundSystemUI {
  constructor(soundSystem, onClose) {
    this.sound = soundSystem;
    this.onClose = onClose;
    this.active = false;

    this.overlay = document.getElementById('sound-system-overlay');
    this.closeBtn = document.getElementById('sound-system-close');
    this.dockToggleBtn = document.getElementById('sound-toggle-btn');

    // Display elements
    this.trackTitle = document.getElementById('ss-track-title');
    this.trackArtist = document.getElementById('ss-track-artist');
    this.trackBadge = document.getElementById('ss-track-badge');
    this.speakerCone = document.getElementById('subwoofer-cone-ui');
    this.speakerRing = document.getElementById('subwoofer-ring-ui');
    this.eqCanvas = document.getElementById('ss-eq-canvas');
    this.playlistTabs = document.getElementById('ss-playlist-tabs');
    this.trackList = document.getElementById('ss-track-list');

    // Controls
    this.playBtn = document.getElementById('ss-btn-play');
    this.prevBtn = document.getElementById('ss-btn-prev');
    this.nextBtn = document.getElementById('ss-btn-next');
    this.eqBtn = document.getElementById('ss-btn-eq');
    this.auxBtn = document.getElementById('ss-btn-aux');
    this.fileInput = document.getElementById('ss-file-input');
    this.volumeSlider = document.getElementById('ss-volume-slider');

    this.eqCtx = this.eqCanvas ? this.eqCanvas.getContext('2d') : null;
    this.eqBars = [0.2, 0.4, 0.7, 0.5, 0.9, 0.6, 0.3, 0.8, 0.5, 0.7, 0.4, 0.6];

    this.init();
    this.startVisualizer();
  }

  init() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.dockToggleBtn) {
      this.dockToggleBtn.addEventListener('click', () => this.toggle());
    }

    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.sound.togglePlay();
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.sound.prevTrack();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.sound.nextTrack();
      });
    }

    if (this.eqBtn) {
      this.eqBtn.addEventListener('click', () => {
        const modes = ['BASS_BOOST', 'CLUB', 'VOCAL', 'NORMAL'];
        const nextIdx = (modes.indexOf(this.sound.eqMode) + 1) % modes.length;
        const nextMode = modes[nextIdx];
        this.sound.setEqualizerMode(nextMode);
        this.eqBtn.textContent = `🔊 EQ: ${nextMode.replace('_', ' ')}`;
      });
    }

    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        this.sound.volume = parseFloat(e.target.value);
        if (this.sound.auxAudio) this.sound.auxAudio.volume = this.sound.volume;
      });
    }

    if (this.auxBtn && this.fileInput) {
      this.auxBtn.addEventListener('click', () => {
        this.fileInput.click();
      });

      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.sound.loadCustomMP3(file);
          this.renderPlaylists();
          this.renderTracks();
        }
      });
    }

    this.sound.onTrackChange = (pl, track) => {
      this.updateNowPlaying(pl, track);
      this.renderTracks();
    };

    this.sound.onStateChange = (playing) => {
      if (this.playBtn) {
        this.playBtn.textContent = playing ? '⏸️ PAUSE' : '▶️ PLAY';
      }
      if (this.dockToggleBtn) {
        this.dockToggleBtn.classList.toggle('playing', playing);
      }
    };

    this.renderPlaylists();
    this.renderTracks();
    this.updateNowPlaying(this.sound.getCurrentPlaylist(), this.sound.getCurrentTrack());
  }

  open() {
    this.active = true;
    if (this.overlay) this.overlay.classList.remove('hidden');
    this.renderPlaylists();
    this.renderTracks();
    this.updateNowPlaying(this.sound.getCurrentPlaylist(), this.sound.getCurrentTrack());
  }

  close() {
    this.active = false;
    if (this.overlay) this.overlay.classList.add('hidden');
    if (this.onClose) this.onClose();
  }

  toggle() {
    if (this.active) {
      this.close();
    } else {
      this.open();
    }
  }

  renderPlaylists() {
    if (!this.playlistTabs) return;
    this.playlistTabs.innerHTML = '';

    SOUND_PLAYLISTS.forEach((pl, idx) => {
      const tab = document.createElement('button');
      tab.className = 'ss-tab-btn' + (idx === this.sound.currentPlaylistIndex ? ' active' : '');
      tab.textContent = pl.title;
      tab.style.borderColor = idx === this.sound.currentPlaylistIndex ? pl.color : 'rgba(255,255,255,0.15)';
      tab.addEventListener('click', () => {
        this.sound.selectPlaylist(pl.id);
        this.renderPlaylists();
        this.renderTracks();
      });
      this.playlistTabs.appendChild(tab);
    });
  }

  renderTracks() {
    if (!this.trackList) return;
    this.trackList.innerHTML = '';

    const pl = this.sound.getCurrentPlaylist();
    pl.tracks.forEach((t, idx) => {
      const row = document.createElement('div');
      const isCurrent = idx === this.sound.currentTrackIndex;
      row.className = 'ss-track-row' + (isCurrent ? ' active' : '');
      row.innerHTML = `
        <div class="ss-track-idx">${isCurrent && this.sound.isPlaying ? '🔊' : (idx + 1)}</div>
        <div class="ss-track-meta">
          <div class="ss-t-title">${t.title}</div>
          <div class="ss-t-artist">${t.artist} · <span class="ss-t-era">${t.era}</span></div>
        </div>
      `;

      row.addEventListener('click', () => {
        this.sound.selectTrackByIndex(idx);
        this.renderTracks();
      });

      this.trackList.appendChild(row);
    });
  }

  updateNowPlaying(pl, track) {
    if (this.trackTitle) {
      this.trackTitle.textContent = track ? track.title : 'No Track Selected';
    }
    if (this.trackArtist) {
      this.trackArtist.textContent = track ? `${track.artist} (${track.era})` : '';
    }
    if (this.trackBadge) {
      this.trackBadge.textContent = pl ? pl.badge : 'SOUND SYSTEM';
      this.trackBadge.style.color = pl ? pl.color : '#ff7a18';
    }
    if (this.dockToggleBtn) {
      this.dockToggleBtn.textContent = this.sound.isPlaying
        ? `🔊 ${track ? track.title.substring(0, 18) + '...' : 'PLAYING'}`
        : '🔇 SOUND SYSTEM: OFF';
    }
  }

  startVisualizer() {
    const animate = () => {
      requestAnimationFrame(animate);

      const isPlaying = this.sound.isPlaying;

      // Pulse Subwoofer Cone & LED ring
      if (this.speakerCone) {
        if (isPlaying) {
          const isBassBeat = (this.sound.step % 4 === 0);
          const scale = isBassBeat ? (1.16 * (this.sound.bassBoost / 1.35)) : 1.0;
          this.speakerCone.style.transform = `scale(${scale})`;
          if (this.speakerRing) {
            this.speakerRing.style.boxShadow = isBassBeat
              ? '0 0 35px rgba(255, 122, 24, 0.9), inset 0 0 20px rgba(0, 255, 255, 0.8)'
              : '0 0 10px rgba(255, 122, 24, 0.3)';
          }
        } else {
          this.speakerCone.style.transform = 'scale(1.0)';
          if (this.speakerRing) {
            this.speakerRing.style.boxShadow = '0 0 5px rgba(255, 255, 255, 0.1)';
          }
        }
      }

      // Render Dynamic RGB Equalizer Spectrum
      if (this.eqCtx && this.eqCanvas) {
        const ctx = this.eqCtx;
        const w = this.eqCanvas.width;
        const h = this.eqCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const barCount = this.eqBars.length;
        const barWidth = (w - (barCount - 1) * 3) / barCount;

        for (let i = 0; i < barCount; i++) {
          let target = 0.05;
          if (isPlaying) {
            const time = performance.now() * 0.009;
            target = 0.15 + 0.8 * Math.abs(Math.sin(time * (1 + i * 0.25) + i * 0.8));
            if (i < 4 && this.sound.step % 4 === 0) {
              target = Math.min(1.0, target * 1.6);
            }
          }

          this.eqBars[i] = (this.eqBars[i] || 0.1) * 0.75 + target * 0.25;
          const barH = this.eqBars[i] * h;
          const x = i * (barWidth + 3);
          const y = h - barH;

          // Gradient: Neon Cyan -> Gold -> Hot Coral Red
          const grad = ctx.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#00ffff');
          grad.addColorStop(0.55, '#ffd166');
          grad.addColorStop(1.0, '#ff3b30');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barH);
        }
      }
    };

    animate();
  }
}
