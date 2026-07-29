import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evAjustes, delta, veredicto,
  desenfoqueFondo, desenfoqueMovimiento, ruido, brillo, contraste,
  avisos, equivalencias, calcular
} from '../js/motor.js';
import { APERTURAS_STOP, TIEMPOS_STOP, ISOS_STOP } from '../js/escalas.js';
import { ESCENAS } from '../js/escenas.js';

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

test('el contraste es neutro con exposición correcta', () => {
  assert.ok(Math.abs(contraste(0) - 1) < 1e-9);
});

test('subexponer sube el contraste para que las sombras se cierren a negro', () => {
  // contrast() de CSS interpola hacia el gris medio: bajarlo levantaría los
  // negros y la foto se vería gris lechosa en vez de oscura.
  assert.ok(contraste(-1) > 1, 'subexponer un stop ya debe cerrar sombras');
  assert.ok(contraste(-3) > contraste(-1), 'a más subexposición, más cierre');
  assert.ok(contraste(-20) <= 1.3, 'con un techo, para no cartelizar la imagen');
});

test('sobreexponer no toca el contraste: lo hace todo el brillo', () => {
  // brightness() ya levanta las sombras y recorta las luces a blanco. Bajar
  // el contraste además tiraba los blancos recortados de vuelta al gris.
  assert.equal(contraste(1), 1);
  assert.equal(contraste(5), 1);
});

test('la imagen se aclara de forma monótona al sobreexponer', () => {
  // Regresión: con la curva anterior, un tono medio bajaba de 0.90 a 0.80
  // entre +2 y +4 stops, o sea sobreexponer más oscurecía la foto.
  const pixel = (valor, d) => {
    const trasBrillo = Math.min(1, valor * brillo(d));
    return Math.max(0, Math.min(1, (trasBrillo - 0.5) * contraste(d) + 0.5));
  };
  for (const tono of [0.15, 0.5]) {
    for (let d = 0; d < 5; d += 0.5) {
      assert.ok(pixel(tono, d + 0.5) >= pixel(tono, d) - 1e-9,
        `el tono ${tono} se oscurece entre Δ=${d} y Δ=${d + 0.5}`);
    }
  }
});

test('la imagen se oscurece de forma monótona al subexponer', () => {
  const pixel = (valor, d) => {
    const trasBrillo = Math.min(1, valor * brillo(d));
    return Math.max(0, Math.min(1, (trasBrillo - 0.5) * contraste(d) + 0.5));
  };
  for (const tono of [0.15, 0.5, 0.85]) {
    for (let d = 0; d > -5; d -= 0.5) {
      assert.ok(pixel(tono, d - 0.5) <= pixel(tono, d) + 1e-9,
        `el tono ${tono} se aclara entre Δ=${d} y Δ=${d - 0.5}`);
    }
  }
});

test('las sombras llegan a negro real al subexponer', () => {
  const sombra = (d) => {
    const trasBrillo = Math.min(1, 0.15 * brillo(d));
    return Math.max(0, Math.min(1, (trasBrillo - 0.5) * contraste(d) + 0.5));
  };
  assert.equal(sombra(-2), 0, 'a 2 stops de menos, las sombras deben ser negro');
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

const SERIES_SIMPLE = {
  aperturas: APERTURAS_STOP,
  tiempos:   TIEMPOS_STOP,
  isos:      ISOS_STOP
};

test('toda equivalencia devuelta expone correctamente', () => {
  for (const ev of [15, 12, 11, 8, 5, 3]) {
    for (const eq of equivalencias(ev, SERIES_SIMPLE)) {
      const d = delta(ev, eq.apertura, eq.tiempo, eq.iso);
      assert.ok(Math.abs(d) <= 0.5,
        `equivalencia "${eq.clave}" en EV ${ev} da delta ${d.toFixed(2)}`);
    }
  }
});

test('la equivalencia de desenfoque abre más que la de nitidez', () => {
  const res = equivalencias(12, SERIES_SIMPLE);
  const desenfoque = res.find(e => e.clave === 'desenfoque');
  const nitidez    = res.find(e => e.clave === 'nitidez');
  assert.ok(desenfoque, 'falta la equivalencia de desenfoque');
  assert.ok(nitidez, 'falta la equivalencia de nitidez');
  assert.ok(desenfoque.apertura < nitidez.apertura,
    'la de desenfoque debe usar un número f menor');
});

test('la equivalencia de congelar usa el tiempo más rápido disponible', () => {
  const res = equivalencias(12, SERIES_SIMPLE);
  const congelar = res.find(e => e.clave === 'congelar');
  assert.ok(congelar, 'falta la equivalencia de congelar');
  for (const otra of res) {
    assert.ok(congelar.tiempo <= otra.tiempo,
      'ninguna otra equivalencia debe ser más rápida');
  }
});

test('no se repite el triplete que el usuario ya tiene puesto', () => {
  const actual = { apertura: 2.8, tiempo: 1/500, iso: 100 };
  const res = equivalencias(12, { ...SERIES_SIMPLE, actual });
  for (const eq of res) {
    const igual = eq.apertura === actual.apertura
               && Math.abs(eq.tiempo - actual.tiempo) < 1e-9
               && eq.iso === actual.iso;
    assert.ok(!igual, 'devolvió el triplete actual como alternativa');
  }
});

test('cada equivalencia trae una etiqueta legible', () => {
  for (const eq of equivalencias(12, SERIES_SIMPLE)) {
    assert.equal(typeof eq.etiqueta, 'string');
    assert.ok(eq.etiqueta.length > 0);
  }
});

test('una escena sin solución posible devuelve lista vacía sin reventar', () => {
  // EV 40 no es alcanzable con ninguna combinación de las series.
  assert.deepEqual(equivalencias(40, SERIES_SIMPLE), []);
});

test('calcular devuelve el resultado completo', () => {
  const escena = ESCENAS['nublado'];
  const r = calcular({ ...escena.preset, escena, series: SERIES_SIMPLE });
  for (const campo of ['ev', 'delta', 'veredicto', 'desenfoqueFondo',
                       'desenfoqueMovimiento', 'ruido', 'brillo',
                       'contraste', 'avisos', 'equivalencias']) {
    assert.ok(r[campo] !== undefined, `falta el campo ${campo}`);
  }
});

test('el preset de una escena da veredicto correcto vía calcular', () => {
  for (const escena of Object.values(ESCENAS)) {
    const r = calcular({ ...escena.preset, escena, series: SERIES_SIMPLE });
    assert.equal(r.veredicto, 'correcta',
      `"${escena.nombreSimple}" dio ${r.veredicto} (delta ${r.delta.toFixed(2)})`);
  }
});

test('el arrastre usa el tiempo seguro de la escena', () => {
  const escena = ESCENAS['calle-noche'];   // tiempoSeguro 1/60
  const rapido = calcular({ apertura: 2, tiempo: 1/250, iso: 3200, escena, series: SERIES_SIMPLE });
  const lento  = calcular({ apertura: 2, tiempo: 1/8,   iso: 3200, escena, series: SERIES_SIMPLE });
  assert.equal(rapido.desenfoqueMovimiento, 0);
  assert.ok(lento.desenfoqueMovimiento > 0);
});
