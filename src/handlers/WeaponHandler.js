/**
 * EVENT HANDLER: the player's weapon. Owns firing state and the cooldown.
 * It only REQUESTS shots (PLAYER_FIRE_REQUESTED); ProjectileHandler creates the bullets.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  class WeaponHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('WeaponHandler', bus, world);
      this.cooldown = 0;
      this.on(E.INPUT_FIRE_CHANGED, this.onFireChanged);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.GAME_STARTED, this.onGameStarted);
    }

    onFireChanged(p) {
      this.world.player.firing = p.active;
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const pl = this.world.player;
      this.cooldown = Math.max(0, this.cooldown - p.dt);
      if (!pl.firing || this.cooldown > 0) return;

      const pattern = pl.buffs.spread > 0 ? 'spread' : 'single';
      this.cooldown = pl.buffs.rapid > 0 ? C.PLAYER.rapidCooldown : C.PLAYER.fireCooldown;
      this.emit(E.PLAYER_FIRE_REQUESTED, { x: pl.x, y: pl.y - pl.h / 2 + 4, pattern });
    }

    onGameStarted() {
      this.cooldown = 0;
    }
  }

  EDP.WeaponHandler = WeaponHandler;
})(globalThis);
