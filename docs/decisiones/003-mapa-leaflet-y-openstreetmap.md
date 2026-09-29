# ADR 003 — Mapa con Leaflet y OpenStreetMap

**Estado:** Aceptada · **Fecha:** 2026-09-29 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

El cliente pidió un mapa real, como el de Bing de su maqueta, manejado por el combo País / Ciudad. Las
alternativas revisadas:
- **CARTO:** exige clave desde 08/2026.
- **Esri y Stadia:** exigen cuenta o limitan el uso comercial.
- **ECharts-geo:** no ofrece mapa base con calles.

## Decisión

**Leaflet 1.9.4** con teselas de **OpenStreetMap** (uso moderado permitido, con atribución visible y Referer
activo), más el GeoJSON local de provincias de geoBoundaries (CC0) y burbujas con coordenadas de `_Catalogos`.

## Consecuencias

- Mapa real, gratuito y sin claves.
- Si OSM no responde, las provincias y las burbujas siguen visibles.
- Obliga a no usar `no-referrer` de forma global.
