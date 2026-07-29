# exposicion.foto v3 — Plan de implementación

> **Para quien ejecute este plan:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Reemplazar el motor de exposición inventado de la v2 por física real (EV y stops), y construir sobre él una previsualización visual que muestre el efecto de cada parámetro, con un switch SIMPLE/PRO que cambia la densidad de información.

**Arquitectura:** Un módulo puro `motor.js` sin acceso al DOM concentra toda la física y se prueba con `node --test` antes de conectarse a nada. La interfaz consume ese motor y renderiza la previsualización apilando dos imágenes (fondo y sujeto recortado) con filtros CSS aplicados en vivo — sin canvas. Los datos (escenas) y el contenido educativo (`textos.js`) viven separados de la lógica para poder editarse sin tocar código.

**Stack:** HTML5, CSS3, JavaScript vanilla con módulos ES nativos. Cero dependencias de runtime. Cero bundler. Pruebas con el `node --test` incluido en Node. Deploy estático en Vercel.

**Spec de referencia:** `docs/superpowers/specs/2026-07-28-exposicion-foto-v3-design.md`

## Restricciones globales

- **Cero dependencias de runtime.** No se instala ningún paquete npm. El `package.json` existe solo para declarar `"type": "module"`.
- **Sin build tools.** Vercel sirve los archivos tal cual. Cualquier cambio que introduzca un paso de build viola el diseño.
- **`border-radius: 0`** en todos los elementos, sin excepciones (manual de marca).
- **`transition: none`** en estados de interfaz (hover, activo, navegación). NO aplica al render de la previsualización, que responde de forma continua al slider — está declarado en §4.5 de la spec.
- **Paleta oficial:** `#000000` fondo, `#F7A810` ámbar (acentos), `#FFFFFF` blanco técnico, `#4B0082` violeta (quiebre), `#333333` bordes.
- **Contraste:** el cuerpo de texto usa `#CCCCCC` (13:1). `#666666` queda reservado para etiquetas y metadata. Nunca cuerpo de texto en `#666666` — da 3,66:1 y falla WCAG AA.
- **Idioma:** todo el contenido de cara al usuario en español. Los identificadores de código en español también, siguiendo el estilo de la v2.
- **Móvil primero.** Cada media query añade desde el ancho pequeño hacia arriba, no al revés.
- **Formato de números:** en el código, `tiempo` siempre en segundos como número (`1/125` → `0.008`), nunca como texto. El formateo a `"1/125"` ocurre solo en la capa de presentación.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `package.json` | Solo `{"type":"module","private":true}`. Sin dependencias, sin scripts de build. |
| `vercel.json` | Declara explícitamente que no hay build. |
| `index.html` | Solo estructura. Sin estilos ni lógica embebidos. |
| `css/estilo.css` | Todo el estilo. |
| `js/motor.js` | La física. Funciones puras, sin DOM. |
| `js/escalas.js` | Las series de aperturas, tiempos e ISO, y su formateo. |
| `js/escenas.js` | Datos por escena: EV, preset, tiempo seguro, placa. |
| `js/textos.js` | Todo el contenido educativo, en sus dos niveles. |
| `js/ui.js` | Conecta el motor al DOM. Único archivo que toca el DOM. |
| `test/motor.test.js` | Pruebas del motor. |
| `test/escalas.test.js` | Pruebas de las series y el formateo. |
| `img/escenas/` | Placa base y recorte del sujeto. |

`index.html` de la v2 (1.047 líneas con todo dentro) se vacía y se reconstruye. El archivo original queda en el historial de git; no hace falta conservar una copia.

---

## Fase 1 — El motor

### Task 1: Andamiaje de módulos y pruebas

Deja el proyecto en condiciones de ejecutar `node --test` sin romper el deploy estático de Vercel. Es la tarea de mayor riesgo del plan: si Vercel interpreta el `package.json` como un proyecto con build, el sitio en producción deja de servirse.

**Files:**
- Create: `package.json`
- Create: `vercel.json`
- Create: `js/motor.js`
- Create: `test/motor.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `evAjustes(apertura, tiempo, iso) -> number` — el valor de exposición de un triplete de ajustes, en EV

- [ ] **Step 1: Escribir la prueba que falla**

Crear `test/motor.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evAjustes } from '../js/motor.js';

test('la regla del soleado f/16 da EV 15', () => {
  // f/16 · 1/125 · ISO 100 es la exposición canónica a pleno sol.
  const ev = evAjustes(16, 1 / 125, 100);
  assert.ok(Math.abs(ev - 15) < 0.05, `esperaba ~15, obtuve ${ev}`);
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

```bash
node --test
```

Esperado: FALLA. El error será `Cannot find module` o `Unexpected token 'export'`, porque todavía no existen ni `js/motor.js` ni el `package.json` que declara los módulos ES.

- [ ] **Step 3: Crear el package.json**

```json
{
  "name": "exposicion-foto",
  "private": true,
  "type": "module"
}
```

No lleva `dependencies`, ni `devDependencies`, ni `scripts`. Si en algún momento aparece una dependencia, es señal de que algo se desvió del diseño.

- [ ] **Step 4: Crear el vercel.json**

```json
{
  "buildCommand": null,
  "installCommand": null,
  "outputDirectory": "."
}
```

Esto le dice a Vercel que no intente instalar ni construir nada al ver el `package.json`, y que sirva la raíz del repo tal cual.

- [ ] **Step 5: Escribir la implementación mínima**

Crear `js/motor.js`:

```js
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
```

- [ ] **Step 6: Correr la prueba y verificar que pasa**

```bash
node --test
```

Esperado: PASA. `# pass 1`, `# fail 0`.

- [ ] **Step 7: Verificar que el sitio sigue sirviéndose**

Este paso no es opcional. Abrir `index.html` (el de la v2, todavía intacto) en el navegador y confirmar que carga igual que antes. El `package.json` no debe haber cambiado nada del comportamiento en local.

Después del commit, verificar el deploy de Vercel: la rama que se despliegue debe seguir sirviendo el sitio. Si Vercel reporta un error de build, revisar `vercel.json` antes de continuar con cualquier otra tarea.

- [ ] **Step 8: Commit**

```bash
git add package.json vercel.json js/motor.js test/motor.test.js
git commit -m "Añadir andamiaje de módulos ES y pruebas del motor

package.json solo declara type:module, sin dependencias. vercel.json
desactiva build e install explícitamente para que Vercel siga sirviendo
el sitio como estático al detectar el package.json."
```

---

### Task 2: Δ y veredicto

**Files:**
- Modify: `js/motor.js`
- Modify: `test/motor.test.js`

**Interfaces:**
- Consumes: `evAjustes(apertura, tiempo, iso) -> number`
- Produces:
  - `delta(evEscena, apertura, tiempo, iso) -> number` — error de exposición en stops. Positivo = sobreexpuesta.
  - `veredicto(d) -> string` — una de `'muy-subexpuesta' | 'subexpuesta' | 'correcta' | 'sobreexpuesta' | 'muy-sobreexpuesta'`

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir a `test/motor.test.js` (y ampliar el import de la primera línea a `{ evAjustes, delta, veredicto }`):

```js
test('delta es cero cuando los ajustes coinciden con la luz de la escena', () => {
  // Escena a pleno sol (EV 15) con la exposición canónica.
  const d = delta(15, 16, 1 / 125, 100);
  assert.ok(Math.abs(d) < 0.05, `esperaba ~0, obtuve ${d}`);
});

test('duplicar el ISO desplaza delta exactamente un stop', () => {
  const base  = delta(12, 8, 1 / 250, 100);
  const doble = delta(12, 8, 1 / 250, 200);
  assert.ok(Math.abs((doble - base) - 1) < 1e-9,
    `esperaba una diferencia de 1, obtuve ${doble - base}`);
});

test('cerrar el diafragma un stop subexpone un stop', () => {
  const abierto = delta(12, 5.6, 1 / 250, 100);
  const cerrado = delta(12, 8, 1 / 250, 100);
  // f/8 deja entrar la mitad de luz que f/5.6, así que delta baja en 1.
  assert.ok(Math.abs((cerrado - abierto) + 1) < 0.02,
    `esperaba una diferencia de -1, obtuve ${cerrado - abierto}`);
});

test('los umbrales del veredicto respetan los límites de la spec', () => {
  assert.equal(veredicto(-2.01), 'muy-subexpuesta');
  assert.equal(veredicto(-2),    'subexpuesta');
  assert.equal(veredicto(-0.51), 'subexpuesta');
  assert.equal(veredicto(-0.5),  'correcta');
  assert.equal(veredicto(0),     'correcta');
  assert.equal(veredicto(0.5),   'correcta');
  assert.equal(veredicto(0.51),  'sobreexpuesta');
  assert.equal(veredicto(2),     'sobreexpuesta');
  assert.equal(veredicto(2.01),  'muy-sobreexpuesta');
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
node --test
```

Esperado: FALLA con `delta is not a function` / `veredicto is not a function`.

- [ ] **Step 3: Implementar**

Añadir a `js/motor.js`:

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
node --test
```

Esperado: PASA. `# pass 5`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/motor.js test/motor.test.js
git commit -m "Añadir cálculo de delta y veredicto de exposición

Delta se mide en stops contra el EV de la escena, que es la unidad que ya
usa la fotografía. Reemplaza la suma de índices de array de la v2."
```

---

### Task 3: Series de valores reales

Reemplaza los arrays de etiquetas de la v2 (`'f/1.4'`, `'1/125s'`) por valores numéricos con los que se puede calcular.

**Files:**
- Create: `js/escalas.js`
- Create: `test/escalas.test.js`

**Interfaces:**
- Consumes: nada
- Produces:
  - `APERTURAS_STOP`, `APERTURAS_TERCIO`, `TIEMPOS_STOP`, `TIEMPOS_TERCIO`, `ISOS_STOP`, `ISOS_TERCIO` — arrays de números, ordenados de menor a mayor
  - `formatearApertura(n) -> string` (ej. `'f/5.6'`)
  - `formatearTiempo(s) -> string` (ej. `'1/125'`, `'0.3s'`, `'2s'`)
  - `formatearIso(n) -> string` (ej. `'ISO 400'`)
  - `series(modo) -> { aperturas, tiempos, isos }` donde `modo` es `'simple'` o `'pro'`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `test/escalas.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APERTURAS_STOP, TIEMPOS_STOP, ISOS_STOP,
  formatearApertura, formatearTiempo, formatearIso, series
} from '../js/escalas.js';

test('las aperturas de paso completo avanzan un stop cada una', () => {
  for (let i = 1; i < APERTURAS_STOP.length; i++) {
    // Un stop de apertura equivale a multiplicar el número f por raíz de 2.
    const razon = APERTURAS_STOP[i] / APERTURAS_STOP[i - 1];
    const stops = Math.log2(razon * razon);
    assert.ok(Math.abs(stops - 1) < 0.12,
      `${APERTURAS_STOP[i-1]} -> ${APERTURAS_STOP[i]} son ${stops.toFixed(2)} stops`);
  }
});

test('los tiempos de paso completo se duplican', () => {
  for (let i = 1; i < TIEMPOS_STOP.length; i++) {
    const stops = Math.log2(TIEMPOS_STOP[i] / TIEMPOS_STOP[i - 1]);
    assert.ok(Math.abs(stops - 1) < 0.12,
      `${TIEMPOS_STOP[i-1]} -> ${TIEMPOS_STOP[i]} son ${stops.toFixed(2)} stops`);
  }
});

test('los ISO de paso completo se duplican exactamente', () => {
  for (let i = 1; i < ISOS_STOP.length; i++) {
    assert.equal(ISOS_STOP[i], ISOS_STOP[i - 1] * 2);
  }
});

test('el formateo de tiempo distingue fracciones de segundos enteros', () => {
  assert.equal(formatearTiempo(1 / 125), '1/125');
  assert.equal(formatearTiempo(1 / 2),   '1/2');
  assert.equal(formatearTiempo(0.3),     '0.3s');
  assert.equal(formatearTiempo(1),       '1s');
  assert.equal(formatearTiempo(30),      '30s');
});

test('el formateo de apertura e ISO', () => {
  assert.equal(formatearApertura(5.6), 'f/5.6');
  assert.equal(formatearApertura(8),   'f/8');
  assert.equal(formatearIso(400),      'ISO 400');
});

test('el modo pro ofrece más pasos que el simple', () => {
  const simple = series('simple');
  const pro    = series('pro');
  assert.ok(pro.aperturas.length > simple.aperturas.length);
  assert.ok(pro.tiempos.length   > simple.tiempos.length);
  assert.ok(pro.isos.length      > simple.isos.length);
});

test('los extremos de cada serie coinciden entre simple y pro', () => {
  const simple = series('simple');
  const pro    = series('pro');
  for (const clave of ['aperturas', 'tiempos', 'isos']) {
    assert.equal(pro[clave][0], simple[clave][0], `primer valor de ${clave}`);
    assert.equal(pro[clave].at(-1), simple[clave].at(-1), `último valor de ${clave}`);
  }
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
node --test
```

Esperado: FALLA con `Cannot find module '../js/escalas.js'`.

- [ ] **Step 3: Implementar**

Crear `js/escalas.js`:

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
node --test
```

Esperado: PASA. `# fail 0`.

Si la prueba de aperturas falla en el salto `11 -> 16`, es esperado que quede cerca del límite: `log2((16/11)²) = 1.08` stops. La tolerancia de 0.12 lo cubre. La serie f estándar no es geométricamente exacta porque usa valores redondeados por convención.

- [ ] **Step 5: Commit**

```bash
git add js/escalas.js test/escalas.test.js
git commit -m "Añadir series de valores reales de cámara

Reemplaza los arrays de etiquetas de la v2 por números con los que se
puede calcular. Corrige el defecto de raíz: en la v2 la posición del
slider de apertura no equivalía a un stop (f/1.4->f/1.8 son 2/3)."
```

---

### Task 4: Escenas y regresión de los presets

Esta tarea contiene la prueba de regresión del bug central de la v2: dos de los seis presets se contradecían con la propia calculadora.

**Files:**
- Create: `js/escenas.js`
- Create: `test/escenas.test.js`

**Interfaces:**
- Consumes: `delta` de `motor.js`
- Produces:
  - `ESCENAS` — objeto indexado por clave. Cada escena: `{ nombreSimple, nombrePro, ev, preset: {apertura, tiempo, iso}, tiempoSeguro, sujeto }`
  - `ESCENA_DEFECTO` — la clave `'nublado'`
  - `PLACA_BASE`, `RECORTE_BASE` — rutas de las imágenes

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `test/escenas.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESCENAS, ESCENA_DEFECTO } from '../js/escenas.js';
import { delta } from '../js/motor.js';
import { APERTURAS_STOP, TIEMPOS_STOP, ISOS_STOP } from '../js/escalas.js';

test('REGRESIÓN: el preset de cada escena da exposición correcta', () => {
  // Este es el bug de la v2: "paisaje con mucha luz" marcaba subexpuesto y
  // "fotografía nocturna" marcaba sobreexpuesto en la propia calculadora.
  for (const [clave, e] of Object.entries(ESCENAS)) {
    const d = delta(e.ev, e.preset.apertura, e.preset.tiempo, e.preset.iso);
    assert.ok(Math.abs(d) <= 0.5,
      `la escena "${clave}" da delta ${d.toFixed(3)}, fuera del rango correcto`);
  }
});

test('los presets usan valores de paso completo, para funcionar en modo simple', () => {
  for (const [clave, e] of Object.entries(ESCENAS)) {
    assert.ok(APERTURAS_STOP.includes(e.preset.apertura),
      `la apertura de "${clave}" no está en la serie de paso completo`);
    assert.ok(TIEMPOS_STOP.some(t => Math.abs(t - e.preset.tiempo) < 1e-9),
      `el tiempo de "${clave}" no está en la serie de paso completo`);
    assert.ok(ISOS_STOP.includes(e.preset.iso),
      `el ISO de "${clave}" no está en la serie de paso completo`);
  }
});

test('cada escena declara todos sus campos', () => {
  for (const [clave, e] of Object.entries(ESCENAS)) {
    for (const campo of ['nombreSimple', 'nombrePro', 'ev', 'preset', 'tiempoSeguro', 'sujeto']) {
      assert.ok(e[campo] !== undefined, `la escena "${clave}" no declara ${campo}`);
    }
    assert.ok(typeof e.ev === 'number', `el EV de "${clave}" debe ser número`);
  }
});

test('la escena por defecto existe', () => {
  assert.ok(ESCENAS[ESCENA_DEFECTO], `${ESCENA_DEFECTO} no está en ESCENAS`);
});

test('los EV van de más luz a menos luz en el orden declarado', () => {
  const evs = Object.values(ESCENAS).map(e => e.ev);
  for (let i = 1; i < evs.length; i++) {
    assert.ok(evs[i] < evs[i - 1],
      `el orden de las escenas no es descendente por luz: ${evs}`);
  }
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
node --test
```

Esperado: FALLA con `Cannot find module '../js/escenas.js'`.

- [ ] **Step 3: Implementar**

Crear `js/escenas.js`:

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
node --test
```

Esperado: PASA. La prueba de regresión debe pasar para las seis escenas.

- [ ] **Step 5: Verificar manualmente que los presets de la v2 habrían fallado**

Correr en la raíz del proyecto:

```bash
node --input-type=module -e "
import { delta } from './js/motor.js';
// Los presets de la v2, traducidos a valores reales:
console.log('paisaje v2 (f/8 1/500 ISO100 a EV15):', delta(15, 8, 1/500, 100).toFixed(2));
console.log('noche v2   (f/1.8 1/30 ISO6400 a EV3):', delta(3, 1.8, 1/30, 6400).toFixed(2));
"
```

Esperado: valores claramente fuera de ±0,5, confirmando que el motor nuevo detecta lo que el viejo no. Anotar los números en el mensaje de commit.

- [ ] **Step 6: Commit**

```bash
git add js/escenas.js test/escenas.test.js
git commit -m "Añadir datos de escenas con prueba de regresión de presets

Cada escena declara su EV y un preset que expone correctamente contra él.
La prueba de regresión cubre el bug central de la v2, donde dos de los seis
presets se contradecían con la propia calculadora del sitio."
```

---

### Task 5: Efectos secundarios calculados

Los tres efectos que alimentan la previsualización. Sin ellos la foto no reacciona.

**Files:**
- Modify: `js/motor.js`
- Modify: `test/motor.test.js`

**Interfaces:**
- Consumes: nada de tareas anteriores
- Produces:
  - `desenfoqueFondo(apertura, focal, distancia) -> number` — radio de desenfoque en píxeles
  - `desenfoqueMovimiento(tiempo, tiempoSeguro) -> number` — arrastre en píxeles
  - `ruido(iso) -> number` — opacidad de la capa de grano, entre 0 y 0.6
  - `brillo(d) -> number` — multiplicador para el filtro CSS `brightness()`
  - `contraste(d) -> number` — multiplicador para el filtro CSS `contrast()`

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir a `test/motor.test.js` (ampliar el import con `desenfoqueFondo, desenfoqueMovimiento, ruido, brillo, contraste`):

```js
test('abrir el diafragma aumenta el desenfoque de fondo', () => {
  const abierto = desenfoqueFondo(1.4, 50, 2);
  const medio   = desenfoqueFondo(5.6, 50, 2);
  const cerrado = desenfoqueFondo(22, 50, 2);
  assert.ok(abierto > medio, 'f/1.4 debe desenfocar más que f/5.6');
  assert.ok(medio > cerrado, 'f/5.6 debe desenfocar más que f/22');
  assert.ok(abierto > 15, `f/1.4 debe dar un desenfoque marcado, dio ${abierto}`);
  assert.equal(cerrado, 0, `f/22 debe dar cero desenfoque, dio ${cerrado}`);
});

test('un teleobjetivo desenfoca más que un gran angular a la misma apertura', () => {
  assert.ok(desenfoqueFondo(2.8, 85, 2) > desenfoqueFondo(2.8, 35, 2));
});

test('acercarse al sujeto aumenta el desenfoque de fondo', () => {
  assert.ok(desenfoqueFondo(2.8, 50, 1) > desenfoqueFondo(2.8, 50, 4));
});

test('no hay arrastre si el tiempo congela al sujeto', () => {
  assert.equal(desenfoqueMovimiento(1 / 250, 1 / 125), 0);
  assert.equal(desenfoqueMovimiento(1 / 125, 1 / 125), 0);
});

test('el arrastre crece al bajar la velocidad', () => {
  const poco   = desenfoqueMovimiento(1 / 60, 1 / 125);
  const mucho  = desenfoqueMovimiento(1 / 15, 1 / 125);
  assert.ok(poco > 0);
  assert.ok(mucho > poco);
});

test('el ruido va de cero en ISO 100 a máximo en ISO 25600', () => {
  assert.equal(ruido(100), 0);
  assert.ok(ruido(1600) > 0.2 && ruido(1600) < 0.4);
  assert.ok(Math.abs(ruido(25600) - 0.6) < 0.01);
});

test('el brillo es neutro con exposición correcta y sube al sobreexponer', () => {
  assert.ok(Math.abs(brillo(0) - 1) < 1e-9);
  assert.ok(brillo(2) > 1, 'sobreexponer debe aclarar');
  assert.ok(brillo(-2) < 1, 'subexponer debe oscurecer');
});

test('el contraste cae al alejarse de la exposición correcta', () => {
  assert.ok(Math.abs(contraste(0) - 1) < 1e-9);
  assert.ok(contraste(3) < 1, 'sobreexponer debe aplanar el contraste');
  assert.ok(contraste(-3) < 1, 'subexponer también');
  assert.ok(contraste(10) >= 0.35, 'el contraste nunca baja del piso');
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
node --test
```

Esperado: FALLA con `desenfoqueFondo is not a function`.

- [ ] **Step 3: Implementar**

Añadir a `js/motor.js`:

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
node --test
```

Esperado: PASA. `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/motor.js test/motor.test.js
git commit -m "Añadir cálculo de desenfoque, arrastre, ruido, brillo y contraste

Son los cinco valores que alimentan la previsualización. Se calculan a
partir de la física, no se describen con texto como en la v2."
```

---

### Task 6: Avisos técnicos

Solo se muestran en modo PRO, pero el motor los calcula siempre.

**Files:**
- Modify: `js/motor.js`
- Modify: `test/motor.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `avisos({ apertura, tiempo, iso, focal }) -> string[]` — cero o más de `'trepidacion' | 'difraccion' | 'ruido-alto'`

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir a `test/motor.test.js` (ampliar el import con `avisos`):

```js
test('la regla recíproca avisa de trepidación', () => {
  // A 50 mm, por debajo de 1/50 hay riesgo de foto movida por pulso.
  assert.ok(avisos({ apertura: 4, tiempo: 1/30, iso: 100, focal: 50 })
    .includes('trepidacion'));
  assert.ok(!avisos({ apertura: 4, tiempo: 1/125, iso: 100, focal: 50 })
    .includes('trepidacion'));
});

test('la regla recíproca se ajusta a la focal', () => {
  // A 200 mm, 1/125 ya es lento.
  assert.ok(avisos({ apertura: 4, tiempo: 1/125, iso: 100, focal: 200 })
    .includes('trepidacion'));
});

test('cerrar más allá de f/16 avisa de difracción', () => {
  assert.ok(avisos({ apertura: 16, tiempo: 1/125, iso: 100, focal: 50 })
    .includes('difraccion'));
  assert.ok(!avisos({ apertura: 11, tiempo: 1/125, iso: 100, focal: 50 })
    .includes('difraccion'));
});

test('el ISO muy alto avisa de pérdida de calidad', () => {
  assert.ok(avisos({ apertura: 4, tiempo: 1/125, iso: 12800, focal: 50 })
    .includes('ruido-alto'));
  assert.ok(!avisos({ apertura: 4, tiempo: 1/125, iso: 800, focal: 50 })
    .includes('ruido-alto'));
});

test('una exposición cómoda no dispara ningún aviso', () => {
  assert.deepEqual(avisos({ apertura: 5.6, tiempo: 1/250, iso: 200, focal: 50 }), []);
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
node --test
```

Esperado: FALLA con `avisos is not a function`.

- [ ] **Step 3: Implementar**

Añadir a `js/motor.js`:

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
node --test
```

Esperado: PASA. `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add js/motor.js test/motor.test.js
git commit -m "Añadir avisos técnicos de trepidación, difracción y ruido alto"
```

---

### Task 7: Equivalencias

El concepto que no existía en la v2 y que sostiene el salto pedagógico: exponer bien no es una respuesta, son varias, y cada una se ve distinta.

**Files:**
- Modify: `js/motor.js`
- Modify: `test/motor.test.js`

**Interfaces:**
- Consumes: `evAjustes`, `delta`
- Produces: `equivalencias(evEscena, { aperturas, tiempos, isos, actual }) -> Array<{ apertura, tiempo, iso, delta, clave, etiqueta }>` — hasta tres alternativas correctas con perfiles distintos. `clave` es `'desenfoque' | 'nitidez' | 'congelar'`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir a `test/motor.test.js` (ampliar el import con `equivalencias`) y añadir arriba `import { APERTURAS_STOP, TIEMPOS_STOP, ISOS_STOP } from '../js/escalas.js';`:

```js
const SERIES_SIMPLE = {
  aperturas: APERTURAS_STOP,
  tiempos:   TIEMPOS_STOP,
  isos:      ISOS_STOP
};

test('toda equivalencia devuelta expone correctamente', () => {
  for (const ev of [15, 12, 11, 8, 5, 3]) {
    for (const eq of equivalencias(ev, SERIES_SIMPLE)) {
      const d = delta(ev, eq.apertura, eq.tiempo, eq.iso);
      assert.ok(Math.abs(d) <= 0.5,
        `equivalencia "${eq.clave}" en EV ${ev} da delta ${d.toFixed(2)}`);
    }
  }
});

test('la equivalencia de desenfoque abre más que la de nitidez', () => {
  const res = equivalencias(12, SERIES_SIMPLE);
  const desenfoque = res.find(e => e.clave === 'desenfoque');
  const nitidez    = res.find(e => e.clave === 'nitidez');
  assert.ok(desenfoque, 'falta la equivalencia de desenfoque');
  assert.ok(nitidez, 'falta la equivalencia de nitidez');
  assert.ok(desenfoque.apertura < nitidez.apertura,
    'la de desenfoque debe usar un número f menor');
});

test('la equivalencia de congelar usa el tiempo más rápido disponible', () => {
  const res = equivalencias(12, SERIES_SIMPLE);
  const congelar = res.find(e => e.clave === 'congelar');
  assert.ok(congelar, 'falta la equivalencia de congelar');
  for (const otra of res) {
    assert.ok(congelar.tiempo <= otra.tiempo,
      'ninguna otra equivalencia debe ser más rápida');
  }
});

test('no se repite el triplete que el usuario ya tiene puesto', () => {
  const actual = { apertura: 2.8, tiempo: 1/500, iso: 100 };
  const res = equivalencias(12, { ...SERIES_SIMPLE, actual });
  for (const eq of res) {
    const igual = eq.apertura === actual.apertura
               && Math.abs(eq.tiempo - actual.tiempo) < 1e-9
               && eq.iso === actual.iso;
    assert.ok(!igual, 'devolvió el triplete actual como alternativa');
  }
});

test('cada equivalencia trae una etiqueta legible', () => {
  for (const eq of equivalencias(12, SERIES_SIMPLE)) {
    assert.equal(typeof eq.etiqueta, 'string');
    assert.ok(eq.etiqueta.length > 0);
  }
});

test('una escena sin solución posible devuelve lista vacía sin reventar', () => {
  // EV 40 no es alcanzable con ninguna combinación de las series.
  assert.deepEqual(equivalencias(40, SERIES_SIMPLE), []);
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
node --test
```

Esperado: FALLA con `equivalencias is not a function`.

- [ ] **Step 3: Implementar**

Añadir a `js/motor.js`:

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
node --test
```

Esperado: PASA. `# fail 0`.

Nota: la prueba "la equivalencia de congelar usa el tiempo más rápido" puede fallar si el perfil de desenfoque resulta ser también el más rápido y se deduplica. Si eso ocurre, la lista tendrá menos de tres entradas y `res.find(e => e.clave === 'congelar')` será `undefined`. En EV 12 con las series de paso completo no ocurre. Si ocurriera al ajustar valores, revisar el orden de `PERFILES`.

- [ ] **Step 5: Commit**

```bash
git add js/motor.js test/motor.test.js
git commit -m "Añadir generación de equivalencias

Dado el EV de una escena, devuelve hasta tres tripletes que también
exponen correctamente pero con perfiles visuales distintos. Es lo que
enseña que exponer bien no es una respuesta sino varias."
```

---

### Task 8: La API pública del motor

Ensambla todo en una sola llamada, para que `ui.js` no tenga que orquestar siete funciones.

**Files:**
- Modify: `js/motor.js`
- Modify: `test/motor.test.js`

**Interfaces:**
- Consumes: todas las funciones anteriores de `motor.js`
- Produces: `calcular({ apertura, tiempo, iso, escena, focal, distancia, series }) -> Resultado`

```
Resultado = {
  ev: number,                    // EV de los ajustes
  delta: number,
  veredicto: string,
  desenfoqueFondo: number,       // px
  desenfoqueMovimiento: number,  // px
  ruido: number,                 // 0–0.6
  brillo: number,
  contraste: number,
  avisos: string[],
  equivalencias: Array<{apertura, tiempo, iso, delta, clave, etiqueta}>
}
```

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir a `test/motor.test.js` (ampliar el import con `calcular`) y añadir `import { ESCENAS } from '../js/escenas.js';`:

```js
test('calcular devuelve el resultado completo', () => {
  const escena = ESCENAS['nublado'];
  const r = calcular({
    ...escena.preset,
    escena,
    series: SERIES_SIMPLE
  });
  for (const campo of ['ev', 'delta', 'veredicto', 'desenfoqueFondo',
                       'desenfoqueMovimiento', 'ruido', 'brillo',
                       'contraste', 'avisos', 'equivalencias']) {
    assert.ok(r[campo] !== undefined, `falta el campo ${campo}`);
  }
});

test('el preset de una escena da veredicto correcto vía calcular', () => {
  for (const escena of Object.values(ESCENAS)) {
    const r = calcular({ ...escena.preset, escena, series: SERIES_SIMPLE });
    assert.equal(r.veredicto, 'correcta',
      `"${escena.nombreSimple}" dio ${r.veredicto} (delta ${r.delta.toFixed(2)})`);
  }
});

test('el arrastre usa el tiempo seguro de la escena', () => {
  const escena = ESCENAS['calle-noche'];   // tiempoSeguro 1/60
  const rapido = calcular({ apertura: 2, tiempo: 1/250, iso: 3200, escena, series: SERIES_SIMPLE });
  const lento  = calcular({ apertura: 2, tiempo: 1/8,   iso: 3200, escena, series: SERIES_SIMPLE });
  assert.equal(rapido.desenfoqueMovimiento, 0);
  assert.ok(lento.desenfoqueMovimiento > 0);
});
```

- [ ] **Step 2: Correr y verificar que falla**

```bash
node --test
```

Esperado: FALLA con `calcular is not a function`.

- [ ] **Step 3: Implementar**

Añadir a `js/motor.js`:

```js
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
```

- [ ] **Step 4: Correr y verificar que pasa**

```bash
node --test
```

Esperado: PASA. Todas las pruebas de las tareas 1 a 8.

- [ ] **Step 5: Commit**

```bash
git add js/motor.js test/motor.test.js
git commit -m "Añadir calcular(), el punto de entrada único del motor

La interfaz llama a una sola función en vez de orquestar siete. El motor
queda cerrado y completamente probado antes de tocar el DOM."
```

---

## Fase 2 — Los insumos

### Task 9: Recorte del sujeto con canal alfa

Sin este archivo la previsualización no puede separar sujeto y fondo, y el desenfoque de apertura no se puede mostrar.

**Files:**
- Create: `img/escenas/20260728_placa-base_v1_sujeto.png`

**Interfaces:**
- Consumes: `img/escenas/20260728_placa-base_v1.png`
- Produces: un PNG del mismo tamaño que la placa, con la figura recortada y el resto transparente

- [ ] **Step 1: Producir el recorte**

Aplicar eliminación de fondo sobre `img/escenas/20260728_placa-base_v1.png`. Cualquiera de estas vías sirve:

- la capacidad `remove_background` disponible en la sesión,
- la skill `media-use`,
- o, si no hay ninguna, `rembg` local.

El resultado debe conservar **exactamente las mismas dimensiones** que la placa original, con la figura en la misma posición de píxel. Si la herramienta recorta al bounding box de la figura, hay que volver a componerla sobre un lienzo transparente del tamaño original, o el apilado de capas quedará desalineado.

- [ ] **Step 2: Verificar el archivo**

```bash
cd /Users/juantramolao/Claude/Projects/LIBRAPHOTOS/tips-fotografos
node --input-type=module -e "
import { readFileSync } from 'node:fs';
const b = readFileSync('img/escenas/20260728_placa-base_v1_sujeto.png');
// Cabecera IHDR de PNG: ancho y alto en los bytes 16-23, tipo de color en el 25.
const ancho = b.readUInt32BE(16), alto = b.readUInt32BE(20), tipo = b[25];
console.log({ ancho, alto, tipoDeColor: tipo });
if (tipo !== 6) throw new Error('el PNG no tiene canal alfa (se esperaba tipo 6)');
"
```

Esperado: `tipoDeColor: 6` (RGBA). Las dimensiones deben coincidir con las de la placa original — comprobarlo corriendo lo mismo sobre `20260728_placa-base_v1.png`, que dará tipo 2 o 6 pero las mismas medidas.

- [ ] **Step 3: Verificar visualmente el borde**

Abrir el recorte sobre un fondo de color plano y revisar el contorno: el pelo recogido y el cuello del abrigo son las zonas donde el recorte falla más. Si quedan halos claros del fondo original, rehacer con otra herramienta antes de continuar — un halo se vuelve muy visible cuando el fondo detrás está desenfocado.

- [ ] **Step 4: Commit**

```bash
git add img/escenas/20260728_placa-base_v1_sujeto.png
git commit -m "Añadir recorte del sujeto con canal alfa

Mismas dimensiones y posición que la placa base, para que el apilado de
capas de la previsualización quede alineado."
```

---

## Fase 3 — La interfaz

### Task 10: Esqueleto HTML y CSS base

Reconstruye la página con la jerarquía nueva: el instrumento primero, el hero reducido a una línea. Elimina el waitlist falso.

**Files:**
- Modify: `index.html` (reemplazo completo)
- Create: `css/estilo.css`

**Interfaces:**
- Consumes: nada
- Produces: los identificadores de DOM que consumen las tareas 11 a 14:
  `#escenas`, `#preview-fondo`, `#preview-sujeto`, `#preview-grano`, `#fotometro`,
  `#fotometro-aguja`, `#fotometro-lectura`, `#sl-apertura`, `#sl-tiempo`, `#sl-iso`,
  `#val-apertura`, `#val-tiempo`, `#val-iso`, `#veredicto`, `#explicacion`,
  `#avisos`, `#equivalencias`, `#switch-modo`

- [ ] **Step 1: Escribir el index.html**

Reemplazar `index.html` por completo:

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Triángulo de exposición — exposicion.foto</title>
<link rel="stylesheet" href="css/estilo.css">
</head>
<body>
<div class="page">

  <header class="header">
    <a class="logo" href="/">
      <span class="logo-lp">LP</span>
      <span class="logo-divider">|</span>
      <span class="logo-name">EXPOSICION.FOTO</span>
    </a>
    <button id="switch-modo" class="switch" role="switch" aria-checked="false">
      <span class="switch-simple">SIMPLE</span>
      <span class="switch-pro">PRO</span>
    </button>
  </header>

  <section class="hero">
    <h1>Aprende a <span class="hero-accent">exponer</span> bien.</h1>
  </section>

  <section class="instrumento">

    <p class="section-label">1 · La luz de la escena</p>
    <div id="escenas" class="escenas" role="radiogroup" aria-label="Situación de luz"></div>

    <p class="section-label">2 · Lo que verías</p>
    <div class="preview" id="preview">
      <img id="preview-fondo"  class="preview-capa preview-fondo"  alt="">
      <img id="preview-sujeto" class="preview-capa preview-sujeto" alt="Previsualización de la fotografía">
      <div id="preview-grano"  class="preview-capa preview-grano" aria-hidden="true"></div>
    </div>

    <div class="fotometro" id="fotometro">
      <div class="fotometro-escala"><div class="fotometro-aguja" id="fotometro-aguja"></div></div>
      <p class="fotometro-lectura" id="fotometro-lectura"></p>
    </div>

    <p class="section-label">3 · Tus ajustes</p>
    <div class="controles">
      <div class="control">
        <label class="control-label" for="sl-apertura">Apertura</label>
        <output class="control-valor" id="val-apertura"></output>
        <input class="control-slider" type="range" id="sl-apertura" min="0" step="1">
      </div>
      <div class="control">
        <label class="control-label" for="sl-tiempo">Velocidad</label>
        <output class="control-valor" id="val-tiempo"></output>
        <input class="control-slider" type="range" id="sl-tiempo" min="0" step="1">
      </div>
      <div class="control">
        <label class="control-label" for="sl-iso">ISO</label>
        <output class="control-valor" id="val-iso"></output>
        <input class="control-slider" type="range" id="sl-iso" min="0" step="1">
      </div>
    </div>

    <div class="lectura" aria-live="polite">
      <p class="lectura-veredicto" id="veredicto"></p>
      <p class="lectura-explicacion" id="explicacion"></p>
      <ul class="avisos" id="avisos"></ul>
    </div>

    <p class="section-label">4 · Otras formas de exponer lo mismo</p>
    <div id="equivalencias" class="equivalencias"></div>

  </section>

  <section id="glosario"></section>
  <section id="faq"></section>

  <footer class="footer">
    <span class="footer-copy">exposicion.foto</span>
    <span class="footer-credito">Una herramienta de <a href="https://libraphotos.com">Libraphotos</a></span>
  </footer>

</div>
<script type="module" src="js/ui.js"></script>
</body>
</html>
```

El waitlist desaparece por completo, junto con la función `subscribir()` que descartaba el correo.

- [ ] **Step 2: Escribir el CSS base**

Crear `css/estilo.css`. Solo la base y el layout; la previsualización y las equivalencias llegan en las tareas siguientes.

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #000000;
  --surface:   #0D0D0D;
  --border:    #333333;
  --border-hi: #FFFFFF;
  --accent:    #F7A810;
  --accent-fg: #000000;
  --violet:    #4B0082;
  --texto:     #FFFFFF;   /* titulares */
  --cuerpo:    #CCCCCC;   /* cuerpo de texto — 13:1 sobre negro */
  --meta:      #666666;   /* SOLO etiquetas y metadata — 3,66:1, no usar en cuerpo */
}

html { font-size: 16px; }

body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: var(--bg);
  color: var(--cuerpo);
  line-height: 1.5;
}

/* Móvil primero: el ancho base es el del teléfono. */
.page { max-width: 900px; margin: 0 auto; padding: 0 16px 64px; }
@media (min-width: 720px) { .page { padding: 0 32px 80px; } }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; margin: 0 -16px 24px;
  border-bottom: 3px solid var(--border-hi);
}
@media (min-width: 720px) { .header { padding: 20px 32px; margin: 0 -32px 32px; } }

.logo { display: flex; align-items: center; gap: 4px; text-decoration: none; }
.logo-lp { font-weight: 800; letter-spacing: -0.06em; color: var(--accent);
           text-transform: uppercase; line-height: 1; }
.logo-divider { color: var(--border); margin: 0 6px; }
.logo-name { font-family: 'IBM Plex Mono', monospace; font-size: 11px;
             color: var(--meta); letter-spacing: 0.08em; text-transform: uppercase; }

.switch {
  display: flex; border: 2px solid var(--border-hi); background: transparent;
  cursor: pointer; font-family: 'IBM Plex Mono', monospace; font-size: 10px;
  letter-spacing: 0.1em; transition: none;
}
.switch span { padding: 6px 12px; color: var(--meta); }
.switch .switch-simple { background: var(--accent); color: var(--accent-fg); }
.switch[aria-checked="true"] .switch-simple { background: transparent; color: var(--meta); }
.switch[aria-checked="true"] .switch-pro    { background: var(--accent); color: var(--accent-fg); }

.hero { margin-bottom: 32px; }
.hero h1 {
  font-size: clamp(28px, 7vw, 48px); font-weight: 800; line-height: 1.05;
  letter-spacing: -0.03em; text-transform: uppercase; color: var(--texto);
}
.hero-accent { color: var(--accent); }

.section-label {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--cuerpo);
  text-transform: uppercase; letter-spacing: 0.15em;
  padding-bottom: 10px; border-bottom: 2px solid var(--border-hi);
  margin: 32px 0 16px;
}

.escenas { display: grid; grid-template-columns: 1fr 1fr; gap: 0;
           border: 2px solid var(--border-hi); }
@media (min-width: 720px) { .escenas { grid-template-columns: repeat(3, 1fr); } }

.escena-btn {
  padding: 14px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 10px;
  letter-spacing: 0.06em; text-transform: uppercase; text-align: left;
  border: none; border-right: 1px solid var(--border-hi);
  border-bottom: 1px solid var(--border-hi);
  background: transparent; color: var(--cuerpo); cursor: pointer;
  transition: none; min-height: 44px;
}
.escena-btn:hover,
.escena-btn[aria-checked="true"] { background: var(--accent); color: var(--accent-fg); }

.controles { display: grid; grid-template-columns: 1fr; gap: 0;
             border: 2px solid var(--border-hi); }
@media (min-width: 720px) { .controles { grid-template-columns: repeat(3, 1fr); } }

.control { padding: 16px; border-bottom: 2px solid var(--border-hi); }
.control:last-child { border-bottom: none; }
@media (min-width: 720px) {
  .control { border-bottom: none; border-right: 2px solid var(--border-hi); }
  .control:last-child { border-right: none; }
}

.control-label { display: block; font-family: 'IBM Plex Mono', monospace;
                 font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase;
                 color: var(--meta); margin-bottom: 6px; }
.control-valor { display: block; font-family: 'IBM Plex Mono', monospace;
                 font-size: clamp(32px, 9vw, 48px); line-height: 1;
                 letter-spacing: -0.04em; color: var(--texto); margin-bottom: 12px; }

.control-slider { -webkit-appearance: none; appearance: none; width: 100%;
                  height: 2px; background: var(--border-hi); outline: none;
                  cursor: pointer; }
.control-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none;
  width: 20px; height: 20px; background: var(--accent);
  border: 2px solid var(--bg); border-radius: 0; cursor: pointer; }
.control-slider::-moz-range-thumb { width: 20px; height: 20px; background: var(--accent);
  border: 2px solid var(--bg); border-radius: 0; cursor: pointer; }

.lectura { border: 2px solid var(--border-hi); border-left-width: 6px;
           padding: 16px; margin-top: 16px; }
.lectura-veredicto { font-weight: 700; text-transform: uppercase;
                     color: var(--texto); margin-bottom: 8px; }
.lectura-explicacion { font-family: 'Lora', Georgia, serif; font-size: 14px;
                       line-height: 1.7; color: var(--cuerpo); }
.avisos { list-style: none; margin-top: 12px; }
.avisos li { font-family: 'IBM Plex Mono', monospace; font-size: 10px;
             letter-spacing: 0.08em; text-transform: uppercase;
             color: var(--accent); padding: 4px 0; }

.footer { margin-top: 48px; padding: 20px 0; border-top: 2px solid var(--border-hi);
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
          font-family: 'IBM Plex Mono', monospace; font-size: 10px;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--cuerpo); }
.footer a { color: var(--accent); }

/* Foco visible en teclado — no existía en la v2. */
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
```

- [ ] **Step 3: Verificar que la página carga**

Abrir `index.html` en el navegador. Esperado: se ve el encabezado con el switch, el hero, las etiquetas de sección y el pie. Las zonas dinámicas (escenas, previsualización, controles) están vacías todavía — es lo correcto en esta tarea. La consola mostrará un 404 de `js/ui.js`, que aún no existe.

- [ ] **Step 4: Verificar el contraste**

Con las herramientas de desarrollo, inspeccionar `.lectura-explicacion` y confirmar que el color computado es `rgb(204, 204, 204)`, no `rgb(102, 102, 102)`. Este es el hallazgo de la spec §6.1.

- [ ] **Step 5: Commit**

```bash
git add index.html css/estilo.css
git commit -m "Reconstruir la página con el instrumento primero

Hero reducido a una línea, jerarquía móvil primero, y el waitlist falso
eliminado junto con la función que descartaba el correo. El cuerpo de
texto pasa de #666666 (3,66:1, bajo AA) a #CCCCCC (13:1)."
```

---

### Task 11: Controles, escenas y fotómetro conectados al motor

Primera versión funcional: mover un slider cambia el veredicto.

**Files:**
- Create: `js/ui.js`
- Modify: `css/estilo.css`

**Interfaces:**
- Consumes: `calcular` de `motor.js`; `series`, `formatearApertura`, `formatearTiempo`, `formatearIso` de `escalas.js`; `ESCENAS`, `ESCENA_DEFECTO` de `escenas.js`
- Produces: el objeto `estado` interno de `ui.js` y la función `render()`

- [ ] **Step 1: Escribir ui.js**

Crear `js/ui.js`:

```js
import { calcular } from './motor.js';
import { series, formatearApertura, formatearTiempo, formatearIso } from './escalas.js';
import { ESCENAS, ESCENA_DEFECTO } from './escenas.js';

const estado = {
  modo: 'simple',
  escena: ESCENA_DEFECTO,
  iApertura: 0,
  iTiempo: 0,
  iIso: 0,
  focal: 50,
  distancia: 2
};

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

/** Los valores actuales, resueltos desde los índices de slider. */
function valores() {
  const s = series(estado.modo);
  return {
    apertura: s.aperturas[estado.iApertura],
    tiempo:   s.tiempos[estado.iTiempo],
    iso:      s.isos[estado.iIso]
  };
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

function pintarEscenas() {
  const cont = $('escenas');
  cont.innerHTML = '';
  for (const [clave, e] of Object.entries(ESCENAS)) {
    const btn = document.createElement('button');
    btn.className = 'escena-btn';
    btn.type = 'button';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(clave === estado.escena));
    btn.textContent = estado.modo === 'pro'
      ? `${e.nombrePro} · EV ${e.ev}`
      : e.nombreSimple;
    btn.addEventListener('click', () => {
      estado.escena = clave;
      aplicarPreset();
      pintarEscenas();
      render();
    });
    cont.appendChild(btn);
  }
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

function render() {
  const v = valores();
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

  pintarFotometro(r);
  document.dispatchEvent(new CustomEvent('calculo', { detail: { r, v, escena } }));
}

/**
 * La aguja recorre ±3 stops. En modo simple se muestra solo la posición;
 * en pro, además el valor numérico.
 */
function pintarFotometro(r) {
  const acotado = Math.max(-3, Math.min(3, r.delta));
  const porcentaje = ((acotado + 3) / 6) * 100;
  $('fotometro-aguja').style.left = `${porcentaje}%`;
  $('fotometro').dataset.veredicto = r.veredicto;

  const palabras = {
    'muy-subexpuesta':  'Muy oscura',
    'subexpuesta':      'Oscura',
    'correcta':         'Correcta',
    'sobreexpuesta':    'Quemada',
    'muy-sobreexpuesta':'Muy quemada'
  };
  $('fotometro-lectura').textContent = estado.modo === 'pro'
    ? `${r.delta > 0 ? '+' : ''}${r.delta.toFixed(1)} EV · ${palabras[r.veredicto]}`
    : palabras[r.veredicto];
}

function conectar() {
  const pares = [['sl-apertura', 'iApertura'], ['sl-tiempo', 'iTiempo'], ['sl-iso', 'iIso']];
  for (const [id, campo] of pares) {
    $(id).addEventListener('input', (ev) => {
      estado[campo] = parseInt(ev.target.value, 10);
      render();
    });
  }
}

function iniciar() {
  aplicarPreset();
  pintarEscenas();
  configurarSliders();
  conectar();
  render();
}

document.addEventListener('DOMContentLoaded', iniciar);

export { estado, render, valores, colocarEn, aplicarPreset, configurarSliders, pintarEscenas };
```

- [ ] **Step 2: Añadir el CSS del fotómetro**

Añadir a `css/estilo.css`:

```css
.fotometro { margin-top: 16px; }
.fotometro-escala {
  position: relative; height: 24px; border: 2px solid var(--border-hi);
  background: linear-gradient(to right,
    #000 0%, var(--surface) 40%, var(--accent) 50%, var(--violet) 60%, var(--violet) 100%);
}
.fotometro-aguja {
  position: absolute; top: -4px; bottom: -4px; width: 4px;
  background: var(--border-hi); transform: translateX(-50%);
}
.fotometro-lectura {
  font-family: 'IBM Plex Mono', monospace; font-size: 11px;
  letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px;
  color: var(--cuerpo);
}
.fotometro[data-veredicto="correcta"] .fotometro-lectura { color: var(--accent); }
```

- [ ] **Step 3: Verificar en el navegador**

Abrir `index.html`. Esperado:
- Aparecen los seis botones de escena; "Día nublado" está marcado.
- Los tres sliders muestran `f/2.8`, `1/500`, `ISO 100` — el preset de esa escena.
- La lectura del fotómetro dice `Correcta` y la aguja está al centro.
- Mover el slider de ISO dos pasos a la derecha cambia la lectura a `Quemada`.
- Elegir "En la calle, de noche" recoloca los sliders en `f/2`, `1/60`, `ISO 3200` y vuelve a `Correcta`.

Si al elegir una escena la lectura no vuelve a `Correcta`, el fallo está en `aplicarPreset` o en los datos de `escenas.js`, no en el motor — el motor ya está probado.

- [ ] **Step 4: Commit**

```bash
git add js/ui.js css/estilo.css
git commit -m "Conectar escenas, controles y fotómetro al motor

Los dos modos separados de la v2 se fusionan: elegir la escena fija el EV
y coloca los sliders en un preset correcto, desde donde el usuario explora."
```

---

### Task 12: La previsualización

El elemento más grande de la página y el corazón de la versión.

**Files:**
- Modify: `js/ui.js`
- Modify: `css/estilo.css`

**Interfaces:**
- Consumes: el evento `calculo` emitido por `render()`; `PLACA_BASE` y `RECORTE_BASE` de `escenas.js`
- Produces: nada que consuman otras tareas

- [ ] **Step 1: Añadir el CSS de la previsualización**

Añadir a `css/estilo.css`:

```css
.preview {
  position: relative; width: 100%; aspect-ratio: 3 / 4;
  overflow: hidden; border: 2px solid var(--border-hi); background: #000;
}
.preview-capa { position: absolute; inset: 0; width: 100%; height: 100%;
                object-fit: cover; }

/* El fondo recibe el desenfoque de apertura; el sujeto se mantiene nítido
   salvo por el arrastre de movimiento. Ambos comparten brillo y contraste. */
.preview-fondo  { z-index: 1; }
.preview-sujeto { z-index: 2; }

.preview-grano {
  z-index: 3; pointer-events: none; opacity: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23r)' opacity='0.5'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}
```

La capa de grano es un SVG con `feTurbulence` embebido como data URI: no requiere ningún archivo externo ni petición de red.

- [ ] **Step 2: Añadir el render de la previsualización a ui.js**

Añadir a `js/ui.js` (y ampliar el import de `escenas.js` a `{ ESCENAS, ESCENA_DEFECTO, PLACA_BASE, RECORTE_BASE }`):

```js
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

document.addEventListener('calculo', (ev) => pintarPreview(ev.detail.r));
```

Y añadir `iniciarPreview();` como primera línea del cuerpo de `iniciar()`.

- [ ] **Step 3: Verificar en el navegador**

Abrir `index.html`. Esperado, con "Día nublado" activo:
- Se ve la foto de la calle, nítida, con brillo neutro.
- Mover el slider de apertura hacia `f/1.4`: el fondo (ladrillos, hiedra, bicicletas) se desenfoca progresivamente mientras la figura sigue nítida. **Esta es la verificación central del proyecto.**
- Mover el slider de apertura hacia `f/22`: el fondo vuelve a estar nítido.
- Subir el ISO a 12800: aparece grano visible sobre toda la imagen.
- Bajar el tiempo a `1/8` con "En la calle, de noche": la figura se arrastra.
- Desajustar la exposición: la imagen se quema o se apaga, y el contraste se aplana.

- [ ] **Step 4: Verificar el rendimiento en móvil**

Con las herramientas de desarrollo en emulación móvil y estrangulamiento de CPU 4×, arrastrar el slider de apertura de extremo a extremo. Esperado: el movimiento se mantiene fluido. Si se entrecorta, la causa más probable es el radio de desenfoque en la capa de fondo a tamaño completo; reducir `K_DESENFOQUE` en `motor.js` antes de recurrir a canvas.

- [ ] **Step 5: Verificar el borde del recorte**

Con la apertura en `f/1.4`, mirar el contorno de la figura contra el fondo desenfocado. Si aparece un halo claro, el problema está en el recorte de la tarea 9, no aquí.

- [ ] **Step 6: Commit**

```bash
git add js/ui.js css/estilo.css
git commit -m "Añadir la previsualización con capas y filtros CSS

Dos imágenes apiladas — fondo y sujeto recortado — con blur, brightness,
contrast y una capa de grano SVG embebido. Sin canvas y sin peticiones
externas."
```

---

### Task 13: Textos y el switch SIMPLE/PRO

**Files:**
- Create: `js/textos.js`
- Modify: `js/ui.js`
- Modify: `css/estilo.css`

**Interfaces:**
- Consumes: `veredicto` y `avisos` del resultado del motor
- Produces:
  - `explicacion(veredicto, modo) -> string`
  - `textoAviso(clave, modo) -> string`
  - `GLOSARIO` — array de `{ termino, simple, pro }`
  - `FAQ` — array de `{ pregunta, simple, pro }`

- [ ] **Step 1: Escribir textos.js**

Crear `js/textos.js`. Todo el contenido educativo vive aquí; se puede reescribir sin tocar lógica.

```js
// textos.js — todo el contenido educativo, en sus dos niveles.
// SIMPLE: lenguaje natural, sin jerga.
// PRO: nombra stops, EV, difracción, regla recíproca.

const EXPLICACIONES = {
  'muy-subexpuesta': {
    simple: 'La foto sale casi negra: entra muy poca luz. Abre más el diafragma (número f más bajo), usa una velocidad más lenta o sube el ISO.',
    pro:    'Subexposición de más de 2 stops. Compensa abriendo el diafragma, alargando el tiempo o subiendo el ISO — cualquiera de los tres, o repartido entre ellos.'
  },
  'subexpuesta': {
    simple: 'La foto sale oscura. Te falta un poco de luz: prueba abrir el diafragma o bajar la velocidad.',
    pro:    'Subexposición de entre medio y 2 stops. Recuperable en revelado si disparas en RAW, pero pagarás con ruido en las sombras.'
  },
  'correcta': {
    simple: 'Bien. Los tres ajustes están equilibrados para esta luz y la foto sale como debe.',
    pro:    'Exposición dentro de ±0,5 stops del valor de la escena. Desde aquí puedes reorganizar los tres parámetros sin cambiar el brillo — mira las equivalencias.'
  },
  'sobreexpuesta': {
    simple: 'La foto sale demasiado clara. Entra más luz de la necesaria: cierra el diafragma, sube la velocidad o baja el ISO.',
    pro:    'Sobreexposición de entre medio y 2 stops. Las altas luces empiezan a recortarse y esa información no se recupera en revelado.'
  },
  'muy-sobreexpuesta': {
    simple: 'La foto sale quemada, casi blanca. Entra muchísima luz de más.',
    pro:    'Sobreexposición de más de 2 stops. Altas luces completamente recortadas: el detalle en esas zonas está perdido de forma irreversible.'
  }
};

const AVISOS = {
  'trepidacion': {
    simple: 'A esta velocidad la foto puede salir movida por el pulso. Apoya la cámara.',
    pro:    'Por debajo de la regla recíproca (1/focal): riesgo de trepidación. Usa trípode o estabilización.'
  },
  'difraccion': {
    simple: 'Con el diafragma tan cerrado la foto pierde un poco de nitidez.',
    pro:    'Difracción: más allá de f/16 la nitidez global cae aunque la profundidad de campo aumente.'
  },
  'ruido-alto': {
    simple: 'Con este ISO va a aparecer bastante grano en las zonas oscuras.',
    pro:    'ISO alto: ruido de luminancia y croma notorio, y pérdida de rango dinámico.'
  }
};

export function explicacion(veredicto, modo) {
  return EXPLICACIONES[veredicto][modo === 'pro' ? 'pro' : 'simple'];
}

export function textoAviso(clave, modo) {
  return AVISOS[clave][modo === 'pro' ? 'pro' : 'simple'];
}

export const GLOSARIO = [
  {
    termino: 'Apertura',
    simple: 'El tamaño del agujero por donde entra la luz. Número bajo (f/2) = entra mucha luz y el fondo sale desenfocado. Número alto (f/16) = entra poca luz y sale casi todo nítido.',
    pro:    'Diámetro relativo del diafragma, expresado como f = distancia focal / diámetro efectivo. Cada stop multiplica o divide el área por dos, de ahí la progresión en √2. Controla también la profundidad de campo.'
  },
  {
    termino: 'Velocidad de obturación',
    simple: 'Cuánto tiempo está abierta la cámara. Rápida congela el movimiento; lenta lo deja borroso.',
    pro:    'Tiempo de exposición del sensor. Cada stop duplica o divide a la mitad ese tiempo. Determina el arrastre del sujeto y, por la regla recíproca, el riesgo de trepidación.'
  },
  {
    termino: 'ISO',
    simple: 'Cuánta sensibilidad a la luz tiene la cámara. Subirlo aclara la foto, pero le mete grano.',
    pro:    'Ganancia aplicada a la señal del sensor. Cada stop duplica la señal y también el ruido, reduciendo el rango dinámico disponible.'
  },
  {
    termino: 'Stop',
    simple: 'Un paso. Un stop más significa el doble de luz; un stop menos, la mitad.',
    pro:    'La unidad de la exposición: un factor de 2 en la luz que llega al sensor. Los tres parámetros se miden en la misma unidad, y por eso son intercambiables entre sí.'
  },
  {
    termino: 'Triángulo de exposición',
    simple: 'La relación entre los tres ajustes. Si cambias uno, tienes que compensar con otro para que la foto siga saliendo bien.',
    pro:    'El sistema de tres variables que determinan la exposición. Como todas se miden en stops, un cambio de +n en una se compensa con −n repartidos entre las otras dos: eso son las equivalencias.'
  }
];

export const FAQ = [
  {
    pregunta: '¿Qué es el triángulo de exposición?',
    simple: 'Son los tres ajustes que deciden si tu foto sale clara, oscura o bien: la apertura, la velocidad y el ISO. Se llaman triángulo porque están conectados — si tocas uno, tienes que compensar con otro.',
    pro:    'El conjunto de apertura, tiempo de obturación e ISO, las tres variables que determinan la exposición. Todas se miden en stops, así que un cambio en una se compensa exactamente con el cambio inverso repartido entre las otras dos.'
  },
  {
    pregunta: '¿Por qué mis fotos salen oscuras?',
    simple: 'Porque no está entrando suficiente luz para la situación en la que disparas. Prueba abrir más el diafragma, usar una velocidad más lenta o subir el ISO. En interiores y de noche casi siempre hay que subir el ISO.',
    pro:    'Los ajustes están por debajo del EV de la escena. Mide la diferencia en stops y compénsala. Si ya estás a diafragma máximo y en el límite de la regla recíproca, la única variable que queda es el ISO.'
  },
  {
    pregunta: '¿Qué ISO uso de noche?',
    simple: 'En la calle de noche, normalmente entre 1600 y 6400. Va a salir con grano, y es inevitable: mejor una foto con grano que una foto movida u oscura.',
    pro:    'En vía pública iluminada (EV 3), con f/2 y 1/60 el ISO cae alrededor de 3200. Prioriza el tiempo que congela al sujeto y la apertura máxima útil de tu objetivo, y deja que el ISO absorba lo que falte.'
  },
  {
    pregunta: '¿Qué apertura uso para retratos?',
    simple: 'Entre f/1.8 y f/2.8 si quieres el fondo bien desenfocado. Ojo: con el diafragma muy abierto la zona nítida es tan estrecha que puedes dejar los ojos fuera de foco.',
    pro:    'Entre f/1.8 y f/2.8 para separar al sujeto del fondo. A 85 mm y 2 m, f/1.8 deja una profundidad de campo de pocos centímetros: enfoca al ojo más cercano. Cerrar a f/4 da margen sin perder la separación.'
  },
  {
    pregunta: '¿Qué velocidad necesito para congelar el movimiento?',
    simple: 'Para una persona quieta, 1/125 basta. Para alguien caminando, 1/250. Para deporte o carreras, 1/500 o más rápido.',
    pro:    'Depende de la velocidad angular del sujeto en el encuadre, no de su velocidad absoluta: un sujeto que cruza el cuadro exige más que uno que viene de frente. Como piso, respeta siempre la regla recíproca para el pulso.'
  }
];
```

- [ ] **Step 2: Conectar los textos y el switch en ui.js**

Añadir a `js/ui.js` el import `import { explicacion, textoAviso } from './textos.js';` y lo siguiente:

```js
function pintarLectura(r) {
  const titulos = {
    'muy-subexpuesta':  'Muy subexpuesta',
    'subexpuesta':      'Subexpuesta',
    'correcta':         'Exposición correcta',
    'sobreexpuesta':    'Sobreexpuesta',
    'muy-sobreexpuesta':'Muy sobreexpuesta'
  };
  $('veredicto').textContent   = titulos[r.veredicto];
  $('explicacion').textContent = explicacion(r.veredicto, estado.modo);

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

document.addEventListener('calculo', (ev) => pintarLectura(ev.detail.r));

const CLAVE_MODO = 'exposicion-foto:modo';

function cambiarModo(nuevo) {
  // Se conservan los valores reales, no los índices: las series cambian de
  // longitud entre modos y un índice de la serie de stops apunta a otro valor
  // en la de tercios.
  const v = valores();
  estado.modo = nuevo;
  colocarEn(v);

  document.body.dataset.modo = nuevo;
  $('switch-modo').setAttribute('aria-checked', String(nuevo === 'pro'));
  localStorage.setItem(CLAVE_MODO, nuevo);

  configurarSliders();
  pintarEscenas();
  render();
}

function iniciarSwitch() {
  const guardado = localStorage.getItem(CLAVE_MODO);
  estado.modo = guardado === 'pro' ? 'pro' : 'simple';
  document.body.dataset.modo = estado.modo;
  $('switch-modo').setAttribute('aria-checked', String(estado.modo === 'pro'));
  $('switch-modo').addEventListener('click', () => {
    cambiarModo(estado.modo === 'pro' ? 'simple' : 'pro');
  });
}
```

En `iniciar()`, llamar a `iniciarSwitch()` **antes** de `aplicarPreset()`, para que el modo guardado ya esté activo cuando se construyan las series.

Añadir también los controles de focal y distancia, que la spec §4.3 exige en PRO. En `index.html`, dentro de `.instrumento` y justo después del bloque `.controles`:

```html
<div class="optica" id="optica" hidden>
  <label class="control-label" for="sl-focal">Distancia focal</label>
  <input type="range" id="sl-focal" class="control-slider" min="24" max="200" step="1" value="50">
  <output class="optica-valor" id="val-focal">50 mm</output>

  <label class="control-label" for="sl-distancia">Distancia al sujeto</label>
  <input type="range" id="sl-distancia" class="control-slider" min="0.5" max="10" step="0.5" value="2">
  <output class="optica-valor" id="val-distancia">2 m</output>
</div>
```

Y en `js/ui.js`:

```js
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
```

`conectarOptica()` se llama una sola vez desde `iniciar()`. La visibilidad la controla el modo: añadir al final de `cambiarModo()` y de `iniciarSwitch()` la línea

```js
  $('optica').hidden = estado.modo !== 'pro';
```

En SIMPLE los valores quedan fijos en 50 mm y 2 m, que son los que ya usa `estado` por defecto.

Y en `css/estilo.css`:

```css
.optica { display: grid; grid-template-columns: 1fr auto; gap: 8px 16px;
          align-items: center; border: 2px solid var(--border-hi);
          border-top: none; padding: 16px; }
.optica .control-label { grid-column: 1 / -1; margin-bottom: 0; }
.optica-valor { font-family: 'IBM Plex Mono', monospace; font-size: 13px;
                color: var(--texto); }
```

- [ ] **Step 3: Verificar en el navegador**

Abrir `index.html`. Esperado:
- En SIMPLE, la explicación usa lenguaje natural y no hay avisos.
- Pulsar el switch: el fotómetro añade el valor numérico (`+1.0 EV · Quemada`), los nombres de escena pasan a incluir su EV, y aparecen los avisos técnicos cuando corresponde.
- Los sliders se vuelven más finos: mover uno un paso ahora cambia menos el resultado.
- Al pasar de PRO a SIMPLE, los valores mostrados se mantienen aproximadamente iguales, no saltan a otro extremo.
- Recargar la página conserva el modo elegido.
- Poner `f/16` en PRO hace aparecer el aviso de difracción; `1/30` a 50 mm, el de trepidación.
- En PRO aparecen los controles de focal y distancia; en SIMPLE están ocultos.
- Subir la focal a 200 mm aumenta el desenfoque del fondo en la previsualización sin cambiar el brillo, y hace saltar el aviso de trepidación a velocidades que antes no lo disparaban.
- Alejar el sujeto a 10 m reduce el desenfoque del fondo.

- [ ] **Step 4: Commit**

```bash
git add js/textos.js js/ui.js
git commit -m "Añadir textos en dos niveles y el switch SIMPLE/PRO

El switch cambia la densidad de información, no solo la redacción: paso de
los sliders, escala del fotómetro, EV visible y avisos técnicos. Persiste
en localStorage y arranca en SIMPLE."
```

---

### Task 14: Equivalencias en la interfaz

**Files:**
- Modify: `js/ui.js`
- Modify: `css/estilo.css`

**Interfaces:**
- Consumes: `r.equivalencias` del resultado del motor
- Produces: nada que consuman otras tareas

- [ ] **Step 1: Añadir el CSS**

Añadir a `css/estilo.css`:

```css
.equivalencias { display: grid; grid-template-columns: 1fr; gap: 0;
                 border: 2px solid var(--border-hi); }
@media (min-width: 720px) { .equivalencias { grid-template-columns: repeat(3, 1fr); } }

.equivalencia { padding: 16px; border-bottom: 2px solid var(--border-hi);
                text-align: left; background: transparent; cursor: pointer;
                transition: none; }
.equivalencia:last-child { border-bottom: none; }
@media (min-width: 720px) {
  .equivalencia { border-bottom: none; border-right: 2px solid var(--border-hi); }
  .equivalencia:last-child { border-right: none; }
}
.equivalencia:hover { background: var(--accent); }
.equivalencia:hover * { color: var(--accent-fg) !important; }

.equivalencia-etiqueta { font-family: 'IBM Plex Mono', monospace; font-size: 9px;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent);
  margin-bottom: 8px; }
.equivalencia-valores { font-family: 'IBM Plex Mono', monospace; font-size: 15px;
  color: var(--texto); line-height: 1.6; }
```

- [ ] **Step 2: Pintar las equivalencias en ui.js**

Añadir a `js/ui.js` (ampliar el import de `escalas.js` si hace falta):

```js
function pintarEquivalencias(r) {
  const cont = $('equivalencias');
  cont.innerHTML = '';
  // Solo tienen sentido cuando la exposición actual ya es correcta: son
  // "otras formas de exponer lo mismo", no correcciones.
  if (r.veredicto !== 'correcta') {
    const p = document.createElement('p');
    p.className = 'equivalencia';
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
  render();
}

document.addEventListener('calculo', (ev) => pintarEquivalencias(ev.detail.r));
```

- [ ] **Step 3: Verificar en el navegador**

Abrir `index.html` con "Día nublado". Esperado:
- Con la exposición correcta aparecen hasta tres alternativas, cada una con su etiqueta.
- Pulsar "Máximo desenfoque de fondo" recoloca los sliders y **la previsualización cambia de aspecto sin cambiar de brillo**. Esa es la lección completa: mismo brillo, distinto resultado.
- Pulsar "Todo en foco" deja el fondo nítido, también sin cambiar el brillo.
- Desajustar el ISO hace que el bloque se reemplace por el mensaje que invita a corregir la exposición primero.

- [ ] **Step 4: Commit**

```bash
git add js/ui.js css/estilo.css
git commit -m "Añadir las equivalencias a la interfaz

Aplicar una equivalencia cambia el aspecto de la previsualización sin
cambiar el brillo, que es exactamente lo que enseña el concepto."
```

---

### Task 15: Glosario y preguntas frecuentes

Contenido en dos niveles, y el bloque que sostiene el SEO.

**Files:**
- Modify: `js/ui.js`
- Modify: `css/estilo.css`

**Interfaces:**
- Consumes: `GLOSARIO` y `FAQ` de `textos.js`
- Produces: el DOM de `#glosario` y `#faq`, que la tarea 16 usa para los datos estructurados

- [ ] **Step 1: Pintar los bloques**

Añadir a `js/ui.js` (ampliar el import de `textos.js` con `GLOSARIO, FAQ`):

```js
function pintarContenido() {
  const nivel = estado.modo === 'pro' ? 'pro' : 'simple';

  const glo = $('glosario');
  glo.innerHTML = '<p class="section-label">Conceptos clave</p>';
  const listaGlo = document.createElement('div');
  listaGlo.className = 'contenido-lista';
  for (const item of GLOSARIO) {
    const fila = document.createElement('div');
    fila.className = 'contenido-fila';
    fila.innerHTML = `<h3 class="contenido-termino">${item.termino}</h3>` +
                     `<p class="contenido-texto">${item[nivel]}</p>`;
    listaGlo.appendChild(fila);
  }
  glo.appendChild(listaGlo);

  const faq = $('faq');
  faq.innerHTML = '<p class="section-label">Preguntas frecuentes</p>';
  const listaFaq = document.createElement('div');
  listaFaq.className = 'contenido-lista';
  for (const item of FAQ) {
    const fila = document.createElement('div');
    fila.className = 'contenido-fila';
    fila.innerHTML = `<h3 class="contenido-termino">${item.pregunta}</h3>` +
                     `<p class="contenido-texto">${item[nivel]}</p>`;
    listaFaq.appendChild(fila);
  }
  faq.appendChild(listaFaq);
}
```

Llamar a `pintarContenido()` dentro de `iniciar()` y también al final de `cambiarModo()`, para que el contenido siga el nivel activo.

- [ ] **Step 2: Añadir el CSS**

Añadir a `css/estilo.css`:

```css
.contenido-lista { border: 2px solid var(--border-hi); }
.contenido-fila { padding: 16px; border-bottom: 1px solid var(--border); }
.contenido-fila:last-child { border-bottom: none; }
@media (min-width: 720px) {
  .contenido-fila { display: grid; grid-template-columns: 200px 1fr; gap: 24px;
                    padding: 20px 24px; align-items: start; }
}
.contenido-termino { font-family: 'IBM Plex Mono', monospace; font-size: 11px;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent);
  font-weight: 400; margin-bottom: 8px; }
@media (min-width: 720px) { .contenido-termino { margin-bottom: 0; } }
.contenido-texto { font-family: 'Lora', Georgia, serif; font-size: 14px;
  line-height: 1.7; color: var(--cuerpo); }
```

- [ ] **Step 3: Verificar en el navegador**

Esperado: cinco conceptos y cinco preguntas. Pulsar el switch reescribe ambos bloques al nivel correspondiente. Los términos usan `<h3>`, lo que da a los buscadores una estructura de encabezados coherente.

- [ ] **Step 4: Commit**

```bash
git add js/ui.js css/estilo.css
git commit -m "Añadir glosario y preguntas frecuentes en dos niveles"
```

---

## Fase 4 — Cierre

### Task 16: SEO, fuentes y analítica

**Files:**
- Modify: `index.html`
- Create: `robots.txt`
- Create: `sitemap.xml`
- Create: `css/fuentes.css`
- Create: `fonts/` (archivos woff2)

**Interfaces:**
- Consumes: `FAQ` de `textos.js` (para los datos estructurados)
- Produces: nada

- [ ] **Step 1: Auto-alojar las fuentes**

Descargar los woff2 de Space Grotesk (700, 800), IBM Plex Mono (400) y Lora (400) y dejarlos en `fonts/`. Solo esos cuatro cortes: cargar familias completas es lo que hoy bloquea el primer render.

Crear `css/fuentes.css`:

```css
@font-face { font-family: 'Space Grotesk'; font-weight: 700; font-display: swap;
             src: url('../fonts/space-grotesk-700.woff2') format('woff2'); }
@font-face { font-family: 'Space Grotesk'; font-weight: 800; font-display: swap;
             src: url('../fonts/space-grotesk-800.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Mono'; font-weight: 400; font-display: swap;
             src: url('../fonts/ibm-plex-mono-400.woff2') format('woff2'); }
@font-face { font-family: 'Lora'; font-weight: 400; font-display: swap;
             src: url('../fonts/lora-400.woff2') format('woff2'); }
```

Importarlo desde `index.html` **antes** de `estilo.css`. Eliminar los `<link>` a `fonts.googleapis.com`.

- [ ] **Step 2: Añadir las metaetiquetas y los datos estructurados**

Añadir al `<head>` de `index.html`:

```html
<meta name="description" content="Aprende a exponer bien cualquier foto. Mueve apertura, velocidad e ISO y mira en tiempo real cómo cambia la imagen. Gratis, en español, con modo principiante y modo pro.">
<link rel="canonical" href="https://exposicion.foto/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="Triángulo de exposición — exposicion.foto">
<meta property="og:description" content="Mueve los tres parámetros y mira en tiempo real cómo cambia la foto.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://exposicion.foto/">
<meta property="og:image" content="https://exposicion.foto/img/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "exposicion.foto",
  "url": "https://exposicion.foto/",
  "applicationCategory": "EducationalApplication",
  "inLanguage": "es",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}
</script>
```

Los datos estructurados de `FAQPage` se generan desde `textos.js` para no duplicar el contenido. Añadir a `js/ui.js`:

```js
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
```

Llamarla desde `iniciar()`.

- [ ] **Step 3: Crear robots.txt y sitemap.xml**

`robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://exposicion.foto/sitemap.xml
```

`sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://exposicion.foto/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

Crear también el favicon que la metaetiqueta ya referencia. `favicon.svg`, un cuadrado ámbar con el monograma, sin dependencias:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#000000"/>
  <circle cx="32" cy="32" r="18" fill="none" stroke="#F7A810" stroke-width="6"/>
  <circle cx="32" cy="32" r="6" fill="#F7A810"/>
</svg>
```

Es un diafragma abierto: legible a 16 px y coherente con la paleta.

Y generar `img/og.jpg`, que la metaetiqueta `og:image` también referencia. Basta una captura de la herramienta en funcionamiento, recortada a 1200×630 px, con la previsualización visible. Si no está lista al momento de desplegar, **quitar la línea `og:image` del HTML** en vez de dejarla apuntando a un archivo inexistente: una etiqueta rota es peor que ninguna, porque las redes sociales cachean el fallo.

- [ ] **Step 4: Añadir la analítica**

Añadir antes de `</body>` en `index.html`:

```html
<script defer src="/_vercel/insights/script.js"></script>
```

Vercel Analytics no usa cookies y no requiere aviso de consentimiento.

- [ ] **Step 5: Añadir el crédito de la placa generada**

La regla de transparencia de Libraphotos exige declarar lo generativo. Añadir al pie, en `index.html`:

```html
<span class="footer-credito">Imagen de ejemplo generada con IA</span>
```

Si en algún momento la placa se reemplaza por una fotografía real de Juan, esta línea se elimina.

- [ ] **Step 6: Verificar**

- Con la red desconectada tras la primera carga, comprobar que no hay peticiones a `fonts.googleapis.com` en la pestaña de red.
- Pegar el HTML renderizado en el validador de resultados enriquecidos de Google y confirmar que reconoce `WebApplication` y `FAQPage`.
- Comprobar que `/robots.txt` y `/sitemap.xml` se sirven correctamente en el despliegue de vista previa.

- [ ] **Step 7: Commit**

```bash
git add index.html css/fuentes.css fonts/ robots.txt sitemap.xml favicon.svg js/ui.js
git commit -m "Añadir SEO técnico, fuentes auto-alojadas y analítica

Las tres familias desde el CDN de Google bloqueaban el primer render.
Los datos estructurados de FAQ se generan desde textos.js para no
duplicar el contenido."
```

---

### Task 17: Accesibilidad

**Files:**
- Modify: `index.html`
- Modify: `js/ui.js`
- Modify: `css/estilo.css`

- [ ] **Step 1: Etiquetar los sliders con su valor**

En `js/ui.js`, dentro de `render()`, después de actualizar los textos de los valores:

```js
  // Un lector de pantalla debe anunciar el valor real, no el índice del slider.
  $('sl-apertura').setAttribute('aria-valuetext', formatearApertura(v.apertura));
  $('sl-tiempo').setAttribute('aria-valuetext',   formatearTiempo(v.tiempo));
  $('sl-iso').setAttribute('aria-valuetext',      formatearIso(v.iso));
```

- [ ] **Step 2: Marcar el grupo de escenas**

En `pintarEscenas()`, añadir a cada botón:

```js
    btn.setAttribute('tabindex', clave === estado.escena ? '0' : '-1');
```

Y en el contenedor `#escenas` del HTML ya está `role="radiogroup"` con su `aria-label`.

- [ ] **Step 3: Etiquetar el switch**

En `index.html`, añadir al botón del switch:

```html
aria-label="Nivel de detalle: simple o profesional"
```

- [ ] **Step 4: Verificar con teclado**

Recorrer la página entera solo con el tabulador. Esperado:
- Todo elemento enfocable muestra un contorno ámbar de 3 px visible sobre el fondo negro.
- Los sliders se mueven con las flechas y el valor anunciado es el real (`f/5.6`), no un número de índice.
- El switch se activa con Espacio o Intro.
- Los botones de escena son alcanzables y activables.

- [ ] **Step 5: Verificar con lector de pantalla**

Con VoiceOver activo (Cmd+F5 en macOS), mover un slider. Esperado: el bloque de lectura, que lleva `aria-live="polite"`, anuncia el veredicto nuevo sin interrumpir.

- [ ] **Step 6: Verificar el contraste de toda la página**

Con la auditoría de accesibilidad de las herramientas de desarrollo, confirmar cero incidencias de contraste. Si aparece alguna, es que quedó algún `var(--meta)` aplicado a cuerpo de texto.

- [ ] **Step 7: Commit**

```bash
git add index.html js/ui.js css/estilo.css
git commit -m "Añadir accesibilidad: valores anunciados, foco visible y aria-live

Los sliders anuncian el valor real y no el índice; el veredicto se anuncia
al cambiar sin interrumpir la navegación."
```

---

### Task 18: Documentación y cierre

**Files:**
- Modify: `CLAUDE.md`
- Create: `BACKLOG.md`
- Modify: `../CLAUDE.md` (el del directorio LIBRAPHOTOS)

- [ ] **Step 1: Añadir la iteración v3 al CLAUDE.md**

Añadir una sección `### v3 — Motor correcto y previsualización` al historial, siguiendo el formato de v0, v1 y v2. Debe registrar:
- el defecto de raíz del motor de la v2 y cómo se corrigió,
- la fusión de los dos modos en un flujo único,
- el switch SIMPLE/PRO,
- la separación en módulos y la aparición de pruebas,
- la corrección de contraste,
- la eliminación del waitlist.

Actualizar también la tabla "Archivos del proyecto", que hoy solo lista `index.html` y `CHANGELOG.md`.

- [ ] **Step 2: Migrar los pendientes a BACKLOG.md**

Crear `BACKLOG.md` con el patrón que Juan usa en sus otros proyectos (embudo idea → aprobada → spec → implementación). Contenido inicial:

**Ideas admitidas, sin fecha:**
- Modo desafío: el sitio propone una situación y el usuario acierta la exposición
- Calculadora de profundidad de campo independiente
- Balance de blancos
- Placas propias por escena (hoy todas comparten una)
- Reemplazar la placa generada por una fotografía real de Juan a f/11 con fondo con detalle — eliminaría la declaración de IA del pie
- Profundidad de campo por distancia en la previsualización (hoy el desenfoque del fondo es uniforme; ver la simplificación declarada en la spec §4.4)

**Descartado:**
- Otros idiomas (la propuesta de valor es ser la referencia **en español**)

Retirar del `CLAUDE.md` la lista "Pendiente / Próximas iteraciones", que queda reemplazada por este archivo.

- [ ] **Step 3: Actualizar el CLAUDE.md raíz**

En `/Users/juantramolao/Claude/Projects/LIBRAPHOTOS/CLAUDE.md`, la entrada de `tips-fotografos/` dice hoy "ya alineado a la paleta/tipografía del MASTER (v2)". Actualizarla a v3, mencionando el motor de exposición real, el switch SIMPLE/PRO, la previsualización y que el proyecto pasó de un archivo único a módulos con pruebas.

- [ ] **Step 4: Correr toda la batería de pruebas una última vez**

```bash
node --test
```

Esperado: todas pasan, cero fallos.

- [ ] **Step 5: Verificar el sitio completo antes de publicar**

Recorrido final en el navegador, en móvil y en escritorio:
1. Elegir cada una de las seis escenas y confirmar que todas arrancan en `Correcta`.
2. En cada una, abrir y cerrar el diafragma y confirmar que el fondo responde.
3. Cambiar de modo y volver, confirmando que los valores se conservan.
4. Recargar y confirmar que el modo persiste.
5. Confirmar que no queda ni rastro del waitlist.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md BACKLOG.md ../CLAUDE.md
git commit -m "Documentar la v3 y migrar los pendientes a BACKLOG.md"
```

---

## Cobertura de la spec

| Sección de la spec | Tareas |
|---|---|
| §3.1 Fórmula | 1, 2 |
| §3.2 Umbrales | 2 |
| §3.3 Series de valores | 3 |
| §3.4 Escenas y presets | 4 |
| §3.5 Efectos secundarios | 5, 6 |
| §3.6 Equivalencias | 7, 14 |
| §3.7 Interfaz del módulo | 8 |
| §4.1 Jerarquía y móvil primero | 10 |
| §4.2 El instrumento | 10, 11, 12, 14 |
| §4.3 Switch SIMPLE/PRO | 13 |
| §4.4 Previsualización | 9, 12 |
| §4.4.1 Placa base | 9 |
| §4.4.2 Declaración de IA | 16 |
| §4.5 ANTIGRAVITY | 10 (restricciones globales) |
| §5 Estructura del código | 1, 3, 4, 10, 11, 13 |
| §5.1 Pruebas | 1–8 |
| §6.1 Contraste | 10, 17 |
| §6.2 Resto de accesibilidad | 17 |
| §7 SEO | 15, 16 |
| §8 Medición | 16 |
| §9 Waitlist | 10 |
| §10 Limpieza | 10, 18 |
