import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evAjustes, delta, veredicto,
  desenfoqueFondo, desenfoqueMovimiento, ruido, brillo, contraste,
  avisos
} from '../js/motor.js';

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
  // La tolerancia es de 0.05 y no menor porque la serie f está redondeada por
  // convención: el valor exacto de "f/5.6" es 5.657, así que el salto real a
  // f/8 es de 1.029 stops. La imprecisión está en la serie, no en el motor.
  assert.ok(Math.abs((cerrado - abierto) + 1) < 0.05,
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

test('abrir el diafragma aumenta el desenfoque de fondo', () => {
  const abierto = desenfoqueFondo(1.4, 50, 2);
  const medio   = desenfoqueFondo(5.6, 50, 2);
  const cerrado = desenfoqueFondo(22, 50, 2);
  assert.ok(abierto > medio, 'f/1.4 debe desenfocar más que f/5.6');
  assert.ok(medio > cerrado, 'f/5.6 debe desenfocar más que f/22');
  assert.ok(abierto > 15, `f/1.4 debe dar un desenfoque marcado, dio ${abierto}`);
  assert.equal(cerrado, 0, `f/22 debe dar cero desenfoque, dio ${cerrado}`);
});

test('un teleobjetivo desenfoca más que un gran angular a la misma apertura', () => {
  assert.ok(desenfoqueFondo(2.8, 85, 2) > desenfoqueFondo(2.8, 35, 2));
});

test('acercarse al sujeto aumenta el desenfoque de fondo', () => {
  assert.ok(desenfoqueFondo(2.8, 50, 1) > desenfoqueFondo(2.8, 50, 4));
});

test('no hay arrastre si el tiempo congela al sujeto', () => {
  assert.equal(desenfoqueMovimiento(1 / 250, 1 / 125), 0);
  assert.equal(desenfoqueMovimiento(1 / 125, 1 / 125), 0);
});

test('el arrastre crece al bajar la velocidad', () => {
  const poco  = desenfoqueMovimiento(1 / 60, 1 / 125);
  const mucho = desenfoqueMovimiento(1 / 15, 1 / 125);
  assert.ok(poco > 0);
  assert.ok(mucho > poco);
});

test('el ruido va de cero en ISO 100 a máximo en ISO 25600', () => {
  assert.equal(ruido(100), 0);
  assert.ok(ruido(1600) > 0.2 && ruido(1600) < 0.4);
  assert.ok(Math.abs(ruido(25600) - 0.6) < 0.01);
});

test('el brillo es neutro con exposición correcta y sube al sobreexponer', () => {
  assert.ok(Math.abs(brillo(0) - 1) < 1e-9);
  assert.ok(brillo(2) > 1, 'sobreexponer debe aclarar');
  assert.ok(brillo(-2) < 1, 'subexponer debe oscurecer');
});

test('el contraste cae al alejarse de la exposición correcta', () => {
  assert.ok(Math.abs(contraste(0) - 1) < 1e-9);
  assert.ok(contraste(3) < 1, 'sobreexponer debe aplanar el contraste');
  assert.ok(contraste(-3) < 1, 'subexponer también');
  assert.ok(contraste(10) >= 0.35, 'el contraste nunca baja del piso');
});

test('la regla recíproca avisa de trepidación', () => {
  // A 50 mm, por debajo de 1/50 hay riesgo de foto movida por pulso.
  assert.ok(avisos({ apertura: 4, tiempo: 1/30, iso: 100, focal: 50 })
    .includes('trepidacion'));
  assert.ok(!avisos({ apertura: 4, tiempo: 1/125, iso: 100, focal: 50 })
    .includes('trepidacion'));
});

test('la regla recíproca se ajusta a la focal', () => {
  // A 200 mm, 1/125 ya es lento.
  assert.ok(avisos({ apertura: 4, tiempo: 1/125, iso: 100, focal: 200 })
    .includes('trepidacion'));
});

test('cerrar más allá de f/16 avisa de difracción', () => {
  assert.ok(avisos({ apertura: 16, tiempo: 1/125, iso: 100, focal: 50 })
    .includes('difraccion'));
  assert.ok(!avisos({ apertura: 11, tiempo: 1/125, iso: 100, focal: 50 })
    .includes('difraccion'));
});

test('el ISO muy alto avisa de pérdida de calidad', () => {
  assert.ok(avisos({ apertura: 4, tiempo: 1/125, iso: 12800, focal: 50 })
    .includes('ruido-alto'));
  assert.ok(!avisos({ apertura: 4, tiempo: 1/125, iso: 800, focal: 50 })
    .includes('ruido-alto'));
});

test('una exposición cómoda no dispara ningún aviso', () => {
  assert.deepEqual(avisos({ apertura: 5.6, tiempo: 1/250, iso: 200, focal: 50 }), []);
});
