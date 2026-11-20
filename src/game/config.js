/** Static game balance data and tiny helpers. No behaviour, no events. */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  const Config = {
    W: 560,
    H: 720,

    PLAYER: {
      w: 30,
      h: 34,
      speed: 340,
      maxHealth: 100,
      lives: 3,
      fireCooldown: 0.2,
      rapidCooldown: 0.085,
      bulletSpeed: 720,
      hitInvuln: 1.0,
      respawnInvuln: 2.0,
      startX: 280,
      startY: 630,
    },

    DAMAGE: { ram: 25, bossRam: 30, enemyBullet: 12, bossBullet: 15 },

    ENEMIES: {
      drone: { hp: 1, w: 28, h: 28, speed: 120, points: 10, color: '#ff5d73' },
      weaver: { hp: 2, w: 30, h: 30, speed: 95, points: 20, color: '#ffa24d', amp: 110, freq: 2.2 },
      gunner: { hp: 3, w: 34, h: 34, speed: 38, points: 40, color: '#c77dff', fireEvery: 1.7 },
      tank: { hp: 8, w: 52, h: 46, speed: 42, points: 90, color: '#5dff8a', fireEvery: 2.2 },
      boss: { hp: 70, w: 120, h: 80, speed: 0, points: 1000, color: '#ff3d81' },
    },

    POWERUPS: {
      dropChance: 0.17,
      tankDropChance: 0.6,
      healAmount: 30,
      fallSpeed: 90,
      kinds: {
        rapid: { duration: 10, weight: 3, color: '#ffd84d', label: 'RAPID FIRE', glyph: 'R' },
        spread: { duration: 10, weight: 3, color: '#c77dff', label: 'SPREAD SHOT', glyph: 'S' },
        shield: { duration: 12, weight: 2, color: '#4df3ff', label: 'SHIELD', glyph: 'O' },
        health: { duration: 0, weight: 2, color: '#5dff8a', label: 'REPAIR', glyph: '+' },
      },
    },

    SCORE: { comboWindow: 2.2, maxMultiplier: 5, comboPerLevel: 3, powerup: 50, waveBonus: 100 },

    // Wave 5 is the boss wave: the boss is spawned first, then minions.
    WAVES: [
      { total: 10, interval: 0.95, mix: { drone: 1 } },
      { total: 14, interval: 0.8, mix: { drone: 3, weaver: 2 } },
      { total: 16, interval: 0.8, mix: { weaver: 3, drone: 1, gunner: 2 } },
      { total: 18, interval: 0.7, mix: { weaver: 2, gunner: 2, tank: 1, drone: 1 } },
      { total: 11, interval: 1.4, mix: { drone: 2, weaver: 2, gunner: 1 }, boss: true },
    ],
  };

  const Util = {
    clamp(v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v;
    },
  };

  EDP.Config = Config;
  EDP.Util = Util;
})(globalThis);
