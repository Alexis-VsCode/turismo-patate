/**
 * @file formato.js
 * @description Compartido. Formato de números, porcentajes y fecha con hora para la interfaz (separador de
 *   miles y coma decimal de Ecuador, hora de Guayaquil) y tiempo transcurrido.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from './textos.es.js';

/** Lo que se muestra en lugar de una cifra que no existe (sin datos). */
export const SIN_DATO = 's/d';

const formato = new Intl.NumberFormat('es-EC');
/** Número entero con separador de miles, p. ej. 96452 → «96.452». */
export const numero = (n) => formato.format(Math.round(n || 0));

/** Porcentaje con una decimal y coma decimal; «s/d» cuando no hay base. */
export function porcentaje(valor) {
  return valor === null ? SIN_DATO : `${(valor * 100).toFixed(1).replace('.', ',')}%`;
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

const formatoHora = new Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Hora y minutos en hora de Ecuador, p. ej. «12:31»; «s/d» si el valor no es una fecha. */
export function hora(valor) {
  const fecha = new Date(valor ?? NaN);
  return Number.isNaN(fecha.getTime()) ? SIN_DATO : formatoHora.format(fecha);
}

/** Fecha y hora con segundos en hora de Ecuador, p. ej. «29/09/2026 12:31:05»; «s/d» si el valor no es una fecha. */
export function fechaHora(valor) {
  const fecha = new Date(valor ?? NaN);
  if (Number.isNaN(fecha.getTime())) return SIN_DATO;
  const p = Object.fromEntries(formatoFechaHora.formatToParts(fecha).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

/** Tiempo transcurrido en lenguaje natural a partir de minutos, p. ej. «hace 2 h 15 min»; «s/d» sin dato. */
export function tiempoTranscurrido(minutos) {
  if (minutos === null || minutos === undefined) return SIN_DATO;
  const t = TEXTOS.transcurrido;
  if (minutos < 1) return t.menosDeUnMinuto;
  if (minutos < 60) return t.minutos(minutos);
  if (minutos < 60 * 24) return t.horas(Math.floor(minutos / 60), minutos % 60);
  return t.dias(Math.floor(minutos / (60 * 24)));
}
