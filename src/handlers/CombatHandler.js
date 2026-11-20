/**
 * EVENT HANDLER: combat resolution. Turns raw COLLISION_* facts into game consequences:
 * damage to enemies, destruction, damage to the player or a shield absorbing the hit.
 * Owns enemy HP and the "alive" flag of bullets / enemies it consumes.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  class CombatHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('CombatHandler', bus, world);
      this.on(E.COLLISION_BULLET_ENEMY, this.onBulletEnemy);
      this.on(E.COLLISION_PLAYER_ENEMY, this.onPlayerEnemy);
      this.on(E.COLLISION_ENEMY_BULLET_PLAYER, this.onEnemyBulletPlayer);
    }

    onBulletEnemy(p) {
      if (this.world.state !== 'playing') return;
      const bullet = this.world.bullets.find((b) => b.id === p.bullet_id && b.alive);
      const enemy = this.world.enemies.find((e) => e.id === p.enemy_id && e.alive);
      if (!bullet || !enemy) return; // already consumed earlier in this cycle
      bullet.alive = false;
      enemy.hp -= bullet.damage;
      this.emit(E.ENEMY_DAMAGED, {
        enemy_id: enemy.id,
        enemy_type: enemy.type,
        damage: bullet.damage,
        hp: Math.max(0, enemy.hp),
        x: p.x,
        y: p.y,
      });
      if (enemy.hp <= 0) this.destroy(enemy, 'bullet');
    }

    onPlayerEnemy(p) {
      if (this.world.state !== 'playing') return;
      const enemy = this.world.enemies.find((e) => e.id === p.enemy_id && e.alive);
      if (!enemy) return;
      this.hurtPlayer(enemy.type === 'boss' ? C.DAMAGE.bossRam : C.DAMAGE.ram, 'collision', p.x, p.y);
      if (enemy.type !== 'boss') this.destroy(enemy, 'collision');
    }

    onEnemyBulletPlayer(p) {
      if (this.world.state !== 'playing') return;
      const bullet = this.world.enemyBullets.find((b) => b.id === p.bullet_id && b.alive);
      if (!bullet) return;
      bullet.alive = false;
      this.hurtPlayer(bullet.damage, 'enemy_bullet', p.x, p.y);
    }

    hurtPlayer(amount, source, x, y) {
      if (this.world.player.buffs.shield > 0) {
        this.emit(E.SHIELD_ABSORBED, { source, x, y });
      } else {
        this.emit(E.PLAYER_DAMAGED, { amount, source, x, y });
      }
    }

    destroy(enemy, cause) {
      enemy.alive = false;
      this.emit(E.ENEMY_DESTROYED, {
        enemy_id: enemy.id,
        enemy_type: enemy.type,
        x: enemy.x,
        y: enemy.y,
        points: C.ENEMIES[enemy.type].points,
        cause,
      });
      if (enemy.type === 'boss') this.emit(E.BOSS_DEFEATED, { enemy_id: enemy.id, x: enemy.x, y: enemy.y });
    }
  }

  EDP.CombatHandler = CombatHandler;
})(globalThis);
