/**
 * @file chips.presentational.js
 * @description Presentacional. Pinta los filtros aplicados como píldoras con un botón para quitar cada
 *   uno. No guarda estado: avisa al container qué filtro quitar.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';

/**
 * @param {HTMLElement} contenedor lista donde van los chips
 * @param {Array<{ campo: string, valor: string|number, texto: string }>} chips una etiqueta por cada opción elegida
 * @param {(campo: string, valor: string|number) => void} alQuitar se llama con el campo y el valor del chip que se quita
 * @param {() => void} alQuitarTodos se llama al pulsar «Quitar todos», que solo aparece con dos o más etiquetas
 */
export function pintarChips(contenedor, chips, alQuitar, alQuitarTodos) {
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
    boton.addEventListener('click', () => alQuitar(chip.campo, chip.valor));
    contenedor.appendChild(boton);
  }
  // Paso 3: con varias etiquetas se ofrece quitarlas todas de una vez
  if (chips.length > 1) {
    const todos = document.createElement('button');
    todos.type = 'button';
    todos.className = 'chips-limpiar';
    todos.textContent = TEXTOS.quitarTodos;
    todos.addEventListener('click', alQuitarTodos);
    contenedor.appendChild(todos);
  }
}
