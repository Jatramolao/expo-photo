import { calcular } from './motor.js';
import { series, formatearApertura, formatearTiempo, formatearIso } from './escalas.js';
import { ESCENAS, ESCENA_DEFECTO, PLACA_BASE, RECORTE_BASE } from './escenas.js';
import { explicacion, textoAviso, GLOSARIO, FAQ } from './textos.js';
import { transformarHistograma } from './geometria.js';
import {
  crearDiafragma, actualizarDiafragma,
  crearCortinilla, dispararCortinilla,
  crearSenal, actualizarSenal,
  crearHistograma, actualizarHistograma, muestrearHistograma
} from './widgets.js';
import {
  crearEstadoVisual, valoresVisuales, saltarA, transicionarA,
  moverAguja, entrada
} from './motion.js';
import { deHash, escribirHash } from './enlace.js';

const estado = {
  modo: 'simple',
  escena: ESCENA_DEFECTO,
  iApertura: 0,
  iTiempo: 0,
  iIso: 0,
  focal: 50,
  distancia: 2
};

const CLAVE_MODO = 'exposicion-foto:modo';

// Lo que se está pintando ahora, que puede ir por detrás del estado real
// mientras dura una transición. Se rellena en iniciar().
let visual = null;
const widgets = {};
let histogramaBase = null;

const $ = (id) => document.getElementById(id);

/**
 * Índice del elemento del array más cercano a un valor dado.
 * Se usa cada vez que hay que traducir valores reales a posiciones de slider:
 * al aplicar un preset, al cambiar de modo y al aplicar una equivalencia.
 */
function masCercano(arr, valor) {
  return arr.reduce((mejor, x, i) =>
    Math.abs(x - valor) < Math.abs(arr[mejor] - valor) ? i : mejor, 0);
}

/** Los valores objetivo, resueltos desde los índices de slider. */
function valores() {
  const s = series(estado.modo);
  return {
    apertura: s.aperturas[estado.iApertura],
    tiempo:   s.tiempos[estado.iTiempo],
    iso:      s.isos[estado.iIso]
  };
}

/**
 * Los valores que hay que PINTAR. Durante una transición van por detrás de
 * los objetivo; el resto del tiempo coinciden. Separar ambos es lo que
 * hace posible animar sin tocar las funciones de pintado.
 */
function valoresPintados() {
  return visual ? valoresVisuales(visual) : valores();
}

/** Coloca los sliders en el triplete dado, en la serie del modo activo. */
function colocarEn({ apertura, tiempo, iso }) {
  const s = series(estado.modo);
  estado.iApertura = masCercano(s.aperturas, apertura);
  estado.iTiempo   = masCercano(s.tiempos,   tiempo);
  estado.iIso      = masCercano(s.isos,      iso);
}

/** Coloca los sliders en el preset de la escena activa. */
function aplicarPreset() {
  colocarEn(ESCENAS[estado.escena].preset);
}

// --- Pintado ------------------------------------------------------------

function pintarEscenas() {
  const cont = $('escenas');
  cont.innerHTML = '';
  for (const [clave, e] of Object.entries(ESCENAS)) {
    const btn = document.createElement('button');
    btn.className = 'escena-btn';
    btn.type = 'button';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(clave === estado.escena));
    btn.setAttribute('tabindex', clave === estado.escena ? '0' : '-1');
    // La franja lateral lleva el brillo que corresponde al EV de la escena:
    // la rejilla enseña el rango de luz antes de tocar nada. EV 3 (noche)
    // queda casi negro; EV 15 (pleno sol), casi blanco.
    const luz = Math.round(((e.ev - 3) / 12) * 205 + 25);
    btn.style.setProperty('--luz', `rgb(${luz},${luz},${luz})`);
    btn.textContent = estado.modo === 'pro'
      ? `${e.nombrePro} · EV ${e.ev}`
      : e.nombreSimple;
    btn.addEventListener('click', () => seleccionarEscena(clave));
    btn.addEventListener('keydown', (ev) => navegarEscenas(ev, clave));
    cont.appendChild(btn);
  }
}

function seleccionarEscena(clave, { enfocar = false } = {}) {
  estado.escena = clave;
  aplicarPreset();
  pintarEscenas();
  configurarSliders();
  irA(valores(), 500);
  if (enfocar) {
    const activa = document.querySelector('.escena-btn[aria-checked="true"]');
    if (activa) activa.focus();
  }
}

/**
 * Patrón radiogroup completo (WAI-ARIA): las flechas mueven la selección y
 * la activan, Home y End van a los extremos.
 *
 * Sin esto, role="radio" + tabindex="-1" en las no seleccionadas deja el
 * selector COMPLETAMENTE inaccesible por teclado: solo se alcanza la escena
 * activa y no hay forma de cambiar. Es el defecto que introdujo la v3.
 */
function navegarEscenas(ev, claveActual) {
  const claves = Object.keys(ESCENAS);
  const i = claves.indexOf(claveActual);
  let destino = null;

  switch (ev.key) {
    case 'ArrowRight': case 'ArrowDown': destino = (i + 1) % claves.length; break;
    case 'ArrowLeft':  case 'ArrowUp':   destino = (i - 1 + claves.length) % claves.length; break;
    case 'Home':                          destino = 0; break;
    case 'End':                           destino = claves.length - 1; break;
    default: return;
  }
  ev.preventDefault();
  seleccionarEscena(claves[destino], { enfocar: true });
}

function configurarSliders() {
  const s = series(estado.modo);
  const pares = [
    ['sl-apertura', s.aperturas.length, 'iApertura'],
    ['sl-tiempo',   s.tiempos.length,   'iTiempo'],
    ['sl-iso',      s.isos.length,      'iIso']
  ];
  for (const [id, largo, campo] of pares) {
    const el = $(id);
    el.max = largo - 1;
    el.value = estado[campo];
  }
}

/**
 * Escala del fotómetro: una marca por stop, de -3 a +3. Es lo que separa
 * un instrumento de una barra de progreso, y le da unidad al recorrido de
 * la aguja: sin marcas, se ve que se mueve pero no cuánto vale.
 */
function pintarMarcasFotometro() {
  const cont = $('fotometro-marcas');
  cont.innerHTML = '';
  for (let s = -3; s <= 3; s++) {
    const m = document.createElement('div');
    m.className = 'fotometro-marca' + (s === 0 ? ' fotometro-marca--cero' : '');
    m.style.left = `${((s + 3) / 6) * 100}%`;
    const et = document.createElement('span');
    et.textContent = s === 0 ? '0' : (s > 0 ? `+${s}` : `${s}`);
    m.appendChild(et);
    cont.appendChild(m);
  }
}

/**
 * Banda de datos al pie del fotograma, como en una hoja de contacto.
 * Reúne en un solo sitio la metadata que hoy vive repartida.
 */
function pintarDatos(v, escena) {
  $('marco-datos').innerHTML =
    `<span><b>${formatearApertura(v.apertura)}</b></span>` +
    `<span><b>${formatearTiempo(v.tiempo)}</b></span>` +
    `<span><b>${formatearIso(v.iso)}</b></span>` +
    `<span>EV <b>${escena.ev}</b></span>` +
    `<span>${estado.focal} mm</span>`;
}

function iniciarPreview() {
  $('preview-fondo').src  = PLACA_BASE;
  $('preview-sujeto').src = RECORTE_BASE;
}

/**
 * Traduce los efectos calculados a filtros CSS.
 * El fondo lleva el desenfoque de apertura; el sujeto, el arrastre de
 * movimiento. Brillo y contraste se aplican a ambos por igual, porque la
 * exposición afecta a toda la imagen.
 */
function pintarPreview(r) {
  const expo = `brightness(${r.brillo.toFixed(3)}) contrast(${r.contraste.toFixed(3)})`;
  $('preview-fondo').style.filter  = `${expo} blur(${r.desenfoqueFondo}px)`;
  $('preview-sujeto').style.filter = r.desenfoqueMovimiento > 0
    ? `${expo} blur(${(r.desenfoqueMovimiento / 4).toFixed(1)}px)`
    : expo;
  $('preview-grano').style.opacity = r.ruido;
}

/**
 * La aguja recorre ±3 stops. En modo simple se muestra solo la posición;
 * en pro, además el valor numérico.
 */
const PALABRAS = {
  'muy-subexpuesta':   'Muy oscura',
  'subexpuesta':       'Oscura',
  'correcta':          'Correcta',
  'sobreexpuesta':     'Quemada',
  'muy-sobreexpuesta': 'Muy quemada'
};

function pintarFotometro(r, animar = false) {
  const acotado = Math.max(-3, Math.min(3, r.delta));
  const porcentaje = ((acotado + 3) / 6) * 100;
  moverAguja($('fotometro-aguja'), porcentaje, animar);
  $('fotometro').dataset.veredicto = r.veredicto;
  $('fotometro-lectura').textContent = estado.modo === 'pro'
    ? `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(1)} EV · ${PALABRAS[r.veredicto]}`
    : PALABRAS[r.veredicto];
}

const TITULOS = {
  'muy-subexpuesta':   'Muy subexpuesta',
  'subexpuesta':       'Subexpuesta',
  'correcta':          'Exposición correcta',
  'sobreexpuesta':     'Sobreexpuesta',
  'muy-sobreexpuesta': 'Muy sobreexpuesta'
};

function pintarLectura(r) {
  $('veredicto').textContent   = TITULOS[r.veredicto];
  $('explicacion').textContent = explicacion(r.veredicto, estado.modo);
  $('lectura').style.borderLeftColor =
    r.veredicto === 'correcta' ? 'var(--accent)'
    : r.delta > 0 ? 'var(--violet)' : 'var(--meta)';

  const lista = $('avisos');
  lista.innerHTML = '';
  // Los avisos técnicos solo se muestran en PRO.
  if (estado.modo !== 'pro') return;
  for (const clave of r.avisos) {
    const li = document.createElement('li');
    li.textContent = textoAviso(clave, estado.modo);
    lista.appendChild(li);
  }
}

function pintarEquivalencias(r) {
  const cont = $('equivalencias');
  cont.innerHTML = '';
  // Solo tienen sentido cuando la exposición actual ya es correcta: son
  // "otras formas de exponer lo mismo", no correcciones.
  if (r.veredicto !== 'correcta') {
    const p = document.createElement('p');
    p.className = 'equivalencia equivalencia-vacia';
    p.textContent = 'Ajusta primero la exposición hasta que sea correcta. Entonces verás otras combinaciones que dan el mismo brillo con un resultado distinto.';
    cont.appendChild(p);
    return;
  }
  for (const eq of r.equivalencias) {
    const btn = document.createElement('button');
    btn.className = 'equivalencia';
    btn.type = 'button';
    btn.innerHTML =
      `<span class="equivalencia-etiqueta">${eq.etiqueta}</span>` +
      `<span class="equivalencia-valores">${formatearApertura(eq.apertura)}<br>` +
      `${formatearTiempo(eq.tiempo)}<br>${formatearIso(eq.iso)}</span>`;
    btn.addEventListener('click', () => aplicarEquivalencia(eq));
    cont.appendChild(btn);
  }
}

function aplicarEquivalencia(eq) {
  colocarEn(eq);
  configurarSliders();
  // La transición ES la lección: el desenfoque y los números viajan
  // mientras el brillo se mantiene clavado.
  irA(valores(), 700);
}

function pintarContenido() {
  const nivel = estado.modo === 'pro' ? 'pro' : 'simple';

  const construir = (titulo, items, campoTitulo) => {
    const lista = document.createElement('div');
    lista.className = 'contenido-lista';
    for (const item of items) {
      const fila = document.createElement('div');
      fila.className = 'contenido-fila';
      const h = document.createElement('h3');
      h.className = 'contenido-termino';
      h.textContent = item[campoTitulo];
      const p = document.createElement('p');
      p.className = 'contenido-texto';
      p.textContent = item[nivel];
      fila.append(h, p);
      lista.appendChild(fila);
    }
    const label = document.createElement('p');
    label.className = 'section-label';
    label.textContent = titulo;
    return [label, lista];
  };

  const glo = $('glosario');
  glo.innerHTML = '';
  glo.append(...construir('Conceptos clave', GLOSARIO, 'termino'));

  const faq = $('faq');
  faq.innerHTML = '';
  faq.append(...construir('Preguntas frecuentes', FAQ, 'pregunta'));
}

// --- Render y estado ----------------------------------------------------

function render({ animarAguja = false } = {}) {
  const v = valoresPintados();
  const escena = ESCENAS[estado.escena];
  const r = calcular({
    ...v, escena,
    focal: estado.focal,
    distancia: estado.distancia,
    series: series(estado.modo)
  });

  $('val-apertura').textContent = formatearApertura(v.apertura);
  $('val-tiempo').textContent   = formatearTiempo(v.tiempo);
  $('val-iso').textContent      = formatearIso(v.iso);

  // Un lector de pantalla debe anunciar el valor real, no el índice del slider.
  $('sl-apertura').setAttribute('aria-valuetext', formatearApertura(v.apertura));
  $('sl-tiempo').setAttribute('aria-valuetext',   formatearTiempo(v.tiempo));
  $('sl-iso').setAttribute('aria-valuetext',      formatearIso(v.iso));

  pintarPreview(r);
  pintarFotometro(r, animarAguja);
  pintarLectura(r);
  pintarEquivalencias(r);
  pintarWidgets(v, r);
  pintarDatos(v, escena);
  escribirHash({ ...valores(), escena: estado.escena, modo: estado.modo });
}

function pintarWidgets(v, r) {
  if (widgets.diafragma) actualizarDiafragma(widgets.diafragma, v.apertura);
  // La rendija se repinta siempre: es información de reposo, no una animación.
  if (widgets.cortinilla && !window.gsap?.isTweening?.(widgets.cortinilla.__arriba)) {
    dispararCortinilla(widgets.cortinilla, v.tiempo, null, false);
  }
  if (widgets.senal)     actualizarSenal(widgets.senal, v.iso);
  if (widgets.histograma && histogramaBase) {
    actualizarHistograma(widgets.histograma,
      transformarHistograma(histogramaBase, { brillo: r.brillo, contraste: r.contraste }));
  }
}

function cambiarModo(nuevo) {
  // Se conservan los valores reales, no los índices: las series cambian de
  // longitud entre modos y un índice de la serie de stops apunta a otro valor
  // en la de tercios.
  const v = valores();
  estado.modo = nuevo;
  colocarEn(v);

  document.body.dataset.modo = nuevo;
  $('switch-modo').setAttribute('aria-checked', String(nuevo === 'pro'));
  $('optica').hidden = nuevo !== 'pro';
  localStorage.setItem(CLAVE_MODO, nuevo);

  configurarSliders();
  pintarEscenas();
  pintarContenido();
  render();
}

function iniciarSwitch() {
  const guardado = localStorage.getItem(CLAVE_MODO);
  estado.modo = guardado === 'pro' ? 'pro' : 'simple';
  document.body.dataset.modo = estado.modo;
  $('switch-modo').setAttribute('aria-checked', String(estado.modo === 'pro'));
  $('optica').hidden = estado.modo !== 'pro';
  $('switch-modo').addEventListener('click', () => {
    cambiarModo(estado.modo === 'pro' ? 'simple' : 'pro');
  });
}

function conectar() {
  const pares = [['sl-apertura', 'iApertura'], ['sl-tiempo', 'iTiempo'], ['sl-iso', 'iIso']];
  for (const [id, campo] of pares) {
    $(id).addEventListener('input', (ev) => {
      estado[campo] = parseInt(ev.target.value, 10);
      // El arrastre NO se anima: tiene que seguir al dedo. Interponer un
      // tween aquí se siente como lag, no como suavidad.
      saltarA(visual, valores(), () => render());
      if (campo === 'iTiempo') dispararCortinilla(widgets.cortinilla, valores().tiempo, window.gsap);
    });
  }
}

/** Cambio discreto: se anima, porque el recorrido es lo que enseña. */
function irA(destino, ms) {
  transicionarA(visual, destino, () => render(), ms);
  moverAguja($('fotometro-aguja'),
    ((Math.max(-3, Math.min(3, 0)) + 3) / 6) * 100, false);
  dispararCortinilla(widgets.cortinilla, destino.tiempo, window.gsap);
}

function conectarOptica() {
  $('sl-focal').addEventListener('input', (ev) => {
    estado.focal = parseInt(ev.target.value, 10);
    $('val-focal').textContent = `${estado.focal} mm`;
    render();
  });
  $('sl-distancia').addEventListener('input', (ev) => {
    estado.distancia = parseFloat(ev.target.value);
    $('val-distancia').textContent = `${estado.distancia} m`;
    render();
  });
}

/** Datos estructurados de FAQ, generados desde textos.js para no duplicar. */
function inyectarFaqEstructurada() {
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(item => ({
      '@type': 'Question',
      name: item.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: item.simple }
    }))
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(datos);
  document.head.appendChild(s);
}

/** Monta los tres widgets dentro de su tarjeta y el histograma en óptica. */
function montarWidgets() {
  const pares = [
    ['sl-apertura', 'diafragma', crearDiafragma],
    ['sl-tiempo',   'cortinilla', crearCortinilla],
    ['sl-iso',      'senal',     crearSenal]
  ];
  for (const [idSlider, nombre, crear] of pares) {
    const tarjeta = $(idSlider).closest('.control');
    const el = crear();
    widgets[nombre] = el;
    tarjeta.querySelector('.control-valor').insertAdjacentElement('afterend', el);
    tarjeta.classList.add('control--con-widget');
  }

  const caja = document.createElement('div');
  caja.className = 'histograma-caja';
  caja.innerHTML = '<span class="control-label">Histograma</span>';
  widgets.histograma = crearHistograma();
  caja.appendChild(widgets.histograma);
  $('optica').insertAdjacentElement('afterbegin', caja);
}

/** El histograma base se muestrea UNA vez; después solo se transforma. */
function muestrearPlaca() {
  const img = $('preview-fondo');
  const hacerlo = () => {
    try {
      histogramaBase = muestrearHistograma(img);
      render();
    } catch {
      // Si el navegador bloquea la lectura del canvas, el histograma
      // simplemente no aparece. No es motivo para romper la app.
      histogramaBase = null;
    }
  };
  if (img.complete && img.naturalWidth) hacerlo();
  else img.addEventListener('load', hacerlo, { once: true });
}

/** Aplica un estado venido de la URL, si lo hay y es utilizable. */
function aplicarEnlace() {
  const compartido = deHash(location.hash, { escenasValidas: Object.keys(ESCENAS) });
  if (!compartido) return false;
  estado.escena = compartido.escena;
  if (compartido.modo) {
    estado.modo = compartido.modo;
    document.body.dataset.modo = estado.modo;
    $('switch-modo').setAttribute('aria-checked', String(estado.modo === 'pro'));
    $('optica').hidden = estado.modo !== 'pro';
  }
  aplicarPreset();
  const s = series(estado.modo);
  if (compartido.apertura) estado.iApertura = masCercano(s.aperturas, compartido.apertura);
  if (compartido.tiempo)   estado.iTiempo   = masCercano(s.tiempos, compartido.tiempo);
  if (compartido.iso)      estado.iIso      = masCercano(s.isos, compartido.iso);
  return true;
}

function iniciar() {
  iniciarPreview();
  iniciarSwitch();
  aplicarPreset();
  aplicarEnlace();
  pintarEscenas();
  pintarMarcasFotometro();
  montarWidgets();
  configurarSliders();
  conectar();
  conectarOptica();
  pintarContenido();
  inyectarFaqEstructurada();

  visual = crearEstadoVisual(valores());
  render();
  muestrearPlaca();

  entrada({
    hero: document.querySelector('.hero'),
    escenas: $('escenas'),
    visor: document.querySelector('.visor'),
    controles: [...document.querySelectorAll('.control')]
  });
}

document.addEventListener('DOMContentLoaded', iniciar);

export { estado, render, valores, colocarEn, aplicarPreset, configurarSliders, pintarEscenas };
