/**
 * EVENT PRODUCER: keyboard input.
 * Translates raw DOM key events into semantic game events. It does not know what a "move" or
 * a "fire" does — it only reports that the player's intent changed.
 */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;

  const LEFT = ['ArrowLeft', 'KeyA'];
  const RIGHT = ['ArrowRight', 'KeyD'];
  const UP = ['ArrowUp', 'KeyW'];
  const DOWN = ['ArrowDown', 'KeyS'];
  const FIRE = ['Space'];
  const GAME_KEYS = new Set([].concat(LEFT, RIGHT, UP, DOWN, FIRE, ['Enter', 'KeyP', 'Escape', 'KeyM']));

  class InputProducer {
    /** @param {EventBus} bus  @param {EventTarget} target usually `window` */
    constructor(bus, target) {
      this.publish = bus.createPublisher('InputProducer');
      this.keys = new Set();
      this.dx = 0;
      this.dy = 0;
      this.firing = false;
      target.addEventListener('keydown', (e) => this.onKey(e, true));
      target.addEventListener('keyup', (e) => this.onKey(e, false));
      target.addEventListener('blur', () => this.releaseAll());
    }

    anyDown(codes) {
      return codes.some((c) => this.keys.has(c));
    }

    onKey(e, down) {
      const code = e.code;
      if (GAME_KEYS.has(code) && e.preventDefault) e.preventDefault();
      if (down) this.keys.add(code);
      else this.keys.delete(code);
      this.sync();

      if (down && !e.repeat) {
        if (code === 'Enter') this.publish(E.INPUT_START_PRESSED, {});
        else if (code === 'KeyP' || code === 'Escape') this.publish(E.INPUT_PAUSE_PRESSED, {});
        else if (code === 'KeyM') this.publish(E.INPUT_MUTE_PRESSED, {});
      }
    }

    /** Publish only when the derived intent actually changes. */
    sync() {
      const dx = (this.anyDown(RIGHT) ? 1 : 0) - (this.anyDown(LEFT) ? 1 : 0);
      const dy = (this.anyDown(DOWN) ? 1 : 0) - (this.anyDown(UP) ? 1 : 0);
      if (dx !== this.dx || dy !== this.dy) {
        this.dx = dx;
        this.dy = dy;
        this.publish(E.INPUT_MOVE_CHANGED, { dx, dy });
      }
      const firing = this.anyDown(FIRE);
      if (firing !== this.firing) {
        this.firing = firing;
        this.publish(E.INPUT_FIRE_CHANGED, { active: firing });
      }
    }

    releaseAll() {
      this.keys.clear();
      this.sync();
    }
  }

  EDP.InputProducer = InputProducer;
})(globalThis);
