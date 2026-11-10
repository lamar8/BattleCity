(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  class NesAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.muted = false;
      this.volume = 0.45;
      this.noiseBuffer = null;

      // Engine hum state
      this.engineOsc = null;
      this.engineGain = null;
      this.engineActive = false;
      this.engineMoving = false;
      this.enginePhase = 0;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
        this.noiseBuffer = this._createNoiseBuffer();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    unlock() {
      this.ensureContext();
    }

    setMuted(m) {
      this.muted = !!m;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(
          this.muted ? 0 : this.volume,
          this.ctx.currentTime,
          0.015
        );
      }
    }

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.masterGain && this.ctx && !this.muted) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.015);
      }
    }

    _createNoiseBuffer() {
      const sampleRate = this.ctx.sampleRate;
      const len = sampleRate * 1.0;
      const buf = this.ctx.createBuffer(1, len, sampleRate);
      const data = buf.getChannelData(0);
      // NES-style stepped LFSR pseudo-noise feel
      let last = 0;
      for (let i = 0; i < len; i++) {
        if (i % 3 === 0) {
          last = Math.random() * 2 - 1;
        }
        data[i] = last;
      }
      return buf;
    }

    _tone(type, freqStart, freqEnd, startTime, duration, gainPeak = 0.25) {
      const ctx = this.ensureContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, startTime);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, freqEnd),
          startTime + duration
        );
      }

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.015);
    }

    _noise(filterStart, filterEnd, startTime, duration, gainPeak = 0.35) {
      const ctx = this.ensureContext();
      if (!ctx || !this.noiseBuffer) return;

      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterStart, startTime);
      if (filterEnd !== filterStart) {
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(40, filterEnd),
          startTime + duration
        );
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainPeak, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(startTime);
      src.stop(startTime + duration + 0.02);
    }

    playIntro() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t0 = ctx.currentTime + 0.03;

      // Iconic Battle City Stage Start Fanfare (Square Lead + Harmony + Triangle Bass)
      const lead = [
        // Phrase 1
        [392.0, 0.00, 0.09], [440.0, 0.10, 0.09], [493.88, 0.20, 0.09], [523.25, 0.30, 0.24],
        // Phrase 2
        [329.63, 0.60, 0.09], [349.23, 0.70, 0.09], [392.0, 0.80, 0.09], [440.0, 0.90, 0.24],
        // Phrase 3 (March finale)
        [349.23, 1.20, 0.09], [392.0, 1.30, 0.09], [440.0, 1.40, 0.09],
        [493.88, 1.50, 0.09], [523.25, 1.60, 0.09], [587.33, 1.70, 0.09], [523.25, 1.80, 0.42],
      ];
      const harmony = [
        [261.63, 0.00, 0.09], [293.66, 0.10, 0.09], [329.63, 0.20, 0.09], [392.0, 0.30, 0.24],
        [220.00, 0.60, 0.09], [246.94, 0.70, 0.09], [261.63, 0.80, 0.09], [329.63, 0.90, 0.24],
        [261.63, 1.20, 0.09], [293.66, 1.30, 0.09], [329.63, 1.40, 0.09],
        [349.23, 1.50, 0.09], [392.00, 1.60, 0.09], [440.00, 1.70, 0.09], [392.00, 1.80, 0.42],
      ];
      const bass = [
        [130.81, 0.00, 0.25], [196.00, 0.30, 0.25],
        [110.00, 0.60, 0.25], [164.81, 0.90, 0.25],
        [174.61, 1.20, 0.25], [196.00, 1.50, 0.25], [130.81, 1.80, 0.42],
      ];

      for (const [f, off, dur] of lead) {
        this._tone('square', f, f, t0 + off, dur, 0.18);
      }
      for (const [f, off, dur] of harmony) {
        this._tone('square', f, f, t0 + off, dur, 0.11);
      }
      for (const [f, off, dur] of bass) {
        this._tone('triangle', f, f, t0 + off, dur, 0.26);
      }
    }

    playShoot() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._tone('square', 780, 190, t, 0.085, 0.16);
      this._noise(1600, 400, t, 0.045, 0.12);
    }

    playHitBrick() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._noise(450, 110, t, 0.06, 0.18);
    }

    playHitSteel() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._tone('square', 1320, 1680, t, 0.045, 0.15);
      this._tone('square', 2080, 1760, t + 0.02, 0.06, 0.11);
    }

    playHitArmor() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._tone('square', 1100, 1480, t, 0.055, 0.16);
      this._tone('triangle', 520, 680, t, 0.06, 0.18);
    }

    playExplodeEnemy() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._noise(750, 85, t, 0.28, 0.34);
      this._tone('sawtooth', 160, 48, t, 0.24, 0.16);
    }

    playExplodePlayer() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._noise(620, 50, t, 0.56, 0.42);
      this._tone('sawtooth', 140, 36, t, 0.48, 0.24);
    }

    playPowerupAppear() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((f, i) => {
        this._tone('square', f, f, t + i * 0.045, 0.05, 0.14);
      });
    }

    playPowerupPick() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        this._tone('square', f, f, t + i * 0.05, 0.075, 0.18);
      });
    }

    playLifeUp() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [659.25, 783.99, 1318.5, 1046.5, 1174.66, 1567.98];
      notes.forEach((f, i) => {
        this._tone('square', f, f, t + i * 0.07, 0.09, 0.19);
      });
    }

    playPause() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._tone('square', 659.25, 659.25, t, 0.06, 0.16);
      this._tone('square', 523.25, 523.25, t + 0.065, 0.06, 0.16);
      this._tone('square', 659.25, 659.25, t + 0.13, 0.09, 0.16);
    }

    playScoreTick() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this._tone('square', 920, 920, t, 0.025, 0.11);
    }

    playBonus() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      [587.33, 783.99, 987.77, 1174.66].forEach((f, i) => {
        this._tone('square', f, f, t + i * 0.06, 0.11, 0.18);
      });
    }

    playGameOver() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [
        [392.0, 0.00, 0.18],
        [369.99, 0.20, 0.18],
        [349.23, 0.40, 0.18],
        [329.63, 0.60, 0.22],
        [261.63, 0.85, 0.55],
      ];
      for (const [f, off, dur] of notes) {
        this._tone('square', f, f * 0.985, t + off, dur, 0.20);
        this._tone('triangle', f * 0.5, f * 0.5, t + off, dur, 0.22);
      }
    }

    // Authentic subtle NES engine chug while active in battlefield
    updateEngine(active, moving) {
      if (!this.ctx || this.ctx.state !== 'running' || this.muted) {
        this._stopEngine();
        return;
      }
      if (!active) {
        this._stopEngine();
        return;
      }

      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'triangle';
        this.engineGain.gain.value = 0.038;
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);
        this.engineOsc.start();
      }

      this.enginePhase = (this.enginePhase + 1) % 6;
      if (moving) {
        const freq = this.enginePhase < 3 ? 88 : 74;
        this.engineOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        this.engineGain.gain.setTargetAtTime(0.052, this.ctx.currentTime, 0.02);
      } else {
        const freq = this.enginePhase < 3 ? 58 : 50;
        this.engineOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        this.engineGain.gain.setTargetAtTime(0.024, this.ctx.currentTime, 0.02);
      }
    }

    _stopEngine() {
      if (this.engineOsc) {
        try {
          this.engineOsc.stop();
          this.engineOsc.disconnect();
        } catch (_) {}
        this.engineOsc = null;
      }
      if (this.engineGain) {
        try {
          this.engineGain.disconnect();
        } catch (_) {}
        this.engineGain = null;
      }
    }
  }

  BC.Audio = new NesAudio();
})(window);
