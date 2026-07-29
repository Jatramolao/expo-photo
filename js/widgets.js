// widgets.js — los tres dibujos de mecanismo, en SVG.
// Consume geometria.js para toda la matemática. Único trabajo aquí: crear
// y actualizar nodos SVG.

import { puntosDiafragma, formaSenal, duracionCortinilla } from './geometria.js';

const NS = 'http://www.w3.org/2000/svg';
const LADO = 48;

function svg(tag, atributos = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  return el;
}

/** Contenedor común: los tres son decorativos, el valor lo anuncia el slider. */
function lienzo(clase) {
  const s = svg('svg', {
    class: `widget ${clase}`,
    viewBox: `0 0 ${LADO} ${LADO}`,
    width: LADO, height: LADO,
    'aria-hidden': 'true', focusable: 'false'
  });
  return s;
}

// --- DIAFRAGMA ---------------------------------------------------------

export function crearDiafragma() {
  const s = lienzo('widget-diafragma');
  // El cuerpo del objetivo.
  s.appendChild(svg('circle', {
    cx: 24, cy: 24, r: 21, fill: 'none',
    stroke: 'var(--meta)', 'stroke-width': 2
  }));
  // Las hojas: el anillo oscuro entre el cuerpo y la abertura.
  const hojas = svg('circle', {
    cx: 24, cy: 24, r: 20, fill: 'var(--surface)'
  });
  s.appendChild(hojas);
  // La abertura: por donde entra la luz.
  const abertura = svg('polygon', { fill: 'var(--accent)', points: '' });
  s.appendChild(abertura);
  s.__abertura = abertura;
  return s;
}

export function actualizarDiafragma(s, apertura) {
  const { puntos } = puntosDiafragma(apertura, { radioMax: 19 });
  s.__abertura.setAttribute('points',
    puntos.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '));
}

// --- CORTINILLA --------------------------------------------------------

export function crearCortinilla() {
  const s = lienzo('widget-cortinilla');
  s.appendChild(svg('rect', {
    x: 4, y: 4, width: 40, height: 40, fill: 'var(--accent)'
  }));
  s.appendChild(svg('rect', {
    x: 3, y: 3, width: 42, height: 42, fill: 'none',
    stroke: 'var(--meta)', 'stroke-width': 2
  }));
  const arriba = svg('rect', { x: 4, y: 4, width: 40, height: 20, fill: 'var(--surface)' });
  const abajo  = svg('rect', { x: 4, y: 24, width: 40, height: 20, fill: 'var(--surface)' });
  s.appendChild(arriba); s.appendChild(abajo);
  s.__arriba = arriba; s.__abajo = abajo;
  return s;
}

/**
 * Un solo ciclo al cambiar el valor, nunca un bucle: un bucle sería
 * movimiento permanente sin que el usuario lo provoque.
 * Devuelve la duración total para que motion.js pueda coordinar.
 */
export function dispararCortinilla(s, tiempo, gsap, animar = true) {
  const total = duracionCortinilla(tiempo);
  const apertura = total * 0.35;
  gsap.killTweensOf([s.__arriba, s.__abajo]);
  if (!animar) {
    s.__arriba.setAttribute('height', 20);
    s.__abajo.setAttribute('y', 24);
    s.__abajo.setAttribute('height', 20);
    return 0;
  }
  const tl = gsap.timeline();
  tl.to(s.__arriba, { attr: { height: 0 }, duration: apertura / 1000, ease: 'power3.in' }, 0)
    .to(s.__abajo,  { attr: { y: 44, height: 0 }, duration: apertura / 1000, ease: 'power3.in' }, 0)
    .to(s.__arriba, { attr: { height: 20 }, duration: apertura / 1000, ease: 'power3.out' }, (total - apertura) / 1000)
    .to(s.__abajo,  { attr: { y: 24, height: 20 }, duration: apertura / 1000, ease: 'power3.out' }, (total - apertura) / 1000);
  return total;
}

// --- SEÑAL Y RUIDO -----------------------------------------------------

export function crearSenal() {
  const s = lienzo('widget-senal');
  s.appendChild(svg('rect', {
    x: 3, y: 3, width: 42, height: 42, fill: 'none',
    stroke: 'var(--meta)', 'stroke-width': 2
  }));
  const linea = svg('polyline', {
    fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5,
    'stroke-linejoin': 'round', points: ''
  });
  s.appendChild(linea);
  s.__linea = linea;
  return s;
}

export function actualizarSenal(s, iso) {
  const { puntos } = formaSenal(iso, { muestras: 28, ancho: 38, alto: 34 });
  s.__linea.setAttribute('points',
    puntos.map(([x, y]) => `${(x + 5).toFixed(2)},${(y + 7).toFixed(2)}`).join(' '));
}

// --- HISTOGRAMA (solo PRO) ---------------------------------------------

const CUBOS = 64;

export function crearHistograma() {
  const s = svg('svg', {
    class: 'histograma', viewBox: `0 0 ${CUBOS} 24`,
    preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false'
  });
  const barras = [];
  for (let i = 0; i < CUBOS; i++) {
    const r = svg('rect', { x: i, y: 24, width: 1, height: 0, fill: 'var(--cuerpo)' });
    s.appendChild(r);
    barras.push(r);
  }
  s.__barras = barras;
  return s;
}

export function actualizarHistograma(s, histograma) {
  const max = Math.max(...histograma, 1);
  histograma.forEach((v, i) => {
    const h = (v / max) * 24;
    const r = s.__barras[i];
    r.setAttribute('height', h.toFixed(2));
    r.setAttribute('y', (24 - h).toFixed(2));
    // Los extremos se pintan en violeta cuando acumulan recorte: es el
    // momento en que se pierde información de verdad.
    const recorte = (i === 0 || i === CUBOS - 1) && v / max > 0.5;
    r.setAttribute('fill', recorte ? 'var(--violet)' : 'var(--cuerpo)');
  });
}

/**
 * Muestrea el histograma de luminancia de la placa UNA sola vez, con un
 * canvas fuera de pantalla. A partir de ahí solo se transforma.
 */
export function muestrearHistograma(img, cubos = CUBOS) {
  const lado = 96;                       // suficiente para la forma general
  const c = document.createElement('canvas');
  c.width = lado; c.height = lado;
  const ctx = c.getContext('2d', { willReadFrequently: false });
  ctx.drawImage(img, 0, 0, lado, lado);
  const datos = ctx.getImageData(0, 0, lado, lado).data;
  const h = new Array(cubos).fill(0);
  for (let i = 0; i < datos.length; i += 4) {
    const lum = (0.2126 * datos[i] + 0.7152 * datos[i + 1] + 0.0722 * datos[i + 2]) / 255;
    h[Math.min(cubos - 1, Math.floor(lum * cubos))]++;
  }
  return h;
}
