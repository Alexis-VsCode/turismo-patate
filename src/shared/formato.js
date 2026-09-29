/**
 * @file formato.js
 * @description Compartido. Formato de números, porcentajes y fecha con hora para la interfaz (separador de
 *   miles y coma decimal de Ecuador, hora de Guayaquil).
 * @author Kevin Alexis Barrera Llerena 2026
 */

const formato = new Intl.NumberFormat('es-EC');
/** Número entero con separador de miles, p. ej. 96452 → «96.452». */
export const numero = (n) => formato.format(Math.round(n || 0));

/** Porcentaje con una decimal y coma decimal; «—» cuando no hay base. */
export function porcentaje(valor) {
  return valor === null ? '—' : `${(valor * 100).toFixed(1).replace('.', ',')}%`;
}

/** Texto de la variación con signo, p. ej. «+11,9%»; null si no hay año anterior con qué comparar. */
export function textoVariacion(variacion) {
  if (variacion === null || variacion === undefined) return null;
  const signo = variacion > 0 ? '+' : variacion < 0 ? '−' : '';
  return `${signo}${porcentaje(Math.abs(variacion))}`;
}

const formatoFechaHora = new Intl.DateTimeFormat('es-EC', {
  timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** Fecha y hora con segundos en hora de Ecuador, p. ej. «29/09/2026 12:31:05»; «—» si el valor no es una fecha. */
export function fechaHora(valor) {
  const fecha = new Date(valor ?? NaN);
  if (Number.isNaN(fecha.getTime())) return '—';
  const p = Object.fromEntries(formatoFechaHora.formatToParts(fecha).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}
