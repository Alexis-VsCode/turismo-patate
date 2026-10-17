/**
 * @file tema.js
 * @description Compartido. Reglas puras del tema claro u oscuro: qué tema corresponde según la elección guardada
 *   (por defecto el claro, sin mirar el sistema) y cómo alternarlo. No toca el DOM ni el almacenamiento.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Clave de `localStorage` con la elección de tema. La repite `tema-inicial.js`; una prueba las mantiene iguales. */
export const CLAVE_TEMA = 'tema-patate';

/**
 * Tema que corresponde aplicar.
 * @param {string|null|undefined} guardado elección guardada del visitante ('light', 'dark' o cualquier otro valor)
 * @returns {'light'|'dark'} la elección guardada si es válida; si no, el claro
 */
export function resolverTema(guardado) {
  return guardado === 'dark' ? 'dark' : 'light';
}

/**
 * Tema contrario al actual.
 * @param {string|null} actual tema aplicado ('dark' o cualquier otro valor)
 * @returns {'light'|'dark'}
 */
export function alternarTema(actual) {
  return actual === 'dark' ? 'light' : 'dark';
}
