# Dashboard «Estadísticas de Visitantes · Cantón Patate»

Sitio web estático y público del GAD Municipal de San Cristóbal de Patate. Muestra los visitantes de los
establecimientos turísticos a partir de una Google Sheet compartida.

## Cómo funciona

1. Cada establecimiento llena **su propia pestaña** en la hoja de Google «TURISMOPEGIPATATE».
2. La hoja está publicada en la web (Archivo → Compartir → Publicar en la web → *Todo el documento*, formato
   xlsx). **Esa URL no está en el código:** vive solo en el secreto `SHEET_URL` del repositorio en GitHub.
3. Cada 5 minutos, GitHub Actions (`.github/workflows/publicar.yml`) hace esto:
   - descarga la hoja;
   - corre las pruebas;
   - la valida con las mismas reglas del dashboard (`tools/construir_datos.mjs`);
   - publica en GitHub Pages el sitio junto con un `datos/datos.json` compacto.

   El navegador del visitante **solo lee `datos.json` del propio sitio**: nunca ve ni contacta la hoja. Si la
   hoja falla, la tarea termina con error y el sitio sigue mostrando los últimos datos buenos.
4. Cada pestaña cuenta como un establecimiento, salvo:
   - las pestañas que empiezan con `_` (por ejemplo `_Instrucciones` y `_Catalogos`);
   - las que contienen «plantilla» (`Plantilla`, `Plantilla (2)`, `Copia de Plantilla`).

## Columnas fijas de cada pestaña

| Año | Mes | País | Provincia | Ciudad | Cantidad | Motivo de visita | Edad | Género |
|---|---|---|---|---|---|---|---|---|

- Cada fila es un grupo de visitantes con el mismo mes, procedencia, motivo, edad y género. Una persona sola
  se anota con Cantidad = 1.
- **Nacional o extranjero no se escribe:** el dashboard lo deduce del País (Ecuador = nacional).
- Edad es un número entero de 0 a 110. El dashboard la agrupa en 0-17, 18-25, 26-35, 36-45, 46-59 y 60+.
- Si la fila es de un extranjero, Provincia y Ciudad quedan vacías.
- **No se escriben datos personales**: ni nombres, ni cédulas, ni teléfonos. La hoja publicada es pública.

## Agregar un establecimiento

1. En la hoja: clic derecho en la pestaña `Plantilla` → **Duplicar**.
2. Renombrar la copia con el nombre del establecimiento.
3. Llenar las filas usando los desplegables.

Unos 5 minutos después, que es lo que tarda Google en republicar, aparece en el dashboard: en el combo, en los
filtros, en las tarjetas y en el mapa. No hay que tocar código.

## Catálogos (`_Catalogos`)

La pestaña `_Catalogos` alimenta los desplegables de la hoja y el mapa:

- **Listas:** años, meses, países, provincias, ciudades, motivos y géneros.
- **Coordenadas:** `Ciudad_Lat`/`Ciudad_Lon` para cada ciudad y `Pais_Lat`/`Pais_Lon` para cada país.

Para sumar una ciudad o un país, se agrega en la columna que corresponde con sus coordenadas. Si una fila trae
un valor que no está en el catálogo, el dashboard **no lo descarta en silencio**: lo muestra en el aviso
«⚠ N filas con problemas», con la pestaña y la fila.

## Actualización

| Cuándo | Qué hace |
|---|---|
| Al abrir la página | Descarga los datos |
| Botón «Actualizar» | Descarga en el momento |
| Cambio de establecimiento | Vuelve a descargar si pasaron más de 60 s |
| Automático | Cada 5 minutos, mientras la pestaña está visible |

La página muestra siempre «Se actualiza automáticamente cada 5 minutos · Datos al …». Si la descarga falla,
se conservan los últimos datos buenos y aparece un aviso.

Por qué no se actualiza cada minuto:
- Google cachea lo publicado unos 5 minutos, así que refrescar antes devolvería lo mismo.
- Con el tráfico de la web municipal sería descarga inútil.

## Seguridad

La hoja la editan terceros, así que **toda celda y todo nombre de pestaña se trata como texto no confiable**.

| Medida | Detalle |
|---|---|
| Librerías sin CVE conocidos (revisado el 29/09/2026) | ECharts **6.1.0** (corrige CVE-2026-45249 y CVE-2021-39227), Leaflet **1.9.4** y SheetJS **0.20.3** (corrige CVE-2023-30533 y CVE-2024-22363). No se usa la 0.18.5 de cdnjs. |
| Integridad (SRI) | Cada script externo lleva su hash `integrity`. SheetJS ya no se carga en el navegador: solo lo usa GitHub Actions. |
| CSP (`<meta>` en `index.html`) | Scripts solo propios y de cdnjs. Datos solo del propio sitio (`connect-src 'self'`). Imágenes solo propias y de `tile.openstreetmap.org`. Sin scripts en línea, sin `eval`, sin formularios ni objetos. |
| Anti-XSS | El código escribe texto solo con `textContent`. Los tooltips de los gráficos usan `renderMode: 'richText'` y los del mapa, nodos de texto. Una prueba falla si aparece `innerHTML`, `eval` o `new Function` en `js/`. |
| Contaminación de prototipos | Las agrupaciones usan `Map` y descartan `__proto__`, `constructor` y `prototype`. |
| Límites de descarga | Timeout de 15 s. Máximo de 20 MB leyendo el stream. Máximo de 300 pestañas y 5000 filas por pestaña. |
| Referer | La página usa `strict-origin-when-cross-origin`, porque la política de OpenStreetMap prohíbe `no-referrer`. Los scripts de los CDN van con `no-referrer`. |

Limitación conocida: GitHub Pages no permite cabeceras propias, así que `frame-ancestors` y `X-Frame-Options`
no aplican. El sitio se puede incrustar en la web del GAD. El riesgo de clickjacking es bajo porque el sitio
es de solo lectura.

## Publicación en GitHub Pages

1. En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**, con nombre
   `SHEET_URL` y como valor la URL `.../pub?output=xlsx` de la hoja.
2. En **Settings → Pages → Source**, elegir **GitHub Actions**.
3. Cada `push` a `main`, y además cada 5 minutos, publica el sitio. La URL queda en Settings → Pages y en la
   pestaña Actions.

A tener en cuenta:
- GitHub puede retrasar las tareas programadas en horas de mucha carga.
- En un repositorio público, las tareas programadas se pausan si pasan 60 días sin actividad. Se reactivan
  desde la pestaña Actions.

**Protección de la hoja en Google** (la hace el administrador):
- Compartir → **Restringido**, con solo los correos de los establecimientos.
- **Datos → Proteger hojas** para `_Catalogos` y `Plantilla`.
- Opcional: cada pestaña editable solo por su establecimiento.

## Desarrollo

Lo que hace falta:
- **Node 20 o superior**, para las pruebas.
- **Python 3 con openpyxl**, para el oráculo y el generador.
- **Nada de npm install:** el proyecto no tiene dependencias ni paso de build.

```bash
node tools/construir_datos.mjs --desde-archivo test/fixtures/piloto-publicado.xlsx
```

```bash
python -m http.server 8765 --bind 127.0.0.1
```

```bash
python tools/oraculo.py
```

```bash
node --test test/*.test.mjs
```

| Prueba | Qué comprueba |
|---|---|
| `test/datos.test.mjs` | Pestañas de sistema, normalización de errores reales (`agosoto`, espacios, tildes), filas rechazadas con ubicación y pestañas mal armadas |
| `test/agregaciones.test.mjs` | Los 7 escenarios de `test/fixtures/escenarios.json` concilian con `tools/oraculo.py`, que calcula aparte con openpyxl sobre el libro publicado real |
| `test/paquete.test.mjs` | `datos.json` conserva exactamente los números, no contiene la URL de la hoja y el navegador rechaza un paquete alterado |
| `test/seguridad.test.mjs` | HTML hostil en pestañas y celdas, `__proto__`, descarga acotada en tamaño y tiempo, y APIs prohibidas |

`tools/generar_piloto.py` genera, con semilla fija, el libro de prueba de 100 establecimientos ficticios.

## Pasar a datos reales

1. En `js/config.js`, poner `DATOS_DE_PRUEBA: false`. Así se quita la franja amarilla.
2. Reemplazar en la hoja las pestañas ficticias por las de los establecimientos reales, duplicando la
   `Plantilla`.

## Créditos

- Mapa © colaboradores de OpenStreetMap.
- Límites provinciales: geoBoundaries (CC0).
- Foto de cabecera: «Valle del Patate», DIOHER_PAVAL, CC BY 3.0, vía Wikimedia Commons. Se reemplaza por
  una foto propia del GAD en `assets/fondo-cabecera.jpg`, conservando el nombre.

Diseño y desarrollo: Ing. Kevin Alexis Barrera Llerena — [LinkedIn](https://www.linkedin.com/in/alexisbarreradesarrolador/). © 2026, todos los derechos de desarrollo reservados.
