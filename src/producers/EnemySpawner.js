/**
 * EVENT PRODUCER: enemy spawner (wave timer).
 * Reads the current wave (read-only) and, on its own timer, REQUESTS spawns. It never creates
 * an enemy itself — EnemyBehaviorHandler turns the request into an entity.
 * Its only private state is its own timer / counter, which it resets when a new wave starts.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;
  const Random = EDP.Random;

  class EnemySpawner {
    constructor(bus, world) {
      this.publish = bus.createPublisher('EnemySpawner');
      this.world = world;
      this.serial = -1;
      this.requested = 0;
      this.timer = 0;
    }

    update(dt) {
      const wave = this.world.wave;
      if (this.world.state !== 'playing' || !wave.active) return;

      if (wave.serial !== this.serial) {
        this.serial = wave.serial;
        this.requested = 0;
        this.timer = 0.6; // short grace period after the wave banner
      }
      if (this.requested >= wave.total) return;

      this.timer -= dt;
      if (this.timer > 0) return;

      const cfg = C.WAVES[wave.number - 1];
      const type = cfg.boss && this.requested === 0 ? 'boss' : Random.weighted(cfg.mix);
      this.publish(E.ENEMY_SPAWN_REQUESTED, {
        enemy_type: type,
        x: type === 'boss' ? C.W / 2 : Random.range(30, C.W - 30),
        wave: wave.number,
        index: this.requested,
      });
      this.requested++;
      this.timer = cfg.interval;
    }
  }

  EDP.EnemySpawner = EnemySpawner;
})(globalThis);
