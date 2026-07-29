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
