/**
 * @file chips.presentational.js
 * @description Presentacional. Pinta los filtros aplicados como píldoras con un botón para quitar cada
 *   uno. No guarda estado: avisa al container qué filtro quitar.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';

/**
 * @param {HTMLElement} contenedor lista donde van los chips
 * @param {Array<{ campo: string, texto: string }>} chips filtros activos
 * @param {(campo: string) => void} alQuitar se llama con el campo del chip que se quita
 */
export function pintarChips(contenedor, chips, alQuitar) {
  // Paso 1: vaciar nodo por nodo y ocultar si no hay filtros
  while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
  contenedor.hidden = chips.length === 0;
  // Paso 2: un botón por filtro; el texto de la hoja entra como nodo de texto
  for (const chip of chips) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'chip';
    boton.setAttribute('aria-label', TEXTOS.quitarFiltro(chip.texto));
    const texto = document.createElement('span');
    texto.textContent = chip.texto;
    const cruz = document.createElement('span');
    cruz.className = 'chip-cruz';
    cruz.setAttribute('aria-hidden', 'true');
    cruz.textContent = '×';
    boton.append(texto, cruz);
    boton.addEventListener('click', () => alQuitar(chip.campo));
    contenedor.appendChild(boton);
  }
}
