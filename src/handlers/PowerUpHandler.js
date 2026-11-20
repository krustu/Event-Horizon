/**
 * EVENT HANDLER: power-ups. Owns the falling power-up list and the player's timed buffs.
 * Drops are rolled when enemies are destroyed; pickups arrive as COLLISION_PLAYER_POWERUP.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;
  const Random = EDP.Random;

  const WEIGHTS = {};
  Object.keys(C.POWERUPS.kinds).forEach((k) => (WEIGHTS[k] = C.POWERUPS.kinds[k].weight));

  class PowerUpHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('PowerUpHandler', bus, world);
      this.on(E.ENEMY_DESTROYED, this.onEnemyDestroyed);
      this.on(E.COLLISION_PLAYER_POWERUP, this.onPickup);
      this.on(E.SHIELD_ABSORBED, this.onShieldAbsorbed);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.PLAYER_DIED, this.clearBuffs);
      this.on(E.GAME_STARTED, this.onGameStarted);
    }

    onEnemyDestroyed(p) {
      if (p.enemy_type === 'boss') return;
      const chance = p.enemy_type === 'tank' ? C.POWERUPS.tankDropChance : C.POWERUPS.dropChance;
      if (!Random.chance(chance)) return;
      const kind = Random.weighted(WEIGHTS);
      const powerup = { id: this.world.nextId(), kind, x: p.x, y: p.y, w: 26, h: 26, alive: true, age: 0 };
      this.world.powerups.push(powerup);
      this.emit(E.POWERUP_DROPPED, { powerup_id: powerup.id, kind, x: p.x, y: p.y });
    }

    onPickup(p) {
      const powerup = this.world.powerups.find((u) => u.id === p.powerup_id && u.alive);
      if (!powerup) return;
      powerup.alive = false;
      const cfg = C.POWERUPS.kinds[powerup.kind];
      if (powerup.kind !== 'health') this.world.player.buffs[powerup.kind] = cfg.duration;
      this.emit(E.POWERUP_COLLECTED, { kind: powerup.kind, duration: cfg.duration, x: p.x, y: p.y });
    }

    onShieldAbsorbed() {
      // a shield is spent by the hit it blocks
      if (this.world.player.buffs.shield > 0) {
        this.world.player.buffs.shield = 0;
        this.emit(E.POWERUP_EXPIRED, { kind: 'shield' });
      }
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const w = this.world;
      for (const u of w.powerups) {
        u.age += p.dt;
        u.y += C.POWERUPS.fallSpeed * p.dt;
        if (u.y > C.H + 20) u.alive = false;
      }
      w.powerups = w.powerups.filter((u) => u.alive);

      const buffs = w.player.buffs;
      for (const kind of Object.keys(buffs)) {
        if (buffs[kind] <= 0) continue;
        buffs[kind] -= p.dt;
        if (buffs[kind] <= 0) {
          buffs[kind] = 0;
          this.emit(E.POWERUP_EXPIRED, { kind });
        }
      }
    }

    clearBuffs() {
      const b = this.world.player.buffs;
      b.rapid = b.spread = b.shield = 0;
    }

    onGameStarted() {
      this.world.powerups = [];
      this.clearBuffs();
    }
  }

  EDP.PowerUpHandler = PowerUpHandler;
})(globalThis);
