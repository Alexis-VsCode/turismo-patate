/**
 * @file frescura.presentational.js
 * @description Presentacional. Pinta el chip de frescura de los datos: un punto de color, la categoría en
 *   texto y cuánto hace que se publicaron. Solo la etiqueta se anuncia a lectores de pantalla, y solo cuando
 *   cambia de categoría, no cada minuto. Sin acceso a datos ni a la fachada.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { tiempoTranscurrido } from '../../../shared/formato.js';
import { TEXTOS } from '../../../shared/textos.es.js';

/**
 * Actualiza el chip con la frescura calculada por la fachada.
 * @param {{ chip: HTMLElement, etiqueta: HTMLElement, detalle: HTMLElement }} zonas elementos del chip
 * @param {{ estado: 'alDia'|'retrasado'|'vencido'|'desconocido', minutos: number|null }} frescura resultado de `facade.frescura()`
 */
export function pintarFrescura({ chip, etiqueta, detalle }, { estado, minutos }) {
  // Paso 1: el estado gobierna el color por atributo, el CSS no conoce las categorías por nombre de clase
  chip.dataset.estado = estado;
  // Paso 2: reasignar el mismo texto también se anuncia, por eso solo se escribe si cambió
  if (etiqueta.textContent !== TEXTOS.frescura[estado]) etiqueta.textContent = TEXTOS.frescura[estado];
  detalle.textContent = minutos === null ? '' : TEXTOS.frescuraDetalle(tiempoTranscurrido(minutos));
}
