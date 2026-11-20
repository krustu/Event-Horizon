/**
 * EVENT HANDLER: enemy AI. Owns the enemy list: creates enemies from spawn requests, moves them,
 * decides when they shoot (as a REQUEST), detects escapes and the boss's enrage phase.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;
  const Random = EDP.Random;
  const clamp = EDP.Util.clamp;

  class EnemyBehaviorHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('EnemyBehaviorHandler', bus, world);
      this.on(E.ENEMY_SPAWN_REQUESTED, this.onSpawnRequested);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.ENEMY_DAMAGED, this.onDamaged);
      this.on(E.BOSS_DEFEATED, this.onBossDefeated);
      this.on(E.GAME_STARTED, this.onGameStarted);
    }

    onSpawnRequested(p) {
      const cfg = C.ENEMIES[p.enemy_type];
      const enemy = {
        id: this.world.nextId(),
        type: p.enemy_type,
        x: p.x,
        baseX: p.x,
        y: -cfg.h / 2,
        w: cfg.w,
        h: cfg.h,
        hp: cfg.hp,
        maxHp: cfg.hp,
        alive: true,
        age: 0,
        fireTimer: cfg.fireEvery ? cfg.fireEvery * Random.range(0.4, 1) : 2,
        volley: 0,
        enraged: false,
      };
      this.world.enemies.push(enemy);
      this.emit(E.ENEMY_SPAWNED, {
        enemy_id: enemy.id,
        enemy_type: enemy.type,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        wave: p.wave,
      });
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const scale = 1 + 0.07 * Math.max(0, this.world.wave.number - 1);
      this.world.enemies = this.world.enemies.filter((e) => e.alive);
      for (const e of this.world.enemies) this.think(e, p.dt, scale);
    }

    think(e, dt, scale) {
      const cfg = C.ENEMIES[e.type];
      e.age += dt;
      switch (e.type) {
        case 'drone':
          e.y += cfg.speed * scale * dt;
          break;
        case 'weaver':
          e.y += cfg.speed * scale * dt;
          e.x = clamp(e.baseX + Math.sin(e.age * cfg.freq) * cfg.amp, 20, C.W - 20);
          break;
        case 'gunner':
          e.y += cfg.speed * dt;
          e.x = clamp(e.baseX + Math.sin(e.age * 1.2) * 80, 20, C.W - 20);
          this.shoot(e, dt, 'aimed', cfg.fireEvery);
          break;
        case 'tank':
          e.y += cfg.speed * dt;
          e.x = clamp(e.baseX + Math.sin(e.age * 0.7) * 50, 30, C.W - 30);
          this.shoot(e, dt, 'triple', cfg.fireEvery);
          break;
        case 'boss':
          this.thinkBoss(e, dt);
          break;
        default:
          break;
      }
      if (e.type !== 'boss' && e.y - e.h / 2 > C.H) {
        e.alive = false;
        this.emit(E.ENEMY_ESCAPED, { enemy_id: e.id, enemy_type: e.type });
      }
    }

    shoot(e, dt, pattern, every) {
      e.fireTimer -= dt;
      if (e.fireTimer > 0 || e.y < 30 || e.y > C.H * 0.75) return;
      const pl = this.world.player;
      this.emit(E.ENEMY_FIRE_REQUESTED, {
        enemy_id: e.id,
        enemy_type: e.type,
        x: e.x,
        y: e.y + e.h / 2,
        pattern,
        target_x: pl.x,
        target_y: pl.y,
      });
      e.fireTimer = every + Random.range(0, 0.5);
    }

    thinkBoss(e, dt) {
      if (e.y < 120) {
        e.y += 80 * dt; // entrance
        return;
      }
      e.x = C.W / 2 + Math.sin(e.age * (e.enraged ? 1.1 : 0.7)) * (C.W / 2 - e.w / 2 - 20);
      e.fireTimer -= dt;
      if (e.fireTimer > 0) return;
      e.volley++;
      const pl = this.world.player;
      const ring = e.volley % (e.enraged ? 3 : 5) === 0;
      this.emit(E.ENEMY_FIRE_REQUESTED, {
        enemy_id: e.id,
        enemy_type: e.type,
        x: e.x,
        y: e.y + e.h / 2,
        pattern: ring ? 'ring' : 'fan5',
        target_x: pl.x,
        target_y: pl.y,
      });
      e.fireTimer = e.enraged ? 0.85 : 1.4;
    }

    onDamaged(p) {
      if (p.enemy_type !== 'boss') return;
      const boss = this.world.enemies.find((e) => e.id === p.enemy_id);
      if (boss && boss.alive && !boss.enraged && p.hp <= boss.maxHp / 2) {
        boss.enraged = true;
        this.emit(E.BOSS_ENRAGED, { enemy_id: boss.id, hp: p.hp });
      }
    }

    onBossDefeated() {
      // the boss's minions die with it
      this.world.enemies.forEach((e) => (e.alive = false));
    }

    onGameStarted() {
      this.world.enemies = [];
    }
  }

  EDP.EnemyBehaviorHandler = EnemyBehaviorHandler;
})(globalThis);
