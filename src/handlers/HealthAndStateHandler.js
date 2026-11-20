/**
 * EVENT HANDLER: player health, lives, invulnerability and the top-level game state machine
 *   title -> playing <-> paused -> gameover | won -> playing (restart)
 * Owns world.state and the player's health / lives / invuln.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  class HealthAndStateHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('HealthAndStateHandler', bus, world);
      this.on(E.INPUT_START_PRESSED, this.onStartPressed);
      this.on(E.INPUT_PAUSE_PRESSED, this.onPausePressed);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.PLAYER_DAMAGED, this.onDamaged);
      this.on(E.SHIELD_ABSORBED, this.onShieldAbsorbed);
      this.on(E.POWERUP_COLLECTED, this.onPowerup);
      this.on(E.BOSS_DEFEATED, this.onBossDefeated);
    }

    onStartPressed() {
      const w = this.world;
      if (w.state !== 'title' && w.state !== 'gameover' && w.state !== 'won') return;
      const isRestart = w.state !== 'title';
      const p = w.player;
      p.health = p.maxHealth = C.PLAYER.maxHealth;
      p.lives = C.PLAYER.lives;
      p.invuln = 0;
      w.state = 'playing';
      this.emit(E.GAME_STARTED, { lives: p.lives, health: p.health, is_restart: isRestart });
    }

    onPausePressed() {
      const w = this.world;
      if (w.state === 'playing') {
        w.state = 'paused';
        this.emit(E.GAME_PAUSED, {});
      } else if (w.state === 'paused') {
        w.state = 'playing';
        this.emit(E.GAME_RESUMED, {});
      }
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const pl = this.world.player;
      if (pl.invuln > 0) pl.invuln = Math.max(0, pl.invuln - p.dt);
    }

    onDamaged(p) {
      const w = this.world;
      const pl = w.player;
      if (w.state !== 'playing' || pl.invuln > 0) return;
      pl.health = Math.max(0, pl.health - p.amount);
      pl.invuln = C.PLAYER.hitInvuln;
      this.emit(E.PLAYER_HEALTH_CHANGED, { health: pl.health, max_health: pl.maxHealth, delta: -p.amount });
      if (pl.health <= 0) this.die();
    }

    die() {
      const w = this.world;
      const pl = w.player;
      pl.lives -= 1;
      this.emit(E.PLAYER_DIED, { lives_left: pl.lives, x: pl.x, y: pl.y });
      if (pl.lives > 0) {
        pl.health = pl.maxHealth;
        pl.invuln = C.PLAYER.respawnInvuln;
        this.emit(E.PLAYER_RESPAWNED, { x: C.PLAYER.startX, y: C.PLAYER.startY, invulnerable_for: C.PLAYER.respawnInvuln });
        this.emit(E.PLAYER_HEALTH_CHANGED, { health: pl.health, max_health: pl.maxHealth, delta: pl.maxHealth });
      } else {
        w.state = 'gameover';
        this.emit(E.GAME_OVER, { score: w.score, wave: w.wave.number, reason: 'out_of_lives' });
      }
    }

    onShieldAbsorbed() {
      // brief grace period after a shield blocks a hit
      this.world.player.invuln = Math.max(this.world.player.invuln, 1.0);
    }

    onPowerup(p) {
      if (p.kind !== 'health') return;
      const pl = this.world.player;
      const before = pl.health;
      pl.health = Math.min(pl.maxHealth, pl.health + C.POWERUPS.healAmount);
      const amount = pl.health - before;
      this.emit(E.PLAYER_HEALED, { amount, health: pl.health });
      this.emit(E.PLAYER_HEALTH_CHANGED, { health: pl.health, max_health: pl.maxHealth, delta: amount });
    }

    onBossDefeated() {
      const w = this.world;
      if (w.state !== 'playing') return;
      w.state = 'won';
      this.emit(E.GAME_WON, { score: w.score, wave: w.wave.number });
    }
  }

  EDP.HealthAndStateHandler = HealthAndStateHandler;
})(globalThis);
