# ADR 007 — Formato mensual de captura con totales por rango de edad

**Estado:** Aceptada · **Fecha:** 2026-10-01 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

Cada fila de una pestaña era un grupo de visitantes con una edad y un género sueltos. El municipio pidió capturar por **mes**, con rangos de edad
(0-30, 31-45, 46-60 y 61+), «Total mujeres» y «Total hombres», y un dato nuevo: personas con discapacidad. Los establecimientos llenan la hoja a
mano, así que los totales no pueden poder descuadrarse.

## Alternativas

- **A. Totales sueltos** (mujeres, hombres y cuatro rangos por separado): es lo más corto de llenar, pero el sitio ya no sabría cuántas mujeres hay de 0 a
  30 y los filtros de edad y género dejarían de cruzarse.
- **B. Una fila larga por grupo** (el formato anterior): exacto, pero obliga a miles de filas por establecimiento.
- **C. Ocho columnas cruzadas** (mujeres y hombres por rango) con los totales calculados por la hoja (elegida).

## Decisión

El formato mensual usa ocho columnas de números más «Personas con discapacidad». Los totales, nacionales y extranjeros los calcula la hoja con fórmulas,
y una fila imposible se pinta de rojo. El lector repite las mismas reglas y rechaza lo imposible con pestaña, fila y motivo. El formato anterior sigue
vigente y se reconoce por los encabezados.

Cada número mayor que cero se expande en una fila interna con la **edad base de su rango** (0, 31, 46 o 61), que el dominio vuelve a convertir en el
mismo rango. Así los filtros, los gráficos, el mapa y el contrato `datos.json` no cambian de forma. La discapacidad viaja aparte, en una clave opcional,
porque no se cruza con la edad ni con el género.

## Consecuencias

- Una fila de la hoja produce hasta ocho filas internas: el paquete crece (unos 2,6 MB con 16.000 filas de hoja) y se mide en cada publicación.
- La edad interna es una representación, no un dato: no debe mostrarse como edad real.
- El libro de prueba lo genera `tools/excel/generar-excel.py` y un oráculo en Python, que lee las ocho columnas por su cuenta, concilia con el lector.
