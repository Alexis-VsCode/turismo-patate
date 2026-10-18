# Política de seguridad

## Reportar una vulnerabilidad

Si encuentras un problema de seguridad, **no abras un issue público**. Escribe al autor por LinkedIn
(https://www.linkedin.com/in/alexisbarreradesarrolador/) o usa **Security → Report a vulnerability** en este
repositorio.

Incluye:
- la URL o el archivo afectado;
- los pasos para reproducir el problema;
- el impacto que observaste.

Recibirás respuesta en un plazo razonable y se te reconocerá el reporte, si así lo deseas.

## Alcance

El sitio es **estático y de solo lectura**:
- No tiene inicio de sesión, formularios ni cookies.
- No guarda datos de quien lo visita. Lo único que se guarda, en el propio dispositivo, es la elección de tema
  (`localStorage`), y no se envía a ningún sitio.
- Los datos que muestra son agregados y no incluyen información personal.

## Medidas vigentes

| Riesgo | Medida |
|---|---|
| Exposición de la hoja de origen | La URL vive solo en el secreto cifrado `SHEET_URL` de GitHub Actions y el acceso a la hoja es Restringido. El sitio publica solo `datos.json` validado. Una prueba impide que la URL aparezca en ese archivo y otra, que algún archivo del repositorio escriba el ID de una hoja |
| Permisos de la publicación | El flujo solo da `contents: read`; cada job declara lo que usa y solo `desplegar` escribe en Pages. Sin artefactos de respaldo, porque en un repositorio público cualquier cuenta podría descargarlos |
| Librerías vulnerables | Versiones fijas y revisadas: ECharts 6.1.0 (corrige CVE-2026-45249), Leaflet 1.9.4 y SheetJS 0.20.3 (corrige CVE-2023-30533 y CVE-2024-22363) |
| Alteración de scripts en el CDN | Subresource Integrity (`integrity` sha512) en cada script y hoja de estilos externos |
| Inyección de código (XSS) | CSP estricta que permite cada recurso externo por su URL exacta, sin scripts en línea ni `eval`. Todo texto de la hoja se escribe con `textContent`. Tooltips en `richText`. Una prueba prohíbe `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` y `new Function` en `src/` |
| Contaminación de prototipos | Agrupaciones con `Map` y claves `__proto__`, `constructor` y `prototype` descartadas |
| Archivo de datos alterado | El navegador valida tipos, índices y rangos de `datos.json`. Si no cumplen, lo rechaza |
| Descargas abusivas | Tope de tiempo y de bytes leyendo el stream: 15 s y 20 MB en el navegador, 120 s y 50 MB para la hoja en Actions |

Detalle técnico en [docs/seguridad.md](docs/seguridad.md).
