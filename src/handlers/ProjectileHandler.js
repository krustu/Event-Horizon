/**
 * EVENT HANDLER: projectiles. Owns the bullet arrays: creates bullets when a weapon or an enemy
 * REQUESTS a shot, moves them each tick, culls the ones that left the screen.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  const TAU = Math.PI * 2;

  class ProjectileHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('ProjectileHandler', bus, world);
      this.on(E.PLAYER_FIRE_REQUESTED, this.onPlayerFire);
      this.on(E.ENEMY_FIRE_REQUESTED, this.onEnemyFire);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.GAME_STARTED, this.clearAll);
      this.on(E.PLAYER_DIED, this.clearEnemyBullets);
      this.on(E.BOSS_DEFEATED, this.clearEnemyBullets);
    }

    onPlayerFire(p) {
      const speed = C.PLAYER.bulletSpeed;
      const angles = p.pattern === 'spread' ? [-0.22, 0, 0.22] : [0];
      for (const a of angles) {
        this.world.bullets.push({
          id: this.world.nextId(),
          x: p.x,
          y: p.y,
          vx: Math.sin(a) * speed,
          vy: -Math.cos(a) * speed,
          w: 6,
          h: 18,
          damage: 1,
          alive: true,
        });
      }
      this.emit(E.PLAYER_FIRED, { x: p.x, y: p.y, pattern: p.pattern, bullets: angles.length });
    }

    onEnemyFire(p) {
      // angle measured from "straight down": vx = sin(a) * speed, vy = cos(a) * speed
      const aim = Math.atan2(p.target_x - p.x, p.target_y - p.y);
      let angles;
      let speed;
      switch (p.pattern) {
        case 'triple':
          angles = [-0.28, 0, 0.28];
          speed = 230;
          break;
        case 'fan5':
          angles = [-0.5, -0.25, 0, 0.25, 0.5].map((o) => aim + o);
          speed = 250;
          break;
        case 'ring':
          angles = Array.from({ length: 12 }, (_, i) => (i * TAU) / 12);
          speed = 180;
          break;
        default: // 'aimed'
          angles = [aim];
          speed = 270;
      }
      const damage = p.enemy_type === 'boss' ? C.DAMAGE.bossBullet : C.DAMAGE.enemyBullet;
      for (const a of angles) {
        this.world.enemyBullets.push({
          id: this.world.nextId(),
          x: p.x,
          y: p.y,
          vx: Math.sin(a) * speed,
          vy: Math.cos(a) * speed,
          w: 10,
          h: 10,
          damage,
          alive: true,
        });
      }
      this.emit(E.ENEMY_FIRED, { enemy_id: p.enemy_id, enemy_type: p.enemy_type, bullets: angles.length });
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const w = this.world;
      const m = 30;
      const inside = (b) => b.alive && b.x > -m && b.x < C.W + m && b.y > -m && b.y < C.H + m;
      for (const b of w.bullets) {
        b.x += b.vx * p.dt;
        b.y += b.vy * p.dt;
      }
      for (const b of w.enemyBullets) {
        b.x += b.vx * p.dt;
        b.y += b.vy * p.dt;
      }
      w.bullets = w.bullets.filter(inside);
      w.enemyBullets = w.enemyBullets.filter(inside);
    }

    clearEnemyBullets() {
      this.world.enemyBullets = [];
    }

    clearAll() {
      this.world.bullets = [];
      this.world.enemyBullets = [];
    }
  }

  EDP.ProjectileHandler = ProjectileHandler;
})(globalThis);
