// Interactive Photo Mode for NCR ESCAPE (spec §18, §23).
// Orbit camera, cinematic filters, depth tilt, time-of-day toggle, and instant PNG download.

export const PHOTO_FILTERS = [
  { id: 'none', name: 'Natural (No Filter)', css: 'none' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', css: 'contrast(135%) saturate(160%) hue-rotate(15deg) brightness(105%)' },
  { id: 'golden', name: 'Golden Hour Aravalli', css: 'sepia(35%) saturate(145%) contrast(110%) brightness(108%)' },
  { id: 'noir', name: 'Monsoon Noir', css: 'grayscale(90%) contrast(150%) brightness(90%)' },
  { id: 'vintage', name: 'Retro Vintage 90s', css: 'sepia(55%) contrast(120%) saturate(110%) brightness(95%)' },
];

export class PhotoMode {
  constructor(scene, camera, renderer, setDayNight, onExit) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.setDayNight = setDayNight;
    this.onExit = onExit;

    this.active = false;
    this.orbitRadius = 7.5;
    this.orbitTheta = 0.4; // azimuth angle
    this.orbitPhi = 0.25;  // elevation angle
    this.roll = 0;
    this.fov = 55;
    this.targetX = 0;
    this.targetZ = 0;
    this.currentFilterIndex = 0;

    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.initUI();
    this.bindEvents();
  }

  initUI() {
    this.overlay = document.getElementById('photo-overlay');
    this.filterBtn = document.getElementById('photo-filter-btn');
    this.fovSlider = document.getElementById('photo-fov');
    this.tiltSlider = document.getElementById('photo-tilt');
    this.distSlider = document.getElementById('photo-dist');
    this.captureBtn = document.getElementById('photo-capture-btn');
    this.exitBtn = document.getElementById('photo-exit-btn');
    this.timeBtn = document.getElementById('photo-time-btn');
  }

  bindEvents() {
    if (this.filterBtn) {
      this.filterBtn.addEventListener('click', () => {
        this.currentFilterIndex = (this.currentFilterIndex + 1) % PHOTO_FILTERS.length;
        this.applyFilter();
      });
    }

    if (this.fovSlider) {
      this.fovSlider.addEventListener('input', (e) => {
        this.fov = parseFloat(e.target.value);
        this.camera.fov = this.fov;
        this.camera.updateProjectionMatrix();
      });
    }

    if (this.tiltSlider) {
      this.tiltSlider.addEventListener('input', (e) => {
        this.roll = (parseFloat(e.target.value) * Math.PI) / 180;
      });
    }

    if (this.distSlider) {
      this.distSlider.addEventListener('input', (e) => {
        this.orbitRadius = parseFloat(e.target.value);
      });
    }

    if (this.timeBtn) {
      let modeIdx = 0;
      const modes = ['day', 'sunset', 'night'];
      this.timeBtn.addEventListener('click', () => {
        modeIdx = (modeIdx + 1) % modes.length;
        const m = modes[modeIdx];
        this.setDayNight(m);
        this.timeBtn.textContent = `TIME: ${m.toUpperCase()}`;
      });
    }

    if (this.captureBtn) {
      this.captureBtn.addEventListener('click', () => this.captureScreenshot());
    }

    if (this.exitBtn) {
      this.exitBtn.addEventListener('click', () => this.exit());
    }

    // Drag-to-orbit listeners on main canvas
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.active || !this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.orbitTheta -= dx * 0.008;
      this.orbitPhi = Math.max(0.05, Math.min(1.4, this.orbitPhi + dy * 0.008));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch orbit listeners for smartphones
    canvas.addEventListener('touchstart', (e) => {
      if (!this.active || e.touches.length !== 1) return;
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.active || !this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;

      this.orbitTheta -= dx * 0.008;
      this.orbitPhi = Math.max(0.05, Math.min(1.4, this.orbitPhi + dy * 0.008));
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  applyFilter() {
    const f = PHOTO_FILTERS[this.currentFilterIndex];
    if (this.filterBtn) this.filterBtn.textContent = `FILTER: ${f.name.toUpperCase()}`;
    const canvas = this.renderer.domElement;
    canvas.style.filter = f.css;
  }

  enter(carState) {
    this.active = true;
    this.targetX = carState.x;
    this.targetZ = carState.z;
    this.orbitTheta = carState.heading + Math.PI * 0.8;
    this.orbitPhi = 0.25;
    this.roll = 0;
    this.fov = 55;

    if (this.fovSlider) this.fovSlider.value = '55';
    if (this.tiltSlider) this.tiltSlider.value = '0';
    if (this.distSlider) this.distSlider.value = '7.5';

    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.applyFilter();

    if (this.overlay) this.overlay.classList.remove('hidden');
  }

  exit() {
    this.active = false;
    const canvas = this.renderer.domElement;
    canvas.style.filter = 'none';
    if (this.overlay) this.overlay.classList.add('hidden');
    if (this.onExit) this.onExit();
  }

  update() {
    if (!this.active) return;

    // Calculate spherical orbit position
    const camX = this.targetX + this.orbitRadius * Math.sin(this.orbitTheta) * Math.cos(this.orbitPhi);
    const camY = Math.max(0.4, this.orbitRadius * Math.sin(this.orbitPhi) + 0.6);
    const camZ = this.targetZ + this.orbitRadius * Math.cos(this.orbitTheta) * Math.cos(this.orbitPhi);

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(this.targetX, 0.7, this.targetZ);

    if (this.roll !== 0) {
      this.camera.rotation.z = this.roll;
    }
  }

  captureScreenshot() {
    const origCanvas = this.renderer.domElement;
    const f = PHOTO_FILTERS[this.currentFilterIndex];

    // Render clean frame
    this.renderer.render(this.scene, this.camera);

    // Create offscreen canvas to apply CSS filter if needed
    const offCanvas = document.createElement('canvas');
    offCanvas.width = origCanvas.width;
    offCanvas.height = origCanvas.height;
    const ctx = offCanvas.getContext('2d');

    if (f.css !== 'none') {
      ctx.filter = f.css;
    }
    ctx.drawImage(origCanvas, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    link.download = `ncr-escape-${Date.now()}.png`;
    link.href = offCanvas.toDataURL('image/png');
    link.click();
  }
}
