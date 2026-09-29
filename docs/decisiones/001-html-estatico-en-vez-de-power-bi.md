# ADR 001 — HTML estático en vez de Power BI

**Estado:** Aceptada · **Fecha:** 2026-09-29 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

El tablero debe ser **público**: se enlaza desde la web del municipio y se abre en el celular. Power BI
exige, para publicarlo, una cuenta de trabajo o escuela y licencia Pro o Fabric. «Publicar en la web» lo expone
sin control, y el GAD no tenía un tenant confirmado.

## Decisión

Sitio **HTML/JavaScript estático** con ECharts y Leaflet, publicado en GitHub Pages. Power BI se descartó por su
licencia, no por su capacidad: si el GAD confirmara un tenant con licencia Pro o Fabric, sería una alternativa
válida, pero exigiría rehacer el tablero y sus filtros en esa herramienta.

## Consecuencias

- Costo de licencias cero y diseño exactamente igual al que pidió el cliente.
- Los filtros cruzados que Power BI trae hechos se programan. Se prueban en `test/application/`.
