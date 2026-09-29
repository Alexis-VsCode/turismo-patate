/**
 * @file kpis.presentational.js
 * @description Presentacional. Pinta las tres tarjetas de la esquina: total de visitantes y
 *   porcentajes de nacionales y extranjeros. Sin estado ni acceso a datos.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { numero } from '../../../shared/formato.js';

/** Porcentaje con una decimal y coma decimal; «—» cuando no hay base. */
export function porcentaje(valor) {
  return valor === null ? '—' : `${(valor * 100).toFixed(1).replace('.', ',')}%`;
}

/**
 * @param {{ total: HTMLElement, nacionales: HTMLElement, extranjeros: HTMLElement }} elementos
 * @param {{ total: number, pctNacionales: number|null, pctExtranjeros: number|null }} k resultado de kpis()
 */
export function pintarKpis(elementos, k) {
  elementos.total.textContent = numero(k.total);
  elementos.nacionales.textContent = porcentaje(k.pctNacionales);
  elementos.extranjeros.textContent = porcentaje(k.pctExtranjeros);
}
