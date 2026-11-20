/**
 * Generates events.md from the live code:
 *   - producer, trigger and example payload come from the registry (src/core/events.js)
 *   - consumers come from the REAL subscriptions the handlers register on the bus
 * so the catalog can never drift from the implementation (tests/run.js checks it is up to date).
 *
 *   npm run docs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./load-game');

function generate() {
  const EDP = loadGame();
  const game = new EDP.Game();
  const subs = game.bus.listSubscriptions();
  const schemas = EDP.EventSchemas;
  const names = Object.keys(schemas);

  const producers = [...new Set(names.map((n) => schemas[n].producer).filter((p) => !/Handler$/.test(p)))];
  const handlerNames = game.handlers.map((h) => h.name);
  const isProducer = (p) => producers.includes(p);
  const code = (list) => (list.length ? list.map((x) => '`' + x + '`').join(', ') : '_none_');

  const out = [];
  out.push('# Event Catalog');
  out.push('');
  out.push('> Generated from the code by `npm run docs` (`tools/generate-events-md.js`): producers, triggers and example');
  out.push('> payloads come from the registry in `src/core/events.js`; consumers are the subscriptions the handlers actually');
  out.push('> register on the bus. `npm test` fails if this file is out of date. Do not edit it by hand.');
  out.push('');
  out.push('There are **' + names.length + ' events**, produced by **' + producers.length + ' event producers** and **' +
    handlerNames.length + ' event handlers**.');
  out.push('');
  out.push('## Event envelope');
  out.push('');
  out.push('Every event on the queue has the same structure. The tables below document the `payload` of each event type.');
  out.push('');
  out.push('```json');
  out.push(JSON.stringify({
    id: 231,
    event_type: 'ENEMY_DESTROYED',
    timestamp: 18342.7,
    source: 'CombatHandler',
    payload: schemas.ENEMY_DESTROYED.example,
  }, null, 2));
  out.push('```');
  out.push('');
  out.push('| Field | Meaning |');
  out.push('|---|---|');
  out.push('| `id` | Monotonic sequence number, assigned when the event is published |');
  out.push('| `event_type` | One of the names in this catalog |');
  out.push('| `timestamp` | Milliseconds (`performance.now()`) at publish time |');
  out.push('| `source` | Name of the component that published it (must match the registry) |');
  out.push('| `payload` | Plain JSON data; deep-frozen, so consumers cannot mutate what other consumers see |');
  out.push('');
  out.push('## Components');
  out.push('');
  out.push('**Event producers** (publish only, never subscribe): ' + code(producers) + '.');
  out.push('');
  out.push('**Event handlers** (subscribe; may publish follow-up events): ' + code(handlerNames) + '.');
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push('| Event | Producer | Consumer(s) |');
  out.push('|---|---|---|');
  EDP.EventCategories.forEach((cat) => {
    names.filter((n) => schemas[n].category === cat).forEach((n) => {
      const s = schemas[n];
      const consumers = subs[n].length > 4 ? subs[n].length + ' handlers (see below)' : code(subs[n]);
      out.push('| [`' + n + '`](#' + n.toLowerCase() + ') | `' + s.producer + '` | ' + consumers + ' |');
    });
  });
  out.push('');
  out.push('## Details by category');

  EDP.EventCategories.forEach((cat) => {
    out.push('');
    out.push('### ' + cat);
    names.filter((n) => schemas[n].category === cat).forEach((n) => {
      const s = schemas[n];
      out.push('');
      out.push('#### `' + n + '`');
      out.push('');
      out.push('| | |');
      out.push('|---|---|');
      out.push('| **Producer** | `' + s.producer + '` (' + (isProducer(s.producer) ? 'event producer' : 'event handler') + ') |');
      out.push('| **Consumer(s)** | ' + code(subs[n]) + ' |');
      out.push('| **Trigger** | ' + s.trigger + (s.noisy ? ' _(high-frequency; hidden from the debug log unless enabled)_' : '') + ' |');
      out.push('');
      out.push('```json');
      out.push(JSON.stringify(s.example, null, 2));
      out.push('```');
    });
  });
  out.push('');
  return out.join('\n');
}

module.exports = { generate };

if (require.main === module) {
  const file = path.join(ROOT, 'events.md');
  fs.writeFileSync(file, generate());
  console.log('Wrote ' + file);
}
