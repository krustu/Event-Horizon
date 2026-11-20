/**
 * World — the shared game-state container (plain data, no behaviour).
 *
 * OWNERSHIP RULE: every field has exactly one handler that may WRITE it (see architecture.md).
 * Producers (collision detector, spawner, loop) and the Renderer only READ it.
 * Handlers reset their own slice when they receive GAME_STARTED.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const C = EDP.Config;

  class World {
    constructor() {
      this._id = 0;

      /** 'title' | 'playing' | 'paused' | 'gameover' | 'won'   (HealthAndStateHandler) */
      this.state = 'title';

      /** position/input: PlayerControlHandler; health/lives/invuln: HealthAndStateHandler;
       *  firing/cooldown: WeaponHandler; buffs: PowerUpHandler */
      this.player = {
        x: C.PLAYER.startX,
        y: C.PLAYER.startY,
        w: C.PLAYER.w,
        h: C.PLAYER.h,
        moveX: 0,
        moveY: 0,
        health: C.PLAYER.maxHealth,
        maxHealth: C.PLAYER.maxHealth,
        lives: C.PLAYER.lives,
        invuln: 0,
        firing: false,
        buffs: { rapid: 0, spread: 0, shield: 0 },
      };

      this.enemies = []; // EnemyBehaviorHandler (+ CombatHandler marks alive=false)
      this.bullets = []; // ProjectileHandler: player bullets
      this.enemyBullets = []; // ProjectileHandler: enemy bullets
      this.powerups = []; // PowerUpHandler

      /** WaveHandler */
      this.wave = { number: 0, serial: 0, total: 0, spawned: 0, alive: 0, active: false, boss: false, intermission: 0, pending: 0 };

      /** ScoreHandler */
      this.score = 0;
      this.highScore = 0;
      this.combo = 0;
      this.multiplier = 1;
      this.comboTimer = 0;

      /** VisualEffectsHandler */
      this.fx = { particles: [], rings: [], texts: [], shake: 0, flash: 0, flashColor: '#ffffff', lowHealth: false };

      /** UINotificationHandler */
      this.ui = { toasts: [], banner: null };

      /** AudioHandler */
      this.muted = false;
    }

    nextId() {
      return ++this._id;
    }
  }

  EDP.World = World;
})(globalThis);
