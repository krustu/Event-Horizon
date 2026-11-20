/**
 * EVENT REGISTRY — the single source of truth for every event in the system.
 *
 * Each entry declares: name, category, the ONE component allowed to produce it,
 * the trigger condition, and an example payload. The example's keys double as
 * the required payload keys, which the EventBus validates on every publish().
 * events.md is generated from this file (npm run docs).
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  const Schemas = {};

  function add(name, category, producer, trigger, example, opts) {
    Schemas[name] = Object.freeze({
      name,
      category,
      producer,
      trigger,
      example: Object.freeze(example),
      required: Object.freeze(Object.keys(example)),
      noisy: !!(opts && opts.noisy),
    });
  }

  const Categories = [
    'Input',
    'Game Loop',
    'Spawning',
    'Collision',
    'Weapons',
    'Enemies & Combat',
    'Player & Game State',
    'Scoring',
    'Waves',
    'Power-ups',
    'Meta',
  ];

  // ---------------------------------------------------------------- Input
  add('INPUT_MOVE_CHANGED', 'Input', 'InputProducer',
    'The combined direction of the movement keys (WASD / arrows) changes: a key is pressed or released.',
    { dx: -1, dy: 0 });
  add('INPUT_FIRE_CHANGED', 'Input', 'InputProducer',
    'The fire key (Space) is pressed or released.',
    { active: true });
  add('INPUT_PAUSE_PRESSED', 'Input', 'InputProducer',
    'P or Escape is pressed.', {});
  add('INPUT_START_PRESSED', 'Input', 'InputProducer',
    'Enter is pressed (starts a game from the title screen, restarts after game over / victory).', {});
  add('INPUT_MUTE_PRESSED', 'Input', 'InputProducer',
    'M is pressed.', {});

  // ------------------------------------------------------------ Game loop
  add('FRAME_TICK', 'Game Loop', 'GameLoopProducer',
    'Every animation frame while the game is not paused. Drives all time-based behaviour (movement, AI, cooldowns, timers).',
    { dt: 0.0167, frame: 1042, time: 17.4, state: 'playing' }, { noisy: true });

  // ------------------------------------------------------------- Spawning
  add('ENEMY_SPAWN_REQUESTED', 'Spawning', 'EnemySpawner',
    'The spawner timer elapses while the current wave still has enemies left to release.',
    { enemy_type: 'weaver', x: 312.5, wave: 3, index: 4 });

  // ------------------------------------------------------------ Collision
  add('COLLISION_BULLET_ENEMY', 'Collision', 'CollisionDetector',
    'A player bullet overlaps a living enemy (hit-box test, once per bullet per frame).',
    { bullet_id: 118, enemy_id: 41, x: 205.2, y: 140.8 });
  add('COLLISION_PLAYER_ENEMY', 'Collision', 'CollisionDetector',
    'The (non-invulnerable) player ship overlaps a living enemy.',
    { enemy_id: 41, x: 280, y: 612 });
  add('COLLISION_ENEMY_BULLET_PLAYER', 'Collision', 'CollisionDetector',
    'An enemy bullet overlaps the (non-invulnerable) player ship.',
    { bullet_id: 140, x: 281.3, y: 606.1 });
  add('COLLISION_PLAYER_POWERUP', 'Collision', 'CollisionDetector',
    'The player ship overlaps a falling power-up.',
    { powerup_id: 77, kind: 'rapid', x: 300, y: 590 });

  // -------------------------------------------------------------- Weapons
  add('PLAYER_FIRE_REQUESTED', 'Weapons', 'WeaponHandler',
    'Fire is held and the weapon cooldown has elapsed.',
    { x: 280, y: 613, pattern: 'spread' });
  add('ENEMY_FIRE_REQUESTED', 'Weapons', 'EnemyBehaviorHandler',
    "An enemy's AI decides to shoot (its fire timer elapsed).",
    { enemy_id: 41, enemy_type: 'gunner', x: 200, y: 160, pattern: 'aimed', target_x: 280, target_y: 630 });
  add('PLAYER_FIRED', 'Weapons', 'ProjectileHandler',
    'Player bullets have been created in response to PLAYER_FIRE_REQUESTED.',
    { x: 280, y: 613, pattern: 'spread', bullets: 3 });
  add('ENEMY_FIRED', 'Weapons', 'ProjectileHandler',
    'Enemy bullets have been created in response to ENEMY_FIRE_REQUESTED.',
    { enemy_id: 41, enemy_type: 'gunner', bullets: 1 });

  // ---------------------------------------------------- Enemies & combat
  add('ENEMY_SPAWNED', 'Enemies & Combat', 'EnemyBehaviorHandler',
    'An enemy entity has been created from an ENEMY_SPAWN_REQUESTED.',
    { enemy_id: 41, enemy_type: 'gunner', x: 200, y: -17, hp: 3, wave: 3 });
  add('ENEMY_DAMAGED', 'Enemies & Combat', 'CombatHandler',
    'A player bullet hit an enemy and reduced its HP (also fired for the killing blow, with hp = 0).',
    { enemy_id: 41, enemy_type: 'gunner', damage: 1, hp: 2, x: 205.2, y: 140.8 });
  add('ENEMY_DESTROYED', 'Enemies & Combat', 'CombatHandler',
    'An enemy reached 0 HP, or a non-boss enemy rammed the player.',
    { enemy_id: 41, enemy_type: 'gunner', x: 205.2, y: 140.8, points: 40, cause: 'bullet' });
  add('ENEMY_ESCAPED', 'Enemies & Combat', 'EnemyBehaviorHandler',
    'A non-boss enemy flew off the bottom edge of the playfield.',
    { enemy_id: 44, enemy_type: 'drone' });
  add('BOSS_ENRAGED', 'Enemies & Combat', 'EnemyBehaviorHandler',
    'The boss drops to 50% HP or below (once per boss).',
    { enemy_id: 90, hp: 35 });
  add('BOSS_DEFEATED', 'Enemies & Combat', 'CombatHandler',
    'The boss was destroyed (emitted right after its ENEMY_DESTROYED).',
    { enemy_id: 90, x: 280, y: 120 });
  add('SHIELD_ABSORBED', 'Enemies & Combat', 'CombatHandler',
    'A damaging collision happened while the player had an active shield.',
    { source: 'enemy_bullet', x: 281, y: 606 });
  add('PLAYER_DAMAGED', 'Enemies & Combat', 'CombatHandler',
    'A damaging collision happened and the player had no shield.',
    { amount: 12, source: 'enemy_bullet', x: 281, y: 606 });

  // ------------------------------------------------- Player & game state
  add('PLAYER_HEALTH_CHANGED', 'Player & Game State', 'HealthAndStateHandler',
    'Player health changed (damage, repair pickup, respawn).',
    { health: 88, max_health: 100, delta: -12 });
  add('PLAYER_HEALED', 'Player & Game State', 'HealthAndStateHandler',
    'A repair power-up restored health.',
    { amount: 30, health: 100 });
  add('PLAYER_DIED', 'Player & Game State', 'HealthAndStateHandler',
    'Player health reached 0 and a life was spent.',
    { lives_left: 2, x: 281, y: 606 });
  add('PLAYER_RESPAWNED', 'Player & Game State', 'HealthAndStateHandler',
    'The player died but still has lives left: respawn with temporary invulnerability.',
    { x: 280, y: 630, invulnerable_for: 2 });
  add('GAME_STARTED', 'Player & Game State', 'HealthAndStateHandler',
    'Enter pressed on the title / game-over / victory screen. Every handler resets its own state.',
    { lives: 3, health: 100, is_restart: false });
  add('GAME_PAUSED', 'Player & Game State', 'HealthAndStateHandler',
    'P / Escape pressed while playing.', {});
  add('GAME_RESUMED', 'Player & Game State', 'HealthAndStateHandler',
    'P / Escape pressed while paused.', {});
  add('GAME_OVER', 'Player & Game State', 'HealthAndStateHandler',
    'The last life was lost.',
    { score: 1840, wave: 4, reason: 'out_of_lives' });
  add('GAME_WON', 'Player & Game State', 'HealthAndStateHandler',
    'The boss was defeated.',
    { score: 5230, wave: 5 });

  // -------------------------------------------------------------- Scoring
  add('SCORE_CHANGED', 'Scoring', 'ScoreHandler',
    'Score increased (kill, power-up pickup, wave bonus).',
    { score: 340, delta: 60, reason: 'enemy_destroyed', multiplier: 3, x: 205.2, y: 140.8 });
  add('COMBO_CHANGED', 'Scoring', 'ScoreHandler',
    'The kill combo counter changed (kill, or reset to 0).',
    { combo: 7, multiplier: 3 });
  add('COMBO_LOST', 'Scoring', 'ScoreHandler',
    'A running combo ended (timeout, player hit, player died, enemy escaped).',
    { previous_combo: 7, reason: 'timeout' });
  add('HIGH_SCORE_BEATEN', 'Scoring', 'ScoreHandler',
    'At game over / victory the final score (including any bonus that lands in the same cycle) beats the stored high score. Announced once per run.',
    { score: 1840, previous: 1200 });

  // ---------------------------------------------------------------- Waves
  add('WAVE_STARTED', 'Waves', 'WaveHandler',
    'The intermission timer elapsed and a new wave begins.',
    { wave: 3, total_enemies: 16, boss: false });
  add('WAVE_CLEARED', 'Waves', 'WaveHandler',
    'Every enemy of the wave has been spawned and then destroyed / escaped.',
    { wave: 3, bonus: 300 });

  // ------------------------------------------------------------ Power-ups
  add('POWERUP_DROPPED', 'Power-ups', 'PowerUpHandler',
    'A destroyed enemy rolled a drop.',
    { powerup_id: 77, kind: 'rapid', x: 205.2, y: 140.8 });
  add('POWERUP_COLLECTED', 'Power-ups', 'PowerUpHandler',
    'The player touched a power-up (handled after COLLISION_PLAYER_POWERUP).',
    { kind: 'rapid', duration: 10, x: 300, y: 590 });
  add('POWERUP_EXPIRED', 'Power-ups', 'PowerUpHandler',
    'A timed buff ran out, or a shield was consumed by a hit.',
    { kind: 'rapid' });

  // ----------------------------------------------------------------- Meta
  add('ACHIEVEMENT_UNLOCKED', 'Meta', 'AchievementHandler',
    'An achievement condition was met (once per run).',
    { id: 'first_blood', title: 'First Blood', description: 'Destroy your first enemy' });
  add('MUTE_CHANGED', 'Meta', 'AudioHandler',
    'Sound was muted / unmuted in response to INPUT_MUTE_PRESSED.',
    { muted: true });

  const Types = {};
  Object.keys(Schemas).forEach((k) => (Types[k] = k));

  EDP.EventSchemas = Object.freeze(Schemas);
  EDP.EventTypes = Object.freeze(Types);
  EDP.EventCategories = Object.freeze(Categories);
})(globalThis);
