/**
 * EVENT HANDLER: achievements. Watches the stream of game events, keeps its own counters and
 * emits ACHIEVEMENT_UNLOCKED once per run per achievement. It reads no world state at all —
 * everything it needs arrives in event payloads.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;

  const ACHIEVEMENTS = {
    first_blood: { title: 'First Blood', description: 'Destroy your first enemy' },
    trigger_happy: { title: 'Trigger Happy', description: 'Fire 150 shots' },
    chain_reaction: { title: 'Chain Reaction', description: 'Reach a x6 kill combo' },
    untouchable: { title: 'Untouchable', description: 'Destroy 12 enemies without taking damage' },
    power_hungry: { title: 'Power Hungry', description: 'Collect 3 power-ups' },
    close_call: { title: 'Close Call', description: 'Let a shield block a hit' },
    veteran: { title: 'Veteran', description: 'Clear wave 3' },
    high_roller: { title: 'High Roller', description: 'Reach 1000 points' },
    boss_slayer: { title: 'Boss Slayer', description: 'Defeat the Event Horizon boss' },
  };

  class AchievementHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('AchievementHandler', bus, world);
      this.reset();
      this.on(E.GAME_STARTED, this.reset);
      this.on(E.ENEMY_DESTROYED, this.onKill);
      this.on(E.PLAYER_FIRED, this.onShot);
      this.on(E.COMBO_CHANGED, this.onCombo);
      this.on(E.PLAYER_DAMAGED, this.onDamaged);
      this.on(E.POWERUP_COLLECTED, this.onPowerup);
      this.on(E.SHIELD_ABSORBED, this.onShield);
      this.on(E.WAVE_CLEARED, this.onWave);
      this.on(E.SCORE_CHANGED, this.onScore);
      this.on(E.BOSS_DEFEATED, this.onBoss);
    }

    reset() {
      this.unlocked = new Set();
      this.shots = 0;
      this.cleanKills = 0;
      this.powerups = 0;
    }

    unlock(id) {
      if (this.unlocked.has(id)) return;
      this.unlocked.add(id);
      const a = ACHIEVEMENTS[id];
      this.emit(E.ACHIEVEMENT_UNLOCKED, { id, title: a.title, description: a.description });
    }

    onKill() {
      this.unlock('first_blood');
      if (++this.cleanKills >= 12) this.unlock('untouchable');
    }

    onShot(p) {
      this.shots += p.bullets;
      if (this.shots >= 150) this.unlock('trigger_happy');
    }

    onCombo(p) {
      if (p.combo >= 6) this.unlock('chain_reaction');
    }

    onDamaged() {
      this.cleanKills = 0;
    }

    onPowerup() {
      if (++this.powerups >= 3) this.unlock('power_hungry');
    }

    onShield() {
      this.unlock('close_call');
    }

    onWave(p) {
      if (p.wave >= 3) this.unlock('veteran');
    }

    onScore(p) {
      if (p.score >= 1000) this.unlock('high_roller');
    }

    onBoss() {
      this.unlock('boss_slayer');
    }
  }

  EDP.AchievementHandler = AchievementHandler;
})(globalThis);
