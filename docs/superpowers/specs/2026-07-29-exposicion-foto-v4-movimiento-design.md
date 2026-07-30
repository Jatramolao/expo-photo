# exposicion.foto v4 — Capa de movimiento

**Fecha:** 2026-07-29
**Proyecto:** `tips-fotografos/` — exposicion.foto (https://exposicion.libraphotos.com)
**Parte de:** continuación de `2026-07-28-exposicion-foto-v3-design.md`

---

## 1. Objetivo

Añadir movimiento con propósito didáctico: enseñar lo que hoy solo se afirma. Cerrar además dos huecos de la v3 y hacer el estado compartible por URL.

**Marco normativo:** ANTIGRAVITY quedó eliminada del MASTER (jul 2026). La norma vigente es **D14, "el sitio elástico"**: el movimiento con propósito didáctico o narrativo entra por defecto; lo prohibido es el movimiento sin función. Nada de lo que sigue necesita justificación adicional.

---

## 2. La pieza principal: la transición entre equivalencias

Hoy, al pulsar "máximo desenfoque", los valores saltan y la foto cambia de golpe. Está verificado que el brillo se mantiene idéntico entre los dos estados (1.022 en ambos), pero **el usuario no puede verlo**: el cambio es instantáneo y tiene que recordar cómo estaba antes.

Animar esa transición —el fondo desenfocándose progresivamente mientras el brillo permanece clavado y el fotómetro no se mueve— **convierte la tesis de la app en algo observable**. Exponer bien no es una respuesta sino varias, y cambian el aspecto sin cambiar la luz. Hoy lo afirmamos; con movimiento, se demuestra.

Es la mejora de mayor valor de esta versión, por encima de los tres widgets.

---

## 3. Arquitectura

### 3.1 Estado visual separado del estado real

`render()` lee hoy las posiciones de los sliders y pinta al instante, lo que hace imposible cualquier transición: no existe un "entre dos estados".

Se introduce un **estado visual**. GSAP interpola el visual hacia el real y en cada fotograma se repinta desde el visual. Las funciones de pintado no cambian.

### 3.2 Interpolar en stops, no en valores crudos

Un tween de `f/1.4` a `f/22` sobre el número f pasaría casi toda la animación en el rango alto, porque la escala es logarítmica. Se interpola en **stops**:

```
stopsApertura = 2·log₂(N)
stopsTiempo   = log₂(t)
stopsIso      = log₂(ISO/100)
```

Se tweenean esos tres escalares y se convierten de vuelta a valores reales en cada fotograma. El recorrido queda perceptualmente uniforme.

### 3.3 Qué se anima y qué no

| Acción | Comportamiento | Duración |
|---|---|---|
| Arrastrar un slider | **Instantáneo** — seguir al dedo; un tween se siente como lag | 0 |
| Pulsar una equivalencia | Animado | 700 ms |
| Cambiar de escena | Animado | 500 ms |
| Aguja del fotómetro | Animada solo en cambios discretos, con asentamiento | 350 ms |
| Carga inicial | Coreografía corta y seca (registro OBRA) | 600 ms total |

La distinción entre arrastre y cambio discreto es lo que hace que se sienta un instrumento y no una presentación.

### 3.4 Módulos

| Archivo | Responsabilidad | Probable |
|---|---|---|
| `js/geometria.js` | Matemática pura de widgets e histograma. Sin DOM. | ✅ `node --test` |
| `js/widgets.js` | Crea y actualiza los SVG. Consume `geometria.js`. | navegador |
| `js/motion.js` | Líneas de tiempo de GSAP. | navegador |
| `js/enlace.js` | Lee y escribe el estado en la URL. Puro salvo el acceso a `location`. | ✅ parcial |
| `js/vendor/gsap.min.js` | GSAP 3.13.0, copiado de `portafolio-web`. Sin npm, sin build. | — |

`ui.js` no crece: delega movimiento en `motion.js` y dibujos en `widgets.js`.

---

## 4. Los tres widgets de mecanismo

Cada uno enseña lo que de verdad ocurre. No se fuerza una metáfora mecánica donde no la hay.

Tamaño: 48×48 px, a la derecha del valor numérico dentro de cada tarjeta de control. El número sigue mandando. En móvil no roba altura, que importa porque costó que la foto y los sliders cupieran juntos.

### 4.1 Diafragma (apertura)

Heptágono de 7 hojas que se abre y cierra **girando**. El giro es lo que hace que se lea como mecanismo y no como un polígono encogiéndose.

**El tamaño es honesto.** El diámetro real es proporcional a `1/N`, así que `f/22` es literalmente 1/16 del diámetro de `f/1.4` y queda como un punto diminuto. Esa es la lección: ver que el agujero casi desaparece explica por qué a `f/22` hace falta tanto tiempo o tanto ISO. Suavizarlo para que "se vea mejor" destruiría lo que enseña.

### 4.2 Cortinilla (velocidad)

Dos cortinillas que hacen **un solo ciclo al cambiar el valor**, no un bucle. Un bucle sería movimiento permanente sin que el usuario lo provoque, que es lo que el MASTER prohíbe.

**Concesión declarada:** el rango real va de 1/4000 (imperceptible) a 30 s (absurdo esperar). La duración se comprime logarítmicamente a **120–900 ms**. Es relativa, no literal: se ve que 1/30 dura mucho más que 1/1000, pero no en proporción real.

### 4.3 Señal y ruido (ISO)

El ISO no tiene mecanismo físico que animar: es ganancia electrónica. Forzar una metáfora mecánica sería inventar algo falso, y en una herramienta que enseña eso es peor que no ilustrar.

Una onda pequeña: a ISO 100, línea limpia de poca amplitud. Al subir el ISO **crece la amplitud y crece el temblor con ella**. Enseña el concepto que más cuesta: subir ISO no capta más luz, amplifica la que ya hay — y amplifica el ruido en la misma proporción.

El ruido usa un **generador pseudoaleatorio con semilla fija**, no `Math.random()`. Si no, la onda parpadearía distinto en cada fotograma del tween y se leería como un fallo.

---

## 5. Huecos de la v3 que se cierran

### 5.1 Histograma en modo PRO

La spec de la v3 (§4.3) lo prometía y nunca se construyó.

**Cómo se calcula.** Al cargar, se muestrea **una sola vez** el histograma de luminancia de la placa base con un canvas fuera de pantalla. Después, en cada cambio, ese histograma base se transforma por la misma curva de exposición que ya usa la previsualización (`brillo` y `contraste` de `motor.js`), acumulando en el primer y último cubo lo que se recorta.

Es exacto respecto al modelo —muestra el mismo recorte a negros y blancos que ve el usuario— y cuesta una pasada sobre 64 cubos por cambio, no una lectura de píxeles.

La función de transformación es pura y entra en la batería de pruebas.

### 5.2 Navegación por teclado en el selector de escenas

**Defecto introducido en la v3.** Los botones llevan `role="radio"` y las no seleccionadas `tabindex="-1"`, que es correcto para el patrón radiogroup — pero nunca se implementó la navegación con flechas que ese patrón exige. Resultado: **con teclado solo se alcanza la escena activa y no se puede cambiar de escena en absoluto.**

Se implementa el patrón completo: flechas izquierda/derecha/arriba/abajo mueven la selección y la activan, `Home` y `End` van a los extremos, y el foco viaja con la selección.

---

## 6. Estado compartible por URL

Hoy no hay forma de compartir una configuración. Para una herramienta didáctica es esencial: permite enlazar un caso concreto ("mira qué pasa de noche con estos ajustes"), y es vector de tráfico, que es el objetivo declarado del proyecto.

**Formato**, en el hash para no ensuciar la URL canónica ni generar variantes indexables:

```
#escena=calle-noche&f=2&t=0.0167&iso=3200&modo=pro
```

- Al cargar con hash válido, se aplica ese estado en vez del preset.
- Al cambiar el estado, se reemplaza el hash con `replaceState` — **sin añadir entradas al historial**, para no romper el botón atrás.
- Un hash inválido o parcial se ignora en silencio y se cae al preset de la escena. Nunca rompe la carga.

El canonical sigue apuntando a la URL sin hash, así que no crea contenido duplicado.

---

## 7. Accesibilidad

- Los tres widgets van `aria-hidden="true"`: el valor real ya lo anuncia el slider con `aria-valuetext`, y duplicarlo sería ruido para un lector de pantalla.
- El histograma también `aria-hidden="true"`, por lo mismo.
- `gsap.matchMedia()` con `prefers-reduced-motion`: todas las duraciones a cero. Los estados finales son idénticos; solo desaparece el recorrido.
- El patrón radiogroup completo (§5.2).

---

## 8. Riesgo a medir

**Tweening del desenfoque en móvil.** Animar `blur` de 0 a 22 px es más caro que saltar a 22 px. El desenfoque estático ya se verificó con la CPU estrangulada 4×, pero el tween hay que medirlo aparte.

**Salida si no aguanta:** animar los números, el diafragma y la aguja, y dejar el desenfoque en salto. La lección de las equivalencias se sostiene igual, porque lo que hay que ver es que el brillo no cambia mientras el resto sí.

---

## 9. Fuera de alcance

Movimiento continuo de fondo, parallax, carruseles, cualquier cosa que se mueva sin que el usuario la provoque. El criterio del MASTER es *qué enseña el movimiento*, y eso no enseña nada.

Tampoco entran: miniaturas en las equivalencias (A-03 del backlog), modo desafío, ni placas por escena.
