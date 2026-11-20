/**
 * EVENT PRODUCER: the game clock.
 * Emits FRAME_TICK once per animation frame (except while paused). It knows nothing about who
 * consumes the tick — movement, AI, cooldowns, timers and particles all subscribe independently.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;

  class GameLoopProducer {
    constructor(bus, world) {
      this.publish = bus.createPublisher('GameLoopProducer');
      this.world = world;
      this.frame = 0;
      this.time = 0;
    }

    update(dt) {
      if (this.world.state === 'paused') return;
      this.frame++;
      this.time += dt;
      this.publish(E.FRAME_TICK, { dt, frame: this.frame, time: this.time, state: this.world.state });
    }
  }

  EDP.GameLoopProducer = GameLoopProducer;
})(globalThis);
