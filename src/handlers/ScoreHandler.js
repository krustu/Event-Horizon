/**
 * EVENT HANDLER: score, combo multiplier and high score. Owns those world fields.
 * Combo: kills within a short window chain; every few kills raise the multiplier.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  const STORAGE_KEY = 'event-horizon-highscore';

  function loadHighScore() {
    try {
      return parseInt(root.localStorage.getItem(STORAGE_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveHighScore(v) {
    try {
      root.localStorage.setItem(STORAGE_KEY, String(v));
    } catch (e) {
      /* storage unavailable (file:// in some browsers, private mode) — ignore */
    }
  }

  class ScoreHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('ScoreHandler', bus, world);
      world.highScore = loadHighScore();
      this.on(E.GAME_STARTED, this.onGameStarted);
      this.on(E.ENEMY_DESTROYED, this.onEnemyDestroyed);
      this.on(E.ENEMY_ESCAPED, this.onEnemyEscaped);
      this.on(E.PLAYER_DAMAGED, this.onPlayerDamaged);
      this.on(E.PLAYER_DIED, this.onPlayerDied);
      this.on(E.POWERUP_COLLECTED, this.onPowerup);
      this.on(E.WAVE_CLEARED, this.onWaveCleared);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.GAME_OVER, this.onGameEnd);
      this.on(E.GAME_WON, this.onGameEnd);
    }

    onGameStarted() {
      const w = this.world;
      this.ended = false;
      this.announced = false;
      w.score = 0;
      w.combo = 0;
      w.multiplier = 1;
      w.comboTimer = 0;
    }

    add(delta, reason, x, y) {
      const w = this.world;
      w.score += delta;
      this.emit(E.SCORE_CHANGED, { score: w.score, delta, reason, multiplier: w.multiplier, x, y });
      // Points can still arrive after GAME_WON (e.g. the final wave bonus queued in the same cycle).
      if (this.ended) this.checkHighScore();
    }

    checkHighScore() {
      const w = this.world;
      if (w.score <= w.highScore) return;
      const previous = w.highScore;
      w.highScore = w.score;
      saveHighScore(w.score);
      if (!this.announced) {
        this.announced = true;
        this.emit(E.HIGH_SCORE_BEATEN, { score: w.score, previous });
      }
    }

    onEnemyDestroyed(p) {
      const w = this.world;
      w.combo++;
      w.comboTimer = C.SCORE.comboWindow;
      w.multiplier = Math.min(C.SCORE.maxMultiplier, 1 + Math.floor(w.combo / C.SCORE.comboPerLevel));
      this.emit(E.COMBO_CHANGED, { combo: w.combo, multiplier: w.multiplier });
      this.add(p.points * w.multiplier, 'enemy_destroyed', p.x, p.y);
    }

    loseCombo(reason) {
      const w = this.world;
      if (w.combo <= 0) return;
      const previous = w.combo;
      w.combo = 0;
      w.multiplier = 1;
      w.comboTimer = 0;
      this.emit(E.COMBO_LOST, { previous_combo: previous, reason });
      this.emit(E.COMBO_CHANGED, { combo: 0, multiplier: 1 });
    }

    onEnemyEscaped() {
      this.loseCombo('enemy_escaped');
    }

    onPlayerDamaged() {
      this.loseCombo('player_hit');
    }

    onPlayerDied() {
      this.loseCombo('player_died');
    }

    onPowerup(p) {
      this.add(C.SCORE.powerup, 'powerup', p.x, p.y);
    }

    onWaveCleared(p) {
      this.add(p.bonus, 'wave_bonus', C.W / 2, C.H / 2);
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const w = this.world;
      if (w.combo > 0) {
        w.comboTimer -= p.dt;
        if (w.comboTimer <= 0) this.loseCombo('timeout');
      }
    }

    onGameEnd() {
      this.ended = true;
      this.checkHighScore();
    }
  }

  EDP.ScoreHandler = ScoreHandler;
})(globalThis);
