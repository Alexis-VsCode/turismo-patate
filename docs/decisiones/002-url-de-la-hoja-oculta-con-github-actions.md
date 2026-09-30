# ADR 002 — URL de la hoja oculta con GitHub Actions

**Estado:** Aceptada · **Fecha:** 2026-09-29 · **Autor:** Kevin Alexis Barrera Llerena

## Contexto

La versión inicial leía la hoja publicada directamente desde el navegador. Así cualquier visitante podía ver
la URL y descargar el libro completo.

## Decisión

La URL vive solo en el secreto cifrado `SHEET_URL`. GitHub Actions descarga la hoja (la dispara cron-job.org cada 5 minutos), la valida
y publica un `datos.json` sin la URL. El navegador solo lee ese archivo (`connect-src 'self'`), y SheetJS sale
del navegador.

## Consecuencias

- La hoja no queda expuesta y hay una librería menos en el navegador.
- La frescura depende del disparador: el `schedule` de GitHub puede retrasarse o descartarse, por eso una tarea externa de cron-job.org llama a la API.
- Si la hoja falla, el sitio conserva los últimos datos buenos.
