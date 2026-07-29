// escalas.js — las series de valores reales de cámara y su presentación.
// Todos los valores son NÚMEROS. El tiempo va siempre en segundos.

export const APERTURAS_STOP = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];

export const APERTURAS_TERCIO = [
  1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1,
  8, 9, 10, 11, 13, 14, 16, 18, 20, 22
];

export const TIEMPOS_STOP = [
  1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15,
  1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30
];

export const TIEMPOS_TERCIO = [
  1/4000, 1/3200, 1/2500, 1/2000, 1/1600, 1/1250, 1/1000, 1/800, 1/640,
  1/500, 1/400, 1/320, 1/250, 1/200, 1/160, 1/125, 1/100, 1/80,
  1/60, 1/50, 1/40, 1/30, 1/25, 1/20, 1/15, 1/13, 1/10, 1/8, 1/6, 1/5,
  1/4, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6,
  8, 10, 13, 15, 20, 25, 30
];

export const ISOS_STOP = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];

export const ISOS_TERCIO = [
  100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250,
  1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000,
  12800, 16000, 20000, 25600
];

/** Las tres series que corresponden al modo activo. */
export function series(modo) {
  return modo === 'pro'
    ? { aperturas: APERTURAS_TERCIO, tiempos: TIEMPOS_TERCIO, isos: ISOS_TERCIO }
    : { aperturas: APERTURAS_STOP,   tiempos: TIEMPOS_STOP,   isos: ISOS_STOP };
}

export function formatearApertura(n) {
  return `f/${n}`;
}

/**
 * Los tiempos rápidos se leen como fracción ("1/125"); los lentos que no
 * caen en una fracción limpia, como decimal de segundo ("0.3s").
 */
export function formatearTiempo(s) {
  if (s >= 1) return `${s}s`;
  const inverso = 1 / s;
  const redondo = Math.round(inverso);
  if (Math.abs(inverso - redondo) < 0.02) return `1/${redondo}`;
  return `${s}s`;
}

export function formatearIso(n) {
  return `ISO ${n}`;
}
