# Catálogos de Ecuador y países

`generar-catalogos.py` arma los catálogos completos de ciudades de Ecuador (cantones), países y provincias,
**sin quitar ni renombrar nada** de lo que ya tiene la hoja `_Catalogos`: solo agrega lo que falta.

## Qué hace

1. Lee la foto del catálogo actual (`base-actual-2026-10-01.json`, sin red).
2. Descarga los cantones (geoBoundaries ADM2) y calcula para cada uno un punto representativo **dentro del
   polígono** (ray casting con huecos, malla y distancia al borde; Python puro).
3. Asigna la provincia por contención del punto en `assets/ecu-provincias.geojson`.
4. Normaliza el nombre del cantón a su forma común en español y lo contrasta con GeoNames (solo contraste).
5. Une con el catálogo actual sin duplicados (comparación sin tildes ni mayúsculas).
6. Toma los países de mledoze/countries (miembros de la ONU más los territorios ya presentes en el catálogo).
7. Escribe `ciudades-ecuador.csv`, `paises.csv` y `provincias.csv` (UTF-8 con BOM, coma, orden alfabético
   español) y verifica: filas actuales intactas, sin duplicados, ciudades dentro de Ecuador.

La columna `Origen` es `actual`, `geoBoundaries ADM2` o `mledoze/countries`.

## Cómo ejecutarlo

```
python tools/catalogos/generar-catalogos.py
```

Solo biblioteca estándar. Tarda unos 2 minutos (geometría en Python puro). La primera vez descarga
~50 MB a `tools/catalogos/_cache/` (ignorada por git). La foto base solo se rehace a propósito con
`--crear-foto`, que requiere `openpyxl` y la variable de entorno `HOJA_CATALOGOS_URL` con el enlace de
exportación xlsx de la hoja (`.../spreadsheets/d/<id>/export?format=xlsx`):

```
HOJA_CATALOGOS_URL=... python tools/catalogos/generar-catalogos.py --crear-foto
```

Ese enlace no se versiona: vive solo en el entorno de quien rehace la foto, y `test/tools/url-hoja.test.mjs` falla si el ID de una hoja
aparece en algún archivo del repositorio. Sin la variable, el modo se detiene sin tocar nada.

## Fuentes, licencias y atribución

- **Cantones (ADM2):** geoBoundaries, versión gbOpen, Ecuador. Fuente original: INEC (Instituto Nacional de
  Estadística y Censos) y OCHA ROLAC, 2019. Licencia **CC BY 3.0 IGO**.
  Atribución: "Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative
  boundaries. PLoS ONE 15(4): e0231866. Datos: INEC / OCHA ROLAC, CC BY 3.0 IGO".
- **Provincias (ADM1):** `assets/ecu-provincias.geojson` del repositorio. Licencia **CC0**.
- **Países:** mledoze/countries (https://github.com/mledoze/countries). Licencia **ODbL**.
  Atribución: "Contiene información de mledoze/countries, disponible bajo la Open Database License (ODbL)".
- **Contraste de nombres:** GeoNames (https://www.geonames.org), CC BY 4.0. No se copian datos; solo se
  comparan nombres.

## Advertencia

Las coordenadas de los cantones nuevos y de los países nuevos son **centros aproximados** (punto interior
representativo del cantón, o punto de referencia del país), no la ubicación de la cabecera cantonal ni de la
capital. Sirven para ubicar el origen de visitantes en un mapa, no para medir distancias exactas.

Notas de criterio: ADM2 trae 223 unidades; se excluyen `Las Golondrinas` y `El Piedrero` (zonas no
delimitadas) y quedan los 221 cantones. Un cantón cuya cabecera ya está en el catálogo con otro nombre
(p. ej. Puyo, cantón Pastaza) no se agrega de nuevo. Los homónimos llevan la provincia entre paréntesis.
