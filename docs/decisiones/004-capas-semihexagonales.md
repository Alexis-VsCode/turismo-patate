# ADR 004 — Capas semihexagonales en JavaScript sin framework

**Estado:** Aceptada · **Fecha:** 2026-09-29 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

La primera versión tenía `js/` plano y un `app.js` de ~260 líneas que mezclaba estado, reglas, DOM y red.

## Decisión

Se adoptan capas `domain` / `infrastructure` / `application` (fachada, container, presentacionales,
compartidos) + `shared`, con `main.js` como raíz de composición. `test/arquitectura.test.mjs` hace cumplir la
regla de dependencias.

## Consecuencias

- La fachada se prueba en Node con reloj y descarga simulados.
- El dominio no depende de nada.
- Hay más archivos, pero cada uno con una sola responsabilidad.
