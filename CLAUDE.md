# exposicion.foto — Historial de Proyecto

> Herramienta educativa del ecosistema Libraphotos. Calculadora interactiva del triángulo de exposición fotográfica.
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

## Pendiente / Próximas iteraciones

- [ ] Switch de 3 modos: FASHION | MUSIC EVENT | ÁMBAR COLLECTION (arquitectura definida en manual sección 4)
- [ ] Scroll-snap `y mandatory` para secciones de 100vh
- [ ] Integración de metadata técnica con overlay tipográfico en IBM Plex Mono (sección B del manual fotográfico)
- [ ] Calculadora de profundidad de campo (DOF) — mencionada en el waitlist
- [ ] Balance de blancos — mencionada en el waitlist
- [ ] Glosario completo — mencionada en el waitlist
- [ ] Meta tags dinámicos por modo de portafolio
- [ ] Testing cross-browser: Chrome, Safari, Firefox

---

## Archivos del proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | Aplicación completa (HTML + CSS + JS) |
| `CHANGELOG.md` | Este archivo — historial y contexto |

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
