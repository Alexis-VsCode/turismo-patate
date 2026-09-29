/**
 * @file formato.js
 * @description Compartido. Formato de números para la interfaz (separador de miles de Ecuador).
 * @author Kevin Alexis Barrera Llerena 2026
 */

const formato = new Intl.NumberFormat('es-EC');
/** Número entero con separador de miles, p. ej. 96452 → «96.452». */
export const numero = (n) => formato.format(Math.round(n || 0));
