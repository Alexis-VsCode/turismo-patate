/**
 * @file chips.test.mjs
 * @description Presentacional. Chips de filtros aplicados: se ocultan sin filtros, cada chip quita su campo y valor,
 *   «Quitar todos» solo aparece con dos o más, «Copiar enlace» con uno o más y avisa si pudo copiar, y el texto de
 *   la hoja entra como texto. El DOM se simula con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pintarChips } from '../../src/application/components/presentational/chips.presentational.js';
import { Nodo, instalarDocumentoFalso } from '../dom-falso.mjs';

let restaurar;
let contenedor;

beforeEach(() => {
  restaurar = instalarDocumentoFalso();
  contenedor = new Nodo('div');
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  mock.timers.reset();
  restaurar();
});

const AMBATO = { campo: 'procedencia', valor: 'C:Ambato', texto: 'Ambato' };
const ANIO = { campo: 'anio', valor: 2025, texto: '2025' };
const nada = () => {};
const copiado = async () => true;

test('sin filtros el contenedor se oculta y queda vacío, aunque tuviera chips de antes', () => {
  pintarChips(contenedor, [AMBATO, ANIO], nada, nada, copiado);
  pintarChips(contenedor, [], nada, nada, copiado);
  assert.equal(contenedor.hidden, true);
  assert.equal(contenedor.children.length, 0);
});

test('cada chip es un botón con su texto, su cruz oculta al lector y una etiqueta que dice qué quita', () => {
  pintarChips(contenedor, [AMBATO], nada, nada, copiado);
  assert.equal(contenedor.hidden, false);
  const [chip] = contenedor.buscar('chip');
  assert.equal(chip.tagName, 'BUTTON');
  assert.equal(chip.type, 'button');
  assert.equal(chip.getAttribute('aria-label'), 'Quitar filtro Ambato');
  assert.equal(chip.children[0].textContent, 'Ambato');
  const cruz = contenedor.buscar('chip-cruz')[0];
  assert.equal(cruz.getAttribute('aria-hidden'), 'true');
  assert.equal(cruz.textContent, '×');
});

test('el clic en un chip llama a alQuitar con su campo y su valor, sin convertir el tipo', () => {
  const alQuitar = mock.fn();
  pintarChips(contenedor, [AMBATO, ANIO], alQuitar, nada, copiado);
  contenedor.buscar('chip')[1].emitir('click');
  assert.deepEqual(alQuitar.mock.calls.map((c) => c.arguments), [['anio', 2025]]);
});

test('«Quitar todos» aparece solo con dos o más chips y su clic llama a alQuitarTodos', () => {
  pintarChips(contenedor, [AMBATO], nada, nada, copiado);
  assert.equal(contenedor.buscar('chips-limpiar').length, 0);
  const alQuitarTodos = mock.fn();
  pintarChips(contenedor, [AMBATO, ANIO], nada, alQuitarTodos, copiado);
  const [todos] = contenedor.buscar('chips-limpiar');
  assert.equal(todos.textContent, 'Quitar todos');
  assert.equal(todos.type, 'button');
  todos.emitir('click');
  assert.equal(alQuitarTodos.mock.callCount(), 1);
});

test('el orden es chips, «Quitar todos» y «Copiar enlace»', () => {
  pintarChips(contenedor, [AMBATO, ANIO], nada, nada, copiado);
  assert.deepEqual(contenedor.children.map((n) => n.className), ['chip', 'chip', 'chips-limpiar', 'chips-enlace']);
});

test('«Copiar enlace» aparece con un chip, dice si copió y a los 2 segundos vuelve a su texto', async () => {
  for (const [pudo, mensaje] of [[true, 'Enlace copiado'], [false, 'No se pudo copiar']]) {
    pintarChips(contenedor, [AMBATO], nada, nada, async () => pudo);
    const [copiar] = contenedor.buscar('chips-enlace');
    assert.equal(copiar.textContent, 'Copiar enlace');
    await Promise.all(copiar.emitir('click'));
    assert.equal(copiar.textContent, mensaje);
    mock.timers.tick(1999);
    assert.equal(copiar.textContent, mensaje);
    mock.timers.tick(1);
    assert.equal(copiar.textContent, 'Copiar enlace');
  }
});

test('el texto de la hoja entra como texto, nunca como marcado', () => {
  const malicioso = '<img src=x onerror=alert(1)>';
  pintarChips(contenedor, [{ campo: 'establecimiento', valor: malicioso, texto: malicioso }], nada, nada, copiado);
  const [chip] = contenedor.buscar('chip');
  assert.equal(chip.children[0].textContent, malicioso);
  assert.equal(chip.getAttribute('aria-label'), `Quitar filtro ${malicioso}`);
});
