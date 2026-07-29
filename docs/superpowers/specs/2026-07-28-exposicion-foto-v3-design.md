# exposicion.foto v3 — Diseño

**Fecha:** 2026-07-28
**Proyecto:** `tips-fotografos/` — exposicion.foto (repo `Jatramolao/expo-photo`)
**Estado:** diseño aprobado, pendiente de plan de implementación

---

## 1. Objetivo

Convertir exposicion.foto en **la herramienta de referencia en español sobre el triángulo de exposición**: un sitio que se gana su tráfico por mérito propio, enseña con ejemplos visuales y no depende de captación ni de promoción cruzada. Libraphotos aparece discreto al pie, como autor, no como oferta.

Esto fija el orden de prioridades para toda la versión:

1. Motor de exposición físicamente correcto
2. Previsualización visual del resultado
3. SEO y contenido que responda búsquedas reales

### Qué queda fuera, a propósito

Modo desafío (juego), calculadora de profundidad de campo independiente, balance de blancos, otros idiomas. Van al backlog. Esta versión hace una cosa completa y bien.

---

## 2. El problema que se resuelve

La v2 calcula la exposición sumando **índices de array**:

```js
const luz = (8 - ia) + (8 - iv) + ii;   // ia, iv, ii = posiciones de slider
```

Esto tiene dos defectos de raíz:

**Las escalas no son equivalentes.** ISO y velocidad avanzan un paso completo por posición, pero la apertura no: `f/1.4 → f/1.8` es ⅔ de paso, `f/1.8 → f/2` es ⅓, `f/2 → f/2.8` es un paso entero. La fórmula los trata a todos como lo mismo.

**No existe la luz de la escena.** No hay exposición correcta en abstracto: la hay *para una cantidad de luz dada*. En la v2, "correcto" es el rango arbitrario `8 ≤ luz ≤ 16` sobre una suma sin unidad física.

**Consecuencia observable:** dos de los seis presets se contradicen con la propia calculadora del sitio.

| Preset | `luz` calculada | Veredicto de la v2 | Debería ser |
|---|---|---|---|
| Paisaje con mucha luz | 5 | Subexpuesto | Correcto |
| Fotografía nocturna | 18 | Sobreexpuesto | Correcto |

El botón "Explorar con estos valores →" lleva al usuario exactamente a ese estado contradictorio. Para un sitio cuyo único propósito es enseñar bien, es la deuda a saldar primero: toda capa nueva montada encima hereda el error.

---

## 3. El motor

### 3.1 Fórmula

```
EV_ajustes = log₂(N² / t) − log₂(ISO / 100)
Δ          = EV_escena − EV_ajustes
```

donde `N` es el número f, `t` el tiempo de obturación en segundos, y `EV_escena` el valor de luz de la situación elegida.

- `Δ = 0` → exposición correcta
- `Δ > 0` → sobreexpuesta (entra más luz de la necesaria)
- `Δ < 0` → subexpuesta

`Δ` se mide en **pasos (stops)**, que es la unidad que ya usa la fotografía. Deja de ser un número inventado.

**Validación contra la regla del soleado f/16:** escena EV 15, ajustes f/16 · 1/125 · ISO 100 → `EV_ajustes = log₂(256 · 125) = 14,97` → `Δ = 0,03`. El motor coincide con la regla que se enseña en todas partes.

### 3.2 Umbrales de veredicto

| Rango de Δ | Veredicto |
|---|---|
| `Δ < −2` | Muy subexpuesta |
| `−2 ≤ Δ < −0,5` | Subexpuesta |
| `−0,5 ≤ Δ ≤ 0,5` | Correcta |
| `0,5 < Δ ≤ 2` | Sobreexpuesta |
| `Δ > 2` | Muy sobreexpuesta (quemada) |

### 3.3 Escalas de valores

Los arrays pasan a ser **números reales**, no etiquetas. El paso deja de ser "una posición de slider" y pasa a ser un stop de verdad.

**Aperturas (número f)**
- Pasos completos (SIMPLE): `1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22`
- Tercios (PRO): `1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22`

**Tiempos (segundos)**
- Pasos completos (SIMPLE): `1/4000 … 30` en la serie estándar (`1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30`)
- Tercios (PRO): la serie estándar de tercios en el mismo rango

**ISO**
- Pasos completos (SIMPLE): `100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600`
- Tercios (PRO): la serie estándar de tercios en el mismo rango

En PRO, el valor mostrado es el real; el paso del slider es de ⅓ de stop.

### 3.4 Escenas

Cada escena aporta tres datos: su valor de luz, un preset correcto y la velocidad de su sujeto (que determina cuándo hay desenfoque de movimiento).

| Clave | Nombre SIMPLE | EV | Preset correcto | Δ | Tiempo seguro |
|---|---|---|---|---|---|
| `sol-pleno` | Pleno sol, a mediodía | 15 | f/2.8 · 1/4000 · ISO 100 | 0,06 | 1/125 |
| `nublado` | Día nublado | 12 | f/2.8 · 1/500 · ISO 100 | 0,06 | 1/125 |
| `hora-dorada` | Al atardecer | 11 | f/2 · 1/500 · ISO 100 | 0,03 | 1/125 |
| `interior-dia` | Dentro de casa, de día | 8 | f/2 · 1/250 · ISO 400 | 0,03 | 1/60 |
| `interior-noche` | Dentro de casa, de noche | 5 | f/2 · 1/125 · ISO 1600 | 0,03 | 1/60 |
| `calle-noche` | En la calle, de noche | 3 | f/2 · 1/60 · ISO 3200 | 0,10 | 1/60 |

Todos los presets usan valores de paso completo, de modo que funcionan sin cambios en modo SIMPLE.

**Escena por defecto:** `nublado` (EV 12) — un valor intermedio que deja margen para equivocarse en ambas direcciones.

"Tiempo seguro" es el tiempo de obturación más lento que congela al sujeto de esa escena; por debajo de él aparece desenfoque de movimiento en la previsualización.

### 3.5 Efectos secundarios calculados

No se describen con texto: se calculan y alimentan la previsualización.

**Desenfoque de fondo (apertura).** El radio de desenfoque es proporcional a `focal² / (N · distancia)`, con una constante de calibración ajustada para que a 50 mm y 2 m, `f/1.4` produzca un desenfoque marcado y `f/16` prácticamente ninguno. Los valores exactos de la constante se calibran visualmente durante la implementación; el valor por defecto de focal es 50 mm y el de distancia al sujeto, 2 m (ambos editables en PRO).

**Desenfoque de movimiento (tiempo).** Proporcional a `t / tiempoSeguro` de la escena. Sin efecto cuando `t ≤ tiempoSeguro`.

**Ruido (ISO).** La opacidad de la capa de grano crece con el logaritmo del ISO: nula en ISO 100, moderada en ISO 1600, fuerte en ISO 25600.

**Trepidación (solo aviso, en PRO).** Regla recíproca: si `t > 1/focal`, se avisa riesgo de foto movida por pulso.

**Difracción (solo aviso, en PRO).** A partir de f/16 se advierte pérdida de nitidez.

### 3.6 Equivalencias

Este es el concepto que hoy no existe y que constituye el salto pedagógico de la versión.

Dado el triplete actual, el motor genera dos o tres **alternativas que también dan `Δ ≈ 0`** para la misma escena, cada una con un perfil distinto:

- **Máximo desenfoque de fondo** — abrir la apertura al máximo, compensar con tiempo e ISO
- **Todo en foco** — cerrar la apertura, compensar
- **Congelar el movimiento** — el tiempo más rápido posible, compensar

Cada alternativa se presenta con su consecuencia declarada y una miniatura de cómo se vería. La lección: exponer bien no es una respuesta, son varias, y eliges según qué quieres que se vea.

### 3.7 Interfaz del módulo

`motor.js` es una función pura, sin acceso al DOM:

```
entrada:  { apertura, tiempo, iso, escena, focal, distancia }
salida:   { ev_ajustes, delta, veredicto,
            desenfoqueFondo, desenfoqueMovimiento, ruido,
            avisos: [ ... ],
            equivalencias: [ { apertura, tiempo, iso, etiqueta }, ... ] }
```

Esto permite probarlo por completo antes de conectarlo a nada.

---

## 4. La interfaz

### 4.1 Jerarquía

La v2 va: header → hero a pantalla completa → calculadora → glosario → waitlist. El hero consume casi una pantalla antes de que aparezca la herramienta, que es fricción pura para quien llegó desde una búsqueda.

La v3 pone el instrumento primero:

1. Header con el switch SIMPLE/PRO
2. Hero de una sola línea
3. **El instrumento**
4. Conceptos clave (glosario ampliado, en dos niveles)
5. Preguntas frecuentes (bloque de SEO, en dos niveles)
6. Footer con Libraphotos discreto

Se invierte además la prioridad de dispositivo: **móvil primero**. La búsqueda de estos temas es mayoritariamente móvil, y la v2 es de escritorio con media queries de rescate.

### 4.2 El instrumento, de arriba a abajo

**1. La escena.** Fila de situaciones siempre visible. Es lo primero que se elige y fija `EV_escena`. Deja de ser un modo aparte: los dos modos ("Modo libre" / "Por situación") desaparecen y se fusionan en este flujo único.

**2. La previsualización.** El **elemento más grande de la página**. Una foto real de Juan reaccionando en vivo: se oscurece o se quema según `Δ`, el fondo se desenfoca según la apertura, el sujeto se arrastra si el tiempo es lento para el sujeto de esa escena, y el grano sube con el ISO.

**3. El fotómetro.** La lectura de `Δ`, con la meta explícita de llevarlo a cero.

**4. Los tres controles.** Apertura, tiempo, ISO, conservando los números grandes en IBM Plex Mono de la v2.

**5. La lectura.** Veredicto y explicación: por qué quedó así y qué mover.

**6. Las equivalencias.** Las alternativas correctas, cada una con su miniatura y su consecuencia.

### 4.3 El switch SIMPLE / PRO

Cambia **cuánta información aparece**, no solo cómo se redacta. Un switch que solo reescribiera los textos dejaría al principiante frente a la misma densidad de pantalla.

| | SIMPLE (por defecto) | PRO |
|---|---|---|
| Paso de los sliders | Stop completo | ⅓ de stop |
| Fotómetro | Palabras: muy oscura / oscura / correcta / quemada | Escala −3…+3 con el valor exacto de Δ |
| EV de la escena | Oculto | Visible |
| Focal y distancia | Fijas (50 mm, 2 m) | Editables |
| Avisos técnicos | Ninguno | Trepidación, difracción, rango dinámico |
| Histograma | No | Sí |
| Nombres de escena | Cotidianos ("dentro de casa, de noche") | Técnicos, con su EV |
| Textos | Lenguaje natural, sin jerga | Nombran stops, EV, difracción, regla recíproca |

El switch vive en el encabezado, siempre visible, y persiste entre visitas en `localStorage`. **No hay muro de elección al entrar:** se entra en SIMPLE y el switch está disponible para quien quiera más.

### 4.4 Construcción de la previsualización

**Sin canvas para el grueso del efecto.** Dos imágenes superpuestas —fondo completo y sujeto recortado con transparencia— con filtros CSS aplicados en vivo:

- `blur()` sobre la capa de fondo, según el desenfoque calculado por apertura
- `brightness()` y `contrast()` sobre ambas capas, según `Δ` (el contraste cae al crecer `|Δ|`, simulando el recorte a blancos y negros)
- una capa de grano superpuesta cuya opacidad sube con el ISO
- desenfoque direccional sobre la capa del sujeto cuando el tiempo es lento para la escena

Es fluido en móviles modestos, son pocas líneas y no bloquea el hilo principal. Canvas queda de reserva únicamente si el recorte a blancos quemados no resulta convincente con filtros.

**Simplificación declarada.** El modelo de dos capas desenfoca de forma uniforme todo lo que no es el sujeto, incluido lo que está *delante* de él. Ópticamente no es exacto: el desenfoque real depende de la distancia, y el primer plano se degrada de forma distinta al fondo. Se acepta porque a diafragma abierto el primer plano también estaría desenfocado, y porque implementar profundidad de campo por distancia exigiría un mapa de profundidad por escena. Queda anotado como límite conocido, no como omisión.

**Insumo por escena:** **dos archivos** — la foto completa y el sujeto recortado en PNG con alfa.

### 4.4.1 La placa base

La placa base es el punto cero de la app: la imagen sobre la que se simula todo. Debe ser **fotométricamente neutra y estar enfocada de punta a punta**, porque cualquier efecto ya horneado pelea contra la simulación. Si la foto trae grano, el slider de ISO deja de significar algo; si trae el fondo desenfocado de origen, cerrar el diafragma no puede devolverlo a nítido y se pierde la mitad de la lección sobre apertura.

Requisitos:

- Enfoque profundo real (como f/11), sujeto y fondo igualmente nítidos
- Fondo con **detalle fino y legible a media distancia** — texturas, hojas, radios, juntas. Un fondo oscuro y vacío vuelve el efecto invisible.
- Luz de día difusa y pareja, exposición neutra, sin viñeta, sin grano, sin virado, sin sombras duras
- Sujeto despegado del fondo, silueta limpia, pelo recogido (para el recorte con alfa)
- Vertical 3:4

**Placa vigente:** `img/escenas/20260728_placa-base_v1.png`, generada con la API de Reve mediante `generar_placa.py` (script propio del proyecto; ver §4.4.2). Cumple los cinco requisitos.

Las tres fotos de pasarela que Juan aportó el 2026-07-28 **no sirven como placa base**: están disparadas a diafragma abierto, con el fondo ya deshecho y oscuro. Quedan como set de prueba válido para verificar el resto del pipeline (brillo, recorte a blancos, grano, arrastre), donde sí funcionan bien.

### 4.4.2 Generación e independencia de estudio-reve

`generar_placa.py` es deliberadamente independiente de `estudio-reve/generar.py`. Aquel lleva cocido el ADN visual del estudio —flash duro, grano, paleta 70/25/5, sombras aplastadas—, que es exactamente lo contrario de lo que esta placa necesita. Solo se reutiliza la clave de API, leída desde `../estudio-reve/.env` para no duplicar el secreto.

**Declaración de IA.** La regla de transparencia de Libraphotos exige declarar siempre y explícitamente lo generativo publicado. Mientras la placa base sea generada, el sitio lleva un crédito discreto al pie indicándolo. La alternativa —una fotografía real de Juan disparada a f/11 con fondo con detalle— elimina la necesidad de esa declaración y refuerza la autoridad del sitio, que es de un fotógrafo enseñando fotografía. Queda como mejora deseable sin fecha en el backlog; no bloquea nada.

### 4.5 Nota sobre ANTIGRAVITY

El manual de marca manda `transition: none` (corte seco). Esa regla rige los **estados de interfaz** —hover, navegación, activación— y se mantiene sin excepción.

No rige el **render del instrumento**: cuando un slider se mueve y la previsualización responde, eso no es una transición decorativa sino la lectura del aparato. Queda declarado aquí para que no se interprete como una desviación del manual en revisiones futuras.

---

## 5. Estructura del código

La v2 vive en un `index.html` de 1.047 líneas. Con el motor nuevo, la previsualización y dos niveles de texto superaría las 2.500, volviéndose difícil de modificar sin romper algo.

Se separa **sin introducir build tools**: sigue siendo estático puro, servido por Vercel tal cual, usando módulos ES nativos (`<script type="module">`).

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `index.html` | Solo estructura | — |
| `css/estilo.css` | Todo el estilo | — |
| `js/motor.js` | La física. Función pura, sin DOM. | — |
| `js/escenas.js` | Datos: EV, preset y tiempo seguro por escena | — |
| `js/textos.js` | Todo el contenido educativo, en sus dos niveles | — |
| `js/ui.js` | Conecta el motor al DOM | los cuatro anteriores |
| `img/escenas/` | Fotos y recortes | — |

El corte que más importa es `textos.js`: permite reescribir el contenido educativo —que es el producto real— sin tocar una línea de lógica.

### 5.1 Pruebas

`motor.js` es puro, así que se prueba con `node --test`, incluido en Node. **No agrega ninguna dependencia al proyecto ni afecta el deploy.**

Casos mínimos:

1. **Soleado f/16** — escena EV 15, f/16 · 1/125 · ISO 100 → `|Δ| < 0,1`, veredicto correcta
2. **Equivalencia de apertura/tiempo** — f/16 · 1/125 · ISO 100 y f/8 · 1/500 · ISO 100 dan el mismo `Δ`
3. **ISO como stop** — duplicar el ISO desplaza `Δ` exactamente en +1
4. **Umbrales** — `Δ = 0,5` es correcta; `Δ = 0,51` es sobreexpuesta
5. **Los seis presets** — cada escena con su preset da `|Δ| ≤ 0,5` (la prueba de regresión del bug de la v2)
6. **Equivalencias generadas** — toda alternativa devuelta tiene `|Δ| ≤ 0,5` para su escena
7. **Regla recíproca** — a 50 mm, `t = 1/30` dispara el aviso de trepidación; `t = 1/125` no

---

## 6. Accesibilidad

### 6.1 Contraste (hallazgo)

`--text-2: #666666` es el color de **todo el texto descriptivo del sitio** —explicaciones de parámetros, glosario, resultados— y da **3,66:1** sobre negro. El mínimo WCAG AA para texto normal es 4,5:1. El contenido educativo, que es lo único que el sitio existe para comunicar, está por debajo del umbral de legibilidad.

No es un defecto del manual de marca: el manual define Gris Medio como color de *metadata*, y aquí se está usando para *cuerpo de texto*.

**Corrección:** el cuerpo de texto pasa a `#CCCCCC` (13:1). `#666666` queda reservado para etiquetas y metadata, que es su función declarada.

De paso se corrige una inconsistencia de nombres: hoy `--text-3` está comentado como "texto sutil" pero es más brillante que `--text-2`. Los nombres se reordenan por luminancia.

### 6.2 Resto

- Sliders con `<label>` real asociado, no solo texto adyacente
- El veredicto se anuncia con `aria-live="polite"` al cambiar
- Foco visible en navegación por teclado (hoy no existe)
- El switch SIMPLE/PRO como `role="switch"` con su estado

---

## 7. SEO

Como el sitio debe ganarse su tráfico, esto deja de ser accesorio.

**Técnico:** `canonical`, `og:image`, favicon, `sitemap.xml`, `robots.txt`, y datos estructurados `WebApplication` + `FAQPage`.

**Contenido:** un bloque de preguntas frecuentes al pie, después de la herramienta, respondiendo lo que la gente escribe de verdad:

- ¿Qué es el triángulo de exposición?
- ¿Por qué mis fotos salen oscuras?
- ¿Qué ISO uso de noche?
- ¿Qué apertura uso para retratos?
- ¿Qué velocidad de obturación necesito para congelar movimiento?

Respondidas en serio, y también en dos niveles según el switch. Ese bloque es lo que trae gente; la herramienta es lo que hace que se quede y la recomiende.

**Rendimiento:** las tres familias de Google Fonts desde CDN bloquean el primer render. Se auto-alojan y se recortan los pesos no usados.

---

## 8. Medición

Vercel Analytics: una línea, sin cookies, ya está la plataforma. Métricas que importan:

- Visitas
- Porcentaje que mueve al menos un slider (usa la herramienta, no solo la ve)
- Porcentaje que activa PRO
- Escena más elegida

---

## 9. Waitlist

La v2 pide un correo y lo descarta: `subscribir()` valida que haya una arroba y esconde el input. El dato se pierde.

**Decisión: se elimina.** Se reemplaza por un bloque honesto de "próximas herramientas" sin captura de correo, más un enlace discreto a libraphotos.com. Es coherente con el objetivo elegido —ser la herramienta de referencia, no captar— y pedir un correo que no se usa cuesta confianza justo en el momento en que se acaba de ganar.

---

## 10. Limpieza menor

- Footer: `© 2025` → año vigente
- Header: `BETA / V1` → `V3`
- `CLAUDE.md`: se añade la iteración v3 al historial
- La lista "Pendiente / Próximas iteraciones" de `CLAUDE.md` migra a un `BACKLOG.md` propio (patrón `/backlog`), con lo descartado en §1 ya anotado

---

## 11. Insumos pendientes de Juan

| Insumo | Bloquea | Estado |
|---|---|---|
| Placa base con enfoque profundo | La previsualización | ✅ Resuelto — `20260728_placa-base_v1.png`, generada con Reve |
| Recorte del sujeto de la placa base en PNG con alfa | El desenfoque de fondo | Pendiente — se produce con eliminación de fondo sobre la placa vigente |
| Set de prueba (3 retratos de pasarela de Juan) | Nada | ✅ Aportado 2026-07-28 |
| Fotografía real de Juan a f/11 con fondo con detalle | Nada — reemplazaría a la placa generada y eliminaría la declaración de IA | Deseable, sin fecha |
| Placas para las escenas restantes | Nada — se agregan editando solo `escenas.js` | Pendiente |
| `og:image` | Solo el SEO social | Pendiente |
