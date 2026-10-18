# ADR 004: Capas semihexagonales en JavaScript sin framework

**Estado:** Aceptada, ampliada por la [ADR 010](010-publicacion-hexagonal-y-tablero-semihexagonal.md), **Fecha:** 2026-09-29, **Autor:** Ing. Kevin Alexis Barrera Llerena

> Antecedente. Las carpetas que nombra esta decisión viven hoy bajo `src/tablero/`, y la lectura del Excel pasó a `src/publicacion/`.
> La estructura vigente está en la ADR 010.

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
