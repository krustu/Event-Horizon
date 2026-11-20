/**
 * Browser entry point. Creates the Game (composition root), attaches the browser-only pieces
 * (keyboard producer, canvas renderer, debug panel) and runs the animation loop.
 *
 * URL flags:  ?log=1     print every event to the console
 *             ?noisy=1   also show FRAME_TICK in the log
 *             ?strict=1  throw on any event-schema violation
 */
(function (root) {
  'use strict';
  const EDP = root.EDP;
  const params = new URLSearchParams(root.location.search);

  const game = new EDP.Game({
    strict: params.has('strict'),
    console: params.has('log'),
    showNoisy: params.has('noisy'),
  });

  new EDP.InputProducer(game.bus, root);
  const renderer = new EDP.Renderer(document.getElementById('game'), game.world);
  const panel = new EDP.DebugPanel(document.getElementById('debug-panel'), game);

  // Browsers only start audio after a user gesture.
  ['keydown', 'pointerdown'].forEach((type) => root.addEventListener(type, () => game.audio.unlock()));

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.step(dt);
    renderer.render(now);
    panel.update(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Handy for live demos from the DevTools console, e.g.
  //   EDP_GAME.bus.publish('INPUT_PAUSE_PRESSED', {}, 'InputProducer')
  root.EDP_GAME = game;
})(window);
