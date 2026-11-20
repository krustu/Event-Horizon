/**
 * Renderer — a pure VIEW. Reads the world (never writes it, never publishes events) and draws
 * the playfield, HUD, notifications and the state overlays (title / pause / game over / victory).
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const C = EDP.Config;

  const TAU = Math.PI * 2;
  const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';

  class Renderer {
    constructor(canvas, world) {
      this.canvas = canvas;
      this.world = world;
      canvas.width = C.W;
      canvas.height = C.H;
      this.ctx = canvas.getContext('2d');
      this.stars = [];
      for (let i = 0; i < 80; i++) {
        this.stars.push({ x: Math.random() * C.W, y: Math.random() * C.H, z: 0.3 + Math.random() * 0.7 });
      }
    }

    // ------------------------------------------------------------------ helpers
    text(str, x, y, opts) {
      const o = Object.assign({ size: 14, color: '#d7def5', align: 'left', bold: false, alpha: 1 }, opts);
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = o.alpha;
      ctx.font = (o.bold ? 'bold ' : '') + o.size + 'px ' + MONO;
      ctx.textAlign = o.align;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = o.color;
      ctx.fillText(str, x, y);
      ctx.restore();
    }

    poly(points) {
      const ctx = this.ctx;
      ctx.beginPath();
      points.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.closePath();
    }

    // ------------------------------------------------------------------ main
    render(now) {
      const ctx = this.ctx;
      const w = this.world;
      const fx = w.fx;

      ctx.save();
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, C.W, C.H);
      this.drawStars(now);

      if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
      this.drawPowerups(now);
      this.drawEnemies();
      this.drawBullets();
      if (w.state === 'playing' || w.state === 'paused' || w.state === 'won') this.drawPlayer(now);
      this.drawFx();
      ctx.restore();

      if (fx.flash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, fx.flash);
        ctx.fillStyle = fx.flashColor;
        ctx.fillRect(0, 0, C.W, C.H);
        ctx.restore();
      }
      if (fx.lowHealth && w.state === 'playing') this.drawVignette(now);

      if (w.state !== 'title') this.drawHud();
      this.drawToasts();
      this.drawBanner();
      this.drawOverlay(now);
    }

    drawStars(now) {
      const ctx = this.ctx;
      ctx.fillStyle = '#9fb4ff';
      for (const s of this.stars) {
        const y = (s.y + now * 0.04 * s.z) % C.H;
        ctx.globalAlpha = 0.25 + s.z * 0.5;
        ctx.fillRect(s.x, y, s.z * 2, s.z * 2);
      }
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------------ entities
    drawPlayer(now) {
      const ctx = this.ctx;
      const p = this.world.player;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.invuln > 0 && Math.floor(now / 80) % 2 === 0) ctx.globalAlpha = 0.35;
      ctx.shadowColor = '#4df3ff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#4df3ff';
      this.poly([[0, -p.h / 2], [p.w / 2, p.h / 2], [0, p.h / 2 - 8], [-p.w / 2, p.h / 2]]);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b2a3a';
      this.poly([[0, -8], [5, 8], [-5, 8]]);
      ctx.fill();
      // engine flame
      ctx.fillStyle = '#ffa24d';
      const f = 6 + Math.random() * 6;
      this.poly([[-4, p.h / 2 - 6], [4, p.h / 2 - 6], [0, p.h / 2 + f]]);
      ctx.fill();
      // shield bubble
      if (p.buffs.shield > 0) {
        ctx.globalAlpha = p.buffs.shield < 2 && Math.floor(now / 100) % 2 ? 0.2 : 0.8;
        ctx.strokeStyle = '#4df3ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#4df3ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawEnemies() {
      const ctx = this.ctx;
      for (const e of this.world.enemies) {
        if (!e.alive) continue;
        const cfg = C.ENEMIES[e.type];
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = e.type === 'boss' ? 24 : 10;
        ctx.fillStyle = cfg.color;
        const hw = e.w / 2;
        const hh = e.h / 2;
        switch (e.type) {
          case 'drone':
            this.poly([[0, hh], [-hw, -hh], [hw, -hh]]);
            ctx.fill();
            break;
          case 'weaver':
            this.poly([[0, hh], [hw, 0], [0, -hh], [-hw, 0]]);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#2a1500';
            ctx.fillRect(-2, -hh + 4, 4, e.h - 8);
            break;
          case 'gunner':
            this.poly([[-hw / 2, -hh], [hw / 2, -hh], [hw, 0], [hw / 2, hh], [-hw / 2, hh], [-hw, 0]]);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#1b0b2a';
            ctx.fillRect(-3, 0, 6, hh + 2);
            break;
          case 'tank':
            ctx.fillRect(-hw, -hh + 6, e.w, e.h - 12);
            ctx.fillRect(-hw - 4, -hh, 10, e.h);
            ctx.fillRect(hw - 6, -hh, 10, e.h);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0b2a14';
            ctx.fillRect(-4, 0, 8, hh + 4);
            this.hpBar(e, -hh - 8);
            break;
          case 'boss':
            this.poly([[0, hh], [-hw, 0], [-hw * 0.6, -hh], [hw * 0.6, -hh], [hw, 0]]);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = e.enraged ? '#ffd84d' : '#2a0b16';
            ctx.beginPath();
            ctx.arc(0, -4, 16, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#2a0b16';
            ctx.fillRect(-hw * 0.5, hh - 20, 12, 22);
            ctx.fillRect(hw * 0.5 - 12, hh - 20, 12, 22);
            break;
          default:
            break;
        }
        ctx.restore();
      }
    }

    hpBar(e, y) {
      const ctx = this.ctx;
      const frac = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = '#1a1f33';
      ctx.fillRect(-e.w / 2, y, e.w, 4);
      ctx.fillStyle = '#5dff8a';
      ctx.fillRect(-e.w / 2, y, e.w * frac, 4);
    }

    drawBullets() {
      const ctx = this.ctx;
      const w = this.world;
      ctx.save();
      ctx.shadowColor = '#4df3ff';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#c9fbff';
      for (const b of w.bullets) {
        if (b.alive) ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      }
      ctx.shadowColor = '#ff5d73';
      ctx.fillStyle = '#ffb3c0';
      for (const b of w.enemyBullets) {
        if (!b.alive) continue;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawPowerups(now) {
      const ctx = this.ctx;
      for (const u of this.world.powerups) {
        if (!u.alive) continue;
        const cfg = C.POWERUPS.kinds[u.kind];
        const bob = Math.sin(now / 150 + u.id) * 2;
        ctx.save();
        ctx.translate(u.x, u.y + bob);
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(8,10,24,0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        this.text(cfg.glyph, u.x, u.y + bob + 1, { size: 14, bold: true, color: cfg.color, align: 'center' });
      }
    }

    drawFx() {
      const ctx = this.ctx;
      const fx = this.world.fx;
      for (const q of fx.particles) {
        ctx.globalAlpha = Math.max(0, q.life / q.max);
        ctx.fillStyle = q.color;
        ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
      ctx.globalAlpha = 1;
      for (const r of fx.rings) {
        ctx.globalAlpha = Math.max(0, r.life / r.max);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const t of fx.texts) {
        this.text(t.text, t.x, t.y, { size: 13, bold: true, color: t.color, align: 'center', alpha: Math.max(0, t.life / t.max) });
      }
    }

    drawVignette(now) {
      const ctx = this.ctx;
      const pulse = 0.25 + 0.15 * Math.sin(now / 160);
      const g = ctx.createRadialGradient(C.W / 2, C.H / 2, C.H * 0.35, C.W / 2, C.H / 2, C.H * 0.75);
      g.addColorStop(0, 'rgba(255,0,40,0)');
      g.addColorStop(1, 'rgba(255,0,40,' + pulse + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, C.W, C.H);
    }

    // ------------------------------------------------------------------ HUD
    drawHud() {
      const ctx = this.ctx;
      const w = this.world;
      const p = w.player;

      this.text('SCORE', 14, 16, { size: 11, color: '#7a86a8' });
      this.text(String(w.score).padStart(6, '0'), 14, 34, { size: 20, bold: true, color: '#ffffff' });
      this.text('HI ' + String(w.highScore).padStart(6, '0'), C.W - 14, 16, { size: 11, color: '#7a86a8', align: 'right' });
      this.text('WAVE ' + Math.max(1, w.wave.number) + '/' + C.WAVES.length, C.W / 2, 16, { size: 13, bold: true, color: '#4df3ff', align: 'center' });

      // health bar
      const bw = 150;
      const frac = Math.max(0, p.health / p.maxHealth);
      ctx.fillStyle = '#141a30';
      ctx.fillRect(14, 50, bw, 8);
      ctx.fillStyle = frac > 0.3 ? '#5dff8a' : '#ff5d73';
      ctx.fillRect(14, 50, bw * frac, 8);
      ctx.strokeStyle = '#2a3560';
      ctx.strokeRect(14.5, 50.5, bw, 8);

      // lives
      for (let i = 0; i < p.lives; i++) {
        ctx.fillStyle = '#4df3ff';
        this.poly([[C.W - 22 - i * 22, 46], [C.W - 14 - i * 22, 62], [C.W - 30 - i * 22, 62]]);
        ctx.fill();
      }

      // combo
      if (w.combo >= 2) {
        const t = Math.max(0, w.comboTimer / C.SCORE.comboWindow);
        this.text('COMBO x' + w.combo + '   (' + w.multiplier + 'x score)', C.W / 2, 40, { size: 13, bold: true, color: '#ffd84d', align: 'center' });
        ctx.fillStyle = '#ffd84d';
        ctx.fillRect(C.W / 2 - 60, 52, 120 * t, 3);
      }

      // active buffs
      let x = 14;
      for (const kind of ['rapid', 'spread', 'shield']) {
        const left = p.buffs[kind];
        if (left <= 0) continue;
        const cfg = C.POWERUPS.kinds[kind];
        this.text(cfg.glyph + ' ' + left.toFixed(1) + 's', x, C.H - 18, { size: 13, bold: true, color: cfg.color });
        x += 84;
      }

      // boss health bar
      const boss = w.enemies.find((e) => e.type === 'boss' && e.alive);
      if (boss) {
        const bwid = C.W - 120;
        ctx.fillStyle = '#141a30';
        ctx.fillRect(60, 72, bwid, 8);
        ctx.fillStyle = boss.enraged ? '#ffd84d' : '#ff3d81';
        ctx.fillRect(60, 72, bwid * Math.max(0, boss.hp / boss.maxHp), 8);
        this.text('EVENT HORIZON', C.W / 2, 90, { size: 10, color: '#ff3d81', align: 'center' });
      }

      if (w.muted) this.text('MUTED', C.W - 14, C.H - 18, { size: 11, color: '#7a86a8', align: 'right' });
    }

    drawToasts() {
      const toasts = this.world.ui.toasts;
      toasts.forEach((t, i) => {
        this.text(t.text, C.W - 14, 112 + i * 20, { size: 12, bold: true, color: t.color, align: 'right', alpha: Math.min(1, t.life) });
      });
    }

    drawBanner() {
      const b = this.world.ui.banner;
      if (!b) return;
      const a = Math.min(1, b.life / 0.5, (b.max - b.life) / 0.2 + 0.2);
      this.text(b.title, C.W / 2, C.H * 0.36, { size: 34, bold: true, color: b.color, align: 'center', alpha: a });
      if (b.sub) this.text(b.sub, C.W / 2, C.H * 0.36 + 32, { size: 14, color: '#d7def5', align: 'center', alpha: a });
    }

    // ------------------------------------------------------------------ overlays
    drawOverlay(now) {
      const w = this.world;
      const ctx = this.ctx;
      const cx = C.W / 2;
      const blink = Math.floor(now / 500) % 2 === 0;

      if (w.state === 'title') {
        ctx.fillStyle = 'rgba(3,4,12,0.55)';
        ctx.fillRect(0, 0, C.W, C.H);
        this.text('EVENT HORIZON', cx, 190, { size: 40, bold: true, color: '#4df3ff', align: 'center' });
        this.text('an event-driven space shooter', cx, 226, { size: 14, color: '#7a86a8', align: 'center' });
        const lines = [
          ['MOVE', 'WASD / ARROWS'],
          ['FIRE', 'SPACE (hold)'],
          ['PAUSE', 'P / ESC'],
          ['MUTE', 'M'],
        ];
        lines.forEach((l, i) => {
          this.text(l[0], cx - 20, 300 + i * 26, { size: 15, bold: true, color: '#ffd84d', align: 'right' });
          this.text(l[1], cx + 4, 300 + i * 26, { size: 15, color: '#d7def5' });
        });
        this.text('Survive 5 waves. Defeat the boss.', cx, 440, { size: 13, color: '#d7def5', align: 'center' });
        this.text('Every action is an event - watch the bus on the right.', cx, 462, { size: 12, color: '#7a86a8', align: 'center' });
        if (blink) this.text('PRESS ENTER TO START', cx, 540, { size: 20, bold: true, color: '#ffffff', align: 'center' });
        if (w.highScore > 0) this.text('HIGH SCORE ' + w.highScore, cx, 600, { size: 13, color: '#ffd84d', align: 'center' });
      } else if (w.state === 'paused') {
        ctx.fillStyle = 'rgba(3,4,12,0.6)';
        ctx.fillRect(0, 0, C.W, C.H);
        this.text('PAUSED', cx, C.H / 2 - 10, { size: 36, bold: true, color: '#ffffff', align: 'center' });
        this.text('P / ESC to resume', cx, C.H / 2 + 28, { size: 14, color: '#7a86a8', align: 'center' });
      } else if (w.state === 'gameover' || w.state === 'won') {
        const won = w.state === 'won';
        ctx.fillStyle = 'rgba(3,4,12,0.62)';
        ctx.fillRect(0, 0, C.W, C.H);
        this.text(won ? 'VICTORY' : 'GAME OVER', cx, 230, { size: 44, bold: true, color: won ? '#5dff8a' : '#ff5d73', align: 'center' });
        if (won) this.text('The Event Horizon is destroyed.', cx, 272, { size: 14, color: '#d7def5', align: 'center' });
        this.text('SCORE  ' + w.score, cx, 330, { size: 22, bold: true, color: '#ffffff', align: 'center' });
        this.text('HIGH SCORE  ' + w.highScore, cx, 362, { size: 15, color: '#ffd84d', align: 'center' });
        this.text('Reached wave ' + Math.max(1, w.wave.number), cx, 392, { size: 14, color: '#7a86a8', align: 'center' });
        if (blink) this.text('PRESS ENTER TO PLAY AGAIN', cx, 470, { size: 18, bold: true, color: '#ffffff', align: 'center' });
      }
    }
  }

  EDP.Renderer = Renderer;
})(globalThis);
