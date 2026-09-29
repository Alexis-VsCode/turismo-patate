# Seguridad

La hoja la editan terceros, así que **toda celda y todo nombre de pestaña se trata como entrada no confiable**,
tanto en GitHub Actions como en el navegador.

## Librerías

Revisión del 29/09/2026 en NVD y en los avisos de GitHub:

| Librería | Versión | Dónde | Estado |
|---|---|---|---|
| Apache ECharts | 6.1.0 | Navegador (cdnjs + SRI) | Corrige CVE-2026-45249 (XSS en el tooltip de la serie `lines`) y no le afecta CVE-2021-39227 |
| Leaflet | 1.9.4 | Navegador (cdnjs + SRI) | Sin CVE conocidos en la versión estable |
| SheetJS CE | 0.20.3 | Solo en GitHub Actions (`tools/vendor/`) | Corrige CVE-2023-30533 (contaminación de prototipos) y CVE-2024-22363 (ReDoS). No se usa la 0.18.5 de cdnjs |

Al cambiar una versión hay que revisar sus CVE, recalcular el `integrity` y actualizar esta tabla y
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Política de contenidos (CSP)

Va en un `<meta>`, porque GitHub Pages no permite cabeceras propias:

```
default-src 'none'; script-src 'self' https://cdnjs.cloudflare.com;
style-src 'self' https://cdnjs.cloudflare.com; style-src-attr 'unsafe-inline';
img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self';
font-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'
```

- **Scripts:** solo propios y de cdnjs, todos con **SRI**. No hay scripts en línea ni `eval`; se verificó que
  ECharts no necesita `unsafe-eval`.
- **Datos:** solo del mismo sitio (`connect-src 'self'`). El navegador no puede contactar la hoja.
- **`style-src-attr 'unsafe-inline'`:** es necesario porque Leaflet y ECharts posicionan elementos con estilos
  en línea. No habilita scripts.

## Contenido de la hoja

| Riesgo | Medida | Dónde |
|---|---|---|
| XSS por nombres de pestaña o celdas | Escritura solo con `textContent`/`createElement`; tooltips de ECharts en `richText`; tooltips del mapa como nodos DOM | `src/application/components/**` |
| Reintroducir APIs peligrosas | Prueba que falla si aparece `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` o `new Function` en `src/` | `test/infrastructure/seguridad.test.mjs` |
| Contaminación de prototipos | Agrupaciones con `Map` y claves `__proto__`, `constructor` y `prototype` descartadas | `src/domain/texto.js`, `estadisticas.js` |
| Íconos de los motivos | Trazos fijos del código, creados con `createElementNS`; el nombre del motivo solo elige cuál usar y nunca se interpreta como HTML | `src/application/components/presentational/motivos.presentational.js` |
| Caracteres invisibles o de control | `limpiarTexto()` los elimina y acota el largo a 120 caracteres | `src/domain/texto.js` |
| Excel malicioso | SheetJS en modo restrictivo: sin fórmulas, HTML, estilos ni macros, y con topes de pestañas y filas | `src/infrastructure/lector-libro.js` |
| `datos.json` alterado | El navegador valida versión, tipos, índices y rangos, y rechaza el paquete entero si algo no cumple | `src/infrastructure/contrato-datos.js` |
| Respuesta gigante o lenta | Timeout de 15 s y tope de 20 MB leyendo el stream, aunque falte `Content-Length` | `src/infrastructure/seguridad.js` |

## Privacidad

- **Sin rastreo:** el sitio no usa cookies ni analítica y no recoge datos de quien lo visita.
- **Lo único que se guarda** es la elección de tema (claro u oscuro) en el `localStorage` del propio dispositivo, con la
  clave `tema-patate`. No se envía a ningún sitio y el sitio funciona igual si el navegador lo bloquea.
- **Referer:** la página usa `strict-origin-when-cross-origin`, porque la política de uso de OpenStreetMap
  prohíbe `no-referrer`. Los scripts de los CDN van con `no-referrer`.
- **Solo agregados:** la hoja no debe contener datos personales, porque su contenido agregado es público.

## Limitaciones conocidas

- **Cabeceras:** GitHub Pages no permite `frame-ancestors` ni `X-Frame-Options`, así que el sitio se puede
  incrustar en otros dominios. El riesgo de clickjacking es bajo, porque es de solo lectura. Si hiciera
  falta, se resuelve con un CDN delante que agregue cabeceras.
- **Teselas:** las de OpenStreetMap se sirven sin garantía de disponibilidad. Si fallan, el mapa sigue
  mostrando las provincias y las burbujas, que son locales.
