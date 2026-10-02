# ADR 008 — Filtros de varias opciones

**Estado:** Aceptada · **Fecha:** 2026-10-01 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

Cada filtro admitía una sola opción. Con catálogos de más de 450 procedencias, comparar dos países o una ciudad y un país exigía cambiar el filtro
una y otra vez.

## Alternativas

- **A. Una opción por filtro** (lo que había).
- **B. Varias opciones en todos los filtros**, incluidos año y mes.
- **C. Varias opciones en establecimiento, procedencia, motivo, edad y género; año y mes de una sola** (elegida).

## Decisión

Cada filtro de varias opciones guarda una lista; una lista vacía significa «sin restricción». Dentro de un filtro las opciones se suman y entre filtros se
cruzan. Las opciones elegidas se muestran como etiquetas sobre los gráficos, cada una con su «×», y «Quitar todos» las limpia. Un clic en una barra, en un
motivo o en el mapa agrega o quita la opción. La pestaña del mapa sigue a la última opción de procedencia agregada.

Año y mes quedan de una sola opción porque la variación interanual y la evolución comparan dos años y no tienen sentido con varios.

## Consecuencias

- El estado de filtros cambió de forma; `filtros.js` acepta también un valor suelto, así que las pruebas y los datos anteriores siguen valiendo.
- El combo nuevo (`combo-multiple.js`) reemplaza al combo con búsqueda de una sola opción.
- La discapacidad respeta todos los filtros salvo edad y género.
