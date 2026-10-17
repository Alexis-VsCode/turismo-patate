/**
 * @file descarga-acotada.js
 * @description Contrato. Descarga acotada en tiempo y tamaño que comparten los dos lados: el navegador la usa para
 *   `datos.json` y los límites del mapa, y la publicación para la hoja. Sus códigos de error (ErrorDescarga) son parte
 *   del contrato: la interfaz los traduce a un aviso y la publicación los registra. No reintenta: los reintentos son
 *   política de la publicación. La limpieza de texto y las claves seguras para agrupar son reglas del dominio y viven
 *   en domain/texto.js.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Error de descarga con un código estable que la interfaz traduce a un aviso. */
export class ErrorDescarga extends Error {
  constructor(codigo, detalle) {
    super(`${codigo}: ${detalle}`);
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

/**
 * Descarga una URL como ArrayBuffer sin credenciales y, salvo que se pida otra cosa, sin caché, cortando si supera
 * `timeoutMs` o `maxBytes`. El tamaño se controla leyendo el stream, porque
 * Content-Length puede faltar o mentir.
 * @param {string} url dirección a descargar
 * @param {{ timeoutMs: number, maxBytes: number, fetchImpl?: Function, cache?: RequestCache }} opciones límites,
 *   `fetch` inyectable y modo de caché ('no-store' por defecto; un archivo fijo del sitio puede usar 'default')
 * @returns {Promise<ArrayBuffer>} el contenido completo, dentro de los límites
 * @throws {ErrorDescarga} con código TIEMPO_AGOTADO, DEMASIADO_GRANDE, HTTP o RED
 */
export async function descargarAcotado(url, { timeoutMs, maxBytes, fetchImpl = globalThis.fetch, cache = 'no-store' }) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  try {
    // Paso 1: petición anónima y, por defecto, sin caché; el redirect a googleusercontent se sigue solo
    let respuesta;
    try {
      respuesta = await fetchImpl(url, {
        cache, credentials: 'omit', redirect: 'follow',
        referrerPolicy: 'no-referrer', signal: control.signal,
      });
    } catch (e) {
      throw new ErrorDescarga(control.signal.aborted ? 'TIEMPO_AGOTADO' : 'RED', String(e && e.message));
    }
    if (!respuesta.ok) throw new ErrorDescarga('HTTP', String(respuesta.status));
    const declarado = Number(respuesta.headers.get('content-length'));
    if (declarado && declarado > maxBytes) throw new ErrorDescarga('DEMASIADO_GRANDE', String(declarado));

    // Paso 2: lectura del stream con tope de bytes
    const lector = respuesta.body.getReader();
    const trozos = [];
    let total = 0;
    for (;;) {
      let parte;
      try {
        parte = await lector.read();
      } catch (e) {
        throw new ErrorDescarga(control.signal.aborted ? 'TIEMPO_AGOTADO' : 'RED', String(e && e.message));
      }
      if (parte.done) break;
      total += parte.value.byteLength;
      if (total > maxBytes) {
        control.abort();
        throw new ErrorDescarga('DEMASIADO_GRANDE', String(total));
      }
      trozos.push(parte.value);
    }

    // Paso 3: unir los trozos en un único buffer
    const salida = new Uint8Array(total);
    let desplazamiento = 0;
    for (const trozo of trozos) {
      salida.set(trozo, desplazamiento);
      desplazamiento += trozo.byteLength;
    }
    return salida.buffer;
  } finally {
    clearTimeout(temporizador);
  }
}
