/**
 * DebugPanel — live view of the Event Bus for demos. Pure observer: it reads the EventLogger's
 * ring buffer and the bus statistics and renders them into a DOM container. It never publishes
 * events and no game code depends on it.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  const MAX_ROWS = 40;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  class DebugPanel {
    /** @param {HTMLElement} container  @param {Game} game */
    constructor(container, game) {
      this.el = container;
      this.game = game;
      this.logger = game.logger;
      this.bus = game.bus;
      this.lastVersion = -1;
      this.lastDraw = 0;

      container.innerHTML =
        '<h2>EVENT BUS <small>live queue &amp; dispatch log</small></h2>' +
        '<div class="stats" data-ref="stats"></div>' +
        '<div class="buttons">' +
        '<button data-act="freeze">Freeze log</button>' +
        '<button data-act="noisy">Show FRAME_TICK</button>' +
        '<button data-act="console">Console log</button>' +
        '<button data-act="clear">Clear</button>' +
        '</div>' +
        '<div class="legend"><span class="chip prod"></span> producer ' +
        '<span class="chip hand"></span> handler &nbsp; <i>producer ▶ EVENT ▶ handlers that received it</i></div>' +
        '<div class="log" data-ref="log"></div>' +
        '<details><summary>Subscriptions &mdash; who listens to what</summary><div class="subs" data-ref="subs"></div></details>';

      this.statsEl = container.querySelector('[data-ref="stats"]');
      this.logEl = container.querySelector('[data-ref="log"]');
      container.querySelector('[data-ref="subs"]').innerHTML = this.renderSubscriptions();

      this.buttons = {};
      container.querySelectorAll('button[data-act]').forEach((b) => (this.buttons[b.dataset.act] = b));
      this.syncButtons();

      // Keep keyboard focus on the game: clicking panel controls must not steal Space / Enter.
      container.addEventListener('mousedown', (e) => {
        if (e.target.closest && e.target.closest('button,summary')) e.preventDefault();
      });
      container.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('button[data-act]');
        if (!btn) return;
        this.act(btn.dataset.act);
        btn.blur();
      });
    }

    act(name) {
      const l = this.logger;
      if (name === 'freeze') l.paused = !l.paused;
      else if (name === 'noisy') l.showNoisy = !l.showNoisy;
      else if (name === 'console') l.console = !l.console;
      else if (name === 'clear') l.clear();
      this.syncButtons();
      this.lastVersion = -1;
    }

    syncButtons() {
      this.buttons.freeze.classList.toggle('on', this.logger.paused);
      this.buttons.noisy.classList.toggle('on', this.logger.showNoisy);
      this.buttons.console.classList.toggle('on', this.logger.console);
    }

    isHandler(name) {
      return /Handler$/.test(name);
    }

    renderSubscriptions() {
      const subs = this.bus.listSubscriptions();
      const rows = Object.keys(subs).map((type) => {
        const schema = this.bus.schemas[type];
        const handlers = subs[type].map((h) => '<span class="hand">' + esc(h) + '</span>').join(', ');
        return (
          '<div class="sub"><b>' + esc(type) + '</b><br><span class="prod">' + esc(schema.producer) +
          '</span> ▶ ' + (handlers || '<i>no subscribers</i>') + '</div>'
        );
      });
      return rows.join('');
    }

    update(now) {
      if (now - this.lastDraw < 100) return;
      this.lastDraw = now;

      const s = this.bus.stats;
      const l = this.logger;
      this.statsEl.textContent =
        'processed ' + s.processed + '  |  ' + l.eventsPerSecond() + ' ev/s  |  last cycle: ' +
        s.lastCycle.processed + ' events, peak queue ' + s.lastCycle.peakDepth + '  |  state: ' + this.game.world.state;

      if (l.version === this.lastVersion) return;
      this.lastVersion = l.version;

      const entries = l.entries.slice(-MAX_ROWS).reverse();
      this.logEl.innerHTML = entries
        .map((e) => {
          const srcClass = this.isHandler(e.source) ? 'hand' : 'prod';
          const to = e.handlers.length ? e.handlers.map(esc).join(', ') : 'no subscribers';
          const payload = JSON.stringify(e.payload);
          return (
            '<div class="row"><span class="t">' + (e.timestamp / 1000).toFixed(2) + 's #' + e.id + '</span> ' +
            '<span class="' + srcClass + '">' + esc(e.source) + '</span> ▶ <b class="ev">' + esc(e.type) + '</b>' +
            '<div class="to">⤷ ' + to + ' <code>' + esc(payload) + '</code></div></div>'
          );
        })
        .join('');
    }
  }

  EDP.DebugPanel = DebugPanel;
})(globalThis);
