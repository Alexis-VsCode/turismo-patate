/**
 * @file foco-al-repintar.test.mjs
 * @description Presentacional y compartido. Quien usa el teclado no pierde su lugar cuando un clic repinta lo que tenía
 *   el foco: la lista de motivos, la barra de chips y las etiquetas del combo vuelven a enfocar el mismo botón, o el
 *   que quedó en su lugar si ese ya no existe. Si el foco estaba en otra parte, repintar no lo mueve.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Nodo } from '../../dom-falso.mjs';
import { instalarFocoFalso } from './foco-falso.mjs';
import { pintarChips } from '../../../src/tablero/application/components/presentational/chips.presentational.js';
import { pintarMotivos } from '../../../src/tablero/application/components/presentational/motivos.presentational.js';
import { crearComboMultiple } from '../../../src/tablero/application/components/compartidos/combo-multiple.js';

let foco;

beforeEach(() => {
  foco = instalarFocoFalso();
});

afterEach(() => {
  foco.restaurar();
});

const nada = () => {};
const copiado = async () => true;
const chip = (valor) => ({ campo: 'motivo', valor, texto: valor });
const chipsDe = (contenedor) => contenedor.buscar('chip');
const MOTIVOS = [{ nombre: 'Turismo', valor: 6 }, { nombre: 'Gastronomía', valor: 3 }, { nombre: 'Descanso', valor: 1 }];

test('quitar un chip con el teclado deja el foco en el chip que quedó en su lugar', () => {
  const barra = foco.colgar(new Nodo('div'));
  const respaldo = foco.colgar(new Nodo('main'));
  pintarChips(barra, [chip('A'), chip('B'), chip('C')], nada, nada, copiado, respaldo);
  chipsDe(barra)[1].focus();
  pintarChips(barra, [chip('A'), chip('C')], nada, nada, copiado, respaldo);
  assert.equal(foco.enfocado(), chipsDe(barra)[1]);
  assert.equal(foco.enfocado().children[0].textContent, 'C');
  chipsDe(barra)[1].focus();
  pintarChips(barra, [chip('A')], nada, nada, copiado, respaldo);
  assert.equal(foco.enfocado(), chipsDe(barra)[0], 'si era el último, pasa al anterior');
});

test('un chip que sigue tras repintar conserva el foco', () => {
  const barra = foco.colgar(new Nodo('div'));
  pintarChips(barra, [chip('A'), chip('B')], nada, nada, copiado, null);
  chipsDe(barra)[1].focus();
  pintarChips(barra, [chip('B')], nada, nada, copiado, null);
  assert.equal(foco.enfocado(), chipsDe(barra)[0]);
  assert.equal(foco.enfocado().children[0].textContent, 'B');
});

test('sin chips que enfocar, el foco pasa al respaldo y no se pierde en la página', () => {
  const barra = foco.colgar(new Nodo('div'));
  const respaldo = foco.colgar(new Nodo('main'));
  pintarChips(barra, [chip('A'), chip('B')], nada, nada, copiado, respaldo);
  barra.buscar('chips-limpiar')[0].focus();
  pintarChips(barra, [], nada, nada, copiado, respaldo);
  assert.equal(foco.enfocado(), respaldo, '«Quitar todos» deja el foco al inicio del dashboard');
});

test('repintar la barra de chips no mueve un foco que estaba en otra parte', () => {
  const barra = foco.colgar(new Nodo('div'));
  const otro = foco.colgar(new Nodo('button'));
  const respaldo = foco.colgar(new Nodo('main'));
  pintarChips(barra, [chip('A')], nada, nada, copiado, respaldo);
  otro.focus();
  pintarChips(barra, [], nada, nada, copiado, respaldo);
  assert.equal(foco.enfocado(), otro);
});

test('elegir un motivo con el teclado deja el foco en ese motivo, ya marcado', () => {
  const lista = foco.colgar(new Nodo('ol'));
  pintarMotivos(lista, MOTIVOS, [], nada);
  const boton = (i) => lista.children[i].children[0];
  boton(1).focus();
  pintarMotivos(lista, MOTIVOS, ['Gastronomía'], nada);
  assert.equal(foco.enfocado(), boton(1));
  assert.equal(foco.enfocado().getAttribute('aria-pressed'), 'true');
  const otro = foco.colgar(new Nodo('button'));
  otro.focus();
  pintarMotivos(lista, MOTIVOS, [], nada);
  assert.equal(foco.enfocado(), otro, 'si el foco no estaba en la lista, no se mueve');
});

/** Combo de varias opciones sobre nodos falsos, con tres opciones elegidas. */
function comboConTres() {
  const raiz = foco.colgar(new Nodo('div'));
  const entrada = new Nodo('input');
  const lista = new Nodo('ul');
  lista.id = 'lista';
  raiz.append(entrada, lista);
  raiz.querySelector = (selector) => (selector === 'input' ? entrada : lista);
  const cambios = [];
  const textos = { todos: 'Todos', elegidas: (n) => `${n} elegidas`, sinCoincidencias: '', quitar: (t) => `Quitar ${t}`, masElegidas: (n) => `+${n}` };
  const combo = crearComboMultiple(raiz, { textos, alCambiar: (sel) => cambios.push(sel) });
  combo.fijarOpciones([{ valor: 'a', texto: 'A' }, { valor: 'b', texto: 'B' }, { valor: 'c', texto: 'C' }]);
  combo.fijarValores(['a', 'b', 'c']);
  const etiquetas = () => raiz.buscar('etiqueta-mini');
  return { combo, entrada, etiquetas, cambios };
}

test('quitar una etiqueta del combo con el teclado deja el foco en la etiqueta que quedó en su lugar', () => {
  const { entrada, etiquetas, cambios } = comboConTres();
  etiquetas()[1].focus();
  etiquetas()[1].emitir('click');
  assert.deepEqual(cambios.at(-1), ['a', 'c']);
  assert.equal(foco.enfocado(), etiquetas()[1]);
  assert.equal(foco.enfocado().getAttribute('aria-label'), 'Quitar C');
  etiquetas()[1].emitir('click');
  assert.equal(foco.enfocado(), etiquetas()[0], 'si era la última, pasa a la anterior');
  etiquetas()[0].emitir('click');
  assert.equal(foco.enfocado(), entrada, 'sin etiquetas, vuelve a la entrada del mismo combo');
});

test('cuando la fachada repinta el combo, la etiqueta enfocada conserva el foco', () => {
  const { combo, etiquetas } = comboConTres();
  etiquetas()[2].focus();
  combo.fijarOpciones([{ valor: 'a', texto: 'A' }, { valor: 'c', texto: 'C' }]);
  combo.fijarValores(['a', 'b', 'c']);
  assert.equal(foco.enfocado(), etiquetas()[2]);
});
