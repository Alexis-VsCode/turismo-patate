/**
 * @file config.js
 * @description Tablero, infraestructura. Configuración única del dashboard en el navegador: fuente de datos,
 *   intervalos de actualización, límites de las descargas y datos del pie. Cambiar un valor aquí basta; ningún otro
 *   módulo repite estos números. Lo que solo usa la publicación vive en publicacion/config-publicacion.js.
 * @author Kevin Alexis Barrera Llerena 2026
 */
export const CONFIG = Object.freeze({
  /** Datos que publica GitHub Actions en el propio sitio. La URL de la hoja vive solo en el secreto SHEET_URL. */
  URL_DATOS: 'datos/datos.json',
  /** Consulta automática mientras la pestaña está visible; más seguida que la publicación para ver pronto cada ciclo nuevo. */
  INTERVALO_AUTO_MS: 10 * 60 * 1000,
  /** Cada cuántos minutos se vuelve a publicar el sitio (cron-job.org). Lo usan el aviso del chip y la documentación. */
  PUBLICACION_MINUTOS: 30,
  /** Cada cuánto el navegador revisa si toca la consulta automática y repinta el chip de frescura. */
  REVISION_AUTOMATICA_MS: 30 * 1000,
  /** Límites provinciales del mapa, servidos por el propio sitio. */
  URL_LIMITES: 'assets/ecu-provincias.geojson',
  /** Teselas del fondo del mapa. Su origen tiene que estar en img-src de la CSP de index.html (una prueba lo vigila). */
  URL_TESELAS: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** Al cambiar de establecimiento se reusa la descarga si es más reciente que esto. */
  REUSO_MINIMO_MS: 60 * 1000,
  /**
   * Edad máxima, en minutos, de la publicación para cada estado del chip de frescura: al día cubre un ciclo de
   * publicación más la demora de Actions; retrasado tolera perder un ciclo entero antes de darla por vencida.
   */
  UMBRALES_FRESCURA: Object.freeze({ alDiaMin: 45, retrasadoMin: 100 }),
  /** Límites de las descargas del navegador: una respuesta lenta o gigante produce un aviso, nunca un cuelgue. */
  TIMEOUT_MS: 15 * 1000,
  MAX_BYTES: 20 * 1024 * 1024,
  /** Muestra la franja «DATOS DE PRUEBA». En false desde que la hoja trae los datos reales del municipio. */
  DATOS_DE_PRUEBA: false,
  /**
   * Contacto del municipio en el pie. Un enlace vacío se muestra como «próximamente» y su botón abre un aviso con los
   * demás enlaces; para publicarlo basta con escribir aquí su dirección https:// sin parámetros de rastreo.
   */
  CONTACTO_MUNICIPIO: Object.freeze({
    nombre: 'Lic. Vanessa Lesano Martínez',
    /** Cómo se la nombra dentro de una frase («Facebook de la Lic. …»). */
    referencia: 'la Lic. Vanessa Lesano Martínez',
    enlaces: Object.freeze({
      facebook: 'https://www.facebook.com/vane.lesano.martinez',
      tiktok: 'https://www.tiktok.com/@vanelesano',
      linkedin: '',
    }),
  }),
  /** Autoridad del cantón que el pie presenta junto al agradecimiento; el enlace se usa solo si es https. */
  AUTORIDAD_MUNICIPIO: Object.freeze({
    nombre: 'Ing. Emerson Hernán Medina Castro',
    cargo: 'Alcalde',
    periodo: '2023 a 2027',
    enlace: 'https://patate.gob.ec/',
  }),
  /** Provincia que el mapa resalta siempre. */
  PROVINCIA_RESALTADA: 'Tungurahua',
});
