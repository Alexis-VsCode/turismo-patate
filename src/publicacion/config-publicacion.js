/**
 * @file config-publicacion.js
 * @description Publicación. Configuración única de la cadena que corre en GitHub Actions: límites de la descarga y de
 *   la lectura de la hoja, nombre de la pestaña de catálogos, país local y mínimo de establecimientos para publicar.
 *   Cambiar un valor aquí basta; ningún otro módulo repite estos números. Lo del navegador vive en
 *   tablero/infrastructure/config.js.
 * @author Kevin Alexis Barrera Llerena 2026
 */

export const CONFIG_PUBLICACION = Object.freeze({
  /** Tope de la hoja completa en xlsx: con más de cien pestañas y fórmulas pesa bastante más que el datos.json que se publica. */
  MAX_BYTES_HOJA: 50 * 1024 * 1024,
  /** Tiempo máximo de la descarga de la hoja en el build de Actions (el libro completo pesa más que datos.json). */
  TIMEOUT_HOJA_MS: 120 * 1000,
  MAX_PESTANAS: 300,
  MAX_FILAS_PESTANA: 5000,
  /** Pestaña con listas y coordenadas. Toda pestaña que empieza por '_' o contiene 'plantilla' no es establecimiento. */
  PESTANA_CATALOGOS: '_Catalogos',
  /** País que define a un visitante como nacional. */
  PAIS_LOCAL: 'Ecuador',
  /** Con menos establecimientos válidos que estos no se publica: el sitio sigue con los últimos datos buenos. */
  MINIMO_ESTABLECIMIENTOS: 1,
});
