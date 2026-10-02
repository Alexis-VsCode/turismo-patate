/**
 * @file combo-multiple.test.mjs
 * @description Compartido. Lógica pura del combo de varias opciones: búsqueda sin tildes, grupos que solo aparecen
 *   si tienen coincidencias y texto resumen de lo elegido. El DOM se verifica en el navegador.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararOpciones, resumenSeleccion } from '../../src/application/components/compartidos/combo-multiple.js';

const OPCIONES = [
  { valor: 'NAC', texto: 'Ecuador (todas las ciudades)', grupo: 'Atajos' },
  { valor: 'C:Ambato', texto: 'Ambato', grupo: 'Ciudades' },
  { valor: 'C:Baños', texto: 'Baños', grupo: 'Ciudades' },
  { valor: 'P:Perú', texto: 'Perú', grupo: 'Países' },
  { valor: 'M:Turismo', texto: 'Turismo' },
];

test('sin búsqueda se muestran todas las opciones con su encabezado de grupo una sola vez', () => {
  const items = prepararOpciones(OPCIONES, '');
  assert.deepEqual(items.filter((i) => i.tipo === 'grupo').map((i) => i.texto), ['Atajos', 'Ciudades', 'Países']);
  assert.equal(items.filter((i) => i.tipo === 'opcion').length, 5);
});

test('la búsqueda ignora tildes y mayúsculas y oculta los grupos sin coincidencias', () => {
  const items = prepararOpciones(OPCIONES, 'BANOS');
  assert.deepEqual(items.map((i) => (i.tipo === 'grupo' ? `# ${i.texto}` : i.valor)), ['# Ciudades', 'C:Baños']);
});

test('una búsqueda sin coincidencias no devuelve nada', () => {
  assert.deepEqual(prepararOpciones(OPCIONES, 'zzz'), []);
});

test('las opciones sin grupo no llevan encabezado', () => {
  const items = prepararOpciones(OPCIONES, 'turis');
  assert.deepEqual(items.map((i) => i.tipo), ['opcion']);
});

test('el resumen dice «todos» sin elección, el nombre con una y la cantidad con varias', () => {
  const textos = { todos: 'Todos', elegidas: (n) => `${n} elegidas` };
  assert.equal(resumenSeleccion(OPCIONES, [], textos), 'Todos');
  assert.equal(resumenSeleccion(OPCIONES, ['C:Baños'], textos), 'Baños');
  assert.equal(resumenSeleccion(OPCIONES, ['C:Baños', 'P:Perú'], textos), '2 elegidas');
});

test('el resumen con una elección que ya no existe en las opciones cuenta como elegida', () => {
  const textos = { todos: 'Todos', elegidas: (n) => `${n} elegidas` };
  assert.equal(resumenSeleccion(OPCIONES, ['C:Nueva'], textos), 'C:Nueva');
});
