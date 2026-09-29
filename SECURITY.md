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
- No guarda datos de quien lo visita.
- Los datos que muestra son agregados y no incluyen información personal.

## Medidas vigentes

| Riesgo | Medida |
|---|---|
| Exposición de la hoja de origen | La URL vive solo en el secreto cifrado `SHEET_URL` de GitHub Actions. El sitio publica solo `datos.json` validado. Una prueba impide que la URL aparezca en ese archivo |
| Librerías vulnerables | Versiones fijas y revisadas: ECharts 6.1.0 (corrige CVE-2026-45249), Leaflet 1.9.4 y SheetJS 0.20.3 (corrige CVE-2023-30533 y CVE-2024-22363) |
| Alteración de scripts en el CDN | Subresource Integrity (`integrity` sha512) en cada script externo |
| Inyección de código (XSS) | CSP estricta sin scripts en línea ni `eval`. Todo texto de la hoja se escribe con `textContent`. Tooltips en `richText`. Una prueba prohíbe `innerHTML`, `eval` y `new Function` en `src/` |
| Contaminación de prototipos | Agrupaciones con `Map` y claves `__proto__`, `constructor` y `prototype` descartadas |
| Archivo de datos alterado | El navegador valida tipos, índices y rangos de `datos.json`. Si no cumplen, lo rechaza |
| Descargas abusivas | Timeout de 15 s y tope de 20 MB leyendo el stream |

Detalle técnico en [docs/seguridad.md](docs/seguridad.md).
