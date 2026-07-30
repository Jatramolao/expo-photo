import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APERTURAS_STOP, TIEMPOS_STOP, ISOS_STOP,
  formatearApertura, formatearTiempo, formatearIso, series
} from '../js/escalas.js';

test('las aperturas de paso completo avanzan un stop cada una', () => {
  for (let i = 1; i < APERTURAS_STOP.length; i++) {
    // Un stop de apertura equivale a multiplicar el número f por raíz de 2.
    const razon = APERTURAS_STOP[i] / APERTURAS_STOP[i - 1];
    const stops = Math.log2(razon * razon);
    assert.ok(Math.abs(stops - 1) < 0.12,
      `${APERTURAS_STOP[i-1]} -> ${APERTURAS_STOP[i]} son ${stops.toFixed(2)} stops`);
  }
});

test('los tiempos de paso completo se duplican', () => {
  for (let i = 1; i < TIEMPOS_STOP.length; i++) {
    const stops = Math.log2(TIEMPOS_STOP[i] / TIEMPOS_STOP[i - 1]);
    assert.ok(Math.abs(stops - 1) < 0.12,
      `${TIEMPOS_STOP[i-1]} -> ${TIEMPOS_STOP[i]} son ${stops.toFixed(2)} stops`);
  }
});

test('los ISO de paso completo se duplican exactamente', () => {
  for (let i = 1; i < ISOS_STOP.length; i++) {
    assert.equal(ISOS_STOP[i], ISOS_STOP[i - 1] * 2);
  }
});

test('el formateo de tiempo distingue fracciones de segundos enteros', () => {
  assert.equal(formatearTiempo(1 / 125), '1/125');
  assert.equal(formatearTiempo(1 / 2),   '1/2');
  assert.equal(formatearTiempo(0.3),     '0.3s');
  assert.equal(formatearTiempo(1),       '1s');
  assert.equal(formatearTiempo(30),      '30s');
});

test('el formateo de apertura e ISO', () => {
  assert.equal(formatearApertura(5.6), 'f/5.6');
  assert.equal(formatearApertura(8),   'f/8');
  assert.equal(formatearIso(400),      'ISO 400');
});

test('el modo pro ofrece más pasos que el simple', () => {
  const simple = series('simple');
  const pro    = series('pro');
  assert.ok(pro.aperturas.length > simple.aperturas.length);
  assert.ok(pro.tiempos.length   > simple.tiempos.length);
  assert.ok(pro.isos.length      > simple.isos.length);
});

test('los extremos de cada serie coinciden entre simple y pro', () => {
  const simple = series('simple');
  const pro    = series('pro');
  for (const clave of ['aperturas', 'tiempos', 'isos']) {
    assert.equal(pro[clave][0], simple[clave][0], `primer valor de ${clave}`);
    assert.equal(pro[clave].at(-1), simple[clave].at(-1), `último valor de ${clave}`);
  }
});

test('el formateo aguanta el error de coma flotante del estado visual', () => {
  // El valor pintado viaja a la escala de stops y vuelve; ese viaje
  // convierte 5.6 en 5.599999999999999. No debe llegar así a la pantalla.
  assert.equal(formatearApertura(5.599999999999999), 'f/5.6');
  assert.equal(formatearApertura(7.999999999999998), 'f/8');
  assert.equal(formatearIso(799.9999999999999), 'ISO 800');
  assert.equal(formatearTiempo(2.0000000000000004), '2s');
});

test('los valores intermedios de una transición se muestran con un decimal', () => {
  assert.equal(formatearApertura(3.7123), 'f/3.7');
  assert.equal(formatearIso(1234.5), 'ISO 1235');
});
