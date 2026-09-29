/**
 * Controles de filtro: combos nativos llenados de forma segura y un combo con búsqueda
 * para el establecimiento (cientos de opciones). Todo texto de la hoja se escribe con textContent.
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
import { claveNormalizada } from './normalizar.js';

/**
 * Reemplaza las opciones de un <select>. `opciones` = [{ valor, texto, grupo? }].
 * Conserva el valor actual si sigue existiendo; si no, vuelve a la primera opción.
 */
export function llenarSelect(select, opciones, valorActual) {
  // Paso 1: vaciar nodo por nodo, sin reinterpretar marcado
  while (select.firstChild) select.removeChild(select.firstChild);
  // Paso 2: agrupar respetando el orden recibido
  const grupos = new Map();
  for (const o of opciones) {
    const opcion = document.createElement('option');
    opcion.value = o.valor;
    opcion.textContent = o.texto;
    if (!o.grupo) {
      select.appendChild(opcion);
      continue;
    }
    if (!grupos.has(o.grupo)) {
      const grupo = document.createElement('optgroup');
      grupo.label = o.grupo;
      grupos.set(o.grupo, grupo);
      select.appendChild(grupo);
    }
    grupos.get(o.grupo).appendChild(opcion);
  }
  // Paso 3: restaurar la selección
  const existe = opciones.some((o) => o.valor === valorActual);
  select.value = existe ? valorActual : (opciones[0] ? opciones[0].valor : '');
}

/**
 * Combo con búsqueda accesible (patrón combobox + listbox de WAI-ARIA).
 * @param {HTMLElement} raiz contenedor con un <input> y un <ul>
 * @param {{ textoTodos: string, sinCoincidencias: string, alCambiar: (valor: string) => void }} opciones
 */
export function crearComboBuscable(raiz, { textoTodos, sinCoincidencias, alCambiar }) {
  const entrada = raiz.querySelector('input');
  const lista = raiz.querySelector('ul');
  let valores = [];
  let valor = '';
  let visibles = [];
  let activo = -1;

  const textoDe = (v) => (v === '' ? textoTodos : v);

  function pintar() {
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    const consulta = claveNormalizada(entrada.value === textoDe(valor) ? '' : entrada.value);
    visibles = ['', ...valores].filter((v) => v === '' || claveNormalizada(v).includes(consulta));
    if (!visibles.length) {
      const vacio = document.createElement('li');
      vacio.className = 'combo-vacio';
      vacio.textContent = sinCoincidencias;
      lista.appendChild(vacio);
    }
    visibles.forEach((v, i) => {
      const item = document.createElement('li');
      item.id = `${lista.id}-op-${i}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(v === valor));
      item.textContent = textoDe(v);
      if (i === activo) item.classList.add('activo');
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        elegir(v);
      });
      lista.appendChild(item);
    });
    entrada.setAttribute('aria-activedescendant', activo >= 0 ? `${lista.id}-op-${activo}` : '');
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
    entrada.value = textoDe(valor);
  }

  function elegir(v) {
    const cambio = v !== valor;
    valor = v;
    cerrar();
    if (cambio) alCambiar(v);
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
      const item = lista.children[activo];
      if (item) item.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activo >= 0 && visibles[activo] !== undefined) elegir(visibles[activo]);
    } else if (e.key === 'Escape') {
      cerrar();
      entrada.blur();
    }
  });

  return {
    fijarOpciones(nuevos) {
      valores = [...nuevos];
      if (valor && !valores.includes(valor)) valor = '';
      entrada.value = textoDe(valor);
    },
    fijarValor(v) {
      valor = v;
      entrada.value = textoDe(v);
    },
  };
}
