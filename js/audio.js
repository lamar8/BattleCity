(function (global) {
  'use strict';

  const BC = (global.BattleCity = global.BattleCity || {});

  // =========================================================================
  // 1985 Famicom Battle City — ROM-Accurate 2A03 NES APU Sound Engine
  // Sequence tables ($ED36–$EF62) + 4 hardware channels (Pulse1, Pulse2, Tri, Noise)
  // =========================================================================
  const NES_CPU_CLOCK = 1789773;
  const NES_PITCH = [2034, 1920, 1812, 1710, 1603, 1524, 1438, 1358, 1282, 1210, 1142, 1078];
  const NES_NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];

  function noteToPeriod(noteByte) {
    const semi = (noteByte >> 3) & 0x0f;
    const oct = noteByte & 0x07;
    if (semi >= 12) return 0;
    return NES_PITCH[semi] >> oct;
  }

  function periodToFreq(period, isTriangle) {
    if (period <= 0) return 440;
    return NES_CPU_CLOCK / ((isTriangle ? 32 : 16) * (period + 1));
  }

  // Exact Battle City Famicom ROM sound sequences (slots 0–27)
  const SOUND_SEQ = [
    /* 0  $EE2C pause */
    [0x02,0x82,0x7F,0x40, 0x64,0x1B,0x2B,0x3B,0x1C,0x2C,0x3C,0x6C,0x53,0xE8],
    /* 1  $ED36 stage start BGM pulse1 */
    [0x01,0x81,0x7F,0x40, 0xEF,0x68,0x1B,0x2B,0x33,0xF0,0x02,0x06,0x33,0x43,0x53,0xF0,0x02,0x0C,0x43,0x53,0x04,0xF0,0x02,0x12,0x5B,0x0C,0x1C,0xF0,0x02,0x18,0x78,0x1C,0x68,0x1C,0x1C,0x1C,0x78,0x1C,0xE8],
    /* 2  $ED5D stage start BGM triangle */
    [0x03,0x10,0x7F,0x08, 0x78,0x1A,0x68,0x1A,0xF1,0x03,0x07,0x78,0x32,0x68,0x32,0xF1,0x03,0x0E,0x78,0x42,0x68,0x42,0xF1,0x03,0x15,0x5A,0xF1,0x03,0x19,0x0B,0xF1,0x03,0x1D,0x78,0x52,0x68,0x52,0xF1,0x03,0x24,0x78,0x52,0xE8],
    /* 3  $ED88 stage start BGM pulse2 */
    [0x02,0x81,0x7F,0x40, 0x78,0x51,0x68,0x51,0xF2,0x03,0x07,0x78,0x0A,0x68,0x0A,0xF2,0x03,0x0E,0x78,0x1A,0x68,0x1A,0xF2,0x03,0x15,0x32,0xF2,0x03,0x19,0x42,0xF2,0x03,0x1D,0x78,0x3A,0x68,0x3A,0xF2,0x03,0x24,0x78,0x3A,0xE8],
    /* 4  $EE9F 1UP pulse1 */
    [0x01,0xA0,0x7F,0x40, 0x66,0x1C,0x3C,0x1C,0x53,0x1C,0x3C,0x05,0x72,0x54,0xE8],
    /* 5  $EEAE 1UP pulse2 */
    [0x02,0x90,0x7F,0x40, 0x62,0x38,0x66,0xEA,0x20,0x3B,0x53,0x3B,0x1B,0x3B,0x53,0x1C,0x6A,0x14,0xE8],
    /* 6  $EE19 powerup collect */
    [0x02,0x80,0x7F,0x40, 0x63,0x52,0x1B,0x3B,0x53,0x4A,0x13,0x33,0x4B,0x1B,0x3B,0x53,0x1C,0x3C,0xE8],
    /* 7  $EDB3 noise explosion */
    [0x04,0x1F,0x7F,0x30,0x0A, 0x62,0x49,0x49,0xEA,0x1E,0x49,0x49,0xEA,0x1D,0x49,0x49,0xEA,0x1C,0x49,0x49,0xEA,0x1B,0x49,0x49,0xEA,0x1A,0x49,0xEA,0x19,0x49,0xEA,0x18,0x49,0xE8],
    /* 8  $EDD5 unused */
    [0x02,0x1F,0x7F,0x30, 0x62,0x00,0x01,0x00,0xE8],
    /* 9  $EE48 powerup appear */
    [0x02,0x60,0x7F,0x40, 0x64,0x52,0x3A,0x52,0x03,0x52,0x03,0x13,0x1B,0xE8],
    /* 10 $EE03 entity kill noise */
    [0x04,0x1F,0x7F,0x40,0x0A, 0x62,0x51,0xEA,0x1E,0x51,0xEA,0x08,0x6A,0x51,0xE8],
    /* 11 $EDF4 eagle hit */
    [0x02,0x20,0x7F,0x30, 0x63,0x1A,0x12,0x51,0x31,0x19,0x11,0x50,0x30,0x18,0xE8],
    /* 12 $EE5E brick hit (triangle thump) */
    [0x03,0x07,0x7F,0x08, 0x61,0x3A,0x13,0x22,0xE8],
    /* 13 $EE56 steel/border ricochet (sharp metallic ping) */
    [0x02,0xD5,0x7F,0x00, 0x62,0x1C,0x1D,0xE8],
    /* 14 $EE67 armor hit */
    [0x02,0x40,0x7F,0x00, 0x61,0x3D,0x62,0x45,0xEA,0x10,0x28,0xE8],
    /* 15 $EE12 player fire (2A03 hardware sweep) */
    [0x01,0x8F,0x82,0x10, 0x6F,0x2C,0xE8],
    /* 16 $EE95 enemy fire */
    [0x01,0x1F,0x7F,0x28, 0x61,0x22,0x42,0x5A,0x1B,0xE8],
    /* 17 $EE8C tank engine (loops) */
    [0x02,0x80,0x94,0x48, 0x62,0x40,0x48,0xF9,0x05,0xE8],
    /* 18 $EE82 eagle alarm */
    [0x02,0x8C,0x94,0x40, 0x61,0x10,0x64,0x18,0xF9,0x05,0xE8],
    /* 19 $EE73 tally tick */
    [0x02,0x80,0x7F,0x18, 0x61,0x39,0xE8],
    /* 20 $EE7A tally tick noise */
    [0x04,0x00,0x7F,0x28,0x0A, 0x61,0x28,0xE8],
    /* 21 $EEC1 hi-score/clear pulse1 */
    [0x01,0xB8,0x7F,0x40, 0xEF,0x65,0x0C,0x53,0xF0,0x0C,0x05,0x0C,0x53,0xF0,0x0C,0x0B,0x34,0x24,0xF0,0x08,0x10,0xEA,0x30,0xB0,0x50,0xEA,0x20,0x9C,0x54,0xE8],
    /* 22 $EEDF hi-score/clear pulse2 */
    [0x02,0xB8,0x7F,0x40, 0x65,0x43,0x33,0xF1,0x0C,0x04,0x43,0x33,0xF1,0x0C,0x0A,0x14,0x4B,0xF1,0x08,0x0F,0xEA,0x3A,0x30,0x50,0x09,0x29,0x31,0x51,0x0A,0x2A,0x32,0x52,0x0B,0x2B,0x33,0x53,0x0C,0x2C,0x9C,0xEA,0x20,0x2C,0xE8],
    /* 23 $EF0A hi-score/clear tri */
    [0x03,0x00,0x7F,0x08, 0xA1,0x01,0x01,0xEE,0x15,0x6A,0x0B,0x0B,0x0B,0xEE,0x22,0x6F,0x33,0x65,0x43,0x7E,0xEE,0x33,0x53,0x6A,0xEE,0x15,0x43,0x33,0x53,0x6F,0xEE,0x22,0x13,0x65,0x23,0x7E,0xEE,0x33,0x33,0x6A,0xEE,0x15,0x23,0x13,0x4A,0x9C,0xEE,0xFF,0x32,0xE8],
    /* 24 $EF3C game over pulse1 */
    [0x01,0x42,0x7F,0x40, 0x66,0x1B,0x0B,0x78,0x1B,0x68,0x52,0x42,0x32,0x1A,0x1A,0x1A,0x78,0x1A,0xE8],
    /* 25 $EF4F game over pulse2 */
    [0x02,0x82,0x7F,0x40, 0x66,0x52,0x52,0x78,0x52,0x68,0x32,0x2A,0x12,0x1A,0x1A,0x1A,0x78,0x1A,0xE8],
    /* 26 $EF62 game over tri */
    [0x03,0x10,0x7F,0x08, 0x66,0x3B,0x33,0x78,0x3B,0x68,0x1B,0x0B,0x52,0x52,0x52,0x52,0x78,0x52,0xE8],
    /* 27 $EE3A tally bonus */
    [0x02,0x82,0x7F,0x40, 0x63,0x53,0x1B,0x1C,0x3B,0x3C,0x53,0x6A,0x54,0xE8],
  ];

  const SND = {
    PAUSE: 0,
    BGM_SQ1: 1,
    BGM_TRI: 2,
    BGM_SQ2: 3,
    LIFE_UP_P1: 4,
    LIFE_UP_P2: 5,
    POWERUP_COLLECT: 6,
    EXPLOSION: 7,
    POWERUP_APPEAR: 9,
    ENTITY_KILL: 10,
    EAGLE_HIT: 11,
    BRICK_HIT: 12,
    STEEL_HIT: 13,
    ARMOR_HIT: 14,
    PLAYER_FIRE: 15,
    ENEMY_FIRE: 16,
    TANK_ENGINE: 17,
    EAGLE_ALARM: 18,
    TALLY_TICK: 19,
    TALLY_TICK2: 20,
    HI_SCORE1: 21,
    HI_SCORE2: 22,
    HI_SCORE3: 23,
    GAME_OVER1: 24,
    GAME_OVER2: 25,
    GAME_OVER3: 26,
    TALLY_DONE: 27,
  };

  class NesAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.muted = false;
      this.volume = 0.42;
      this.dutyWaves = [null, null, null, null];
      this.noiseBuffer = null;
      this.channels = [null, null, null, null];
      this.engineActive = false;

      this.slots = Array.from({ length: 28 }, () => ({
        active: false,
        channel: 0,
        seq: null,
        pos: 0,
        dur: 0,
        durSaved: 0,
        vol: 0,
        freq: 0,
        period: 0,
        noisePeriodIdx: 0,
        duty: 2,
        volByte: 0,
        loopCtr: [0, 0, 0],
        needsWrite: false,
        useEnvelope: false,
        envVol: 15,
        envDivider: 0,
        envPeriod: 0,
        envLoop: false,
        envStartFlag: false,
        sweepEnabled: false,
        sweepPeriod: 0,
        sweepNegate: false,
        sweepShift: 0,
        sweepDivider: 0,
      }));
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this._initWaves();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume * 0.42;
        this.masterGain.connect(this.ctx.destination);

        for (let i = 0; i < 4; i++) {
          this.channels[i] = this._createChannel(i);
        }
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
          this.muted ? 0 : this.volume * 0.42,
          this.ctx.currentTime,
          0.015
        );
      }
      if (this.muted) this._silenceAllHardware();
    }

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.masterGain && this.ctx && !this.muted) {
        this.masterGain.gain.setTargetAtTime(this.volume * 0.42, this.ctx.currentTime, 0.015);
      }
    }

    _initWaves() {
      const duties = [0.125, 0.25, 0.5, 0.75];
      for (let d = 0; d < 4; d++) {
        const n = 64;
        const real = new Float32Array(n);
        const imag = new Float32Array(n);
        for (let i = 1; i < n; i++) {
          real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duties[d]);
        }
        this.dutyWaves[d] = this.ctx.createPeriodicWave(real, imag);
      }

      // 15-bit LFSR pseudo-random noise buffer
      const len = 32767;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let reg = 1;
      for (let i = 0; i < len; i++) {
        const fb = (reg & 1) ^ ((reg >> 1) & 1);
        reg = (reg >> 1) | (fb << 14);
        data[i] = reg & 1 ? -1 : 1;
      }
    }

    _createChannel(chIdx) {
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.masterGain);

      let osc;
      if (chIdx < 2) {
        osc = this.ctx.createOscillator();
        osc.setPeriodicWave(this.dutyWaves[2]);
        osc.frequency.value = 440;
      } else if (chIdx === 2) {
        osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 440;
      } else {
        osc = this.ctx.createBufferSource();
        osc.buffer = this.noiseBuffer;
        osc.loop = true;
      }
      osc.connect(gain);
      osc.start();
      return { osc, gain };
    }

    _updateVolState(s) {
      const constVol = !!(s.volByte & 0x10);
      s.useEnvelope = !constVol;
      s.duty = (s.volByte >> 6) & 3;
      if (constVol) {
        s.vol = s.volByte & 0x0f;
      } else {
        s.envPeriod = s.volByte & 0x0f;
        s.envLoop = !!(s.volByte & 0x20);
      }
    }

    _playSlot(slotIdx) {
      if (this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx || slotIdx < 0 || slotIdx >= 28) return;

      const seq = SOUND_SEQ[slotIdx];
      if (!seq || seq.length < 5) return;

      const s = this.slots[slotIdx];
      s.active = true;
      s.seq = seq;

      const chSel = seq[0];
      s.channel = chSel >= 1 && chSel <= 4 ? chSel - 1 : 0;
      s.volByte = seq[1];

      const constVol = !!(seq[1] & 0x10);
      s.useEnvelope = !constVol;
      s.duty = (seq[1] >> 6) & 3;
      if (constVol) {
        s.vol = seq[1] & 0x0f;
      } else {
        s.envPeriod = seq[1] & 0x0f;
        s.envLoop = !!(seq[1] & 0x20);
        s.envVol = 15;
        s.envDivider = s.envPeriod;
        s.envStartFlag = true;
        s.vol = 15;
      }

      s.sweepEnabled = false;
      if (s.channel < 2) {
        const sweep = seq[2];
        if (sweep & 0x80) {
          s.sweepEnabled = true;
          s.sweepPeriod = (sweep >> 4) & 7;
          s.sweepNegate = !!(sweep & 0x08);
          s.sweepShift = sweep & 7;
          s.sweepDivider = s.sweepPeriod;
        }
      }

      s.pos = chSel === 4 ? 5 : 4;
      s.dur = 0;
      s.durSaved = 0;
      s.freq = 0;
      s.period = 0;
      s.noisePeriodIdx = 0;
      s.needsWrite = false;
      s.loopCtr = [0, 0, 0];
    }

    _stopSlot(slotIdx) {
      if (slotIdx >= 0 && slotIdx < 28) {
        this.slots[slotIdx].active = false;
      }
    }

    _silenceAllHardware() {
      if (!this.ctx) return;
      for (let c = 0; c < 4; c++) {
        if (this.channels[c] && this.channels[c].gain) {
          this.channels[c].gain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
      }
    }

    // 60Hz NES APU frame tick
    tick() {
      if (!this.ctx || this.ctx.state !== 'running' || this.muted) return;

      // Pass 1: Process active sequences
      for (let i = 0; i < 28; i++) {
        const s = this.slots[i];
        if (!s.active) continue;

        if (s.dur > 0) {
          s.dur--;
          if (s.dur > 0) continue;
        }

        const seq = s.seq;
        let safety = 40;
        while (s.pos < seq.length && safety-- > 0) {
          const b = seq[s.pos++];
          if (b <= 0x5f) {
            if (s.channel < 2) {
              s.period = noteToPeriod(b);
              s.freq = periodToFreq(s.period, false);
            } else if (s.channel === 2) {
              s.period = noteToPeriod(b);
              s.freq = periodToFreq(s.period, true);
            } else {
              s.noisePeriodIdx = b & 0x0f;
            }
            s.envStartFlag = true;
            if (s.sweepEnabled) s.sweepDivider = s.sweepPeriod;
            s.needsWrite = true;
            if (s.durSaved > 0 && s.dur === 0) s.dur = s.durSaved;
            break;
          } else if (b === 0x60) {
            if (s.durSaved > 0) s.dur = s.durSaved;
            break;
          } else if (b >= 0x61 && b <= 0xe7) {
            s.dur = b - 0x60;
            s.durSaved = s.dur;
          } else if (b === 0xe8) {
            s.active = false;
            break;
          } else if (b === 0xe9) {
            if (s.pos < seq.length) {
              s.volByte = (s.volByte & 0x3f) | seq[s.pos++];
              this._updateVolState(s);
            }
          } else if (b === 0xea) {
            if (s.pos < seq.length) {
              s.volByte = (s.volByte & 0xc0) | seq[s.pos++];
              this._updateVolState(s);
            }
          } else if (b === 0xeb) {
            if (s.pos < seq.length) {
              s.volByte = (s.volByte & 0xf0) | seq[s.pos++];
              this._updateVolState(s);
            }
          } else if (b === 0xec) {
            if (s.pos < seq.length) {
              const sw = seq[s.pos++];
              if (s.channel < 2) {
                s.sweepEnabled = !!(sw & 0x80);
                s.sweepPeriod = (sw >> 4) & 7;
                s.sweepNegate = !!(sw & 0x08);
                s.sweepShift = sw & 7;
                s.sweepDivider = s.sweepPeriod;
              }
            }
          } else if (b === 0xed) {
            if (s.pos < seq.length) s.pos++;
          } else if (b === 0xee) {
            if (s.pos < seq.length) {
              s.volByte = seq[s.pos++];
              this._updateVolState(s);
            }
          } else if (b === 0xef) {
            s.loopCtr = [0, 0, 0];
          } else if (b >= 0xf0 && b <= 0xf2) {
            const lvl = b - 0xf0;
            if (s.pos + 1 < seq.length) {
              const rep = seq[s.pos++];
              const off = seq[s.pos++];
              s.loopCtr[lvl]++;
              if (s.loopCtr[lvl] >= rep) {
                s.loopCtr[lvl] = 0;
              } else {
                s.pos = off;
              }
            }
          } else if (b >= 0xf3 && b <= 0xf8) {
            // NOP sub-counter tick
          } else if (b === 0xf9) {
            if (s.pos < seq.length) s.pos = seq[s.pos];
          } else {
            if (s.pos < seq.length) s.pos++;
          }
        }
      }

      // Tick Hardware Envelopes (~3 quarter-frame clocks per frame)
      for (let i = 0; i < 28; i++) {
        const s = this.slots[i];
        if (!s.active || !s.useEnvelope) continue;
        for (let q = 0; q < 3; q++) {
          if (s.envStartFlag) {
            s.envStartFlag = false;
            s.envVol = 15;
            s.envDivider = s.envPeriod;
          }
          if (s.envDivider > 0) {
            s.envDivider--;
          } else {
            s.envDivider = s.envPeriod;
            if (s.envVol > 0) s.envVol--;
            else if (s.envLoop) s.envVol = 15;
          }
        }
      }

      // Tick Hardware Sweeps (2 half-frame clocks per frame, pulse only)
      for (let i = 0; i < 28; i++) {
        const s = this.slots[i];
        if (!s.active || !s.sweepEnabled || s.channel >= 2 || s.period <= 0) continue;
        for (let h = 0; h < 2; h++) {
          if (s.sweepDivider > 0) {
            s.sweepDivider--;
          } else {
            s.sweepDivider = s.sweepPeriod;
            if (s.sweepShift > 0) {
              const change = s.period >> s.sweepShift;
              const newPeriod = s.sweepNegate
                ? s.period - change - (s.channel === 0 ? 1 : 0)
                : s.period + change;
              if (newPeriod > 0 && newPeriod < 0x800) {
                s.period = newPeriod;
                s.freq = periodToFreq(s.period, false);
                s.needsWrite = true;
              } else if (newPeriod >= 0x800) {
                s.active = false;
              }
            }
          }
        }
      }

      // Pass 2: Write winning slot per hardware channel
      const claimed = [false, false, false, false];
      const now = this.ctx.currentTime;

      for (let i = 0; i < 28; i++) {
        const s = this.slots[i];
        if (!s.active) continue;
        const chIdx = s.channel;
        if (claimed[chIdx]) continue;
        claimed[chIdx] = true;

        const hw = this.channels[chIdx];
        if (!hw) continue;

        if (chIdx < 2) {
          hw.osc.setPeriodicWave(this.dutyWaves[s.duty & 3]);
        }

        if (s.needsWrite) {
          if (chIdx < 3) {
            hw.osc.frequency.setValueAtTime(Math.max(20, Math.min(20000, s.freq)), now);
          } else {
            const p = NES_NOISE_PERIODS[s.noisePeriodIdx & 0x0f];
            const rate = (NES_CPU_CLOCK / p) / this.ctx.sampleRate;
            hw.osc.playbackRate.setValueAtTime(Math.max(0.05, Math.min(20, rate)), now);
          }
          s.needsWrite = false;
        }

        const vol = s.useEnvelope ? s.envVol : s.vol;
        let gainVal;
        if (chIdx === 2) {
          gainVal = vol > 0 ? 0.58 : 0;
        } else if (chIdx === 3) {
          gainVal = (vol / 15) * 0.42;
        } else {
          // Slightly gentler engine loop (slot 17)
          const mult = i === SND.TANK_ENGINE ? 0.22 : 0.46;
          gainVal = (vol / 15) * mult;
        }
        hw.gain.gain.setValueAtTime(gainVal, now);
      }

      for (let c = 0; c < 4; c++) {
        if (!claimed[c] && this.channels[c]) {
          this.channels[c].gain.gain.setValueAtTime(0, now);
        }
      }
    }

    // High-level triggers
    playIntro() {
      this._playSlot(SND.BGM_SQ1);
      this._playSlot(SND.BGM_TRI);
      this._playSlot(SND.BGM_SQ2);
    }

    playShoot() {
      this._playSlot(SND.PLAYER_FIRE);
    }

    playHitBrick() {
      this._playSlot(SND.BRICK_HIT);
    }

    playHitSteel() {
      this._playSlot(SND.STEEL_HIT);
    }

    playHitArmor() {
      this._playSlot(SND.ARMOR_HIT);
    }

    playExplodeEnemy() {
      this._playSlot(SND.ENTITY_KILL);
      this._playSlot(SND.EXPLOSION);
    }

    playExplodePlayer() {
      this._playSlot(SND.EAGLE_HIT);
      this._playSlot(SND.EXPLOSION);
    }

    playPowerupAppear() {
      this._playSlot(SND.POWERUP_APPEAR);
    }

    playPowerupPick() {
      this._playSlot(SND.POWERUP_COLLECT);
    }

    playLifeUp() {
      this._playSlot(SND.LIFE_UP_P1);
      this._playSlot(SND.LIFE_UP_P2);
    }

    playPause() {
      this._playSlot(SND.PAUSE);
    }

    playScoreTick() {
      this._playSlot(SND.TALLY_TICK);
      this._playSlot(SND.TALLY_TICK2);
    }

    playBonus() {
      this._playSlot(SND.TALLY_DONE);
    }

    playVictoryFanfare() {
      this._stopSlot(SND.BGM_SQ1);
      this._stopSlot(SND.BGM_TRI);
      this._stopSlot(SND.BGM_SQ2);
      this._stopSlot(SND.TANK_ENGINE);
      this.engineActive = false;
      this._playSlot(SND.HI_SCORE1);
      this._playSlot(SND.HI_SCORE2);
      this._playSlot(SND.HI_SCORE3);
    }

    playGameOver() {
      this._stopSlot(SND.BGM_SQ1);
      this._stopSlot(SND.BGM_TRI);
      this._stopSlot(SND.BGM_SQ2);
      this._stopSlot(SND.TANK_ENGINE);
      this.engineActive = false;
      this._playSlot(SND.GAME_OVER1);
      this._playSlot(SND.GAME_OVER2);
      this._playSlot(SND.GAME_OVER3);
    }

    updateEngine(active, moving) {
      const shouldRun = !!(active && moving && !this.muted);
      if (shouldRun && !this.engineActive) {
        this.engineActive = true;
        this._playSlot(SND.TANK_ENGINE);
      } else if (!shouldRun && this.engineActive) {
        this.engineActive = false;
        this._stopSlot(SND.TANK_ENGINE);
      }
    }
  }

  BC.Audio = new NesAudio();
})(window);
