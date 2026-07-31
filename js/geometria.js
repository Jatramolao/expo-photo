// geometria.js — matemática pura de los widgets de mecanismo y del
// histograma. No toca el DOM ni GSAP: todo esto es probable en Node.

// --- ESCALA EN STOPS ---------------------------------------------------
// Interpolar en stops y no en valores crudos. Un tween de f/1.4 a f/22
// sobre el número f pasaría casi toda la animación en el rango alto,
// porque la escala es logarítmica.

/** Convierte un valor real a su posición en stops. */
export function aStops(tipo, valor) {
  if (tipo === 'apertura') return 2 * Math.log2(valor);
  if (tipo === 'tiempo')   return Math.log2(valor);
  return Math.log2(valor / 100);            // iso
}

/** Vuelve de la escala de stops al valor real. */
export function deStops(tipo, stops) {
  if (tipo === 'apertura') return Math.pow(2, stops / 2);
  if (tipo === 'tiempo')   return Math.pow(2, stops);
  return Math.pow(2, stops) * 100;          // iso
}

// --- DIAFRAGMA ---------------------------------------------------------

const HOJAS = 7;

/**
 * Abertura relativa (0–1) para un número f dado.
 *
 * El diámetro real de la abertura es focal/N, así que es proporcional a
 * 1/N. Se normaliza contra f/1.4, que es la más abierta de la serie. Esto
 * hace que f/22 quede como un punto diminuto — y eso ES la lección: ver
 * que el agujero casi desaparece explica por qué a f/22 hace falta tanto
 * tiempo o tanto ISO. Suavizarlo destruiría lo que enseña.
 */
export function aberturaDiafragma(apertura) {
  return 1.4 / apertura;
}

/**
 * Vértices del polígono de la abertura, y el giro de las hojas.
 * El giro es lo que hace que se lea como mecanismo y no como un polígono
 * que simplemente encoge.
 */
export function puntosDiafragma(apertura, { radioMax = 20, cx = 24, cy = 24 } = {}) {
  const fraccion = aberturaDiafragma(apertura);
  const radio = radioMax * fraccion;
  // Al cerrarse, las hojas giran hasta media vuelta de hoja.
  const rotacion = (1 - fraccion) * (Math.PI / HOJAS);

  const puntos = [];
  for (let i = 0; i < HOJAS; i++) {
    const angulo = (i * 2 * Math.PI) / HOJAS + rotacion - Math.PI / 2;
    puntos.push([
      cx + radio * Math.cos(angulo),
      cy + radio * Math.sin(angulo)
    ]);
  }
  return { puntos, rotacion, radio };
}

// --- CORTINILLA --------------------------------------------------------

const CORTINILLA_MIN = 120;
const CORTINILLA_MAX = 900;

/**
 * Duración en ms del ciclo de la cortinilla.
 *
 * Concesión declarada: el rango real va de 1/4000 (imperceptible) a 30 s
 * (absurdo esperar). Se comprime logarítmicamente. Es RELATIVA, no
 * literal: se ve que 1/30 dura mucho más que 1/1000, pero no en
 * proporción real.
 */
/**
 * Altura relativa (0-1) de la rendija del obturador.
 *
 * Un obturador de plano focal, por encima de la velocidad de sincronismo,
 * no abre entero: forma una RENDIJA que barre el sensor, y cuanto más
 * rápida la velocidad, más estrecha es. Eso hace que el widget informe
 * también en reposo, en vez de ser un cuadrado muerto entre animaciones.
 */
export function rendijaObturador(tiempo) {
  const min = Math.log2(1 / 4000);
  const max = Math.log2(1 / 30);        // a 1/30 y más lento, abre entero
  const f = (Math.log2(tiempo) - min) / (max - min);
  return 0.08 + Math.min(Math.max(f, 0), 1) * 0.92;
}

export function duracionCortinilla(tiempo) {
  const min = Math.log2(1 / 4000);
  const max = Math.log2(30);
  const t = (Math.log2(tiempo) - min) / (max - min);
  const acotado = Math.min(Math.max(t, 0), 1);
  return Math.round(CORTINILLA_MIN + acotado * (CORTINILLA_MAX - CORTINILLA_MIN));
}

// --- SEÑAL Y RUIDO -----------------------------------------------------

/**
 * Generador pseudoaleatorio con semilla fija (xorshift de 32 bits).
 * NO se usa Math.random(): la onda parpadearía distinto en cada fotograma
 * del tween y se leería como un fallo.
 */
function aleatorioConSemilla(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Onda de señal para el ISO.
 * Amplitud y temblor crecen juntos: subir ISO no capta más luz, amplifica
 * la que ya hay — y amplifica el ruido en la misma proporción.
 */
export function formaSenal(iso, { muestras = 24, ancho = 48, alto = 20, semilla = 20260729 } = {}) {
  const stops = Math.log2(iso / 100);            // 0 en ISO 100, 8 en 25600
  const fraccion = Math.min(Math.max(stops / 8, 0), 1);

  const amplitud = 0.15 + fraccion * 0.85;
  const ruido = fraccion * fraccion * 0.45;      // cuadrático: se dispara arriba

  const rnd = aleatorioConSemilla(semilla);
  const medio = alto / 2;
  const puntos = [];
  for (let i = 0; i < muestras; i++) {
    const x = (i / (muestras - 1)) * ancho;
    const onda = Math.sin((i / (muestras - 1)) * Math.PI * 3);
    const temblor = (rnd() - 0.5) * 2 * ruido;
    const y = medio - (onda * amplitud + temblor) * medio * 0.9;
    puntos.push([
      Math.round(x * 100) / 100,
      Math.round(y * 100) / 100
    ]);
  }
  return { puntos, amplitud, ruido };
}

// --- HISTOGRAMA --------------------------------------------------------

/**
 * Transforma un histograma de luminancia por la curva de exposición.
 *
 * El histograma base se muestrea UNA VEZ de la placa; después solo se
 * transforma, que cuesta una pasada sobre 64 cubos en vez de leer píxeles.
 * Usa la misma curva que la previsualización (brillo y contraste de
 * motor.js), así que muestra exactamente el mismo recorte a negros y
 * blancos que ve el usuario.
 */
export function transformarHistograma(base, { brillo, contraste }) {
  const n = base.length;
  const salida = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (base[i] === 0) continue;
    const valor = i / (n - 1);
    const trasBrillo = Math.min(1, valor * brillo);
    const trasContraste = (trasBrillo - 0.5) * contraste + 0.5;
    // Lo que se sale por arriba o por abajo se acumula en el cubo extremo:
    // eso es exactamente el recorte a blancos y negros.
    const destino = Math.min(n - 1, Math.max(0, Math.round(trasContraste * (n - 1))));
    salida[destino] += base[i];
  }
  return salida;
}
