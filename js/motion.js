// motion.js — la capa de movimiento. GSAP directo, cero abstracciones
// propias: es la lección que el portafolio pagó cara al revertir su
// "Interactions Framework".
//
// Marco: ANTIGRAVITY quedó eliminada del MASTER. Rige D14 "el sitio
// elástico": el movimiento con propósito didáctico entra por defecto.

import { aStops, deStops } from './geometria.js';

/**
 * Si GSAP no cargó, la app NO puede morir: su valor es que la herramienta
 * funcione, y el movimiento es un extra. Sin GSAP todo degrada a
 * instantáneo, que es exactamente el comportamiento de la v3.
 */
const hayGsap = typeof window.gsap === 'object' && window.gsap !== null;
const gsap = hayGsap ? window.gsap : null;

/** Con prefers-reduced-motion todo llega al mismo sitio, sin recorrido. */
const sinMovimiento = !hayGsap
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dur = (ms) => (sinMovimiento ? 0 : ms / 1000);

/** Aplica el destino de golpe. Es la salida cuando no hay animación posible. */
function fijar(visual, destino) {
  visual.apertura = aStops('apertura', destino.apertura);
  visual.tiempo   = aStops('tiempo', destino.tiempo);
  visual.iso      = aStops('iso', destino.iso);
}

/**
 * Estado visual: lo que se está pintando ahora mismo, que puede ir por
 * detrás del estado real mientras dura una transición. Se guarda en stops
 * porque es la escala en la que hay que interpolar.
 */
export function crearEstadoVisual({ apertura, tiempo, iso }) {
  return {
    apertura: aStops('apertura', apertura),
    tiempo:   aStops('tiempo', tiempo),
    iso:      aStops('iso', iso)
  };
}

/** Traduce el estado visual de vuelta a valores reales de cámara. */
export function valoresVisuales(visual) {
  return {
    apertura: deStops('apertura', visual.apertura),
    tiempo:   deStops('tiempo', visual.tiempo),
    iso:      deStops('iso', visual.iso)
  };
}

/** Salta al estado destino sin animar. Para el arrastre de sliders. */
export function saltarA(visual, destino, alPintar) {
  if (gsap) gsap.killTweensOf(visual);
  fijar(visual, destino);
  alPintar();
}

/**
 * Transición animada entre dos tripletes.
 *
 * Es la pieza central de la v4: al aplicar una equivalencia, el desenfoque
 * y los números viajan mientras el brillo se mantiene clavado. Eso vuelve
 * observable la tesis de la app — exponer bien no es una respuesta sino
 * varias, y cambian el aspecto sin cambiar la luz.
 */
export function transicionarA(visual, destino, alPintar, ms = 700) {
  if (sinMovimiento) {
    fijar(visual, destino);
    alPintar();
    return null;
  }
  gsap.killTweensOf(visual);
  return gsap.to(visual, {
    apertura: aStops('apertura', destino.apertura),
    tiempo:   aStops('tiempo', destino.tiempo),
    iso:      aStops('iso', destino.iso),
    duration: dur(ms),
    ease: 'power3.inOut',
    onUpdate: alPintar,
    onComplete: alPintar
  });
}

/**
 * La aguja del fotómetro con asentamiento.
 * Un fotómetro real tiene inercia: la aguja se pasa un poco y se acomoda.
 * Solo en cambios discretos — durante el arrastre debe seguir al dedo.
 */
export function moverAguja(aguja, porcentaje, animar = true) {
  if (!animar || sinMovimiento) {
    aguja.style.left = `${porcentaje}%`;
    return;
  }
  gsap.killTweensOf(aguja);
  gsap.to(aguja, {
    left: `${porcentaje}%`,
    duration: dur(350),
    ease: 'back.out(2.2)'
  });
}

/**
 * Coreografía de entrada. Registro OBRA (dial ≈7): cortante y coreografiado,
 * no un fundido suave. El instrumento se arma por partes.
 */
export function entrada(elementos) {
  if (sinMovimiento) return;
  const todos = [elementos.hero, elementos.escenas, elementos.visor, ...elementos.controles]
    .filter(Boolean);
  // Red de seguridad: gsap.from() deja los elementos en opacidad 0 hasta
  // que la animación corre. Si el navegador no ejecuta requestAnimationFrame
  // (pestaña en segundo plano, panel oculto), quedarían invisibles para
  // siempre. Pase lo que pase, al segundo y medio se ven.
  setTimeout(() => gsap.set(todos, { clearProps: 'opacity,transform' }), 1500);
  const tl = gsap.timeline();
  tl.from(elementos.hero,     { y: -16, opacity: 0, duration: dur(220), ease: 'power4.out' })
    .from(elementos.escenas,  { y: 12, opacity: 0, duration: dur(200), ease: 'power4.out' }, '-=0.10')
    .from(elementos.visor,    { scaleY: 0.94, opacity: 0, transformOrigin: 'top center',
                                duration: dur(260), ease: 'power4.out' }, '-=0.08')
    .from(elementos.controles.filter(Boolean),
          { y: 14, opacity: 0, duration: dur(200), stagger: dur(60), ease: 'power4.out' }, '-=0.12');
  return tl;
}
