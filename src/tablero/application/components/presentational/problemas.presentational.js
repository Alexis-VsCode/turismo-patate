/**
 * @file problemas.presentational.js
 * @description Presentacional. Pinta el aviso de filas rechazadas y de pestañas mal armadas, con su
 *   ubicación, para que nada se descarte en silencio. Es una herramienta de quien corrige la hoja: solo se muestra en el
 *   modo revisión (la página abierta con `?revision`); el público no la ve. Todo texto de la hoja entra como nodo de texto.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';

const MAX_PROBLEMAS_VISIBLES = 50;

/**
 * Dice si la página se abrió en modo revisión, el que muestra el panel de problemas.
 * @param {string} [busqueda] parte de la dirección desde el `?` (`window.location.search`)
 * @returns {boolean} true si trae el parámetro `revision`, con o sin valor
 */
export function esModoRevision(busqueda) {
  return new URLSearchParams(busqueda || '').has('revision');
}

/**
 * @param {{ caja: HTMLElement, resumen: HTMLElement, lista: HTMLElement }} elementos
 * @param {{ rechazos: Array<{pestana: string, fila: number, motivo: string}>, avisos: Array<{pestana: string, mensaje: string}> }} problemas
 * @param {{ revision?: boolean }} [opciones] revision: true solo en el modo revisión; fuera de él la caja queda oculta
 * @returns {void} solo escribe en el DOM
 */
export function pintarProblemas(elementos, { rechazos, avisos }, { revision = false } = {}) {
  const { caja, resumen, lista } = elementos;
  // Paso 1: vaciar nodo por nodo y ocultar si no es el modo revisión o no hay nada que avisar
  while (lista.firstChild) lista.removeChild(lista.firstChild);
  caja.hidden = !revision || (!rechazos.length && !avisos.length);
  if (!revision) {
    resumen.textContent = '';
    return;
  }
  const partes = [];
  if (rechazos.length) partes.push(TEXTOS.problemas(rechazos.length));
  if (avisos.length) partes.push(TEXTOS.avisosPestanas(avisos.length));
  resumen.textContent = partes.join(' · ');

  // Paso 2: cada problema con su ubicación en negrita
  const agregar = (ubicacion, mensaje) => {
    const item = document.createElement('li');
    const donde = document.createElement('strong');
    donde.textContent = ubicacion;
    item.append(donde, document.createTextNode(`: ${mensaje}`));
    lista.appendChild(item);
  };
  const recorte = (total) => {
    if (total <= MAX_PROBLEMAS_VISIBLES) return;
    const item = document.createElement('li');
    item.textContent = TEXTOS.mostrandoPrimeros(MAX_PROBLEMAS_VISIBLES, total);
    lista.appendChild(item);
  };
  avisos.slice(0, MAX_PROBLEMAS_VISIBLES).forEach((a) => agregar(a.pestana || TEXTOS.libroCompleto, a.mensaje));
  recorte(avisos.length);
  rechazos.slice(0, MAX_PROBLEMAS_VISIBLES).forEach((r) => agregar(TEXTOS.filaDe(r.pestana, r.fila), r.motivo));
  recorte(rechazos.length);
}
