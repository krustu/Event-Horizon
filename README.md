# Event Horizon

A fast 2D arcade space shooter built to demonstrate **Event-Driven Programming**. Every action in the game (a key press, a collision, a kill, a power-up) is an **event** published to a central **event queue** and handled by independent **event handlers**.

* **Genre:** vertical space shooter with 5 waves, a boss fight, power-ups, combos, lives and win / lose states
* **Tech:** HTML5 Canvas + vanilla JavaScript. No dependencies, no build step, no network access needed
* **Architecture:** Event Producers -> Event Queue / Bus -> Event Handlers, with a **live event-queue panel** next to the game

| Document | What it contains |
|---|---|
| [events.md](events.md) | Catalog of all 43 events: producer, consumers, trigger, example JSON payload |
| [architecture.md](architecture.md) | Design, diagrams (Mermaid + ASCII), frame lifecycle, how decoupling is achieved |

## Prerequisites

* A modern desktop browser (Chrome, Edge, Firefox, Safari)
* *Optional:* [Node.js](https://nodejs.org/) 18+ for `npm start` and `npm test` (no `npm install` needed: there are no dependencies)

## Installation

```bash
git clone <your-repo-url> event-horizon
cd event-horizon
```

That is all. There is nothing to install.

## Starting the game

Pick one:

```bash
# Option A - just open the file
open index.html            # macOS      (Windows: start index.html, Linux: xdg-open index.html)

# Option B - tiny built-in Node server (recommended for demos)
npm start                  # then open http://localhost:8080

# Option C - any static server
python3 -m http.server 8080    # then open http://localhost:8080
```

Press **Enter** on the title screen to begin.

## Controls

| Key | Action |
|---|---|
| `W A S D` or arrow keys | Move |
| `Space` (hold) | Fire |
| `P` or `Esc` | Pause / resume |
| `M` | Mute / unmute |
| `Enter` | Start, or play again after game over / victory |

## How to play

* Survive **5 waves** and destroy the boss ("Event Horizon") in wave 5. You have **3 lives** and a health bar; enemy bullets do 12 damage, collisions 25.
* Enemies: **drones** (straight), **weavers** (zig-zag), **gunners** (aimed shots), **tanks** (3-way shots, tough), **boss** (fans and bullet rings, gets faster at 50% HP).
* **Combo:** kills within ~2 seconds chain. Every 3 kills raise the score multiplier (up to x5). A hit, a death, an escaped enemy or a timeout resets it.
* **Power-ups** dropped by enemies:

| Icon | Power-up | Effect |
|---|---|---|
| `R` | Rapid fire | Fire rate x2.4 for 10 s |
| `S` | Spread shot | 3 bullets per shot for 10 s |
| `O` | Shield | Blocks the next hit (12 s) |
| `+` | Repair | Restores 30 health |

* **Achievements** pop up as toasts (First Blood, Chain Reaction, Untouchable, ...). The high score is kept in `localStorage`.

## Watching the event queue in action

The panel on the right is a live view of the Event Bus. For each event you see:

```
6.18s #457  ProjectileHandler > PLAYER_FIRED
  > AchievementHandler, AudioHandler  {"x":303.12,"y":617,"pattern":"single","bullets":1}
```

i.e. *time, sequence number, who produced it, the event type, which handlers received it, and the JSON payload.* Blue names are **producers**, green names are **handlers**.

* **Freeze log** - pause the list so you can read it
* **Show FRAME_TICK** - include the 60-per-second clock event (hidden by default because it floods the log)
* **Console log** - also print each event to the browser DevTools console
* **Clear** - empty the list
* **Subscriptions** (collapsible) - the full routing table: for each event, its producer and the handlers that listen to it
* The stats line shows total events processed, events per second, and how many events the last queue drain handled (with its peak queue depth)

URL flags (append to the address): `?log=1` prints every event to the console, `?noisy=1` includes `FRAME_TICK`, `?strict=1` throws on any event-schema violation.

You can also publish events by hand from the DevTools console to see handlers react:

```js
EDP_GAME.bus.publish('INPUT_PAUSE_PRESSED', {}, 'InputProducer');   // pauses the game
```

### Suggested demo for the professor

1. Open the game, expand **Subscriptions** and show how few events have more than one subscriber and who they are.
2. Press `Enter`, hold `Space`: watch `INPUT_FIRE_CHANGED` -> `PLAYER_FIRE_REQUESTED` -> `PLAYER_FIRED` (producer -> handler -> handler chain).
3. Kill an enemy and press **Freeze log**: one `COLLISION_BULLET_ENEMY` from the `CollisionDetector` fans out into `ENEMY_DAMAGED`, `ENEMY_DESTROYED`, `SCORE_CHANGED`, `COMBO_CHANGED`, `POWERUP_DROPPED`, `ACHIEVEMENT_UNLOCKED`... each handled by different, independent handlers.
4. Tick **Show FRAME_TICK** to see the clock event consumed by ten handlers.
5. Let an enemy bullet hit you: `COLLISION_ENEMY_BULLET_PLAYER` -> `PLAYER_DAMAGED` -> `PLAYER_HEALTH_CHANGED` -> (when out of health) `PLAYER_DIED` -> `PLAYER_RESPAWNED` / `GAME_OVER`.

## Project structure

```
event-horizon/
|-- index.html              page + script loading order
|-- style.css
|-- server.js               zero-dependency static server (npm start)
|-- package.json
|-- events.md               event catalog (generated from the code)
|-- architecture.md         architecture, diagrams, design notes
|-- src/
|   |-- main.js             browser entry: attaches input, renderer, debug panel; runs the loop
|   |-- core/               EVENT QUEUE / BUS layer
|   |   |-- events.js         registry of every event (producer, trigger, payload contract)
|   |   |-- EventBus.js       queue, validation, routing, taps
|   |   |-- EventLogger.js    live log + console printout (bus observer)
|   |   |-- EventHandler.js   base class for handlers
|   |   `-- Random.js         seedable RNG for gameplay
|   |-- producers/          EVENT PRODUCERS layer
|   |   |-- InputProducer.js
|   |   |-- GameLoopProducer.js
|   |   |-- EnemySpawner.js
|   |   `-- CollisionDetector.js
|   |-- handlers/           EVENT HANDLERS layer
|   |   |-- PlayerControlHandler.js   WeaponHandler.js       ProjectileHandler.js
|   |   |-- EnemyBehaviorHandler.js   CombatHandler.js       PowerUpHandler.js
|   |   |-- HealthAndStateHandler.js  WaveHandler.js         ScoreHandler.js
|   |   `-- AchievementHandler.js     VisualEffectsHandler.js AudioHandler.js   UINotificationHandler.js
|   |-- game/
|   |   |-- Game.js           composition root: wires everything, defines one frame
|   |   |-- World.js          shared state container (single writer per field)
|   |   |-- config.js         balance data
|   |   `-- Renderer.js       canvas view (read-only)
|   `-- debug/DebugPanel.js   live event-bus panel
|-- tests/run.js            headless test-suite (npm test)
`-- tools/                  generate-events-md.js (npm run docs), load-game.js
```

## Tests

```bash
npm test
```

Runs the real game code headlessly in strict mode: event bus semantics, keyboard producer, collision detector, gameplay rules, a bot that plays through all 5 waves and wins, an idle player that loses, a renderer smoke test, a check that every one of the 43 events is published at least once, and a check that `events.md` matches the code.

After adding or changing an event, regenerate the catalog with `npm run docs`.

