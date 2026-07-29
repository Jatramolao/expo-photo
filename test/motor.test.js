import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evAjustes } from '../js/motor.js';

test('la regla del soleado f/16 da EV 15', () => {
  // f/16 · 1/125 · ISO 100 es la exposición canónica a pleno sol.
  const ev = evAjustes(16, 1 / 125, 100);
  assert.ok(Math.abs(ev - 15) < 0.05, `esperaba ~15, obtuve ${ev}`);
});
