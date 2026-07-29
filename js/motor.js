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
