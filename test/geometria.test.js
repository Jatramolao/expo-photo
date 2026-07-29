import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aberturaDiafragma, puntosDiafragma,
  duracionCortinilla,
  formaSenal,
  transformarHistograma,
  aStops, deStops
} from '../js/geometria.js';

// --- DIAFRAGMA ---------------------------------------------------------

test('la abertura del diafragma es proporcional a 1/N', () => {
  // El diámetro real de la abertura es focal/N, así que f/22 debe ser
  // aproximadamente 1/16 del diámetro de f/1.4. Eso es la lección.
  const razon = aberturaDiafragma(1.4) / aberturaDiafragma(22);
  assert.ok(Math.abs(razon - 22 / 1.4) < 0.5,
    `esperaba una razón de ~15.7, obtuve ${razon.toFixed(2)}`);
});

test('la abertura decrece de forma monótona al cerrar el diafragma', () => {
  const fs = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
  for (let i = 1; i < fs.length; i++) {
    assert.ok(aberturaDiafragma(fs[i]) < aberturaDiafragma(fs[i - 1]),
      `f/${fs[i]} debe abrir menos que f/${fs[i - 1]}`);
  }
});

test('la abertura nunca llega a cero, ni siquiera a f/22', () => {
  assert.ok(aberturaDiafragma(22) > 0, 'a f/22 debe quedar un punto visible');
  assert.ok(aberturaDiafragma(22) < 0.12, 'pero muy pequeño');
});

test('el diafragma devuelve un polígono de 7 hojas', () => {
  const { puntos } = puntosDiafragma(5.6, { radioMax: 20 });
  assert.equal(puntos.length, 7);
  for (const [x, y] of puntos) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y), 'puntos finitos');
  }
});

test('el diafragma gira al cerrarse', () => {
  // El giro es lo que lo hace leer como mecanismo y no como polígono
  // que encoge.
  const abierto = puntosDiafragma(1.4, { radioMax: 20 });
  const cerrado = puntosDiafragma(22,  { radioMax: 20 });
  assert.ok(Math.abs(cerrado.rotacion - abierto.rotacion) > 0.2,
    'debe haber un giro apreciable entre extremos');
});

// --- CORTINILLA --------------------------------------------------------

test('la duración de la cortinilla crece al bajar la velocidad', () => {
  const rapida = duracionCortinilla(1 / 4000);
  const media  = duracionCortinilla(1 / 125);
  const lenta  = duracionCortinilla(1);
  assert.ok(rapida < media, '1/4000 debe durar menos que 1/125');
  assert.ok(media < lenta, '1/125 debe durar menos que 1s');
});

test('la duración de la cortinilla está acotada entre 120 y 900 ms', () => {
  for (const t of [1 / 4000, 1 / 125, 1, 30]) {
    const d = duracionCortinilla(t);
    assert.ok(d >= 120 && d <= 900, `t=${t} dio ${d} ms, fuera de rango`);
  }
});

// --- SEÑAL Y RUIDO -----------------------------------------------------

test('la amplitud y el ruido crecen con el ISO', () => {
  const bajo = formaSenal(100,   { muestras: 24, alto: 20 });
  const alto = formaSenal(12800, { muestras: 24, alto: 20 });
  assert.ok(alto.amplitud > bajo.amplitud, 'más ISO, más amplitud');
  assert.ok(alto.ruido > bajo.ruido, 'más ISO, más ruido');
});

test('a ISO 100 la señal está limpia', () => {
  const { ruido } = formaSenal(100, { muestras: 24, alto: 20 });
  assert.ok(ruido < 0.02, `esperaba señal limpia, obtuve ruido ${ruido}`);
});

test('la forma de la señal es determinista', () => {
  // Con Math.random() la onda parpadearía distinto en cada fotograma del
  // tween y se leería como un fallo.
  const a = formaSenal(3200, { muestras: 24, alto: 20 });
  const b = formaSenal(3200, { muestras: 24, alto: 20 });
  assert.deepEqual(a.puntos, b.puntos);
});

test('la señal devuelve el número de muestras pedido', () => {
  const { puntos } = formaSenal(1600, { muestras: 32, alto: 20 });
  assert.equal(puntos.length, 32);
});

// --- STOPS -------------------------------------------------------------

test('la conversión a stops y de vuelta es reversible', () => {
  for (const [tipo, valor] of [['apertura', 5.6], ['tiempo', 1/250], ['iso', 800]]) {
    const ida = aStops(tipo, valor);
    const vuelta = deStops(tipo, ida);
    assert.ok(Math.abs(vuelta - valor) < 1e-9,
      `${tipo}: ${valor} -> ${ida} -> ${vuelta}`);
  }
});

test('un stop de apertura equivale a un stop de tiempo en la escala', () => {
  // f/2.8 -> f/4 es un stop; 1/250 -> 1/125 también. Interpolar en esta
  // escala hace que el recorrido sea perceptualmente uniforme.
  const dApertura = aStops('apertura', 4) - aStops('apertura', 2.8);
  const dTiempo   = aStops('tiempo', 1/125) - aStops('tiempo', 1/250);
  assert.ok(Math.abs(dApertura - 1) < 0.05, `apertura dio ${dApertura}`);
  assert.ok(Math.abs(dTiempo - 1) < 0.05, `tiempo dio ${dTiempo}`);
});

// --- HISTOGRAMA --------------------------------------------------------

test('el histograma se desplaza a la derecha al sobreexponer', () => {
  const base = new Array(64).fill(0);
  base[32] = 1000;                       // todo en el tono medio
  const claro = transformarHistograma(base, { brillo: 2, contraste: 1 });
  const centro = (h) => h.reduce((s, v, i) => s + v * i, 0) / h.reduce((s, v) => s + v, 0);
  assert.ok(centro(claro) > 32, 'sobreexponer debe correr el histograma a la derecha');
});

test('el histograma se desplaza a la izquierda al subexponer', () => {
  const base = new Array(64).fill(0);
  base[32] = 1000;
  const oscuro = transformarHistograma(base, { brillo: 0.35, contraste: 1.3 });
  const centro = (h) => h.reduce((s, v, i) => s + v * i, 0) / h.reduce((s, v) => s + v, 0);
  assert.ok(centro(oscuro) < 32, 'subexponer debe correr el histograma a la izquierda');
});

test('el histograma conserva el total de píxeles: lo recortado se acumula', () => {
  const base = new Array(64).fill(0);
  base[50] = 500; base[60] = 500;
  const quemado = transformarHistograma(base, { brillo: 4, contraste: 1 });
  const total = quemado.reduce((s, v) => s + v, 0);
  assert.equal(total, 1000, 'no se pierden píxeles al recortar');
  assert.ok(quemado[63] > 0, 'lo quemado se acumula en el último cubo');
});

test('sin cambio de exposición el histograma no se altera', () => {
  const base = new Array(64).fill(0).map((_, i) => i * 3);
  const igual = transformarHistograma(base, { brillo: 1, contraste: 1 });
  assert.deepEqual(igual, base);
});
