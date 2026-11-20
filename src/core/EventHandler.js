/**
 * Base class for every Event Handler (consumer).
 *
 * A handler:
 *   - subscribes to event TYPES with this.on(type, method)
 *   - owns a slice of the game state and is the only code allowed to mutate it
 *   - may publish follow-up events with this.emit(type, payload)
 * It never imports or calls another handler or producer.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});

  class EventHandler {
    constructor(name, bus, world) {
      this.name = name;
      this.bus = bus;
      this.world = world;
    }

    on(type, method) {
      this.bus.subscribe(type, method.bind(this), this.name);
    }

    emit(type, payload) {
      return this.bus.publish(type, payload, this.name);
    }
  }

  EDP.EventHandler = EventHandler;
})(globalThis);
