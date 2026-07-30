import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aHash, deHash } from '../js/enlace.js';

const VALIDAS = ['sol-pleno', 'nublado', 'calle-noche'];

test('ida y vuelta conserva el estado', () => {
  const estado = { escena: 'calle-noche', apertura: 2, tiempo: 1 / 60, iso: 3200, modo: 'pro' };
  const leido = deHash(aHash(estado), { escenasValidas: VALIDAS });
  assert.equal(leido.escena, estado.escena);
  assert.equal(leido.apertura, estado.apertura);
  assert.equal(leido.iso, estado.iso);
  assert.equal(leido.modo, estado.modo);
  assert.ok(Math.abs(leido.tiempo - estado.tiempo) < 1e-4);
});

test('un hash vacío o ausente no rompe nada', () => {
  for (const h of ['', '#', null, undefined]) {
    assert.equal(deHash(h, { escenasValidas: VALIDAS }), null);
  }
});

test('una escena desconocida se descarta entera', () => {
  // Si no sabemos de qué escena hablamos, el resto de valores no significa
  // nada: no hay EV contra el que medirlos.
  const r = deHash('#escena=inventada&f=2&iso=100', { escenasValidas: VALIDAS });
  assert.equal(r, null);
});

test('un hash parcial aplica lo que entiende y omite lo demás', () => {
  const r = deHash('#escena=nublado&f=5.6', { escenasValidas: VALIDAS });
  assert.equal(r.escena, 'nublado');
  assert.equal(r.apertura, 5.6);
  assert.equal(r.tiempo, undefined, 'lo que falta se deja al preset');
  assert.equal(r.iso, undefined);
});

test('valores fuera de rango o corruptos se ignoran sin reventar', () => {
  const r = deHash('#escena=nublado&f=abc&t=-5&iso=99999999&modo=raro',
    { escenasValidas: VALIDAS });
  assert.equal(r.escena, 'nublado');
  assert.equal(r.apertura, undefined, 'f=abc no es número');
  assert.equal(r.tiempo, undefined, 't negativo está fuera de rango');
  assert.equal(r.iso, undefined, 'iso fuera de rango');
  assert.equal(r.modo, undefined, 'modo desconocido');
});

test('un hash truncado al copiar no impide cargar', () => {
  const r = deHash('#escena=nublado&f=2.8&t=0.00', { escenasValidas: VALIDAS });
  assert.ok(r, 'debe devolver algo utilizable, no null');
  assert.equal(r.escena, 'nublado');
});
