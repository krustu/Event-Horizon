/**
 * EVENT HANDLER: on-screen notifications. Owns world.ui (toast queue + centre banner).
 * Translates game events into short messages; the Renderer draws them.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;

  const MAX_TOASTS = 5;

  class UINotificationHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('UINotificationHandler', bus, world);
      this.on(E.GAME_STARTED, this.onGameStarted);
      this.on(E.WAVE_STARTED, this.onWaveStarted);
      this.on(E.WAVE_CLEARED, this.onWaveCleared);
      this.on(E.ACHIEVEMENT_UNLOCKED, this.onAchievement);
      this.on(E.POWERUP_COLLECTED, this.onPowerup);
      this.on(E.POWERUP_EXPIRED, this.onExpired);
      this.on(E.PLAYER_HEALED, this.onHealed);
      this.on(E.COMBO_LOST, this.onComboLost);
      this.on(E.HIGH_SCORE_BEATEN, this.onHighScore);
      this.on(E.BOSS_ENRAGED, this.onEnraged);
      this.on(E.MUTE_CHANGED, this.onMute);
      this.on(E.FRAME_TICK, this.onTick);
    }

    toast(text, color) {
      const ui = this.world.ui;
      ui.toasts.push({ text, color: color || '#d7def5', life: 3.2 });
      if (ui.toasts.length > MAX_TOASTS) ui.toasts.shift();
    }

    banner(title, sub, color) {
      this.world.ui.banner = { title, sub: sub || '', color: color || '#4df3ff', life: 2.2, max: 2.2 };
    }

    onGameStarted() {
      this.world.ui.toasts = [];
      this.banner('GET READY', '', '#4df3ff');
    }

    onWaveStarted(p) {
      if (p.boss) this.banner('WARNING', 'THE EVENT HORIZON BOSS APPROACHES', '#ff3d81');
      else this.banner('WAVE ' + p.wave, p.total_enemies + ' hostiles inbound', '#4df3ff');
    }

    onWaveCleared(p) {
      this.toast('Wave ' + p.wave + ' cleared  +' + p.bonus, '#5dff8a');
    }

    onAchievement(p) {
      this.toast('★ ' + p.title + ' — ' + p.description, '#ffd84d');
    }

    onPowerup(p) {
      this.toast(C.POWERUPS.kinds[p.kind].label, C.POWERUPS.kinds[p.kind].color);
    }

    onExpired(p) {
      this.toast(C.POWERUPS.kinds[p.kind].label + ' ended', '#7a86a8');
    }

    onHealed(p) {
      this.toast('Hull repaired +' + p.amount, '#5dff8a');
    }

    onComboLost(p) {
      if (p.previous_combo >= 4) this.toast('Combo lost (x' + p.previous_combo + ')', '#ff5d73');
    }

    onHighScore() {
      this.toast('NEW HIGH SCORE!', '#ffd84d');
    }

    onEnraged() {
      this.banner('BOSS ENRAGED', 'it fires faster now', '#ff3d81');
    }

    onMute(p) {
      this.toast(p.muted ? 'Sound off' : 'Sound on', '#7a86a8');
    }

    onTick(p) {
      if (p.state === 'paused') return;
      const ui = this.world.ui;
      ui.toasts.forEach((t) => (t.life -= p.dt));
      ui.toasts = ui.toasts.filter((t) => t.life > 0);
      if (ui.banner) {
        ui.banner.life -= p.dt;
        if (ui.banner.life <= 0) ui.banner = null;
      }
    }
  }

  EDP.UINotificationHandler = UINotificationHandler;
})(globalThis);
