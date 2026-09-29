/**
 * @file problemas.presentational.js
 * @description Presentacional. Pinta el aviso de filas rechazadas y de pestañas mal armadas, con su
 *   ubicación, para que nada se descarte en silencio. Todo texto de la hoja entra como nodo de texto.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';

const MAX_PROBLEMAS_VISIBLES = 50;

/**
 * @param {{ caja: HTMLElement, resumen: HTMLElement, lista: HTMLElement }} elementos
 * @param {{ rechazos: Array<{pestana: string, fila: number, motivo: string}>, avisos: Array<{pestana: string, mensaje: string}> }} problemas
 */
export function pintarProblemas(elementos, { rechazos, avisos }) {
  const { caja, resumen, lista } = elementos;
  // Paso 1: vaciar nodo por nodo y ocultar si no hay nada que avisar
  while (lista.firstChild) lista.removeChild(lista.firstChild);
  caja.hidden = !rechazos.length && !avisos.length;
  const partes = [];
  if (rechazos.length) partes.push(TEXTOS.problemas(rechazos.length));
  if (avisos.length) partes.push(TEXTOS.avisosPestanas(avisos.length));
  resumen.textContent = partes.join(' · ');

  // Paso 2: cada problema con su ubicación en negrita
  const agregar = (ubicacion, mensaje) => {
    const item = document.createElement('li');
    const donde = document.createElement('strong');
    donde.textContent = ubicacion;
    item.append(donde, document.createTextNode(` — ${mensaje}`));
    lista.appendChild(item);
  };
  avisos.forEach((a) => agregar(a.pestana || '—', a.mensaje));
  rechazos.slice(0, MAX_PROBLEMAS_VISIBLES).forEach((r) => agregar(TEXTOS.filaDe(r.pestana, r.fila), r.motivo));
  if (rechazos.length > MAX_PROBLEMAS_VISIBLES) {
    const item = document.createElement('li');
    item.textContent = TEXTOS.mostrandoPrimeros(MAX_PROBLEMAS_VISIBLES, rechazos.length);
    lista.appendChild(item);
  }
}
