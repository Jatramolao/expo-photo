import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESCENAS, ESCENA_DEFECTO } from '../js/escenas.js';
import { delta } from '../js/motor.js';
import { APERTURAS_STOP, TIEMPOS_STOP, ISOS_STOP } from '../js/escalas.js';

test('REGRESIÓN: el preset de cada escena da exposición correcta', () => {
  // Este es el bug de la v2: "paisaje con mucha luz" marcaba subexpuesto y
  // "fotografía nocturna" marcaba sobreexpuesto en la propia calculadora.
  for (const [clave, e] of Object.entries(ESCENAS)) {
    const d = delta(e.ev, e.preset.apertura, e.preset.tiempo, e.preset.iso);
    assert.ok(Math.abs(d) <= 0.5,
      `la escena "${clave}" da delta ${d.toFixed(3)}, fuera del rango correcto`);
  }
});

test('los presets usan valores de paso completo, para funcionar en modo simple', () => {
  for (const [clave, e] of Object.entries(ESCENAS)) {
    assert.ok(APERTURAS_STOP.includes(e.preset.apertura),
      `la apertura de "${clave}" no está en la serie de paso completo`);
    assert.ok(TIEMPOS_STOP.some(t => Math.abs(t - e.preset.tiempo) < 1e-9),
      `el tiempo de "${clave}" no está en la serie de paso completo`);
    assert.ok(ISOS_STOP.includes(e.preset.iso),
      `el ISO de "${clave}" no está en la serie de paso completo`);
  }
});

test('cada escena declara todos sus campos', () => {
  for (const [clave, e] of Object.entries(ESCENAS)) {
    for (const campo of ['nombreSimple', 'nombrePro', 'ev', 'preset', 'tiempoSeguro', 'sujeto']) {
      assert.ok(e[campo] !== undefined, `la escena "${clave}" no declara ${campo}`);
    }
    assert.ok(typeof e.ev === 'number', `el EV de "${clave}" debe ser número`);
  }
});

test('la escena por defecto existe', () => {
  assert.ok(ESCENAS[ESCENA_DEFECTO], `${ESCENA_DEFECTO} no está en ESCENAS`);
});

test('los EV van de más luz a menos luz en el orden declarado', () => {
  const evs = Object.values(ESCENAS).map(e => e.ev);
  for (let i = 1; i < evs.length; i++) {
    assert.ok(evs[i] < evs[i - 1],
      `el orden de las escenas no es descendente por luz: ${evs}`);
  }
});
