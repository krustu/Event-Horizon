/**
 * EVENT QUEUE / BUS — the heart of the architecture.
 *
 *  - Producers call publish() (via a bound publisher). The event is validated against the
 *    registry, cloned (JSON), deep-frozen and appended to a FIFO queue. Nothing is delivered yet.
 *  - process() drains the queue in order. Each event is routed to every subscriber of its type.
 *    Events published while handlers run are appended to the same queue and processed in the
 *    same cycle (breadth-first, deterministic).
 *  - Taps (observers) are told, after each dispatch, which handlers received the event. The
 *    EventLogger / debug panel use this; no game code does.
 *
 * Neither producers nor handlers know about each other — only about event types.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  const defaultClock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function roundNumbers(key, value) {
    return typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 1000) / 1000 : value;
  }

  function deepFreeze(obj) {
    if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      Object.keys(obj).forEach((k) => deepFreeze(obj[k]));
    }
    return obj;
  }

  class EventBus {
    /**
     * @param {object} [options]
     * @param {boolean} [options.strict]   throw on schema violations instead of warning (tests use this)
     * @param {number}  [options.maxPerCycle] safety valve against runaway event loops
     * @param {function} [options.clock]   returns a timestamp in ms
     */
    constructor(options) {
      const o = options || {};
      this.strict = !!o.strict;
      this.maxPerCycle = o.maxPerCycle || 2000;
      this.clock = o.clock || defaultClock;
      this.schemas = o.schemas || EDP.EventSchemas;
      this.subscribers = new Map();
      this.taps = [];
      this.queue = [];
      this.head = 0;
      this.seq = 0;
      this.warned = new Set();
      this.stats = {
        published: 0,
        processed: 0,
        errors: 0,
        peakDepth: 0,
        lastCycle: { processed: 0, peakDepth: 0 },
      };
    }

    get pending() {
      return this.queue.length - this.head;
    }

    _violation(key, message) {
      if (this.strict) throw new Error('[EventBus] ' + message);
      if (!this.warned.has(key)) {
        this.warned.add(key);
        console.warn('[EventBus] ' + message);
      }
    }

    /** Register a handler for one event type. Returns an unsubscribe function. */
    subscribe(type, fn, name) {
      if (!this.schemas[type]) {
        this._violation('sub:' + type, 'Cannot subscribe to unknown event type "' + type + '"');
        return function () {};
      }
      const sub = { name: name || 'anonymous', fn };
      if (!this.subscribers.has(type)) this.subscribers.set(type, []);
      this.subscribers.get(type).push(sub);
      return () => {
        const list = this.subscribers.get(type);
        const i = list.indexOf(sub);
        if (i >= 0) list.splice(i, 1);
      };
    }

    /** Returns publish(type, payload) bound to a component name — producers never see the bus internals. */
    createPublisher(source) {
      return (type, payload) => this.publish(type, payload, source);
    }

    /**
     * Enqueue an event. Envelope: { id, event_type, timestamp, source, payload }.
     * Returns the envelope, or null if the event type is unknown.
     */
    publish(type, payload, source) {
      const src = source || 'unknown';
      const schema = this.schemas[type];
      if (!schema) {
        this._violation('type:' + type, 'Unknown event type "' + type + '" published by ' + src);
        return null;
      }
      if (schema.producer !== src) {
        this._violation(
          'src:' + type + ':' + src,
          type + ' may only be produced by ' + schema.producer + ' (got ' + src + ')'
        );
      }
      // JSON round-trip: payloads are plain data, and producers cannot share mutable objects with handlers.
      // Fractions are rounded to 3 decimals so the logged payloads stay readable.
      const data = deepFreeze(JSON.parse(JSON.stringify(payload === undefined ? {} : payload, roundNumbers)));
      for (const key of schema.required) {
        if (data[key] === undefined) {
          this._violation('key:' + type + ':' + key, type + ' payload is missing required key "' + key + '"');
        }
      }
      const event = Object.freeze({
        id: ++this.seq,
        event_type: type,
        timestamp: this.clock(),
        source: src,
        payload: data,
      });
      this.queue.push(event);
      this.stats.published++;
      if (this.pending > this.stats.peakDepth) this.stats.peakDepth = this.pending;
      return event;
    }

    /** Observe every dispatch: fn(event, handlerNames, durationMs). */
    tap(fn) {
      this.taps.push(fn);
    }

    /** Drain the queue (FIFO). Returns the number of events processed. */
    process() {
      let processed = 0;
      let peak = this.pending;
      while (this.head < this.queue.length) {
        if (processed >= this.maxPerCycle) {
          console.warn('[EventBus] maxPerCycle reached (' + this.maxPerCycle + '); deferring ' + this.pending + ' events');
          break;
        }
        const event = this.queue[this.head++];
        processed++;
        this._dispatch(event);
        if (this.pending > peak) peak = this.pending;
      }
      if (this.head >= this.queue.length) {
        this.queue.length = 0;
        this.head = 0;
      } else if (this.head > 1024) {
        this.queue = this.queue.slice(this.head);
        this.head = 0;
      }
      if (processed > 0) this.stats.lastCycle = { processed, peakDepth: peak };
      return processed;
    }

    _dispatch(event) {
      const list = this.subscribers.get(event.event_type) || [];
      const t0 = this.clock();
      const names = [];
      for (let i = 0; i < list.length; i++) {
        const sub = list[i];
        names.push(sub.name);
        try {
          sub.fn(event.payload, event);
        } catch (err) {
          this.stats.errors++;
          console.error('[EventBus] ' + sub.name + ' failed on ' + event.event_type + ':', err);
          if (this.strict) throw err;
        }
      }
      this.stats.processed++;
      const dt = this.clock() - t0;
      for (let i = 0; i < this.taps.length; i++) this.taps[i](event, names, dt);
    }

    /** { EVENT_TYPE: [handlerName, ...] } for every registered event type (registry order). */
    listSubscriptions() {
      const out = {};
      Object.keys(this.schemas).forEach((type) => {
        out[type] = (this.subscribers.get(type) || []).map((s) => s.name);
      });
      return out;
    }
  }

  EDP.EventBus = EventBus;
})(globalThis);
