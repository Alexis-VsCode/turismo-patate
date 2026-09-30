# ADR 006 — Catálogo en bloques dentro de una sola pestaña

**Estado:** Aceptada · **Fecha:** 2026-09-30 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

`_Catalogos` eran 12 listas de largos distintos puestas en las mismas filas, sin relación entre ellas. Solo había dos parejas reales
(ciudad con su provincia y coordenadas, país con sus coordenadas). Ordenar una columna cruzaba los datos, los desplegables usaban rangos
fijos y nada impedía repetidos.

## Alternativas

- **A. Una pestaña por tema** (`_Ecuador`, `_Paises`, `_Provincias`, `_Listas`): cada fila es autosuficiente, pero obliga a reescribir la
  lectura del catálogo y a mantener un formato anterior de respaldo.
- **B. Una tabla larga** (Tipo, Nombre, Grupo, Lat, Lon): lectura simple, pero los desplegables necesitan fórmulas `FILTER` y una hoja
  auxiliar, frágil en Google Sheets.
- **C. Una sola pestaña, ordenada en bloques** (elegida).

## Decisión

Se mantiene `_Catalogos` con cuatro bloques (Listas, Países, Ciudades de Ecuador y Provincias), separados por una columna vacía y con color
propio, cada pareja contigua. El lector identifica las columnas por su **encabezado**, así que reordenarlas no exigió cambiar su formato de
lectura. Los desplegables llegan hasta la fila 1000, la hoja rechaza nombres repetidos y el lector avisa de ciudades repetidas, fuera de
Ecuador o con una provincia que no está en la lista.

## Consecuencias

- Es el cambio más pequeño que resuelve lo que se veía: orden, pareja visible y agregar al final.
- Las columnas siguen compartiendo filas dentro de un bloque, por lo que ordenar exige seleccionar el bloque completo. La regla está escrita
  en la pestaña `_Inicio`.
- La validación de duplicados y el formato condicional dependen de que Google Sheets los conserve al importar el archivo; el aviso del lector
  cubre ese riesgo.
