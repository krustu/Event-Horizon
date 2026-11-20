/**
 * EVENT HANDLER: visual effects. Owns world.fx (particles, shock-rings, floating score text,
 * screen shake, damage flash, low-health warning). The Renderer only draws what is in there.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  const TAU = Math.PI * 2;
  const MAX_PARTICLES = 500;

  class VisualEffectsHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('VisualEffectsHandler', bus, world);
      this.on(E.ENEMY_DAMAGED, this.onEnemyDamaged);
      this.on(E.ENEMY_DESTROYED, this.onEnemyDestroyed);
      this.on(E.BOSS_DEFEATED, this.onBossDefeated);
      this.on(E.PLAYER_DAMAGED, this.onPlayerDamaged);
      this.on(E.PLAYER_DIED, this.onPlayerDied);
      this.on(E.SHIELD_ABSORBED, this.onShield);
      this.on(E.POWERUP_DROPPED, this.onDrop);
      this.on(E.POWERUP_COLLECTED, this.onCollected);
      this.on(E.SCORE_CHANGED, this.onScore);
      this.on(E.PLAYER_HEALTH_CHANGED, this.onHealth);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.GAME_STARTED, this.onGameStarted);
    }

    burst(x, y, count, color, speed, life, size) {
      const ps = this.world.fx.particles;
      for (let i = 0; i < count && ps.length < MAX_PARTICLES; i++) {
        const a = Math.random() * TAU;
        const s = speed * (0.3 + Math.random() * 0.7);
        const l = life * (0.6 + Math.random() * 0.6);
        ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, size: size * (0.6 + Math.random()), color });
      }
    }

    ring(x, y, color, maxR) {
      this.world.fx.rings.push({ x, y, r: 6, maxR, life: 0.4, max: 0.4, color });
    }

    text(x, y, str, color) {
      this.world.fx.texts.push({ x, y, text: str, color, life: 0.9, max: 0.9 });
    }

    shake(amount) {
      this.world.fx.shake = Math.max(this.world.fx.shake, amount);
    }

    onEnemyDamaged(p) {
      this.burst(p.x, p.y, 4, '#ffffff', 140, 0.25, 2);
    }

    onEnemyDestroyed(p) {
      const color = C.ENEMIES[p.enemy_type].color;
      const big = p.enemy_type === 'tank' || p.enemy_type === 'boss';
      this.burst(p.x, p.y, big ? 36 : 16, color, big ? 260 : 190, 0.6, 3);
      this.ring(p.x, p.y, color, big ? 90 : 46);
      this.shake(big ? 8 : 3);
    }

    onBossDefeated(p) {
      for (let i = 0; i < 6; i++) {
        this.burst(p.x + (Math.random() - 0.5) * 100, p.y + (Math.random() - 0.5) * 60, 30, '#ffd84d', 320, 1.1, 3.5);
        this.ring(p.x + (Math.random() - 0.5) * 100, p.y + (Math.random() - 0.5) * 60, '#ff3d81', 140);
      }
      this.shake(22);
      this.world.fx.flash = 0.6;
      this.world.fx.flashColor = '#ffffff';
    }

    onPlayerDamaged() {
      this.shake(9);
      this.world.fx.flash = 0.35;
      this.world.fx.flashColor = '#ff2d4d';
    }

    onPlayerDied(p) {
      this.burst(p.x, p.y, 40, '#4df3ff', 300, 0.9, 3);
      this.ring(p.x, p.y, '#4df3ff', 120);
      this.shake(16);
    }

    onShield(p) {
      this.ring(p.x, p.y, '#4df3ff', 60);
      this.burst(p.x, p.y, 10, '#4df3ff', 160, 0.4, 2);
    }

    onDrop(p) {
      this.ring(p.x, p.y, C.POWERUPS.kinds[p.kind].color, 30);
    }

    onCollected(p) {
      const color = C.POWERUPS.kinds[p.kind].color;
      this.ring(p.x, p.y, color, 70);
      this.burst(p.x, p.y, 18, color, 200, 0.6, 2.5);
      this.text(p.x, p.y - 14, C.POWERUPS.kinds[p.kind].label, color);
    }

    onScore(p) {
      if (p.reason !== 'enemy_destroyed') return;
      this.text(p.x, p.y, '+' + p.delta + (p.multiplier > 1 ? ' x' + p.multiplier : ''), p.multiplier > 1 ? '#ffd84d' : '#d7def5');
    }

    onHealth(p) {
      this.world.fx.lowHealth = p.health <= 30;
    }

    onTick(p) {
      if (p.state === 'paused') return;
      const fx = this.world.fx;
      const dt = p.dt;

      // engine trail
      if (p.state === 'playing') {
        const pl = this.world.player;
        if (fx.particles.length < MAX_PARTICLES) {
          fx.particles.push({
            x: pl.x + (Math.random() - 0.5) * 6,
            y: pl.y + pl.h / 2,
            vx: (Math.random() - 0.5) * 20,
            vy: 120 + Math.random() * 60,
            life: 0.3,
            max: 0.3,
            size: 2.2,
            color: '#ffa24d',
          });
        }
      }

      for (const q of fx.particles) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vx *= 0.97;
        q.vy *= 0.97;
        q.life -= dt;
      }
      fx.particles = fx.particles.filter((q) => q.life > 0);

      for (const r of fx.rings) {
        r.life -= dt;
        r.r = 6 + (r.maxR - 6) * (1 - r.life / r.max);
      }
      fx.rings = fx.rings.filter((r) => r.life > 0);

      for (const t of fx.texts) {
        t.life -= dt;
        t.y -= 36 * dt;
      }
      fx.texts = fx.texts.filter((t) => t.life > 0);

      fx.shake = Math.max(0, fx.shake - 40 * dt);
      fx.flash = Math.max(0, fx.flash - 1.6 * dt);
    }

    onGameStarted() {
      const fx = this.world.fx;
      fx.particles = [];
      fx.rings = [];
      fx.texts = [];
      fx.shake = 0;
      fx.flash = 0;
      fx.lowHealth = false;
    }
  }

  EDP.VisualEffectsHandler = VisualEffectsHandler;
})(globalThis);
