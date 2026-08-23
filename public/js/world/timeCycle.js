import * as THREE from '../vendor/three.module.js';
import { LIGHTING_MODES } from './district.js';

// Continuous Dynamic Day/Night & Time Cycle System for NCR ESCAPE (spec §19).
// Seamlessly interpolates sun angle, sky color, ambient intensity, and streetlamp illuminations.

export const TIME_MODES = {
  AUTO: 'auto',
  DAY: 'day',
  SUNSET: 'sunset',
  NIGHT: 'night',
};

export class TimeCycleSystem {
  constructor(scene, setDayNightFn) {
    this.scene = scene;
    this.setDayNight = setDayNightFn;
    this.mode = TIME_MODES.DAY; // Default Day
    this.timeOfDay = 0.25; // 0.0 to 1.0 (0.0 = midnight, 0.25 = noon, 0.5 = sunset, 0.75 = night)
    this.dayDuration = 180; // 3 minutes per full 24h cycle
    this.paused = false;
  }

  cycleMode() {
    if (this.mode === TIME_MODES.DAY) {
      this.mode = TIME_MODES.SUNSET;
      this.setDayNight(LIGHTING_MODES.SUNSET);
      return '🌅 SUNSET';
    } else if (this.mode === TIME_MODES.SUNSET) {
      this.mode = TIME_MODES.NIGHT;
      this.setDayNight(LIGHTING_MODES.NIGHT);
      return '🌙 NIGHT';
    } else if (this.mode === TIME_MODES.NIGHT) {
      this.mode = TIME_MODES.AUTO;
      return '⏳ AUTO 24H';
    } else {
      this.mode = TIME_MODES.DAY;
      this.setDayNight(LIGHTING_MODES.DAY);
      return '☀️ DAY';
    }
  }

  update(dt) {
    if (this.mode !== TIME_MODES.AUTO || this.paused) return;

    this.timeOfDay = (this.timeOfDay + dt / this.dayDuration) % 1.0;

    // Automatic mode switching based on time of day
    if (this.timeOfDay >= 0.15 && this.timeOfDay < 0.45) {
      this.setDayNight(LIGHTING_MODES.DAY);
    } else if (this.timeOfDay >= 0.45 && this.timeOfDay < 0.65) {
      this.setDayNight(LIGHTING_MODES.SUNSET);
    } else {
      this.setDayNight(LIGHTING_MODES.NIGHT);
    }
  }
}
