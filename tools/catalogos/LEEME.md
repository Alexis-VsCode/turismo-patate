# Catalogos de Ecuador y paises

`generar-catalogos.py` arma los catalogos completos de ciudades de Ecuador (cantones), paises y provincias,
**sin quitar ni renombrar nada** de lo que ya tiene la hoja `_Catalogos`: solo agrega lo que falta.

## Que hace

1. Lee la foto del catalogo actual (`base-actual-2026-10-01.json`, sin red).
2. Descarga los cantones (geoBoundaries ADM2) y calcula para cada uno un punto representativo **dentro del
   poligono** (ray casting con huecos, malla y distancia al borde; Python puro).
3. Asigna la provincia por contencion del punto en `assets/ecu-provincias.geojson`.
4. Normaliza el nombre del canton a su forma comun en espanol y lo contrasta con GeoNames (solo contraste).
5. Une con el catalogo actual sin duplicados (comparacion sin tildes ni mayusculas).
6. Toma los paises de mledoze/countries (miembros de la ONU mas los territorios ya presentes en el catalogo).
7. Escribe `ciudades-ecuador.csv`, `paises.csv` y `provincias.csv` (UTF-8 con BOM, coma, orden alfabetico
   espanol) y verifica: filas actuales intactas, sin duplicados, ciudades dentro de Ecuador.

La columna `Origen` es `actual`, `geoBoundaries ADM2` o `mledoze/countries`.

## Como ejecutarlo

```
python tools/catalogos/generar-catalogos.py
```

Solo biblioteca estandar. Tarda unos 2 minutos (geometria en Python puro). La primera vez descarga
~50 MB a `tools/catalogos/_cache/` (ignorada por git). La foto base solo se rehace a proposito con
`--crear-foto` (requiere `openpyxl`).

## Fuentes, licencias y atribucion

- **Cantones (ADM2):** geoBoundaries, version gbOpen, Ecuador. Fuente original: INEC (Instituto Nacional de
  Estadistica y Censos) y OCHA ROLAC, 2019. Licencia **CC BY 3.0 IGO**.
  Atribucion: "Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative
  boundaries. PLoS ONE 15(4): e0231866. Datos: INEC / OCHA ROLAC, CC BY 3.0 IGO".
- **Provincias (ADM1):** `assets/ecu-provincias.geojson` del repositorio. Licencia **CC0**.
- **Paises:** mledoze/countries (https://github.com/mledoze/countries). Licencia **ODbL**.
  Atribucion: "Contiene informacion de mledoze/countries, disponible bajo la Open Database License (ODbL)".
- **Contraste de nombres:** GeoNames (https://www.geonames.org), CC BY 4.0. No se copian datos; solo se
  comparan nombres.

## Advertencia

Las coordenadas de los cantones nuevos y de los paises nuevos son **centros aproximados** (punto interior
representativo del canton, o punto de referencia del pais), no la ubicacion de la cabecera cantonal ni de la
capital. Sirven para ubicar el origen de visitantes en un mapa, no para medir distancias exactas.

Notas de criterio: ADM2 trae 223 unidades; se excluyen `Las Golondrinas` y `El Piedrero` (zonas no
delimitadas) y quedan los 221 cantones. Un canton cuya cabecera ya esta en el catalogo con otro nombre
(p. ej. Puyo, canton Pastaza) no se agrega de nuevo. Los homonimos llevan la provincia entre parentesis.
