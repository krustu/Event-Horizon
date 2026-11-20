/**
 * EVENT PRODUCER: collision detector.
 * Pure geometry. Scans the world (read-only) and reports overlaps as COLLISION_* events.
 * It does not apply damage, remove entities or award points — that is up to the handlers.
 *
 * The player is not collidable while invulnerable, and at most one damaging collision is
 * reported per frame.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;

  /** AABB overlap between two centre-positioned boxes, each optionally shrunk (hit-box scale). */
  function hit(a, b, sa, sb) {
    return (
      Math.abs(a.x - b.x) * 2 < a.w * sa + b.w * sb &&
      Math.abs(a.y - b.y) * 2 < a.h * sa + b.h * sb
    );
  }

  class CollisionDetector {
    constructor(bus, world) {
      this.publish = bus.createPublisher('CollisionDetector');
      this.world = world;
    }

    update() {
      const w = this.world;
      if (w.state !== 'playing') return;
      const p = w.player;

      // player bullets vs enemies (a bullet hits at most one enemy per frame)
      for (const b of w.bullets) {
        if (!b.alive) continue;
        for (const e of w.enemies) {
          if (!e.alive) continue;
          if (hit(b, e, 1, 0.9)) {
            this.publish(E.COLLISION_BULLET_ENEMY, { bullet_id: b.id, enemy_id: e.id, x: b.x, y: b.y });
            break;
          }
        }
      }

      // player vs enemies / enemy bullets (one damaging collision per frame)
      if (p.invuln <= 0) {
        let damaged = false;
        for (const e of w.enemies) {
          if (e.alive && hit(p, e, 0.7, 0.85)) {
            this.publish(E.COLLISION_PLAYER_ENEMY, { enemy_id: e.id, x: p.x, y: p.y });
            damaged = true;
            break;
          }
        }
        if (!damaged) {
          for (const b of w.enemyBullets) {
            if (b.alive && hit(p, b, 0.6, 1)) {
              this.publish(E.COLLISION_ENEMY_BULLET_PLAYER, { bullet_id: b.id, x: p.x, y: p.y });
              break;
            }
          }
        }
      }

      // player vs power-ups
      for (const u of w.powerups) {
        if (u.alive && hit(p, u, 1, 1.1)) {
          this.publish(E.COLLISION_PLAYER_POWERUP, { powerup_id: u.id, kind: u.kind, x: u.x, y: u.y });
        }
      }
    }
  }

  EDP.CollisionDetector = CollisionDetector;
})(globalThis);
