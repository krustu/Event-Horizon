/**
 * EventLogger — a passive observer of the bus. Keeps a ring buffer of recent events (for the
 * on-screen debug panel) and can print every event to the browser console in real time.
 * It is a bus "tap", not a handler: it never receives events through subscribe().
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  class EventLogger {
    /**
     * @param {EventBus} bus
     * @param {object} [options]
     * @param {boolean} [options.console]   print events to console.log
     * @param {boolean} [options.showNoisy] include high-frequency events (FRAME_TICK)
     * @param {number}  [options.capacity]  ring-buffer size
     */
    constructor(bus, options) {
      const o = options || {};
      this.bus = bus;
      this.capacity = o.capacity || 300;
      this.console = !!o.console;
      this.showNoisy = !!o.showNoisy;
      this.paused = false;
      this.entries = [];
      this.version = 0;
      this.total = 0;
      this.counts = {};
      this.recent = [];
      bus.tap((event, handlers) => this._record(event, handlers));
    }

    _record(event, handlers) {
      this.total++;
      this.counts[event.event_type] = (this.counts[event.event_type] || 0) + 1;

      this.recent.push(event.timestamp);
      while (this.recent.length && event.timestamp - this.recent[0] > 1000) this.recent.shift();

      const schema = this.bus.schemas[event.event_type];
      const noisy = !!(schema && schema.noisy);
      if (this.paused || (noisy && !this.showNoisy)) return;

      const entry = {
        id: event.id,
        type: event.event_type,
        source: event.source,
        timestamp: event.timestamp,
        payload: event.payload,
        handlers: handlers.slice(),
        noisy,
      };
      this.entries.push(entry);
      if (this.entries.length > this.capacity) this.entries.shift();
      this.version++;
      if (this.console) console.log(EventLogger.format(entry));
    }

    /** Events processed during the last second. */
    eventsPerSecond() {
      return this.recent.length;
    }

    clear() {
      this.entries.length = 0;
      this.version++;
    }

    static format(e) {
      const to = e.handlers.length ? e.handlers.join(', ') : '(no subscribers)';
      return (
        '[EDP] #' + e.id + ' t=' + (e.timestamp / 1000).toFixed(3) + 's  ' +
        e.source + ' --> ' + e.type + ' --> ' + to + '  ' + JSON.stringify(e.payload)
      );
    }
  }

  EDP.EventLogger = EventLogger;
})(globalThis);
