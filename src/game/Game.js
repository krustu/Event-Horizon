/**
 * Game — the composition root. It is the ONLY place that knows every component:
 * it creates the bus, the world, the handlers (consumers) and the DOM-free producers, and
 * defines the order of one frame. Nothing else wires components together.
 *
 * The InputProducer (needs the browser) and the Renderer / DebugPanel are attached by main.js.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  class Game {
    /** @param {{strict?:boolean, console?:boolean, showNoisy?:boolean}} [options] */
    constructor(options) {
      const o = options || {};
      this.bus = new EDP.EventBus({ strict: !!o.strict });
      this.world = new EDP.World();
      this.logger = new EDP.EventLogger(this.bus, { console: !!o.console, showNoisy: !!o.showNoisy });

      const bus = this.bus;
      const world = this.world;

      // --- Event Handlers. Registration order = dispatch order for events with several subscribers.
      this.handlers = [
        new EDP.PlayerControlHandler(bus, world),
        new EDP.WeaponHandler(bus, world),
        new EDP.ProjectileHandler(bus, world),
        new EDP.EnemyBehaviorHandler(bus, world),
        new EDP.CombatHandler(bus, world),
        new EDP.PowerUpHandler(bus, world),
        new EDP.HealthAndStateHandler(bus, world),
        new EDP.WaveHandler(bus, world),
        new EDP.ScoreHandler(bus, world),
        new EDP.AchievementHandler(bus, world),
        new EDP.VisualEffectsHandler(bus, world),
        new EDP.AudioHandler(bus, world),
        new EDP.UINotificationHandler(bus, world),
      ];
      this.audio = this.handlers.find((h) => h instanceof EDP.AudioHandler);

      // --- Event Producers that do not need the browser.
      this.loop = new EDP.GameLoopProducer(bus, world);
      this.spawner = new EDP.EnemySpawner(bus, world);
      this.collisions = new EDP.CollisionDetector(bus, world);
    }

    /**
     * One frame:
     *   phase A — time-driven producers publish (FRAME_TICK, spawn requests), the bus drains:
     *             movement, AI, cooldowns, bullets, timers, effects run as handlers.
     *   phase B — the collision detector observes the resulting world and publishes COLLISION_*,
     *             the bus drains again: damage, kills, score, drops, achievements, sounds...
     * (Input events are published asynchronously by InputProducer whenever a key changes; they are
     *  simply queued and delivered in phase A's drain.)
     */
    step(dt) {
      this.loop.update(dt);
      this.spawner.update(dt);
      this.bus.process();
      this.collisions.update();
      this.bus.process();
    }
  }

  EDP.Game = Game;
})(globalThis);
