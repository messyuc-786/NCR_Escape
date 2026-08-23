// In-Car Stereo Deck & Subwoofer Speaker Widget for NCR ESCAPE (spec §22).
// Provides an authentic tactile dashboard audio controller with animated subwoofer cone and RGB equalizer spectrum.

export class RadioWidget {
  constructor(radioSystem) {
    this.radio = radioSystem;
    this.container = document.getElementById('radio-deck-hud');
    this.lcdFreq = document.getElementById('radio-lcd-freq');
    this.lcdTrack = document.getElementById('radio-lcd-track');
    this.lcdArtist = document.getElementById('radio-lcd-artist');
    this.lcdBadge = document.getElementById('radio-lcd-badge');
    this.speakerCone = document.getElementById('subwoofer-cone');
    this.eqCanvas = document.getElementById('radio-eq-canvas');
    this.fileInput = document.getElementById('radio-file-input');

    this.prevStnBtn = document.getElementById('radio-btn-prev-stn');
    this.nextStnBtn = document.getElementById('radio-btn-next-stn');
    this.prevTrackBtn = document.getElementById('radio-btn-prev-track');
    this.nextTrackBtn = document.getElementById('radio-btn-next-track');
    this.playBtn = document.getElementById('radio-btn-play');
    this.bassBtn = document.getElementById('radio-btn-bass');
    this.auxBtn = document.getElementById('radio-btn-aux');

    this.eqCtx = this.eqCanvas ? this.eqCanvas.getContext('2d') : null;
    this.eqBars = [0.2, 0.4, 0.7, 0.5, 0.9, 0.6, 0.3, 0.8];

    this.initEvents();

    this.radio.onTrackChange = (station, track) => {
      this.updateDisplay(station, track);
    };

    // Initial display
    this.updateDisplay(this.radio.getCurrentStation(), this.radio.getCurrentTrack());
    this.startVisualizer();
  }

  initEvents() {
    if (this.prevStnBtn) {
      this.prevStnBtn.addEventListener('click', () => {
        this.radio.prevStation();
      });
    }

    if (this.nextStnBtn) {
      this.nextStnBtn.addEventListener('click', () => {
        this.radio.nextStation();
      });
    }

    if (this.prevTrackBtn) {
      this.prevTrackBtn.addEventListener('click', () => {
        this.radio.prevTrack();
      });
    }

    if (this.nextTrackBtn) {
      this.nextTrackBtn.addEventListener('click', () => {
        this.radio.nextTrack();
      });
    }

    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        if (this.radio.getCurrentStation().id === 'off') {
          this.radio.setStationById('90s-bollywood');
        } else {
          this.radio.setStationById('off');
        }
      });
    }

    if (this.bassBtn) {
      this.bassBtn.addEventListener('click', () => {
        this.radio.bassBoost = this.radio.bassBoost === 1.25 ? 1.85 : 1.25;
        this.bassBtn.classList.toggle('active', this.radio.bassBoost > 1.3);
        this.bassBtn.textContent = this.radio.bassBoost > 1.3 ? '🔊 BASS: MAX' : '🔉 BASS: NORM';
      });
    }

    if (this.auxBtn && this.fileInput) {
      this.auxBtn.addEventListener('click', () => {
        this.fileInput.click();
      });

      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.radio.loadCustomAudioFile(file);
        }
      });
    }
  }

  updateDisplay(station, track) {
    const isOff = station.id === 'off';

    if (this.lcdFreq) {
      this.lcdFreq.textContent = isOff ? 'RADIO OFF' : `${station.freq} — ${station.name.toUpperCase()}`;
    }

    if (this.lcdTrack) {
      this.lcdTrack.textContent = isOff ? 'Press ⏯️ to Tune In' : `🎵 ${track.title}`;
    }

    if (this.lcdArtist) {
      this.lcdArtist.textContent = isOff ? '90s · 2000s · Punjabi Radio' : track.artist;
    }

    if (this.lcdBadge) {
      this.lcdBadge.textContent = station.era || 'OFF';
      this.lcdBadge.className = 'radio-era-badge ' + (station.id || 'off');
    }

    if (this.playBtn) {
      this.playBtn.textContent = isOff ? '▶️ PLAY' : '⏸️ OFF';
    }
  }

  startVisualizer() {
    const animateVisualizer = () => {
      requestAnimationFrame(animateVisualizer);

      const isPlaying = this.radio.isPlaying;

      // Animate Subwoofer Cone scale
      if (this.speakerCone) {
        if (isPlaying) {
          const beatPulse = (this.radio.step % 4 === 0) ? (1.18 * (this.radio.bassBoost / 1.25)) : 1.0;
          this.speakerCone.style.transform = `scale(${beatPulse})`;
        } else {
          this.speakerCone.style.transform = 'scale(1.0)';
        }
      }

      // Animate RGB Equalizer Canvas
      if (this.eqCtx && this.eqCanvas) {
        const ctx = this.eqCtx;
        const w = this.eqCanvas.width;
        const h = this.eqCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const barCount = 10;
        const barWidth = (w - (barCount - 1) * 3) / barCount;

        for (let i = 0; i < barCount; i++) {
          let targetHeight = 0.05;
          if (isPlaying) {
            const time = performance.now() * 0.008;
            targetHeight = 0.15 + 0.8 * Math.abs(Math.sin(time * (1 + i * 0.3) + i));
            if (i < 3 && this.radio.step % 4 === 0) {
              targetHeight = Math.min(1.0, targetHeight * 1.5);
            }
          }

          this.eqBars[i] = (this.eqBars[i] || 0.1) * 0.75 + targetHeight * 0.25;

          const barH = this.eqBars[i] * h;
          const x = i * (barWidth + 3);
          const y = h - barH;

          // Gradient color: Cyan -> Yellow -> Neon Red
          const grad = ctx.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#00ffff');
          grad.addColorStop(0.6, '#ffd166');
          grad.addColorStop(1.0, '#ff3b30');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barH);
        }
      }
    };

    animateVisualizer();
  }
}
