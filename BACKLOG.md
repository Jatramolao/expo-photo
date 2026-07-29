# BACKLOG — exposicion.foto

> Fuente de verdad única de lo pendiente. El historial de iteraciones vive en
> [CLAUDE.md](CLAUDE.md); el diseño vigente, en
> `docs/superpowers/specs/2026-07-28-exposicion-foto-v3-design.md`.
>
> Embudo: **idea → aprobada → spec → implementación**. Nada se implementa sin
> pasar por spec.

---

## Aprobadas, sin fecha

| # | Qué | Por qué | Notas |
|---|---|---|---|
| A-01 | Reemplazar la placa generada por una fotografía real de Juan | Una herramienta que enseña fotografía gana autoridad si su ejemplo central es una foto de verdad. Además elimina la declaración de IA del pie. | Requisitos en la spec §4.4.1: disparada a f/11, fondo con detalle fino y legible, luz difusa pareja, sujeto despegado del fondo, pelo recogido. Solo hay que sustituir dos archivos y `escenas.js`. |
| A-02 | Placas propias por escena | Hoy las seis escenas comparten una sola placa neutra y solo se diferencian por el brillo simulado. Una foto real de noche enseñaría más que una de día oscurecida. | Se añaden editando solo `escenas.js`. No requiere tocar código. |
| A-03 | Miniaturas en las equivalencias | La spec §3.6 las contempla: cada alternativa mostraría cómo se vería, no solo sus números. Hoy hay que aplicarla para verla. | Requiere renderizar tres previsualizaciones pequeñas en paralelo; ojo con el rendimiento del `blur` en móvil. |

## Ideas, sin aprobar

| # | Qué | Estado |
|---|---|---|
| I-01 | Modo desafío: el sitio propone una situación y el usuario tiene que acertar la exposición | Muy pegajoso y compartible, pero es una segunda funcionalidad completa. Decidir después de ver datos de uso reales. |
| I-02 | Calculadora de profundidad de campo independiente | Estaba prometida en el waitlist de la v2, que ya no existe. Evaluar si aporta algo que la previsualización actual no muestre ya. |
| I-03 | Balance de blancos | Igual que la anterior. |
| I-04 | Profundidad de campo por distancia en la previsualización | Hoy el desenfoque del fondo es uniforme y también afecta al primer plano (simplificación declarada en la spec §4.4). Corregirlo exigiría un mapa de profundidad por escena. |
| I-05 | Memoizar las equivalencias por escena y modo | En PRO se recorren ~32.000 combinaciones en cada movimiento de slider. Hoy no se nota, pero es la primera optimización si algún día se nota. |

## Descartadas

| # | Qué | Por qué |
|---|---|---|
| D-01 | Otros idiomas | La propuesta de valor es ser **la referencia en español**. Traducir diluye el foco y multiplica el contenido a mantener. |
| D-02 | Waitlist de correo | Eliminado en la v3. Pedía un dato y lo descartaba. Si algún día se quiere captar, se conecta a un servicio real y se decide de nuevo. |

---

## Verificaciones pendientes en producción

- [ ] Confirmar que el despliegue de Vercel sigue sirviendo el sitio como estático tras la aparición del `package.json` (mitigado con `vercel.json`, verificado solo en local).
- [ ] Comprobar que Vercel Analytics registra visitas una vez desplegado.
- [ ] Validar los datos estructurados con la herramienta de resultados enriquecidos de Google sobre la URL pública.
