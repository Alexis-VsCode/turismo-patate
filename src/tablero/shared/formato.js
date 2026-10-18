/**
 * @file formato.js
 * @description Compartido. Formato de números, porcentajes y fecha con hora para la interfaz (separador de
 *   miles y coma decimal de Ecuador, hora de Guayaquil). No depende de ningún otro módulo: los textos que se
 *   arman con palabras viven en textos.es.js.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Lo que se muestra en lugar de una cifra que no existe (sin datos). */
export const SIN_DATO = 's/d';

const formato = new Intl.NumberFormat('es-EC');

const formatoFechaHora = new Intl.DateTimeFormat('es-EC', {
  timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

const formatoHora = new Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/**
 * Número entero con separador de miles, p. ej. 96452 → «96.452».
 * @param {number|null|undefined} n cifra; sin valor cuenta como cero
 * @returns {string} la cifra redondeada al entero, con punto de miles
 */
export const numero = (n) => formato.format(Math.round(n || 0));

/**
 * Porcentaje con una decimal y coma decimal. El medio se redondea alejándose del cero (28,75 da 28,8 y -28,75 da
 * -28,8), sin el error de la coma flotante que hace que 0.2875 * 100 valga 28,7499...
 * @param {number|null} valor fracción de 0 a 1
 * @returns {string} p. ej. «82,1%»; «s/d» cuando no hay base (null); nunca «-0,0%»
 */
export function porcentaje(valor) {
  if (valor === null) return SIN_DATO;
  // Paso 1: décimas de punto porcentual, con la coma flotante recortada a 12 cifras antes de redondear
  const decimas = Math.round(Number(Math.abs(valor * 1000).toPrecision(12)));
  const signo = valor < 0 && decimas > 0 ? '-' : '';
  return `${signo}${(decimas / 10).toFixed(1).replace('.', ',')}%`;
}

/**
 * Texto de la variación con signo, p. ej. «+11,9%».
 * @param {number|null|undefined} variacion fracción de cambio contra el año anterior
 * @returns {string|null} el texto con signo; null si no hay año anterior con qué comparar
 */
export function textoVariacion(variacion) {
  if (variacion === null || variacion === undefined) return null;
  const signo = variacion > 0 ? '+' : variacion < 0 ? '−' : '';
  return `${signo}${porcentaje(Math.abs(variacion))}`;
}

/**
 * Hora y minutos en hora de Ecuador, p. ej. «12:31».
 * @param {number|string|null|undefined} valor instante en milisegundos o texto ISO
 * @returns {string} la hora, o «s/d» si el valor no es una fecha
 */
export function hora(valor) {
  const fecha = new Date(valor ?? NaN);
  return Number.isNaN(fecha.getTime()) ? SIN_DATO : formatoHora.format(fecha);
}

/**
 * Fecha y hora con segundos en hora de Ecuador, p. ej. «29/09/2026 12:31:05».
 * @param {number|string|null|undefined} valor instante en milisegundos o texto ISO
 * @returns {string} la fecha con hora, o «s/d» si el valor no es una fecha
 */
export function fechaHora(valor) {
  const fecha = new Date(valor ?? NaN);
  if (Number.isNaN(fecha.getTime())) return SIN_DATO;
  const p = Object.fromEntries(formatoFechaHora.formatToParts(fecha).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}
