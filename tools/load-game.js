/**
 * Loads the game's browser scripts into Node (in the same order as index.html, which is the
 * single source of truth) so tests and tools can run the real code headlessly.
 * main.js is skipped: it needs a DOM.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadGame() {
  if (globalThis.EDP && globalThis.EDP.Game) return globalThis.EDP;
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  for (const src of scripts) {
    if (src === 'src/main.js') continue;
    require(path.join(ROOT, src));
  }
  return globalThis.EDP;
}

module.exports = { loadGame, ROOT };
