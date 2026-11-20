/**
 * EVENT HANDLER: sound. Synthesises every effect with the Web Audio API (no asset files).
 * Without an AudioContext (e.g. in Node tests) every call is a harmless no-op.
 * Owns the mute flag and announces changes with MUTE_CHANGED.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;

  class AudioHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('AudioHandler', bus, world);
      this.ctx = null;
      this.muted = false;
      this.lastShot = 0;
      this.lastEnemyShot = 0;

      this.on(E.INPUT_MUTE_PRESSED, this.onMutePressed);
      this.on(E.PLAYER_FIRED, this.onPlayerFired);
      this.on(E.ENEMY_FIRED, this.onEnemyFired);
      this.on(E.ENEMY_SPAWNED, this.onSpawned);
      this.on(E.ENEMY_DAMAGED, this.onEnemyDamaged);
      this.on(E.ENEMY_DESTROYED, this.onEnemyDestroyed);
      this.on(E.BOSS_ENRAGED, this.onEnraged);
      this.on(E.SHIELD_ABSORBED, this.onShield);
      this.on(E.PLAYER_DAMAGED, this.onPlayerDamaged);
      this.on(E.PLAYER_DIED, this.onPlayerDied);
      this.on(E.POWERUP_COLLECTED, this.onPowerup);
      this.on(E.WAVE_STARTED, this.onWaveStarted);
      this.on(E.WAVE_CLEARED, this.onWaveCleared);
      this.on(E.ACHIEVEMENT_UNLOCKED, this.onAchievement);
      this.on(E.HIGH_SCORE_BEATEN, this.onAchievement);
      this.on(E.GAME_PAUSED, this.onPaused);
      this.on(E.GAME_RESUMED, this.onResumed);
      this.on(E.GAME_OVER, this.onGameOver);
      this.on(E.GAME_WON, this.onGameWon);
    }

    /** Browsers only allow audio after a user gesture; main.js calls this on the first key press. */
    unlock() {
      try {
        if (!this.ctx) {
          const AC = root.AudioContext || root.webkitAudioContext;
          if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) {
        this.ctx = null;
      }
    }

    tone(freq, dur, opts) {
      if (!this.ctx || this.muted) return;
      const o = Object.assign({ type: 'square', vol: 0.05, slide: 0, delay: 0 }, opts);
      try {
        const t0 = this.ctx.currentTime + o.delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = o.type;
        osc.frequency.setValueAtTime(freq, t0);
        if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + o.slide), t0 + dur);
        gain.gain.setValueAtTime(o.vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      } catch (e) {
        /* audio is best-effort */
      }
    }

    noise(dur, vol) {
      if (!this.ctx || this.muted) return;
      try {
        const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        gain.gain.value = vol;
        src.buffer = buf;
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start();
      } catch (e) {
        /* audio is best-effort */
      }
    }

    now() {
      return this.ctx ? this.ctx.currentTime : 0;
    }

    onMutePressed() {
      this.muted = !this.muted;
      this.world.muted = this.muted;
      this.emit(E.MUTE_CHANGED, { muted: this.muted });
    }

    onPlayerFired() {
      const t = this.now();
      if (t - this.lastShot < 0.06) return;
      this.lastShot = t;
      this.tone(880, 0.07, { vol: 0.025, slide: -520 });
    }

    onEnemyFired() {
      const t = this.now();
      if (t - this.lastEnemyShot < 0.12) return;
      this.lastEnemyShot = t;
      this.tone(300, 0.1, { type: 'sawtooth', vol: 0.02, slide: -150 });
    }

    onSpawned(p) {
      if (p.enemy_type === 'boss') {
        for (let i = 0; i < 3; i++) this.tone(180, 0.25, { type: 'sawtooth', vol: 0.05, delay: i * 0.35, slide: 120 });
      }
    }

    onEnemyDamaged() {
      this.tone(220, 0.05, { type: 'triangle', vol: 0.04 });
    }

    onEnemyDestroyed(p) {
      const big = p.enemy_type === 'tank' || p.enemy_type === 'boss';
      this.noise(big ? 0.5 : 0.18, big ? 0.14 : 0.08);
    }

    onEnraged() {
      for (let i = 0; i < 4; i++) this.tone(260, 0.18, { type: 'square', vol: 0.05, delay: i * 0.2, slide: i % 2 ? -80 : 80 });
    }

    onShield() {
      this.tone(520, 0.25, { type: 'sine', vol: 0.07, slide: 500 });
    }

    onPlayerDamaged() {
      this.tone(160, 0.3, { type: 'sawtooth', vol: 0.08, slide: -110 });
      this.noise(0.15, 0.08);
    }

    onPlayerDied() {
      this.noise(0.7, 0.16);
      this.tone(300, 0.7, { type: 'sawtooth', vol: 0.07, slide: -250 });
    }

    onPowerup() {
      this.tone(520, 0.08, { type: 'triangle', vol: 0.07 });
      this.tone(780, 0.14, { type: 'triangle', vol: 0.07, delay: 0.08 });
    }

    onWaveStarted() {
      this.tone(440, 0.12, { type: 'triangle', vol: 0.06 });
      this.tone(660, 0.2, { type: 'triangle', vol: 0.06, delay: 0.12 });
    }

    onWaveCleared() {
      [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, { type: 'triangle', vol: 0.06, delay: i * 0.1 }));
    }

    onAchievement() {
      this.tone(988, 0.1, { type: 'sine', vol: 0.06 });
      this.tone(1319, 0.3, { type: 'sine', vol: 0.06, delay: 0.1 });
    }

    onPaused() {
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
    }

    onResumed() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    onGameOver() {
      [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.07, delay: i * 0.25 }));
    }

    onGameWon() {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.07, delay: i * 0.15 }));
    }
  }

  EDP.AudioHandler = AudioHandler;
})(globalThis);
