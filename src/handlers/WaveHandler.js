/**
 * EVENT HANDLER: wave progression. Owns world.wave. Counts spawned / living enemies from events,
 * announces WAVE_STARTED / WAVE_CLEARED and runs the intermission timer between waves.
 * (The EnemySpawner producer reads world.wave but never writes it.)
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  class WaveHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('WaveHandler', bus, world);
      this.on(E.GAME_STARTED, this.onGameStarted);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.ENEMY_SPAWNED, this.onSpawned);
      this.on(E.ENEMY_DESTROYED, this.onEnemyGone);
      this.on(E.ENEMY_ESCAPED, this.onEnemyGone);
    }

    onGameStarted() {
      Object.assign(this.world.wave, {
        number: 0,
        total: 0,
        spawned: 0,
        alive: 0,
        active: false,
        boss: false,
        intermission: 1.4,
        pending: 1,
      });
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const w = this.world.wave;
      if (w.intermission > 0) {
        w.intermission -= p.dt;
        if (w.intermission <= 0) this.start(w.pending);
      }
    }

    start(n) {
      const w = this.world.wave;
      const cfg = C.WAVES[n - 1];
      Object.assign(w, {
        number: n,
        serial: w.serial + 1,
        total: cfg.total,
        spawned: 0,
        alive: 0,
        active: true,
        boss: !!cfg.boss,
        intermission: 0,
      });
      this.emit(E.WAVE_STARTED, { wave: n, total_enemies: cfg.total, boss: !!cfg.boss });
    }

    onSpawned() {
      const w = this.world.wave;
      w.spawned++;
      w.alive++;
    }

    onEnemyGone() {
      const w = this.world.wave;
      w.alive = Math.max(0, w.alive - 1);
      if (w.active && w.spawned >= w.total && w.alive === 0) {
        w.active = false;
        this.emit(E.WAVE_CLEARED, { wave: w.number, bonus: C.SCORE.waveBonus * w.number });
        if (w.number < C.WAVES.length) {
          w.pending = w.number + 1;
          w.intermission = 2.5;
        }
      }
    }
  }

  EDP.WaveHandler = WaveHandler;
})(globalThis);
