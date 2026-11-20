# Event Catalog

> Generated from the code by `npm run docs` (`tools/generate-events-md.js`): producers, triggers and example
> payloads come from the registry in `src/core/events.js`; consumers are the subscriptions the handlers actually
> register on the bus. `npm test` fails if this file is out of date. Do not edit it by hand.

There are **43 events**, produced by **4 event producers** and **13 event handlers**.

## Event envelope

Every event on the queue has the same structure. The tables below document the `payload` of each event type.

```json
{
  "id": 231,
  "event_type": "ENEMY_DESTROYED",
  "timestamp": 18342.7,
  "source": "CombatHandler",
  "payload": {
    "enemy_id": 41,
    "enemy_type": "gunner",
    "x": 205.2,
    "y": 140.8,
    "points": 40,
    "cause": "bullet"
  }
}
```

| Field | Meaning |
|---|---|
| `id` | Monotonic sequence number, assigned when the event is published |
| `event_type` | One of the names in this catalog |
| `timestamp` | Milliseconds (`performance.now()`) at publish time |
| `source` | Name of the component that published it (must match the registry) |
| `payload` | Plain JSON data; deep-frozen, so consumers cannot mutate what other consumers see |

## Components

**Event producers** (publish only, never subscribe): `InputProducer`, `GameLoopProducer`, `EnemySpawner`, `CollisionDetector`.

**Event handlers** (subscribe; may publish follow-up events): `PlayerControlHandler`, `WeaponHandler`, `ProjectileHandler`, `EnemyBehaviorHandler`, `CombatHandler`, `PowerUpHandler`, `HealthAndStateHandler`, `WaveHandler`, `ScoreHandler`, `AchievementHandler`, `VisualEffectsHandler`, `AudioHandler`, `UINotificationHandler`.

## Summary

| Event | Producer | Consumer(s) |
|---|---|---|
| [`INPUT_MOVE_CHANGED`](#input_move_changed) | `InputProducer` | `PlayerControlHandler` |
| [`INPUT_FIRE_CHANGED`](#input_fire_changed) | `InputProducer` | `WeaponHandler` |
| [`INPUT_PAUSE_PRESSED`](#input_pause_pressed) | `InputProducer` | `HealthAndStateHandler` |
| [`INPUT_START_PRESSED`](#input_start_pressed) | `InputProducer` | `HealthAndStateHandler` |
| [`INPUT_MUTE_PRESSED`](#input_mute_pressed) | `InputProducer` | `AudioHandler` |
| [`FRAME_TICK`](#frame_tick) | `GameLoopProducer` | 10 handlers (see below) |
| [`ENEMY_SPAWN_REQUESTED`](#enemy_spawn_requested) | `EnemySpawner` | `EnemyBehaviorHandler` |
| [`COLLISION_BULLET_ENEMY`](#collision_bullet_enemy) | `CollisionDetector` | `CombatHandler` |
| [`COLLISION_PLAYER_ENEMY`](#collision_player_enemy) | `CollisionDetector` | `CombatHandler` |
| [`COLLISION_ENEMY_BULLET_PLAYER`](#collision_enemy_bullet_player) | `CollisionDetector` | `CombatHandler` |
| [`COLLISION_PLAYER_POWERUP`](#collision_player_powerup) | `CollisionDetector` | `PowerUpHandler` |
| [`PLAYER_FIRE_REQUESTED`](#player_fire_requested) | `WeaponHandler` | `ProjectileHandler` |
| [`ENEMY_FIRE_REQUESTED`](#enemy_fire_requested) | `EnemyBehaviorHandler` | `ProjectileHandler` |
| [`PLAYER_FIRED`](#player_fired) | `ProjectileHandler` | `AchievementHandler`, `AudioHandler` |
| [`ENEMY_FIRED`](#enemy_fired) | `ProjectileHandler` | `AudioHandler` |
| [`ENEMY_SPAWNED`](#enemy_spawned) | `EnemyBehaviorHandler` | `WaveHandler`, `AudioHandler` |
| [`ENEMY_DAMAGED`](#enemy_damaged) | `CombatHandler` | `EnemyBehaviorHandler`, `VisualEffectsHandler`, `AudioHandler` |
| [`ENEMY_DESTROYED`](#enemy_destroyed) | `CombatHandler` | 6 handlers (see below) |
| [`ENEMY_ESCAPED`](#enemy_escaped) | `EnemyBehaviorHandler` | `WaveHandler`, `ScoreHandler` |
| [`BOSS_ENRAGED`](#boss_enraged) | `EnemyBehaviorHandler` | `AudioHandler`, `UINotificationHandler` |
| [`BOSS_DEFEATED`](#boss_defeated) | `CombatHandler` | 5 handlers (see below) |
| [`SHIELD_ABSORBED`](#shield_absorbed) | `CombatHandler` | 5 handlers (see below) |
| [`PLAYER_DAMAGED`](#player_damaged) | `CombatHandler` | 5 handlers (see below) |
| [`PLAYER_HEALTH_CHANGED`](#player_health_changed) | `HealthAndStateHandler` | `VisualEffectsHandler` |
| [`PLAYER_HEALED`](#player_healed) | `HealthAndStateHandler` | `UINotificationHandler` |
| [`PLAYER_DIED`](#player_died) | `HealthAndStateHandler` | 5 handlers (see below) |
| [`PLAYER_RESPAWNED`](#player_respawned) | `HealthAndStateHandler` | `PlayerControlHandler` |
| [`GAME_STARTED`](#game_started) | `HealthAndStateHandler` | 10 handlers (see below) |
| [`GAME_PAUSED`](#game_paused) | `HealthAndStateHandler` | `AudioHandler` |
| [`GAME_RESUMED`](#game_resumed) | `HealthAndStateHandler` | `AudioHandler` |
| [`GAME_OVER`](#game_over) | `HealthAndStateHandler` | `ScoreHandler`, `AudioHandler` |
| [`GAME_WON`](#game_won) | `HealthAndStateHandler` | `ScoreHandler`, `AudioHandler` |
| [`SCORE_CHANGED`](#score_changed) | `ScoreHandler` | `AchievementHandler`, `VisualEffectsHandler` |
| [`COMBO_CHANGED`](#combo_changed) | `ScoreHandler` | `AchievementHandler` |
| [`COMBO_LOST`](#combo_lost) | `ScoreHandler` | `UINotificationHandler` |
| [`HIGH_SCORE_BEATEN`](#high_score_beaten) | `ScoreHandler` | `AudioHandler`, `UINotificationHandler` |
| [`WAVE_STARTED`](#wave_started) | `WaveHandler` | `AudioHandler`, `UINotificationHandler` |
| [`WAVE_CLEARED`](#wave_cleared) | `WaveHandler` | `ScoreHandler`, `AchievementHandler`, `AudioHandler`, `UINotificationHandler` |
| [`POWERUP_DROPPED`](#powerup_dropped) | `PowerUpHandler` | `VisualEffectsHandler` |
| [`POWERUP_COLLECTED`](#powerup_collected) | `PowerUpHandler` | 6 handlers (see below) |
| [`POWERUP_EXPIRED`](#powerup_expired) | `PowerUpHandler` | `UINotificationHandler` |
| [`ACHIEVEMENT_UNLOCKED`](#achievement_unlocked) | `AchievementHandler` | `AudioHandler`, `UINotificationHandler` |
| [`MUTE_CHANGED`](#mute_changed) | `AudioHandler` | `UINotificationHandler` |

## Details by category

### Input

#### `INPUT_MOVE_CHANGED`

| | |
|---|---|
| **Producer** | `InputProducer` (event producer) |
| **Consumer(s)** | `PlayerControlHandler` |
| **Trigger** | The combined direction of the movement keys (WASD / arrows) changes: a key is pressed or released. |

```json
{
  "dx": -1,
  "dy": 0
}
```

#### `INPUT_FIRE_CHANGED`

| | |
|---|---|
| **Producer** | `InputProducer` (event producer) |
| **Consumer(s)** | `WeaponHandler` |
| **Trigger** | The fire key (Space) is pressed or released. |

```json
{
  "active": true
}
```

#### `INPUT_PAUSE_PRESSED`

| | |
|---|---|
| **Producer** | `InputProducer` (event producer) |
| **Consumer(s)** | `HealthAndStateHandler` |
| **Trigger** | P or Escape is pressed. |

```json
{}
```

#### `INPUT_START_PRESSED`

| | |
|---|---|
| **Producer** | `InputProducer` (event producer) |
| **Consumer(s)** | `HealthAndStateHandler` |
| **Trigger** | Enter is pressed (starts a game from the title screen, restarts after game over / victory). |

```json
{}
```

#### `INPUT_MUTE_PRESSED`

| | |
|---|---|
| **Producer** | `InputProducer` (event producer) |
| **Consumer(s)** | `AudioHandler` |
| **Trigger** | M is pressed. |

```json
{}
```

### Game Loop

#### `FRAME_TICK`

| | |
|---|---|
| **Producer** | `GameLoopProducer` (event producer) |
| **Consumer(s)** | `PlayerControlHandler`, `WeaponHandler`, `ProjectileHandler`, `EnemyBehaviorHandler`, `PowerUpHandler`, `HealthAndStateHandler`, `WaveHandler`, `ScoreHandler`, `VisualEffectsHandler`, `UINotificationHandler` |
| **Trigger** | Every animation frame while the game is not paused. Drives all time-based behaviour (movement, AI, cooldowns, timers). _(high-frequency; hidden from the debug log unless enabled)_ |

```json
{
  "dt": 0.0167,
  "frame": 1042,
  "time": 17.4,
  "state": "playing"
}
```

### Spawning

#### `ENEMY_SPAWN_REQUESTED`

| | |
|---|---|
| **Producer** | `EnemySpawner` (event producer) |
| **Consumer(s)** | `EnemyBehaviorHandler` |
| **Trigger** | The spawner timer elapses while the current wave still has enemies left to release. |

```json
{
  "enemy_type": "weaver",
  "x": 312.5,
  "wave": 3,
  "index": 4
}
```

### Collision

#### `COLLISION_BULLET_ENEMY`

| | |
|---|---|
| **Producer** | `CollisionDetector` (event producer) |
| **Consumer(s)** | `CombatHandler` |
| **Trigger** | A player bullet overlaps a living enemy (hit-box test, once per bullet per frame). |

```json
{
  "bullet_id": 118,
  "enemy_id": 41,
  "x": 205.2,
  "y": 140.8
}
```

#### `COLLISION_PLAYER_ENEMY`

| | |
|---|---|
| **Producer** | `CollisionDetector` (event producer) |
| **Consumer(s)** | `CombatHandler` |
| **Trigger** | The (non-invulnerable) player ship overlaps a living enemy. |

```json
{
  "enemy_id": 41,
  "x": 280,
  "y": 612
}
```

#### `COLLISION_ENEMY_BULLET_PLAYER`

| | |
|---|---|
| **Producer** | `CollisionDetector` (event producer) |
| **Consumer(s)** | `CombatHandler` |
| **Trigger** | An enemy bullet overlaps the (non-invulnerable) player ship. |

```json
{
  "bullet_id": 140,
  "x": 281.3,
  "y": 606.1
}
```

#### `COLLISION_PLAYER_POWERUP`

| | |
|---|---|
| **Producer** | `CollisionDetector` (event producer) |
| **Consumer(s)** | `PowerUpHandler` |
| **Trigger** | The player ship overlaps a falling power-up. |

```json
{
  "powerup_id": 77,
  "kind": "rapid",
  "x": 300,
  "y": 590
}
```

### Weapons

#### `PLAYER_FIRE_REQUESTED`

| | |
|---|---|
| **Producer** | `WeaponHandler` (event handler) |
| **Consumer(s)** | `ProjectileHandler` |
| **Trigger** | Fire is held and the weapon cooldown has elapsed. |

```json
{
  "x": 280,
  "y": 613,
  "pattern": "spread"
}
```

#### `ENEMY_FIRE_REQUESTED`

| | |
|---|---|
| **Producer** | `EnemyBehaviorHandler` (event handler) |
| **Consumer(s)** | `ProjectileHandler` |
| **Trigger** | An enemy's AI decides to shoot (its fire timer elapsed). |

```json
{
  "enemy_id": 41,
  "enemy_type": "gunner",
  "x": 200,
  "y": 160,
  "pattern": "aimed",
  "target_x": 280,
  "target_y": 630
}
```

#### `PLAYER_FIRED`

| | |
|---|---|
| **Producer** | `ProjectileHandler` (event handler) |
| **Consumer(s)** | `AchievementHandler`, `AudioHandler` |
| **Trigger** | Player bullets have been created in response to PLAYER_FIRE_REQUESTED. |

```json
{
  "x": 280,
  "y": 613,
  "pattern": "spread",
  "bullets": 3
}
```

#### `ENEMY_FIRED`

| | |
|---|---|
| **Producer** | `ProjectileHandler` (event handler) |
| **Consumer(s)** | `AudioHandler` |
| **Trigger** | Enemy bullets have been created in response to ENEMY_FIRE_REQUESTED. |

```json
{
  "enemy_id": 41,
  "enemy_type": "gunner",
  "bullets": 1
}
```

### Enemies & Combat

#### `ENEMY_SPAWNED`

| | |
|---|---|
| **Producer** | `EnemyBehaviorHandler` (event handler) |
| **Consumer(s)** | `WaveHandler`, `AudioHandler` |
| **Trigger** | An enemy entity has been created from an ENEMY_SPAWN_REQUESTED. |

```json
{
  "enemy_id": 41,
  "enemy_type": "gunner",
  "x": 200,
  "y": -17,
  "hp": 3,
  "wave": 3
}
```

#### `ENEMY_DAMAGED`

| | |
|---|---|
| **Producer** | `CombatHandler` (event handler) |
| **Consumer(s)** | `EnemyBehaviorHandler`, `VisualEffectsHandler`, `AudioHandler` |
| **Trigger** | A player bullet hit an enemy and reduced its HP (also fired for the killing blow, with hp = 0). |

```json
{
  "enemy_id": 41,
  "enemy_type": "gunner",
  "damage": 1,
  "hp": 2,
  "x": 205.2,
  "y": 140.8
}
```

#### `ENEMY_DESTROYED`

| | |
|---|---|
| **Producer** | `CombatHandler` (event handler) |
| **Consumer(s)** | `PowerUpHandler`, `WaveHandler`, `ScoreHandler`, `AchievementHandler`, `VisualEffectsHandler`, `AudioHandler` |
| **Trigger** | An enemy reached 0 HP, or a non-boss enemy rammed the player. |

```json
{
  "enemy_id": 41,
  "enemy_type": "gunner",
  "x": 205.2,
  "y": 140.8,
  "points": 40,
  "cause": "bullet"
}
```

#### `ENEMY_ESCAPED`

| | |
|---|---|
| **Producer** | `EnemyBehaviorHandler` (event handler) |
| **Consumer(s)** | `WaveHandler`, `ScoreHandler` |
| **Trigger** | A non-boss enemy flew off the bottom edge of the playfield. |

```json
{
  "enemy_id": 44,
  "enemy_type": "drone"
}
```

#### `BOSS_ENRAGED`

| | |
|---|---|
| **Producer** | `EnemyBehaviorHandler` (event handler) |
| **Consumer(s)** | `AudioHandler`, `UINotificationHandler` |
| **Trigger** | The boss drops to 50% HP or below (once per boss). |

```json
{
  "enemy_id": 90,
  "hp": 35
}
```

#### `BOSS_DEFEATED`

| | |
|---|---|
| **Producer** | `CombatHandler` (event handler) |
| **Consumer(s)** | `ProjectileHandler`, `EnemyBehaviorHandler`, `HealthAndStateHandler`, `AchievementHandler`, `VisualEffectsHandler` |
| **Trigger** | The boss was destroyed (emitted right after its ENEMY_DESTROYED). |

```json
{
  "enemy_id": 90,
  "x": 280,
  "y": 120
}
```

#### `SHIELD_ABSORBED`

| | |
|---|---|
| **Producer** | `CombatHandler` (event handler) |
| **Consumer(s)** | `PowerUpHandler`, `HealthAndStateHandler`, `AchievementHandler`, `VisualEffectsHandler`, `AudioHandler` |
| **Trigger** | A damaging collision happened while the player had an active shield. |

```json
{
  "source": "enemy_bullet",
  "x": 281,
  "y": 606
}
```

#### `PLAYER_DAMAGED`

| | |
|---|---|
| **Producer** | `CombatHandler` (event handler) |
| **Consumer(s)** | `HealthAndStateHandler`, `ScoreHandler`, `AchievementHandler`, `VisualEffectsHandler`, `AudioHandler` |
| **Trigger** | A damaging collision happened and the player had no shield. |

```json
{
  "amount": 12,
  "source": "enemy_bullet",
  "x": 281,
  "y": 606
}
```

### Player & Game State

#### `PLAYER_HEALTH_CHANGED`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `VisualEffectsHandler` |
| **Trigger** | Player health changed (damage, repair pickup, respawn). |

```json
{
  "health": 88,
  "max_health": 100,
  "delta": -12
}
```

#### `PLAYER_HEALED`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `UINotificationHandler` |
| **Trigger** | A repair power-up restored health. |

```json
{
  "amount": 30,
  "health": 100
}
```

#### `PLAYER_DIED`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `ProjectileHandler`, `PowerUpHandler`, `ScoreHandler`, `VisualEffectsHandler`, `AudioHandler` |
| **Trigger** | Player health reached 0 and a life was spent. |

```json
{
  "lives_left": 2,
  "x": 281,
  "y": 606
}
```

#### `PLAYER_RESPAWNED`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `PlayerControlHandler` |
| **Trigger** | The player died but still has lives left: respawn with temporary invulnerability. |

```json
{
  "x": 280,
  "y": 630,
  "invulnerable_for": 2
}
```

#### `GAME_STARTED`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `PlayerControlHandler`, `WeaponHandler`, `ProjectileHandler`, `EnemyBehaviorHandler`, `PowerUpHandler`, `WaveHandler`, `ScoreHandler`, `AchievementHandler`, `VisualEffectsHandler`, `UINotificationHandler` |
| **Trigger** | Enter pressed on the title / game-over / victory screen. Every handler resets its own state. |

```json
{
  "lives": 3,
  "health": 100,
  "is_restart": false
}
```

#### `GAME_PAUSED`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `AudioHandler` |
| **Trigger** | P / Escape pressed while playing. |

```json
{}
```

#### `GAME_RESUMED`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `AudioHandler` |
| **Trigger** | P / Escape pressed while paused. |

```json
{}
```

#### `GAME_OVER`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `ScoreHandler`, `AudioHandler` |
| **Trigger** | The last life was lost. |

```json
{
  "score": 1840,
  "wave": 4,
  "reason": "out_of_lives"
}
```

#### `GAME_WON`

| | |
|---|---|
| **Producer** | `HealthAndStateHandler` (event handler) |
| **Consumer(s)** | `ScoreHandler`, `AudioHandler` |
| **Trigger** | The boss was defeated. |

```json
{
  "score": 5230,
  "wave": 5
}
```

### Scoring

#### `SCORE_CHANGED`

| | |
|---|---|
| **Producer** | `ScoreHandler` (event handler) |
| **Consumer(s)** | `AchievementHandler`, `VisualEffectsHandler` |
| **Trigger** | Score increased (kill, power-up pickup, wave bonus). |

```json
{
  "score": 340,
  "delta": 60,
  "reason": "enemy_destroyed",
  "multiplier": 3,
  "x": 205.2,
  "y": 140.8
}
```

#### `COMBO_CHANGED`

| | |
|---|---|
| **Producer** | `ScoreHandler` (event handler) |
| **Consumer(s)** | `AchievementHandler` |
| **Trigger** | The kill combo counter changed (kill, or reset to 0). |

```json
{
  "combo": 7,
  "multiplier": 3
}
```

#### `COMBO_LOST`

| | |
|---|---|
| **Producer** | `ScoreHandler` (event handler) |
| **Consumer(s)** | `UINotificationHandler` |
| **Trigger** | A running combo ended (timeout, player hit, player died, enemy escaped). |

```json
{
  "previous_combo": 7,
  "reason": "timeout"
}
```

#### `HIGH_SCORE_BEATEN`

| | |
|---|---|
| **Producer** | `ScoreHandler` (event handler) |
| **Consumer(s)** | `AudioHandler`, `UINotificationHandler` |
| **Trigger** | At game over / victory the final score (including any bonus that lands in the same cycle) beats the stored high score. Announced once per run. |

```json
{
  "score": 1840,
  "previous": 1200
}
```

### Waves

#### `WAVE_STARTED`

| | |
|---|---|
| **Producer** | `WaveHandler` (event handler) |
| **Consumer(s)** | `AudioHandler`, `UINotificationHandler` |
| **Trigger** | The intermission timer elapsed and a new wave begins. |

```json
{
  "wave": 3,
  "total_enemies": 16,
  "boss": false
}
```

#### `WAVE_CLEARED`

| | |
|---|---|
| **Producer** | `WaveHandler` (event handler) |
| **Consumer(s)** | `ScoreHandler`, `AchievementHandler`, `AudioHandler`, `UINotificationHandler` |
| **Trigger** | Every enemy of the wave has been spawned and then destroyed / escaped. |

```json
{
  "wave": 3,
  "bonus": 300
}
```

### Power-ups

#### `POWERUP_DROPPED`

| | |
|---|---|
| **Producer** | `PowerUpHandler` (event handler) |
| **Consumer(s)** | `VisualEffectsHandler` |
| **Trigger** | A destroyed enemy rolled a drop. |

```json
{
  "powerup_id": 77,
  "kind": "rapid",
  "x": 205.2,
  "y": 140.8
}
```

#### `POWERUP_COLLECTED`

| | |
|---|---|
| **Producer** | `PowerUpHandler` (event handler) |
| **Consumer(s)** | `HealthAndStateHandler`, `ScoreHandler`, `AchievementHandler`, `VisualEffectsHandler`, `AudioHandler`, `UINotificationHandler` |
| **Trigger** | The player touched a power-up (handled after COLLISION_PLAYER_POWERUP). |

```json
{
  "kind": "rapid",
  "duration": 10,
  "x": 300,
  "y": 590
}
```

#### `POWERUP_EXPIRED`

| | |
|---|---|
| **Producer** | `PowerUpHandler` (event handler) |
| **Consumer(s)** | `UINotificationHandler` |
| **Trigger** | A timed buff ran out, or a shield was consumed by a hit. |

```json
{
  "kind": "rapid"
}
```

### Meta

#### `ACHIEVEMENT_UNLOCKED`

| | |
|---|---|
| **Producer** | `AchievementHandler` (event handler) |
| **Consumer(s)** | `AudioHandler`, `UINotificationHandler` |
| **Trigger** | An achievement condition was met (once per run). |

```json
{
  "id": "first_blood",
  "title": "First Blood",
  "description": "Destroy your first enemy"
}
```

#### `MUTE_CHANGED`

| | |
|---|---|
| **Producer** | `AudioHandler` (event handler) |
| **Consumer(s)** | `UINotificationHandler` |
| **Trigger** | Sound was muted / unmuted in response to INPUT_MUTE_PRESSED. |

```json
{
  "muted": true
}
```
