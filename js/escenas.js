// escenas.js — los datos de cada situación de luz.
// Editar este archivo basta para añadir o ajustar escenas; no hay lógica aquí.

// Mientras exista una sola placa neutra, todas las escenas la comparten.
// La simulación de brillo es la que las diferencia visualmente.
export const PLACA_BASE   = 'img/escenas/20260728_placa-base_v1.png';
export const RECORTE_BASE = 'img/escenas/20260728_placa-base_v1_sujeto.png';

/**
 * ev           — valor de luz de la escena a ISO 100
 * preset       — un triplete que expone correctamente esa escena
 * tiempoSeguro — el tiempo más lento que congela al sujeto de la escena;
 *                por debajo aparece arrastre en la previsualización
 * sujeto       — cómo se describe lo que se mueve, para los textos
 *
 * Declaradas de más luz a menos luz.
 */
export const ESCENAS = {
  'sol-pleno': {
    nombreSimple: 'Pleno sol, a mediodía',
    nombrePro:    'Luz solar directa',
    ev: 15,
    preset: { apertura: 2.8, tiempo: 1/4000, iso: 100 },
    tiempoSeguro: 1/125,
    sujeto: 'una persona de pie'
  },
  'nublado': {
    nombreSimple: 'Día nublado',
    nombrePro:    'Cielo cubierto, luz difusa',
    ev: 12,
    preset: { apertura: 2.8, tiempo: 1/500, iso: 100 },
    tiempoSeguro: 1/125,
    sujeto: 'una persona de pie'
  },
  'hora-dorada': {
    nombreSimple: 'Al atardecer',
    nombrePro:    'Hora dorada, sol bajo',
    ev: 11,
    preset: { apertura: 2, tiempo: 1/500, iso: 100 },
    tiempoSeguro: 1/125,
    sujeto: 'una persona de pie'
  },
  'interior-dia': {
    nombreSimple: 'Dentro de casa, de día',
    nombrePro:    'Interior con luz de ventana',
    ev: 8,
    preset: { apertura: 2, tiempo: 1/250, iso: 400 },
    tiempoSeguro: 1/60,
    sujeto: 'una persona conversando'
  },
  'interior-noche': {
    nombreSimple: 'Dentro de casa, de noche',
    nombrePro:    'Interior con luz artificial',
    ev: 5,
    preset: { apertura: 2, tiempo: 1/125, iso: 1600 },
    tiempoSeguro: 1/60,
    sujeto: 'una persona conversando'
  },
  'calle-noche': {
    nombreSimple: 'En la calle, de noche',
    nombrePro:    'Vía pública iluminada',
    ev: 3,
    preset: { apertura: 2, tiempo: 1/60, iso: 3200 },
    tiempoSeguro: 1/60,
    sujeto: 'alguien caminando'
  }
};

export const ESCENA_DEFECTO = 'nublado';
