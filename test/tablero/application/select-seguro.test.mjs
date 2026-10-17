/**
 * @file select-seguro.test.mjs
 * @description Compartido. Llenado seguro de un `<select>`: vacía lo anterior, pone cada texto como texto, arma un
 *   `<optgroup>` por grupo en el orden en que aparece y conserva el valor elegido si sigue existiendo; si no, vuelve
 *   a la primera opción. El DOM se simula con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { llenarSelect } from '../../../src/tablero/application/components/compartidos/select-seguro.js';
import { Nodo, instalarDocumentoFalso } from '../../dom-falso.mjs';

let restaurar;
let select;

beforeEach(() => {
  restaurar = instalarDocumentoFalso();
  select = new Nodo('select');
});

afterEach(() => restaurar());

const OPCIONES = [
  { valor: '', texto: 'Todas' },
  { valor: 'C:Ambato', texto: 'Ambato', grupo: 'Ciudades' },
  { valor: 'P:Perú', texto: 'Perú', grupo: 'Países' },
  { valor: 'C:Baños', texto: 'Baños', grupo: 'Ciudades' },
  { valor: 'EXT', texto: 'Extranjeros' },
];

test('las opciones sin grupo van sueltas y las de un grupo dentro de un solo optgroup, en orden de aparición', () => {
  llenarSelect(select, OPCIONES, '');
  assert.deepEqual(select.children.map((n) => (n.tagName === 'OPTGROUP' ? `# ${n.label}` : n.value)), ['', '# Ciudades', '# Países', 'EXT']);
  const [, ciudades, paises] = select.children;
  assert.deepEqual(ciudades.children.map((o) => [o.value, o.textContent]), [['C:Ambato', 'Ambato'], ['C:Baños', 'Baños']]);
  assert.deepEqual(paises.children.map((o) => o.value), ['P:Perú']);
});

test('conserva el valor elegido si sigue entre las opciones', () => {
  llenarSelect(select, OPCIONES, 'C:Baños');
  assert.equal(select.value, 'C:Baños');
});

test('si el valor elegido ya no existe vuelve a la primera opción', () => {
  llenarSelect(select, OPCIONES.slice(1), 'C:Quito');
  assert.equal(select.value, 'C:Ambato');
});

test('sin opciones el select queda vacío y sin valor', () => {
  llenarSelect(select, OPCIONES, 'EXT');
  llenarSelect(select, [], 'EXT');
  assert.equal(select.children.length, 0);
  assert.equal(select.value, '');
});

test('volver a llenar reemplaza las opciones anteriores, no las suma', () => {
  llenarSelect(select, OPCIONES, '');
  llenarSelect(select, [{ valor: '2026', texto: '2026' }, { valor: '2025', texto: '2025' }], '2025');
  assert.deepEqual(select.opciones().map((o) => o.value), ['2026', '2025']);
  assert.equal(select.value, '2025');
});

test('el texto y el grupo que vienen de la hoja entran como texto, nunca como marcado', () => {
  const malicioso = '<img src=x onerror=alert(1)>';
  llenarSelect(select, [{ valor: malicioso, texto: malicioso, grupo: malicioso }], malicioso);
  const [grupo] = select.children;
  assert.equal(grupo.label, malicioso);
  assert.equal(grupo.children[0].textContent, malicioso);
  assert.equal(select.value, malicioso);
});
