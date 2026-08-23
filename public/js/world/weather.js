import * as THREE from '../vendor/three.module.js';

// Dynamic Weather & Atmospheric Particle System for NCR ESCAPE (spec §21).
// Manages Monsoon Rain particles, road slickness friction, and atmospheric dust haze.

export const WEATHER_TYPES = {
  CLEAR: 'clear',
  RAIN: 'rain',
  HAZE: 'haze',
};

export class WeatherSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentWeather = WEATHER_TYPES.CLEAR;
    this.rainParticles = null;
    this.rainCount = 1200;
    this.rainVelocities = [];

    this.initRain();
  }

  initRain() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 260;
      positions[i * 3 + 1] = Math.random() * 70;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 260;
      this.rainVelocities.push(45 + Math.random() * 25);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x99bbff,
      size: 0.6,
      transparent: true,
      opacity: 0.65,
    });

    this.rainParticles = new THREE.Points(geo, mat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  setWeather(type) {
    this.currentWeather = type;

    if (type === WEATHER_TYPES.RAIN) {
      if (this.rainParticles) this.rainParticles.visible = true;
      this.scene.fog.near = 100;
      this.scene.fog.far = 450;
      this.scene.fog.color.setHex(0x1a2233);
    } else if (type === WEATHER_TYPES.HAZE) {
      if (this.rainParticles) this.rainParticles.visible = false;
      this.scene.fog.near = 40;
      this.scene.fog.far = 280;
      this.scene.fog.color.setHex(0x3a362f);
    } else {
      if (this.rainParticles) this.rainParticles.visible = false;
      this.scene.fog.near = 300;
      this.scene.fog.far = 950;
      this.scene.fog.color.setHex(0x2a3550);
    }
  }

  getFrictionMultiplier() {
    if (this.currentWeather === WEATHER_TYPES.RAIN) return 0.78; // slick wet roads
    if (this.currentWeather === WEATHER_TYPES.HAZE) return 0.92;
    return 1.0;
  }

  update(dt, playerX, playerZ) {
    if (this.currentWeather !== WEATHER_TYPES.RAIN || !this.rainParticles) return;

    const positions = this.rainParticles.geometry.attributes.position.array;

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 1] -= this.rainVelocities[i] * dt;

      // Wrap rain relative to player position
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 60 + Math.random() * 10;
        positions[i * 3] = playerX + (Math.random() - 0.5) * 240;
        positions[i * 3 + 2] = playerZ + (Math.random() - 0.5) * 240;
      }
    }

    this.rainParticles.geometry.attributes.position.needsUpdate = true;
  }
}
