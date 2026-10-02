/**
 * @file combo-multiple.js
 * @description Componente compartido. Combo con búsqueda donde se pueden elegir varias opciones: cada clic en una
 *   opción la agrega o la quita y la lista sigue abierta. Las opciones pueden venir agrupadas. Todo texto de la
 *   hoja se escribe con textContent. Las opciones elegidas se ven como etiquetas removibles en la barra de
 *   filtros activos, no dentro del combo.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { claveNormalizada } from '../../../domain/catalogo.js';
import { alternarValor, quitarValor } from '../../../domain/filtros.js';

/**
 * Opciones visibles para una búsqueda, con un encabezado de grupo antes de la primera opción de cada grupo.
 * La búsqueda ignora tildes y mayúsculas; un grupo sin coincidencias no aparece.
 * @param {Array<{ valor: string, texto: string, grupo?: string }>} opciones todas las opciones
 * @param {string} consulta texto escrito por quien busca
 * @returns {Array<{ tipo: 'grupo', texto: string } | { tipo: 'opcion', valor: string, texto: string }>}
 */
export function prepararOpciones(opciones, consulta) {
  const buscado = claveNormalizada(consulta);
  const items = [];
  let grupoActual = null;
  for (const opcion of opciones) {
    if (buscado && !claveNormalizada(opcion.texto).includes(buscado)) continue;
    if (opcion.grupo && opcion.grupo !== grupoActual) items.push({ tipo: 'grupo', texto: opcion.grupo });
    grupoActual = opcion.grupo || null;
    items.push({ tipo: 'opcion', valor: opcion.valor, texto: opcion.texto });
  }
  return items;
}

/**
 * Texto que muestra el combo cerrado.
 * @param {Array<{ valor: string, texto: string }>} opciones todas las opciones
 * @param {string[]} seleccion valores elegidos
 * @param {{ todos: string, elegidas: (n: number) => string }} textos redacción de cada caso
 */
export function resumenSeleccion(opciones, seleccion, textos) {
  if (!seleccion.length) return textos.todos;
  if (seleccion.length > 1) return textos.elegidas(seleccion.length);
  const opcion = opciones.find((o) => o.valor === seleccion[0]);
  return opcion ? opcion.texto : seleccion[0];
}

/**
 * Combo accesible de varias opciones (combobox con listbox de WAI-ARIA).
 * @param {HTMLElement} raiz contenedor con un <input> y un <ul>
 * @param {{
 *   textos: { todos: string, elegidas: (n: number) => string, sinCoincidencias: string },
 *   alCambiar: (seleccion: string[]) => void,
 * }} dependencias redacción de los casos y aviso con la nueva lista de opciones elegidas
 */
export function crearComboMultiple(raiz, { textos, alCambiar }) {
  const entrada = raiz.querySelector('input');
  const lista = raiz.querySelector('ul');
  let opciones = [];
  let seleccion = [];
  let visibles = [];
  let activo = -1;

  const resumen = () => resumenSeleccion(opciones, seleccion, textos);
  const consulta = () => (entrada.value === resumen() ? '' : entrada.value);

  function pintar() {
    lista.replaceChildren();
    const items = prepararOpciones(opciones, consulta());
    visibles = items.filter((i) => i.tipo === 'opcion');
    if (!items.length) {
      const vacio = document.createElement('li');
      vacio.className = 'combo-vacio';
      vacio.textContent = textos.sinCoincidencias;
      lista.appendChild(vacio);
    }
    let indice = 0;
    for (const item of items) {
      const nodo = document.createElement('li');
      if (item.tipo === 'grupo') {
        nodo.className = 'combo-grupo';
        nodo.setAttribute('role', 'presentation');
        nodo.textContent = item.texto;
      } else {
        const posicion = indice;
        indice += 1;
        const elegida = seleccion.includes(item.valor);
        nodo.id = `${lista.id}-op-${posicion}`;
        nodo.setAttribute('role', 'option');
        nodo.setAttribute('aria-selected', String(elegida));
        if (posicion === activo) nodo.classList.add('activo');
        const casilla = document.createElement('span');
        casilla.className = 'combo-casilla';
        casilla.setAttribute('aria-hidden', 'true');
        casilla.textContent = elegida ? '✓' : '';
        const texto = document.createElement('span');
        texto.textContent = item.texto;
        nodo.append(casilla, texto);
        nodo.addEventListener('mousedown', (e) => {
          e.preventDefault();
          activo = posicion;
          alternar(item.valor);
        });
      }
      lista.appendChild(nodo);
    }
    entrada.setAttribute('aria-activedescendant', activo >= 0 && visibles[activo] ? `${lista.id}-op-${activo}` : '');
  }

  function avisarCambio() {
    pintar();
    alCambiar([...seleccion]);
  }

  function alternar(valor) {
    seleccion = alternarValor(seleccion, valor);
    avisarCambio();
  }

  function abrir() {
    raiz.classList.add('abierto');
    entrada.setAttribute('aria-expanded', 'true');
    pintar();
  }

  function cerrar() {
    raiz.classList.remove('abierto');
    entrada.setAttribute('aria-expanded', 'false');
    activo = -1;
    entrada.value = resumen();
  }

  entrada.addEventListener('focus', () => {
    entrada.select();
    abrir();
  });
  entrada.addEventListener('input', () => {
    activo = 0;
    abrir();
  });
  entrada.addEventListener('blur', cerrar);
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!raiz.classList.contains('abierto')) abrir();
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      activo = Math.max(0, Math.min(visibles.length - 1, activo + paso));
      pintar();
      const nodo = lista.querySelector('li.activo');
      if (nodo) nodo.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activo >= 0 && visibles[activo]) alternar(visibles[activo].valor);
    } else if (e.key === 'Backspace' && consulta() === '' && seleccion.length) {
      // Retroceso sin texto escrito quita la última opción elegida
      e.preventDefault();
      seleccion = quitarValor(seleccion, seleccion[seleccion.length - 1]);
      avisarCambio();
      entrada.select();
    } else if (e.key === 'Escape') {
      cerrar();
      entrada.blur();
    }
  });

  lista.setAttribute('aria-multiselectable', 'true');
  entrada.value = resumen();

  return {
    /** Reemplaza las opciones; las elegidas que ya no existan se conservan hasta que la fachada las cambie. */
    fijarOpciones(nuevas) {
      opciones = [...nuevas];
      if (!raiz.classList.contains('abierto')) entrada.value = resumen();
    },
    /** Marca lo que ya está elegido en la fachada, sin avisar de ningún cambio. */
    fijarValores(valores) {
      seleccion = [...valores];
      if (raiz.classList.contains('abierto')) pintar();
      else entrada.value = resumen();
    },
  };
}
