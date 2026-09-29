/**
 * @file formato.js
 * @description Compartido. Formato de números y porcentajes para la interfaz (separador de miles y coma
 *   decimal de Ecuador).
 * @author Kevin Alexis Barrera Llerena 2026
 */

const formato = new Intl.NumberFormat('es-EC');
/** Número entero con separador de miles, p. ej. 96452 → «96.452». */
export const numero = (n) => formato.format(Math.round(n || 0));

/** Porcentaje con una decimal y coma decimal; «—» cuando no hay base. */
export function porcentaje(valor) {
  return valor === null ? '—' : `${(valor * 100).toFixed(1).replace('.', ',')}%`;
}

/** Texto de la variación con signo, p. ej. «+11,9 %»; null si no hay año anterior con qué comparar. */
export function textoVariacion(variacion) {
  if (variacion === null || variacion === undefined) return null;
  const signo = variacion > 0 ? '+' : variacion < 0 ? '−' : '';
  return `${signo}${Math.abs(variacion * 100).toFixed(1).replace('.', ',')} %`;
}
