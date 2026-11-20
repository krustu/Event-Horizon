/**
 * Headless test-suite (no dependencies):  npm test
 *
 * It runs the REAL game code in Node, in strict mode (any event-schema violation throws):
 * unit tests for the bus, the keyboard producer and the renderer, and full simulated games
 * played by a bot (one it wins, one it loses). It also checks events.md is in sync.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('../tools/load-game');
const { generate } = require('../tools/generate-events-md');

const EDP = loadGame();
const E = EDP.EventTypes;
const C = EDP.Config;

// ------------------------------------------------------------------ tiny runner
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log('  ✔ ' + name);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log('  ✘ ' + name + '\n      ' + (err && err.stack ? err.stack.split('\n').slice(0, 4).join('\n      ') : err));
  }
}

// ------------------------------------------------------------------ helpers
const seen = new Set(); // every event type observed across all simulations

function newGame() {
  const game = new EDP.Game({ strict: true });
  game.bus.tap((ev) => seen.add(ev.event_type));
  return game;
}

/** Real InputProducer wired to a fake keyboard (a plain EventTarget). */
function newKeyboard(game) {
  const target = new EventTarget();
  const input = new EDP.InputProducer(game.bus, target);
  const send = (type, code, repeat) => {
    const ev = new Event(type, { cancelable: true });
    ev.code = code;
    ev.repeat = !!repeat;
    target.dispatchEvent(ev);
  };
  return { input, down: (c) => send('keydown', c), up: (c) => send('keyup', c), send };
}

/** A Proxy that accepts any canvas-2D call, so Renderer code paths run without a DOM. */
function fakeCanvas() {
  const store = {};
  const ctx = new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  });
  return { width: 0, height: 0, getContext: () => ctx };
}

/** A simple bot: aims at the nearest enemy / power-up and holds fire. Drives the game only through key events. */
function makeBot(game, kb) {
  let dir = 0;
  kb.down('Space');
  return function update() {
    const w = game.world;
    if (w.state !== 'playing') return;
    const p = w.player;
    const boss = w.enemies.find((e) => e.alive && e.type === 'boss');
    const pu = w.powerups.find((u) => u.alive && u.y > C.H * 0.4);
    const enemy = w.enemies.filter((e) => e.alive).sort((a, b) => b.y - a.y)[0];
    const target = boss || pu || enemy;
    let want = 0;
    if (target) {
      const diff = target.x - p.x;
      if (Math.abs(diff) > 10) want = diff > 0 ? 1 : -1;
    }
    if (want !== dir) {
      if (dir === -1) kb.up('ArrowLeft');
      if (dir === 1) kb.up('ArrowRight');
      if (want === -1) kb.down('ArrowLeft');
      if (want === 1) kb.down('ArrowRight');
      dir = want;
    }
  };
}

function simulate(game, kb, { seconds, until, bot }) {
  const step = 1 / 60;
  const renderer = new EDP.Renderer(fakeCanvas(), game.world);
  for (let f = 0; f < seconds * 60; f++) {
    if (bot) bot();
    game.step(step);
    if (f % 5 === 0) renderer.render(f * 16.7); // exercise the view code too
    if (until()) return f * step;
  }
  return null;
}

// ================================================================== tests
console.log('\nEvent registry');

test('every event declares producer, category, trigger and an example payload', () => {
  const names = Object.keys(EDP.EventSchemas);
  assert.ok(names.length >= 40, 'expected a rich event vocabulary, got ' + names.length);
  for (const n of names) {
    const s = EDP.EventSchemas[n];
    assert.ok(s.producer && s.trigger && s.example, n + ' is incomplete');
    assert.ok(EDP.EventCategories.includes(s.category), n + ' has unknown category');
    assert.deepStrictEqual([...s.required], Object.keys(s.example));
  }
});

test('events.md is in sync with the code (run "npm run docs" if this fails)', () => {
  const onDisk = fs.readFileSync(path.join(ROOT, 'events.md'), 'utf8');
  assert.strictEqual(onDisk, generate());
});

test('every event has at least one consumer', () => {
  const game = new EDP.Game();
  const subs = game.bus.listSubscriptions();
  for (const n of Object.keys(subs)) assert.ok(subs[n].length > 0, n + ' has no subscribers');
});

console.log('\nEvent bus');

test('queues events and only delivers them on process() (FIFO)', () => {
  const bus = new EDP.EventBus({ strict: true });
  const got = [];
  bus.subscribe(E.GAME_PAUSED, () => got.push('paused'), 'T');
  bus.subscribe(E.GAME_RESUMED, () => got.push('resumed'), 'T');
  bus.publish(E.GAME_PAUSED, {}, 'HealthAndStateHandler');
  bus.publish(E.GAME_RESUMED, {}, 'HealthAndStateHandler');
  assert.deepStrictEqual(got, [], 'must not deliver synchronously');
  assert.strictEqual(bus.pending, 2);
  assert.strictEqual(bus.process(), 2);
  assert.deepStrictEqual(got, ['paused', 'resumed']);
});

test('events published by handlers are processed in the same cycle, after the ones already queued', () => {
  const bus = new EDP.EventBus({ strict: true });
  const order = [];
  bus.subscribe(E.GAME_PAUSED, () => {
    order.push('A');
    bus.publish(E.GAME_RESUMED, {}, 'HealthAndStateHandler');
  }, 'T');
  bus.subscribe(E.GAME_RESUMED, () => order.push('chained'), 'T');
  bus.subscribe(E.MUTE_CHANGED, () => order.push('B'), 'T');
  bus.publish(E.GAME_PAUSED, {}, 'HealthAndStateHandler');
  bus.publish(E.MUTE_CHANGED, { muted: true }, 'AudioHandler');
  bus.process();
  assert.deepStrictEqual(order, ['A', 'B', 'chained']);
});

test('payloads are cloned and frozen; the envelope carries id, type, timestamp, source', () => {
  const bus = new EDP.EventBus({ strict: true });
  const original = { muted: true };
  const ev = bus.publish(E.MUTE_CHANGED, original, 'AudioHandler');
  original.muted = false;
  assert.strictEqual(ev.payload.muted, true);
  assert.ok(Object.isFrozen(ev.payload));
  assert.deepStrictEqual(Object.keys(ev).sort(), ['event_type', 'id', 'payload', 'source', 'timestamp']);
  assert.strictEqual(ev.source, 'AudioHandler');
  assert.strictEqual(typeof ev.timestamp, 'number');
});

test('strict mode rejects unknown types, wrong producers and missing payload keys', () => {
  const bus = new EDP.EventBus({ strict: true });
  assert.throws(() => bus.publish('NOT_AN_EVENT', {}, 'X'), /Unknown event type/);
  assert.throws(() => bus.publish(E.MUTE_CHANGED, { muted: true }, 'CombatHandler'), /may only be produced by AudioHandler/);
  assert.throws(() => bus.publish(E.MUTE_CHANGED, {}, 'AudioHandler'), /missing required key "muted"/);
  assert.throws(() => bus.subscribe('NOPE', () => {}, 'T'), /unknown event type/);
});

test('a failing handler does not stop other handlers (non-strict mode)', () => {
  const origError = console.error;
  console.error = () => {};
  try {
    const bus = new EDP.EventBus();
    let ran = false;
    bus.subscribe(E.GAME_PAUSED, () => { throw new Error('boom'); }, 'Bad');
    bus.subscribe(E.GAME_PAUSED, () => { ran = true; }, 'Good');
    bus.publish(E.GAME_PAUSED, {}, 'HealthAndStateHandler');
    bus.process();
    assert.ok(ran);
    assert.strictEqual(bus.stats.errors, 1);
  } finally {
    console.error = origError;
  }
});

test('the logger records which handlers received each event', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  kb.down('Enter');
  game.step(1 / 60);
  const entry = game.logger.entries.find((e) => e.type === E.GAME_STARTED);
  assert.ok(entry, 'GAME_STARTED not logged');
  assert.strictEqual(entry.source, 'HealthAndStateHandler');
  assert.ok(entry.handlers.includes('ScoreHandler') && entry.handlers.includes('WaveHandler'));
  assert.ok(!game.logger.entries.some((e) => e.type === E.FRAME_TICK), 'FRAME_TICK is hidden by default');
});

console.log('\nEvent producers');

test('InputProducer turns key presses into events, de-duplicating repeats', () => {
  const game = newGame();
  const log = [];
  [E.INPUT_MOVE_CHANGED, E.INPUT_FIRE_CHANGED, E.INPUT_PAUSE_PRESSED, E.INPUT_START_PRESSED, E.INPUT_MUTE_PRESSED].forEach((t) =>
    game.bus.subscribe(t, (p) => log.push([t, p]), 'Probe')
  );
  const kb = newKeyboard(game);
  kb.down('ArrowLeft');
  kb.down('KeyA'); // same direction again: no new event
  kb.down('ArrowUp');
  kb.up('ArrowLeft');
  kb.up('KeyA');
  kb.up('ArrowUp');
  kb.down('Space');
  kb.send('keydown', 'Space', true); // auto-repeat
  kb.up('Space');
  kb.down('KeyP');
  kb.down('KeyM');
  kb.down('Enter');
  game.bus.process();
  assert.deepStrictEqual(log, [
    [E.INPUT_MOVE_CHANGED, { dx: -1, dy: 0 }],
    [E.INPUT_MOVE_CHANGED, { dx: -1, dy: -1 }],
    [E.INPUT_MOVE_CHANGED, { dx: 0, dy: -1 }],
    [E.INPUT_MOVE_CHANGED, { dx: 0, dy: 0 }],
    [E.INPUT_FIRE_CHANGED, { active: true }],
    [E.INPUT_FIRE_CHANGED, { active: false }],
    [E.INPUT_PAUSE_PRESSED, {}],
    [E.INPUT_MUTE_PRESSED, {}],
    [E.INPUT_START_PRESSED, {}],
  ]);
});

test('GameLoopProducer emits FRAME_TICK every frame but is silent while paused', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  const ticks = [];
  game.bus.subscribe(E.FRAME_TICK, (p) => ticks.push(p.state), 'Probe');
  kb.down('Enter'); // queued; delivered during the next step
  game.step(0.016); // tick published while still on the title screen, then Enter is processed
  kb.down('KeyP');
  game.step(0.016); // tick published (state playing), then the pause is processed
  game.step(0.016); // paused: no tick
  game.step(0.016);
  assert.strictEqual(game.world.state, 'paused');
  assert.deepStrictEqual(ticks, ['title', 'playing']);
});

test('CollisionDetector reports overlaps as events but changes no state itself', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  kb.down('Enter');
  game.step(1 / 60);
  const w = game.world;
  const hits = [];
  game.bus.subscribe(E.COLLISION_PLAYER_ENEMY, (p) => hits.push(p), 'Probe');
  w.enemies.push({ id: 5001, type: 'drone', x: w.player.x, y: w.player.y, w: 28, h: 28, hp: 1, maxHp: 1, alive: true, age: 0, fireTimer: 9, volley: 0, enraged: false });
  game.collisions.update(); // publishes only; nothing has been processed yet
  assert.strictEqual(hits.length, 0);
  assert.strictEqual(w.enemies[0].alive, true);
  assert.strictEqual(w.player.health, C.PLAYER.maxHealth);
  game.bus.process();
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(w.enemies[0].alive, false); // resolved by CombatHandler, not by the detector
});

console.log('\nGameplay (headless, strict mode)');

test('title screen -> Enter starts a run with full health, lives and a wave banner', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  assert.strictEqual(game.world.state, 'title');
  kb.down('Enter');
  game.step(1 / 60);
  assert.strictEqual(game.world.state, 'playing');
  assert.strictEqual(game.world.player.lives, C.PLAYER.lives);
  assert.strictEqual(game.world.ui.banner.title, 'GET READY');
  simulate(game, kb, { seconds: 3, until: () => game.world.wave.number === 1 });
  assert.strictEqual(game.world.wave.number, 1);
});

test('holding fire produces bullets via PLAYER_FIRE_REQUESTED -> ProjectileHandler -> PLAYER_FIRED', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  const fired = [];
  game.bus.subscribe(E.PLAYER_FIRED, (p) => fired.push(p), 'Probe');
  kb.down('Enter');
  kb.down('Space');
  simulate(game, kb, { seconds: 1, until: () => false });
  assert.ok(fired.length >= 4, 'expected several shots, got ' + fired.length);
  assert.ok(game.world.bullets.length > 0);
});

test('pause freezes the simulation and resumes it', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  kb.down('Enter');
  simulate(game, kb, { seconds: 4, until: () => game.world.enemies.length > 0 });
  kb.down('KeyP');
  game.step(0.016); // this frame's FRAME_TICK was already queued ahead of the pause event
  assert.strictEqual(game.world.state, 'paused');
  const y = game.world.enemies[0].y;
  for (let i = 0; i < 30; i++) game.step(0.016);
  assert.strictEqual(game.world.enemies[0].y, y, 'enemies must not move while paused');
  kb.up('KeyP');
  kb.down('KeyP');
  game.step(0.016);
  game.step(0.016);
  assert.strictEqual(game.world.state, 'playing');
  assert.ok(game.world.enemies[0].y > y);
});

test('mute toggles through events (INPUT_MUTE_PRESSED -> MUTE_CHANGED -> toast)', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  kb.down('KeyM');
  game.step(0.016);
  assert.strictEqual(game.world.muted, true);
  assert.ok(game.world.ui.toasts.some((t) => /Sound off/.test(t.text)));
});

test('a bot with god-mode health plays all 5 waves and defeats the boss (victory)', () => {
  EDP.Random.seed(12345);
  const saved = C.PLAYER.maxHealth;
  C.PLAYER.maxHealth = 1e6; // keep the bot alive; we are testing the pipeline, not the difficulty
  try {
    const game = newGame();
    const kb = newKeyboard(game);
    const log = [];
    game.bus.tap((ev) => log.push(ev.event_type));
    kb.down('Enter');
    const bot = makeBot(game, kb);
    const t = simulate(game, kb, { seconds: 600, until: () => game.world.state === 'won', bot });
    assert.notStrictEqual(t, null, 'bot did not win within 10 simulated minutes; state=' + game.world.state + ' wave=' + game.world.wave.number);
    const count = (n) => log.filter((x) => x === n).length;
    assert.strictEqual(count(E.WAVE_STARTED), 5);
    assert.ok(count(E.WAVE_CLEARED) >= 4); // waves 1-4, plus wave 5 if the boss is the last enemy standing
    assert.strictEqual(count(E.BOSS_DEFEATED), 1);
    assert.strictEqual(count(E.BOSS_ENRAGED), 1);
    assert.strictEqual(count(E.GAME_WON), 1);
    assert.ok(count(E.ENEMY_DESTROYED) >= 50);
    assert.ok(game.world.score > 2000, 'score ' + game.world.score);
    assert.ok(count(E.ACHIEVEMENT_UNLOCKED) >= 5);
    assert.ok(count(E.HIGH_SCORE_BEATEN) === 1);
    for (let i = 0; i < 60; i++) game.step(1 / 60); // let any late bonus events settle
    assert.strictEqual(game.world.highScore, game.world.score, 'high score must include the final wave bonus');
    console.log('      (won after ' + t.toFixed(0) + 's simulated, score ' + game.world.score + ', ' + game.bus.stats.processed + ' events)');
  } finally {
    C.PLAYER.maxHealth = saved;
  }
});

test('an idle player is killed: PLAYER_DAMAGED -> PLAYER_DIED -> PLAYER_RESPAWNED ... -> GAME_OVER, then Enter restarts', () => {
  EDP.Random.seed(777);
  const game = newGame();
  const kb = newKeyboard(game);
  const log = [];
  game.bus.tap((ev) => log.push(ev.event_type));
  kb.down('Enter');
  const t = simulate(game, kb, { seconds: 900, until: () => game.world.state === 'gameover' });
  assert.notStrictEqual(t, null, 'idle player survived 15 simulated minutes');
  const count = (n) => log.filter((x) => x === n).length;
  assert.strictEqual(count(E.PLAYER_DIED), 3);
  assert.strictEqual(count(E.PLAYER_RESPAWNED), 2);
  assert.strictEqual(count(E.GAME_OVER), 1);
  assert.ok(count(E.PLAYER_DAMAGED) >= 3);
  assert.strictEqual(game.world.player.lives, 0);

  // restart
  kb.down('Enter');
  game.step(1 / 60);
  assert.strictEqual(game.world.state, 'playing');
  assert.strictEqual(game.world.score, 0);
  assert.strictEqual(game.world.player.lives, C.PLAYER.lives);
  assert.strictEqual(game.world.enemies.length, 0);
  assert.strictEqual(game.world.bullets.length + game.world.enemyBullets.length, 0);
});

test('shield blocks exactly one hit (SHIELD_ABSORBED instead of PLAYER_DAMAGED) and is then spent', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  const log = [];
  game.bus.tap((ev) => log.push(ev.event_type));
  kb.down('Enter');
  game.step(1 / 60);
  game.world.player.buffs.shield = 10; // as if a shield power-up had been collected
  game.world.enemyBullets.push({ id: 9001, x: game.world.player.x, y: game.world.player.y, vx: 0, vy: 0, w: 10, h: 10, damage: 12, alive: true });
  game.step(1 / 60);
  assert.ok(log.includes(E.SHIELD_ABSORBED));
  assert.ok(!log.includes(E.PLAYER_DAMAGED));
  assert.strictEqual(game.world.player.buffs.shield, 0);
  assert.strictEqual(game.world.player.health, C.PLAYER.maxHealth);
});

test('power-up pickup: COLLISION_PLAYER_POWERUP -> POWERUP_COLLECTED -> buff / heal / score / toast', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  const log = [];
  game.bus.tap((ev) => log.push(ev.event_type));
  kb.down('Enter');
  game.step(1 / 60);
  const p = game.world.player;
  p.health = 50;
  game.world.powerups.push({ id: 9100, kind: 'rapid', x: p.x, y: p.y, w: 26, h: 26, alive: true, age: 0 });
  game.world.powerups.push({ id: 9101, kind: 'health', x: p.x, y: p.y, w: 26, h: 26, alive: true, age: 0 });
  game.step(1 / 60);
  assert.ok(p.buffs.rapid > 9);
  assert.strictEqual(p.health, 80);
  assert.strictEqual(game.world.score, 2 * C.SCORE.powerup);
  assert.ok(log.includes(E.PLAYER_HEALED));
  // buff expires after its duration
  for (let i = 0; i < 11 * 60; i++) game.step(1 / 60);
  assert.strictEqual(p.buffs.rapid, 0);
  assert.ok(log.includes(E.POWERUP_EXPIRED));
});

test('combo multiplier grows with chained kills and resets on timeout', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  kb.down('Enter');
  game.step(1 / 60);
  const kill = () => {
    game.bus.publish(E.ENEMY_DESTROYED, { enemy_id: 1, enemy_type: 'drone', x: 10, y: 10, points: 10, cause: 'bullet' }, 'CombatHandler');
    game.bus.process();
  };
  for (let i = 0; i < 6; i++) kill();
  assert.strictEqual(game.world.combo, 6);
  assert.strictEqual(game.world.multiplier, 3);
  for (let i = 0; i < 60 * 3; i++) game.step(1 / 60);
  assert.strictEqual(game.world.combo, 0);
  assert.strictEqual(game.world.multiplier, 1);
});

console.log('\nView');

test('Renderer draws every game state without errors', () => {
  const game = newGame();
  const kb = newKeyboard(game);
  const r = new EDP.Renderer(fakeCanvas(), game.world);
  r.render(0); // title
  kb.down('Enter');
  game.step(1 / 60);
  r.render(100); // playing
  game.world.state = 'paused';
  r.render(200);
  game.world.state = 'gameover';
  r.render(300);
  game.world.state = 'won';
  r.render(400);
});

console.log('\nCoverage');

test('every event type in the registry was published at least once during the simulations', () => {
  const missing = Object.keys(EDP.EventSchemas).filter((n) => !seen.has(n));
  assert.deepStrictEqual(missing, [], 'never published: ' + missing.join(', '));
});

// ------------------------------------------------------------------ summary
const failed = results.filter((r) => !r.ok).length;
console.log('\n' + (results.length - failed) + '/' + results.length + ' tests passed' + (failed ? ', ' + failed + ' FAILED' : ''));
process.exit(failed ? 1 : 0);
