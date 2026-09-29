/**
 * Configuración única del dashboard: fuente de datos, intervalos de actualización
 * y límites de seguridad. Cambiar un valor aquí basta; ningún otro módulo repite estos números.
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
export const CONFIG = Object.freeze({
  /** Datos que publica GitHub Actions en el propio sitio. La URL de la hoja vive solo en el secreto SHEET_URL. */
  URL_DATOS: 'datos/datos.json',
  /** Actualización automática mientras la pestaña está visible. Google cachea lo publicado ~5 min. */
  INTERVALO_AUTO_MS: 5 * 60 * 1000,
  /** Al cambiar de establecimiento se reusa la descarga si es más reciente que esto. */
  REUSO_MINIMO_MS: 60 * 1000,
  /** Límites de la descarga: una respuesta lenta o gigante produce un aviso, nunca un cuelgue. */
  TIMEOUT_MS: 15 * 1000,
  MAX_BYTES: 20 * 1024 * 1024,
  MAX_PESTANAS: 300,
  MAX_FILAS_PESTANA: 5000,
  /** Pestaña con listas y coordenadas. Toda pestaña que empieza por '_' o contiene 'plantilla' no es establecimiento. */
  PESTANA_CATALOGOS: '_Catalogos',
  /** Muestra la franja «DATOS DE PRUEBA». Poner en false al pasar a datos reales. */
  DATOS_DE_PRUEBA: true,
  /** País que define a un visitante como nacional. */
  PAIS_LOCAL: 'Ecuador',
  /** Provincia que el mapa resalta siempre. */
  PROVINCIA_RESALTADA: 'Tungurahua',
});
