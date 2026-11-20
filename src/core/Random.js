/**
 * Small seedable PRNG (mulberry32) used for all *gameplay* randomness
 * (spawn positions, enemy mix, power-up drops). Seedable => deterministic tests.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  let state = (Date.now() >>> 0) || 1;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const Random = {
    seed(n) {
      state = n >>> 0 || 1;
    },
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    chance(p) {
      return next() < p;
    },
    /** weighted pick from a { key: weight } map */
    weighted(map) {
      const keys = Object.keys(map);
      let total = 0;
      keys.forEach((k) => (total += map[k]));
      let r = next() * total;
      for (const k of keys) {
        r -= map[k];
        if (r <= 0) return k;
      }
      return keys[keys.length - 1];
    },
  };

  EDP.Random = Random;
})(globalThis);
