# exposicion.foto — Historial de Proyecto

> Herramienta educativa del ecosistema Libraphotos. Calculadora interactiva del triángulo de exposición.
> **Producción: https://exposicion.libraphotos.com** (jul 2026). El dominio `exposicion.foto` del nombre original nunca se registró; `tools.libraphotos.com` redirige aquí de forma permanente.
> Rama de desarrollo activa: `claude/lucid-faraday-9Ev3t`

---

## Contexto General

**Nombre del proyecto:** exposicion.foto
**Tipo:** Aplicación web estática (HTML + CSS + JS en un solo archivo)
**Idioma:** Español
**Propósito:** Herramienta educativa para fotógrafos principiantes. Permite manipular los tres parámetros del triángulo de exposición (apertura, velocidad, ISO) en tiempo real y visualizar el resultado de exposición. Forma parte del ecosistema de submarcas técnicas de **Libraphotos** (línea secundaria independiente, según el Manual Maestro de Marca).

**Stack:**
- HTML5 / CSS3 / Vanilla JS (zero dependencias)
- Sin framework, sin bundler, sin npm
- Fuentes externas: Google Fonts (CDN)
- Deploy: Vercel (auto-deploy desde rama `main`)

---

## Iteraciones

### v0 — Estado Original
**Commit base:** antes de la sesión de rediseño

**Diseño original:**
- Fondo crema `#F7F6F2`, modo claro con soporte automático dark mode via `@media prefers-color-scheme`
- Tipografía: DM Sans (cuerpo) + DM Mono (labels)
- Bordes suaves con `rgba`, `border-radius: 10px / 16px`
- Contenedor estrecho: `max-width: 600px`
- Paleta de acentos: verde `#1D7A5A`, rojo `#C0392B`, ámbar `#996B00`
- Animación `fadeUp` en carga
- Modo Libre (sliders) + Modo Escena (6 presets)
- Barra de exposición: 6px de alto, fondo coloreado en el card resultado
- Grid de escenas: 2 columnas

---

### v1 — Rediseño Brutalista
**PR #1** — mergeado a `main`
**Fecha:** Junio 2026

**Motivación:** Transformar la estética de la herramienta a un lenguaje visual brutalista dinámico con carácter premium, alineado con la identidad visual de Libraphotos.

**Cambios aplicados:**

#### Sistema visual
- Dark theme permanente (eliminado `prefers-color-scheme`): fondo `#0D0D0D`
- Acento amarillo neón `#FFE500`
- Tipografía: **Space Grotesk 800** para display, **DM Mono** para metadata
- `border-radius: 0` en todos los elementos — esquinas a 90°
- Bordes duros `#F0F0F0` (blanco) como contorno estructural

#### Layout
- Contenedor ampliado: `max-width: 900px`
- Header full-bleed con borde inferior 3px, logo `[EXPOSICION.FOTO]`
- Hero gigante: `clamp(48px, 9vw, 96px)`, weight 800, uppercase

#### Calculadora
- Valores numéricos de parámetros: **52px DM Mono** (protagonistas visuales)
- Grid de params sin gap, separados por bordes blancos
- Hover de param cards invierte colores (fondo blanco, texto negro)
- Slider custom: track 2px, thumb cuadrado 14×14px en acento
- Barra de exposición: 20px de alto, borde izquierdo grueso como indicador de estado
- Grid de escenas: 3 columnas (antes 2), ícono unicode encima del texto

#### Glosario
- Reestructurado de grid 2-col a lista de filas estilo tabla

#### Animaciones
- `fadeUp` para secciones de página
- `slideIn` (desde X-24px) para param cards con stagger

---

### v2 — Alineación con Manual de Marca Libraphotos
**PR #2** — mergeado a `main`
**Fecha:** Junio 2026

**Motivación:** El Manual Maestro de Marca Libraphotos (archivo `LIBRAPHOTOS_MASTER.md`) centraliza el sistema visual de la marca. La v1 usaba un amarillo neón genérico y DM Mono, que no correspondían a los tokens oficiales. Se actualizó toda la capa visual para adherirse al documento.

**Referencia de marca:** `LIBRAPHOTOS_MASTER.md` (Brutalismo de Lujo & Narrativa Editorial, jun 2026)

**Cambios aplicados:**

#### Paleta de colores (ajuste a tokens oficiales)
| Token | v1 | v2 | Especificación oficial |
|---|---|---|---|
| Fondo principal | `#0D0D0D` | `#000000` | Negro Puro — 60-70% |
| Acento principal | `#FFE500` | `#F7A810` | Ámbar Brillante — 15-20% |
| Nuevo: violeta | — | `#4B0082` | Violeta Profundo — 5-10% |
| Borde divisorio | `#2A2A2A` | `#333333` | Gris Oscuro oficial |
| Texto secundario | `#8A8A8A` | `#666666` | Gris Medio oficial |
| Texto sutil | `#4A4A4A` | `#CCCCCC` | Gris Claro oficial |

#### Tipografía (ajuste a sistema oficial)
| Uso | v1 | v2 |
|---|---|---|
| Metadata técnica / labels | DM Mono | **IBM Plex Mono** |
| Texto descriptivo de cuerpo | Space Grotesk | **Lora** (serif) |
| Títulos display | Space Grotesk 800 | Space Grotesk 800 (equivalente Avenir Black) |

#### Monograma LP
- Header actualizado: `LP | EXPOSICION.FOTO` con monograma LP en Ámbar, tracking condensado `-0.06em` (equivale a tracking -20/-30 pts del manual)

#### Uso del Violeta Profundo `#4B0082`
- CTA del waitlist (botón "Avisar") — color base violeta, hover a ámbar
- Borde izquierdo del banner waitlist (momento de quiebre visual)
- Valores numéricos en el panel de escenas (28px — colección premium)
- Estado "sobreexpuesto" en la barra de exposición

#### Colores de exposición re-mapeados a paleta de marca
| Estado | v1 | v2 | Lógica |
|---|---|---|---|
| Correcto | `#00FF85` (verde) | `#F7A810` Ámbar | Color positivo de la marca |
| Subexpuesto | `#FF2D00` (rojo) | `#666666` Gris | Estado neutro/muted |
| Sobreexpuesto | `#FFE500` (amarillo) | `#4B0082` Violeta | Momento de quiebre |

#### ANTIGRAVITY (arquitectura de interfaz)
- `transition: none` en todos los elementos hover — corte seco sin ease functions (regla explícita del manual sección 4)
- `scroll-behavior: auto`

---

### v3 — Motor correcto y previsualización
**Rama:** `v3-motor-y-previsualizacion`
**Fecha:** 28 de julio de 2026

**Motivación:** El motor de exposición de la v2 no calculaba física real. Sumaba
**índices de array**:

```js
const luz = (8 - ia) + (8 - iv) + ii;
```

Dos defectos de raíz. Primero, las escalas no eran equivalentes: ISO y velocidad
avanzaban un stop por posición, pero la apertura no (`f/1.4 → f/1.8` son ⅔ de
stop). Segundo, no existía la luz de la escena, así que "correcto" era el rango
arbitrario `8 ≤ luz ≤ 16` sobre una suma sin unidad física. El resultado visible:
dos de los seis presets se contradecían con la propia calculadora del sitio.

**Cambios aplicados:**

#### El motor
- Física real: `EV_ajustes = log₂(N²/t) − log₂(ISO/100)`, y `Δ = EV_escena − EV_ajustes`, medido en **stops**.
- Validado contra la regla del soleado f/16: da `Δ = 0,03`.
- Las series pasan a ser valores numéricos reales, con pasos completos y tercios.
- **Equivalencias:** dado el EV de una escena, genera tripletes alternativos que también exponen correctamente pero con perfiles visuales distintos. Es el concepto que la v2 no tenía.
- Efectos calculados, no descritos: desenfoque de fondo, arrastre, ruido, brillo y contraste.
- Avisos de trepidación (regla recíproca), difracción y ruido alto.

#### Arquitectura
- Los dos modos separados ("Modo libre" / "Por situación") se **fusionan en un flujo único**: se elige la escena, que fija el EV, y se ajusta desde su preset.
- De un `index.html` de 1.047 líneas a módulos ES nativos, **sin build tools**.
- **39 pruebas** con `node --test`, incluida la de regresión del bug de los presets.

#### Interfaz
- **Previsualización** como elemento principal: dos capas (fondo y sujeto recortado con alfa) con filtros CSS en vivo. Sin canvas, sin peticiones externas.
- El visor es `position: sticky` y su alto está acotado, para que la foto siga a la vista mientras se mueven los sliders. Sin eso, la foto y los controles nunca coinciden en pantalla.
- **Switch SIMPLE/PRO**: cambia la densidad de información, no solo la redacción — paso de los sliders (9 vs 25 valores de apertura), escala del fotómetro, EV visible, controles de óptica, avisos técnicos y nivel de todos los textos. Persiste en `localStorage`, arranca en SIMPLE.
- Jerarquía invertida: el instrumento primero, hero de una línea, **móvil primero**.
- Waitlist eliminado: pedía un correo y lo descartaba.

#### Correcciones de fondo
- **Contraste:** `--text-2: #666666` era el color de todo el cuerpo de texto y daba 3,66:1, bajo el mínimo AA de 4,5:1. El cuerpo pasa a `#CCCCCC` (13:1); el gris medio queda solo para metadata, que es su función en el manual.
- **Tipografía alineada al ecosistema: Space Grotesk → Syne.** El MASTER §2 pide Avenir Black 800+ para display, que es de licencia Linotype y no está en Google Fonts. La v2 usaba Space Grotesk como sustituto, pero **Space Grotesk se queda en el peso 700**: no podía cumplir la especificación, y Google Fonts descartaba el 800 en silencio sin avisar. Syne sí llega a 800, y además es el sustituto que ya usaba el resto del ecosistema (portafolio-web, presets-fotos, briefings-clientes, img-nation-studio, poses-spots). Este proyecto era el único descolgado.
- **Tracking del monograma corregido.** El MASTER fija −20 a −30 puntos, que son `-0.02` a `-0.03em`. La v2 usaba `-0.06em` comentado como "equivale a −20/−30": las unidades de tracking son milésimas de em, así que eran −60, el doble de lo permitido.
- Fuentes auto-alojadas: las tres familias desde el CDN bloqueaban el primer render.
- SEO: canonical, `og:image`, favicon, `robots.txt`, `sitemap.xml`, datos estructurados `WebApplication` y `FAQPage`.
- Accesibilidad: los sliders anuncian el valor real y no el índice, `aria-live` en el veredicto, foco visible, roles `switch` y `radiogroup`.

#### Imagen base
La previsualización necesita una foto enfocada de punta a punta: solo se puede
desenfocar, no reenfocar. La placa vigente se generó con la API de Reve
(`generar_placa.py`) y **se declara como generada con IA en el pie del sitio**.
Reemplazarla por una fotografía real de Juan es la mejora A-01 del backlog.

---

## Pendiente

Ver [BACKLOG.md](BACKLOG.md). La lista que vivía aquí migró allí en la v3.

---

## Archivos del proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | Solo estructura |
| `css/estilo.css` | Todo el estilo |
| `css/fuentes.css` | Fuentes auto-alojadas |
| `js/motor.js` | La física. Funciones puras, sin DOM. |
| `js/escalas.js` | Series de aperturas, tiempos e ISO, y su formateo |
| `js/escenas.js` | Datos por escena: EV, preset, tiempo seguro |
| `js/textos.js` | Todo el contenido educativo, en sus dos niveles |
| `js/ui.js` | Conecta el motor al DOM. Único archivo que toca el DOM. |
| `test/` | Pruebas del motor y las escalas (`node --test`) |
| `generar_placa.py` | Genera la placa base con la API de Reve |
| `docs/superpowers/specs/` | Diseño |
| `docs/superpowers/plans/` | Plan de implementación |
| `CLAUDE.md` | Este archivo — historial y contexto |
| `BACKLOG.md` | Pendientes |

---

## Manual de Marca

El sistema visual de este proyecto está gobernado por el **Manual Maestro de Marca Libraphotos**. Ante cualquier duda sobre colores, tipografía, tono de voz o comportamiento de interfaz, ese documento es la fuente de verdad.

Extracto de reglas críticas para desarrollo front-end:
```css
border-radius: 0px;                    /* sin excepciones */
scroll-behavior: auto;
scroll-snap-type: y mandatory;
a:hover { transition: none; }          /* corte seco */
```

Paleta resumida:
- `#000000` Negro Puro — fondos (60-70%)
- `#F7A810` Ámbar Brillante — acentos, botones, hover (15-20%)
- `#FFFFFF` Blanco Técnico — textos, contraste (10-15%)
- `#4B0082` Violeta Profundo — quiebre, colecciones premium (5-10%)
