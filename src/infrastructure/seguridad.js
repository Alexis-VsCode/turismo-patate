/**
 * @file seguridad.js
 * @description Infraestructura. Utilidades de seguridad para datos que vienen de una hoja editable por
 *   terceros: descarga acotada en tiempo y tamaño, limpieza de texto y claves seguras para agrupar.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Error de descarga con un código estable que la interfaz traduce a un aviso. */
export class ErrorDescarga extends Error {
  constructor(codigo, detalle) {
    super(`${codigo}: ${detalle}`);
    this.codigo = codigo;
  }
}

/**
 * Descarga una URL como ArrayBuffer sin credenciales ni caché, cortando si supera
 * `timeoutMs` o `maxBytes`. El tamaño se controla leyendo el stream, porque
 * Content-Length puede faltar o mentir.
 * @param {string} url dirección a descargar
 * @param {{ timeoutMs: number, maxBytes: number, fetchImpl?: Function }} opciones límites y `fetch` inyectable
 * @returns {Promise<ArrayBuffer>} el contenido completo, dentro de los límites
 * @throws {ErrorDescarga} con código TIEMPO_AGOTADO, DEMASIADO_GRANDE, HTTP o RED
 */
export async function descargarAcotado(url, { timeoutMs, maxBytes, fetchImpl = globalThis.fetch }) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  try {
    // Paso 1: petición anónima y sin caché; el redirect a googleusercontent se sigue solo
    let respuesta;
    try {
      respuesta = await fetchImpl(url, {
        cache: 'no-store', credentials: 'omit', redirect: 'follow',
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
