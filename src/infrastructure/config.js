/**
 * @file config.js
 * @description Infraestructura. Configuración única del dashboard: fuente de datos, intervalos de actualización
 *   y límites de seguridad. Cambiar un valor aquí basta; ningún otro módulo repite estos números.
 * @author Kevin Alexis Barrera Llerena 2026
 */
export const CONFIG = Object.freeze({
  /** Datos que publica GitHub Actions en el propio sitio. La URL de la hoja vive solo en el secreto SHEET_URL. */
  URL_DATOS: 'datos/datos.json',
  /** Consulta automática mientras la pestaña está visible; más seguida que la publicación para ver pronto cada ciclo nuevo. */
  INTERVALO_AUTO_MS: 10 * 60 * 1000,
  /** Cada cuántos minutos se vuelve a publicar el sitio (cron-job.org). Lo usan el aviso del chip y la documentación. */
  PUBLICACION_MINUTOS: 30,
  /** Al cambiar de establecimiento se reusa la descarga si es más reciente que esto. */
  REUSO_MINIMO_MS: 60 * 1000,
  /**
   * Edad máxima, en minutos, de la publicación para cada estado del chip de frescura: al día cubre un ciclo de
   * 30 minutos más la demora de Actions; retrasado tolera perder un ciclo entero antes de darla por vencida.
   */
  UMBRALES_FRESCURA: Object.freeze({ alDiaMin: 45, retrasadoMin: 100 }),
  /** Límites de la descarga: una respuesta lenta o gigante produce un aviso, nunca un cuelgue. */
  TIMEOUT_MS: 15 * 1000,
  MAX_BYTES: 20 * 1024 * 1024,
  /** Tope de la hoja completa en xlsx: con más de cien pestañas y fórmulas pesa bastante más que el datos.json que se publica. */
  MAX_BYTES_HOJA: 50 * 1024 * 1024,
  /** Tiempo máximo de la descarga de la hoja en el build de Actions (el libro completo pesa más que datos.json). */
  TIMEOUT_HOJA_MS: 120 * 1000,
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
