# ADR 005 — Tema claro y oscuro, y excepciones de color

**Estado:** Aceptada · **Fecha:** 2026-09-29 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

El tablero adopta una paleta solo de verde y amarillo (la del logo del GAD) y un botón para pasar de modo claro a
oscuro. La CSP prohíbe scripts en línea, y aplicar el tema desde un módulo ES provoca un destello del tema
equivocado al cargar.

## Decisión

- **Un botón de dos estados** (claro y oscuro). Sin elección guardada, el sitio sigue al dispositivo.
- **Script clásico externo** (`src/shared/tema-inicial.js`) en el `<head>`, antes de las hojas de estilo: aplica
  `data-theme` antes del primer pintado y cumple la CSP (`script-src 'self'`). Repite la regla de `tema.js` porque un
  script clásico no puede importar; una prueba lo ejecuta en un contexto aislado y comprueba que ambos coinciden.
- **`localStorage`** con la clave `tema-patate`, siempre dentro de `try/catch`, porque puede lanzar en modo privado.
  No hay cookies, y se declara en el pie, en `docs/seguridad.md` y en `SECURITY.md`.
- **Tokens únicos:** los colores viven en variables CSS y los gráficos los leen de ahí. Una prueba exige que cada token
  usado exista, porque un token ausente hace que ECharts use su paleta azul sin dar error.
- **Excepciones de azul, y solo estas:**
  - la bandera de Ecuador;
  - los colores oficiales de LinkedIn y Facebook en sus botones (TikTok va en su negro oficial, que no es azul);
  - el agua de las teselas de OpenStreetMap, que son datos del mapa y no se recolorean.

## Consecuencias

- El tema correcto se ve desde el primer pintado, con o sin `localStorage`.
- Hay una regla duplicada (script inicial y `tema.js`), protegida por una prueba.
- Un barrido de colores del repositorio permite comprobar que no quedó otro azul.
