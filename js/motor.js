// motor.js — la física de la exposición.
// Funciones puras: no tocan el DOM, no leen estado global.

/**
 * Valor de exposición de un triplete de ajustes de cámara.
 * @param {number} apertura número f (ej. 5.6)
 * @param {number} tiempo   segundos (ej. 1/125 = 0.008)
 * @param {number} iso      sensibilidad (ej. 400)
 * @returns {number} EV
 */
export function evAjustes(apertura, tiempo, iso) {
  return Math.log2((apertura * apertura) / tiempo) - Math.log2(iso / 100);
}

/**
 * Error de exposición en stops.
 * Positivo = sobreexpuesta (entra más luz de la necesaria).
 * Negativo = subexpuesta.
 */
export function delta(evEscena, apertura, tiempo, iso) {
  return evEscena - evAjustes(apertura, tiempo, iso);
}

/** Traduce el error numérico a uno de los cinco veredictos de la spec. */
export function veredicto(d) {
  if (d < -2)   return 'muy-subexpuesta';
  if (d < -0.5) return 'subexpuesta';
  if (d <= 0.5) return 'correcta';
  if (d <= 2)   return 'sobreexpuesta';
  return 'muy-sobreexpuesta';
}

// --- Efectos secundarios -----------------------------------------------
// Constantes calibradas para que a 50 mm y 2 m, f/1.4 desenfoque de forma
// marcada (~22 px) y f/22 no desenfoque nada. Ajustar solo con la
// previsualización a la vista.
const K_DESENFOQUE    = 0.0269;
const PISO_DESENFOQUE = 1.5;
const RUIDO_MAXIMO    = 0.6;

/** Radio de desenfoque del fondo, en píxeles. */
export function desenfoqueFondo(apertura, focal = 50, distancia = 2) {
  const bruto = K_DESENFOQUE * (focal * focal) / (apertura * distancia);
  const px = Math.max(0, bruto - PISO_DESENFOQUE);
  return Math.round(px * 10) / 10;
}

/** Arrastre del sujeto, en píxeles. Cero si el tiempo lo congela. */
export function desenfoqueMovimiento(tiempo, tiempoSeguro) {
  if (tiempo <= tiempoSeguro) return 0;
  const stops = Math.log2(tiempo / tiempoSeguro);
  return Math.round(Math.min(stops * 3, 24) * 10) / 10;
}

/** Opacidad de la capa de grano, de 0 (ISO 100) a 0.6 (ISO 25600). */
export function ruido(iso) {
  const stops = Math.log2(iso / 100);
  const fraccion = Math.min(Math.max(stops / 8, 0), 1);
  return Math.round(fraccion * RUIDO_MAXIMO * 100) / 100;
}

/** Multiplicador para el filtro CSS brightness(). */
export function brillo(d) {
  return Math.pow(2, d / 2);
}

/**
 * Multiplicador para el filtro CSS contrast().
 * Al alejarse de la exposición correcta el contraste cae, simulando el
 * recorte a blancos quemados y a negros aplastados.
 */
export function contraste(d) {
  return Math.max(0.35, 1 - Math.abs(d) / 8);
}

/**
 * Avisos técnicos. Se calculan siempre; la interfaz decide mostrarlos
 * solo en modo PRO.
 */
export function avisos({ apertura, tiempo, iso, focal = 50 }) {
  const out = [];
  if (tiempo > 1 / focal) out.push('trepidacion');
  if (apertura >= 16)     out.push('difraccion');
  if (iso >= 6400)        out.push('ruido-alto');
  return out;
}

const PERFILES = [
  {
    clave: 'desenfoque',
    etiqueta: 'Máximo desenfoque de fondo',
    // el número f más pequeño; a igualdad, el ISO más bajo
    orden: (x, y) => x.apertura - y.apertura || x.iso - y.iso
  },
  {
    clave: 'nitidez',
    etiqueta: 'Todo en foco',
    orden: (x, y) => y.apertura - x.apertura || x.iso - y.iso
  },
  {
    clave: 'congelar',
    etiqueta: 'Congelar el movimiento',
    orden: (x, y) => x.tiempo - y.tiempo || x.iso - y.iso
  }
];

/**
 * Alternativas que también exponen correctamente la misma escena, cada una
 * con un perfil visual distinto. Es el concepto central de la v3.
 *
 * Recorre las tres series por fuerza bruta. En modo simple son ~1.500
 * combinaciones y en pro ~32.000: barato, pero conviene memoizar el
 * resultado por escena y modo en la capa de interfaz.
 */
export function equivalencias(evEscena, { aperturas, tiempos, isos, actual = null }) {
  const validas = [];
  for (const apertura of aperturas) {
    for (const tiempo of tiempos) {
      for (const iso of isos) {
        const d = delta(evEscena, apertura, tiempo, iso);
        if (Math.abs(d) > 0.5) continue;
        if (actual
            && apertura === actual.apertura
            && Math.abs(tiempo - actual.tiempo) < 1e-9
            && iso === actual.iso) continue;
        validas.push({ apertura, tiempo, iso, delta: d });
      }
    }
  }
  if (validas.length === 0) return [];

  const salida = [];
  const yaVisto = new Set();
  for (const perfil of PERFILES) {
    const mejor = validas.slice().sort(perfil.orden)[0];
    const huella = `${mejor.apertura}|${mejor.tiempo}|${mejor.iso}`;
    if (yaVisto.has(huella)) continue;
    yaVisto.add(huella);
    salida.push({ ...mejor, clave: perfil.clave, etiqueta: perfil.etiqueta });
  }
  return salida;
}

/**
 * Punto de entrada único del motor. La interfaz solo necesita llamar a esto.
 * @param {object} args
 * @param {number} args.apertura   número f
 * @param {number} args.tiempo     segundos
 * @param {number} args.iso        sensibilidad
 * @param {object} args.escena     una entrada de ESCENAS
 * @param {number} [args.focal]    mm, por defecto 50
 * @param {number} [args.distancia] metros al sujeto, por defecto 2
 * @param {object} args.series     { aperturas, tiempos, isos } del modo activo
 */
export function calcular({ apertura, tiempo, iso, escena, focal = 50, distancia = 2, series }) {
  const ev = evAjustes(apertura, tiempo, iso);
  const d  = escena.ev - ev;
  return {
    ev,
    delta: d,
    veredicto: veredicto(d),
    desenfoqueFondo: desenfoqueFondo(apertura, focal, distancia),
    desenfoqueMovimiento: desenfoqueMovimiento(tiempo, escena.tiempoSeguro),
    ruido: ruido(iso),
    brillo: brillo(d),
    contraste: contraste(d),
    avisos: avisos({ apertura, tiempo, iso, focal }),
    equivalencias: equivalencias(escena.ev, {
      ...series,
      actual: { apertura, tiempo, iso }
    })
  };
}
