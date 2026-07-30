// enlace.js — el estado en la URL, para poder compartir una configuración.
//
// Va en el hash y no en la query: no ensucia la URL canónica ni genera
// variantes indexables. El canonical sigue apuntando a la URL sin hash.

/** Serializa el estado a un hash. */
export function aHash({ escena, apertura, tiempo, iso, modo }) {
  const p = new URLSearchParams({
    escena,
    f: String(apertura),
    t: tiempo.toPrecision(4),
    iso: String(iso),
    modo
  });
  return '#' + p.toString();
}

/**
 * Lee el estado del hash. Devuelve null si no hay nada utilizable.
 *
 * Es deliberadamente tolerante: un hash inválido o parcial se ignora en
 * silencio y la app cae al preset de la escena. Un enlace roto o truncado
 * al copiarlo nunca debe impedir que el sitio cargue.
 */
export function deHash(hash, { escenasValidas }) {
  if (!hash || hash.length < 2) return null;
  let p;
  try {
    p = new URLSearchParams(hash.slice(1));
  } catch {
    return null;
  }

  const escena = p.get('escena');
  if (!escena || !escenasValidas.includes(escena)) return null;

  const num = (clave, min, max) => {
    const v = parseFloat(p.get(clave));
    return Number.isFinite(v) && v >= min && v <= max ? v : null;
  };

  const salida = { escena };
  const apertura = num('f', 1, 64);
  const tiempo   = num('t', 1 / 8000, 60);
  const iso      = num('iso', 50, 409600);
  if (apertura !== null) salida.apertura = apertura;
  if (tiempo   !== null) salida.tiempo   = tiempo;
  if (iso      !== null) salida.iso      = iso;

  const modo = p.get('modo');
  if (modo === 'pro' || modo === 'simple') salida.modo = modo;

  return salida;
}

/**
 * Escribe el hash sin añadir entradas al historial: si cada movimiento de
 * slider apilara una entrada, el botón atrás quedaría inservible.
 */
export function escribirHash(estado) {
  const nuevo = aHash(estado);
  if (nuevo === location.hash) return;
  history.replaceState(null, '', nuevo);
}
