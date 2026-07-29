import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evAjustes, delta, veredicto } from '../js/motor.js';

test('la regla del soleado f/16 da EV 15', () => {
  // f/16 · 1/125 · ISO 100 es la exposición canónica a pleno sol.
  const ev = evAjustes(16, 1 / 125, 100);
  assert.ok(Math.abs(ev - 15) < 0.05, `esperaba ~15, obtuve ${ev}`);
});

test('delta es cero cuando los ajustes coinciden con la luz de la escena', () => {
  // Escena a pleno sol (EV 15) con la exposición canónica.
  const d = delta(15, 16, 1 / 125, 100);
  assert.ok(Math.abs(d) < 0.05, `esperaba ~0, obtuve ${d}`);
});

test('duplicar el ISO desplaza delta exactamente un stop', () => {
  const base  = delta(12, 8, 1 / 250, 100);
  const doble = delta(12, 8, 1 / 250, 200);
  assert.ok(Math.abs((doble - base) - 1) < 1e-9,
    `esperaba una diferencia de 1, obtuve ${doble - base}`);
});

test('cerrar el diafragma un stop subexpone un stop', () => {
  const abierto = delta(12, 5.6, 1 / 250, 100);
  const cerrado = delta(12, 8, 1 / 250, 100);
  // f/8 deja entrar la mitad de luz que f/5.6, así que delta baja en 1.
  assert.ok(Math.abs((cerrado - abierto) + 1) < 0.02,
    `esperaba una diferencia de -1, obtuve ${cerrado - abierto}`);
});

test('los umbrales del veredicto respetan los límites de la spec', () => {
  assert.equal(veredicto(-2.01), 'muy-subexpuesta');
  assert.equal(veredicto(-2),    'subexpuesta');
  assert.equal(veredicto(-0.51), 'subexpuesta');
  assert.equal(veredicto(-0.5),  'correcta');
  assert.equal(veredicto(0),     'correcta');
  assert.equal(veredicto(0.5),   'correcta');
  assert.equal(veredicto(0.51),  'sobreexpuesta');
  assert.equal(veredicto(2),     'sobreexpuesta');
  assert.equal(veredicto(2.01),  'muy-sobreexpuesta');
});
