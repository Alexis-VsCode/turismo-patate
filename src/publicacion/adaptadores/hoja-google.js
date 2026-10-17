/**
 * @file hoja-google.js
 * @description Publicación, adaptador de la fuente. Descarga la hoja publicada de Google con la descarga acotada del
 *   contrato y la repite ante fallos pasajeros (un corte de red, un 429 o un 5xx de Google), esperando cada vez el
 *   doble. Implementa el puerto FuenteHoja. La URL llega desde el secreto SHEET_URL y nunca se escribe en el código.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { descargarAcotado, ErrorDescarga } from '../../contrato/descarga-acotada.js';

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

/**
 * Fuente de la hoja publicada de Google, con los límites de la publicación y reintentos ante fallos pasajeros.
 * @param {string} url enlace de la hoja publicada en xlsx (ya validado por quien compone)
 * @param {{ timeoutMs: number, maxBytes: number }} limites tiempo y tamaño máximos de la descarga
 * @param {{ alReintentar?: (intento: number, error: Error) => void, esperar?: (ms: number) => Promise<void> }} [ganchos]
 *   aviso de cada reintento, para el registro, y espera entre intentos (inyectable en pruebas)
 * @returns {import('../puertos.js').FuenteHoja} la fuente que entrega el libro como bytes
 */
export function crearFuenteHojaGoogle(url, limites, { alReintentar, esperar } = {}) {
  return {
    obtener: async () => new Uint8Array(await descargarConReintentos(url, limites, { alReintentar, esperar })),
  };
}

/** Un fallo es pasajero si volver a intentar puede resolverlo: red, tiempo agotado, límite de peticiones o error del servidor. */
function esPasajero(error) {
  if (!(error instanceof ErrorDescarga)) return false;
  if (error.codigo === 'RED' || error.codigo === 'TIEMPO_AGOTADO') return true;
  const estado = Number(error.detalle);
  return error.codigo === 'HTTP' && (estado === 429 || estado >= 500);
}
