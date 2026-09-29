/**
 * @file repositorio-datos.js
 * @description Infraestructura. Obtiene el conjunto de datos publicado (`datos/datos.json`) con la
 *   descarga acotada en tiempo y tamaño, y lo reconstruye validado con el contrato de datos.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { descargarAcotado } from './seguridad.js';
import { desempaquetar } from './contrato-datos.js';
import { claveNormalizada } from '../domain/catalogo.js';

/**
 * Descarga y valida los datos del tablero.
 * @param {{ url: string, timeoutMs: number, maxBytes: number, ahora?: () => number, fetchImpl?: Function }} opciones
 * @returns {Promise<object>} datos desempaquetados: filas, establecimientos, catálogo, rechazos, avisos y generadoEn
 * @throws {ErrorDescarga} si la red falla, tarda o excede el tamaño; {Error} si el contenido no cumple el contrato
 */
export async function obtenerDatos({ url, timeoutMs, maxBytes, ahora = Date.now, fetchImpl }) {
  // Paso 1: el parámetro t evita que una caché intermedia devuelva un archivo viejo
  const buffer = await descargarAcotado(`${url}?t=${ahora()}`, { timeoutMs, maxBytes, fetchImpl });
  // Paso 2: el contenido se trata como entrada no confiable y se valida al reconstruirlo
  return desempaquetar(JSON.parse(new TextDecoder().decode(buffer)), claveNormalizada);
}
