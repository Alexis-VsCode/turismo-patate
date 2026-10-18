# Seguridad

La hoja la editan terceros, así que **toda celda y todo nombre de pestaña se trata como entrada no confiable**,
tanto en GitHub Actions como en el navegador.

## Librerías

Revisión del 13/10/2026 en NVD y en los avisos de GitHub:

| Librería | Versión | Dónde | Estado |
|---|---|---|---|
| Apache ECharts | 6.1.0 | Navegador (cdnjs + SRI) | Corrige CVE-2026-45249 (XSS en el tooltip de la serie `lines`) y no le afecta CVE-2021-39227 |
| Leaflet | 1.9.4 | Navegador (cdnjs + SRI) | Sin CVE conocidos en la versión estable |
| SheetJS CE | 0.20.3 | Solo en GitHub Actions (`tools/vendor/`) | Corrige CVE-2023-30533 (contaminación de prototipos) y CVE-2024-22363 (ReDoS). No se usa la 0.18.5 de cdnjs |

Al cambiar una versión hay que revisar sus CVE, recalcular el `integrity` y actualizar esta tabla y
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Política de contenidos (CSP)

Va en un `<meta>` de [`index.html`](../index.html), porque GitHub Pages no permite cabeceras propias. Cada recurso externo se permite por su
**URL exacta**, no por el CDN entero:

```
default-src 'none';
script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/echarts/6.1.0/echarts.min.js
  https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js;
style-src 'self' https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css;
style-src-attr 'unsafe-inline';
img-src 'self' data: https://tile.openstreetmap.org;
connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'
```

- **Scripts:** solo propios y los dos de cdnjs, cada uno por su URL exacta y con **SRI** (`sha512`). No hay scripts en línea ni `eval`; se
  verificó que ECharts no necesita `unsafe-eval`. `test/tablero/csp.test.mjs` falla si la política permite el CDN entero, si declara un origen
  que la página no usa o si una librería externa no lleva `integrity`.
- **Imágenes:** solo propias (`img-src 'self'`), `data:` y las teselas de OpenStreetMap. Por eso las fotos de las personas del
  pie viven en `assets/` y no se enlazan desde Facebook ni LinkedIn: una imagen de otro origen el navegador la bloquearía.
- **Datos:** solo del mismo sitio (`connect-src 'self'`). El navegador no puede contactar la hoja.
- **`style-src-attr 'unsafe-inline'`:** es necesario porque Leaflet y ECharts posicionan elementos con estilos
  en línea. No habilita scripts.

## Contenido de la hoja

| Riesgo | Medida | Dónde |
|---|---|---|
| XSS por nombres de pestaña o celdas | Escritura solo con `textContent`/`createElement`; tooltips de ECharts en `richText`; tooltips del mapa como nodos DOM | `src/tablero/application/components/**` |
| Reintroducir APIs peligrosas | Prueba que falla si aparece `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` o `new Function` en `src/` | `test/publicacion/seguridad.test.mjs` |
| Contaminación de prototipos | Agrupaciones con `Map` y claves `__proto__`, `constructor` y `prototype` descartadas | `src/domain/texto.js`, `estadisticas.js` |
| Enlaces del contacto | Por red, solo `https://` con la forma de [configuracion.md](configuracion.md#reglas-de-los-enlaces-de-contacto_municipio) y sin `?` ni `#`. Vacía: botón «Pronto». Inválida: no se muestra. El aviso vuelve a filtrar `https://` | `contacto.presentational.js` (`prepararEnlacesContacto`) y `compartidos/aviso.js` |
| Enlace de la autoridad | El botón «Sitio del GAD» se muestra solo si `AUTORIDAD_MUNICIPIO.enlace` es `https://` a un dominio | `contacto.presentational.js` (`enlaceSeguro`) |
| Aviso flotante | Título y mensaje se escriben con `textContent`; solo se admiten enlaces `https://` | `src/tablero/application/components/compartidos/aviso.js` |
| Íconos de los motivos | Trazos fijos del código, creados con `createElementNS`; el nombre del motivo solo elige cuál usar y nunca se interpreta como HTML | `src/tablero/application/components/presentational/motivos.presentational.js` |
| Caracteres invisibles o de control | `limpiarTexto()` los elimina y acota el largo a 120 caracteres | `src/domain/texto.js` |
| Excel malicioso | SheetJS en modo restrictivo: sin fórmulas, HTML, estilos ni macros, y con topes de pestañas y filas. Se evalúa aislado en un contexto propio | `src/publicacion/adaptadores/lector-xlsx.js` |
| Columnas grises pisadas a mano | El total y la nacionalidad salen siempre de las columnas de entrada y del País; si las grises lo contradicen, se avisa | `lector-xlsx.js` y `tools/excel/proteger-hoja.gs` |
| `datos.json` alterado | El navegador valida versión, tipos, índices y rangos, y rechaza el paquete entero si algo no cumple | `src/contrato/contrato-datos.js` |
| Respuesta gigante o lenta | Tope de tiempo y de bytes leyendo el stream, aunque falte `Content-Length`: 15 s y 20 MB en el navegador, 120 s y 50 MB para la hoja | `src/contrato/descarga-acotada.js` |
| Escritura a medias | `datos.json` se escribe en un temporal y se renombra; si algo falla antes, el archivo anterior no se toca | `src/publicacion/adaptadores/destino-archivo.js` |

## Flujo de publicación

[`publicar.yml`](../.github/workflows/publicar.yml) da a nivel de flujo solo `contents: read`, y cada job declara los permisos que usa:

| Job | Permisos | Por qué |
|---|---|---|
| `destrabar` | `actions: write` | Cancela ejecuciones atascadas y reactiva el flujo mediante la API de Actions ([ADR 009](decisiones/009-publicacion-con-doble-disparador.md)) |
| `construir` | `contents: read`, `pages: read` | Lee el código y la configuración de Pages. Es el único que recibe `SHEET_URL` y no tiene escritura en Pages ni tokens OIDC |
| `desplegar` | `pages: write`, `id-token: write` | Despliega el artefacto de Pages |

`test/tools/flujos.test.mjs` falla si el flujo reparte permisos de más. El sitio publicado no incluye `src/publicacion/`, `tools/` ni `test/`.

**Sin el ID de la hoja en el repositorio.** La publicación toma la URL del secreto `SHEET_URL` y la herramienta de catálogos, de la variable
`HOJA_CATALOGOS_URL`. `test/tools/url-hoja.test.mjs` recorre los archivos versionados y falla si alguno escribe el ID de una hoja de Google.

**Sin respaldos en Actions.** En un repositorio público, los artefactos de Actions los puede descargar cualquier cuenta de GitHub, así que
el flujo no sube copias de la hoja. El respaldo es el historial de versiones de Google ([operacion.md](operacion.md#respaldo-de-la-hoja)).

**Token de cron-job.org.** De grano fino, solo para este repositorio, con el permiso **Actions: Read and write** y con vencimiento
([operacion.md](operacion.md#cómo-se-dispara-la-publicación-cron-joborg)).

## Privacidad

- **Sin rastreo:** el sitio no usa cookies ni analítica y no recoge datos de quien lo visita.
- **Lo único que se guarda** es la elección de tema (claro u oscuro) en el `localStorage` del propio dispositivo, con la
  clave `tema-patate`. No se envía a ningún sitio y el sitio funciona igual si el navegador lo bloquea.
- **Referer:** la página usa `strict-origin-when-cross-origin`, porque la política de uso de OpenStreetMap
  prohíbe `no-referrer`. Los scripts de los CDN van con `no-referrer`.
- **Solo agregados:** la hoja no debe contener datos personales, porque su contenido agregado es público.

## Discapacidad

La cantidad de personas con discapacidad es un dato sensible. Por eso:

- La hoja pide **solo un número por fila** (mes, origen y motivo), nunca nombres, cédulas ni diagnósticos.
- El acceso a la hoja es **Restringido**: solo la abren sus editores.
- El sitio publica **solo cifras agregadas**: el total, su porcentaje sobre los visitantes y cuántos registros caen en cada rango.
- No se cruza con la edad ni con el género, para que ninguna combinación de filtros aísle a una persona.
- Confirme con el GAD que esta publicación agregada es aceptable antes de cargar datos reales.

## Limitaciones conocidas

- **Cabeceras:** GitHub Pages no permite `frame-ancestors` ni `X-Frame-Options`, así que el sitio se puede
  incrustar en otros dominios. El riesgo de clickjacking es bajo, porque es de solo lectura. Si hiciera
  falta, se resuelve con un CDN delante que agregue cabeceras.
- **Teselas:** las de OpenStreetMap se sirven sin garantía de disponibilidad. Si fallan, el mapa sigue
  mostrando las provincias y las burbujas, que son locales.
