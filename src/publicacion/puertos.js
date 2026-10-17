/**
 * @file puertos.js
 * @description Publicación, puertos. Contratos que el caso de uso construir-datos espera de sus adaptadores. Son solo
 *   tipos JSDoc: no hay clases ni código, y cualquier objeto con esa forma sirve (en las pruebas, uno en memoria).
 * @author Kevin Alexis Barrera Llerena 2026
 */

/**
 * Fuente del libro de la hoja: la hoja publicada de Google o un archivo local de prueba.
 * @typedef {object} FuenteHoja
 * @property {() => Promise<Uint8Array>} obtener entrega el libro xlsx completo como bytes
 */

/**
 * Lector del libro: convierte los bytes en el conjunto de datos validado con las reglas del dominio.
 * @typedef {object} LectorLibro
 * @property {(buffer: Uint8Array) => { filas: object[], discapacidad: object[], rechazos: object[], avisos: object[],
 *   establecimientos: string[], catalogo: object }} leer lee el libro y devuelve lo aceptado, lo rechazado y los avisos
 */

/**
 * Destino de la publicación: recibe el texto de datos.json ya armado.
 * @typedef {object} DestinoPublicacion
 * @property {(texto: string) => void} escribir guarda el texto completo, sin dejar nunca un archivo a medias
 */

export {};
