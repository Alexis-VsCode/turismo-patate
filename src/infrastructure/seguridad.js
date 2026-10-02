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
    this.detalle = detalle;
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

/** Un fallo es pasajero si volver a intentar puede resolverlo: red, tiempo agotado, límite de peticiones o error del servidor. */
function esPasajero(error) {
  if (!(error instanceof ErrorDescarga)) return false;
  if (error.codigo === 'RED' || error.codigo === 'TIEMPO_AGOTADO') return true;
  const estado = Number(error.detalle);
  return error.codigo === 'HTTP' && (estado === 429 || estado >= 500);
}

/**
 * Igual que descargarAcotado, pero repite la descarga cuando el fallo es pasajero (un corte de red, un 429 o un 5xx de
 * Google), esperando cada vez el doble. Una hoja demasiado grande o un error de cliente (403, 404) no se repiten.
 * @param {string} url dirección a descargar
 * @param {{ timeoutMs: number, maxBytes: number, fetchImpl?: Function }} limites los de descargarAcotado
 * @param {{ intentos?: number, esperaBaseMs?: number, esperar?: (ms: number) => Promise<void>, alReintentar?: (intento: number, error: Error) => void }} [reintentos]
 *   intentos totales, espera inicial y ganchos inyectables para pruebas y registro
 * @returns {Promise<ArrayBuffer>} el contenido completo
 * @throws {ErrorDescarga} el error del último intento
 */
export async function descargarConReintentos(url, limites, reintentos = {}) {
  const {
    intentos = 3, esperaBaseMs = 2000, esperar = (ms) => new Promise((r) => setTimeout(r, ms)), alReintentar = () => {},
  } = reintentos;
  for (let intento = 1; ; intento += 1) {
    try {
      return await descargarAcotado(url, limites);
    } catch (error) {
      if (intento >= intentos || !esPasajero(error)) throw error;
      alReintentar(intento, error);
      await esperar(esperaBaseMs * 2 ** (intento - 1));
    }
  }
}
