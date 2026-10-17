/**
 * @file estado.test.mjs
 * @description Presentacional. Barra de estado de los datos: un `span.estado-dato` por dato, con el rótulo en
 *   `small`, el valor en `strong` y la explicación en `span.estado-detalle` (la estructura de la que dependen los
 *   estilos), y un repintado que reemplaza lo anterior. El DOM se simula con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pintarEstadoDatos } from '../../src/application/components/presentational/estado.presentational.js';
import { TEXTOS } from '../../src/shared/textos.es.js';
import { Nodo, instalarDocumentoFalso } from '../dom-falso.mjs';

let restaurar;
let contenedor;

beforeEach(() => {
  restaurar = instalarDocumentoFalso();
  contenedor = new Nodo('p');
});

afterEach(() => restaurar());

const DATOS = TEXTOS.estadoDatos('12/10/2026 21:35:05', 30, 'ene 2025 a sep 2026', '14', '14', '1.234');

test('cada dato de la barra de estado es un span.estado-dato con rótulo, valor y detalle', () => {
  pintarEstadoDatos(contenedor, DATOS);
  assert.equal(contenedor.children.length, 4);
  contenedor.children.forEach((item, i) => {
    assert.equal(item.tagName, 'SPAN');
    assert.equal(item.className, 'estado-dato');
    assert.deepEqual(item.children.map((h) => h.tagName), ['SMALL', 'STRONG', 'SPAN']);
    assert.deepEqual(item.children.map((h) => h.className), ['', '', 'estado-detalle']);
    const { rotulo, valor, detalle } = DATOS[i];
    assert.deepEqual(item.children.map((h) => h.textContent), [rotulo, valor, detalle]);
    assert.equal(item.textContent, `${rotulo}${valor}${detalle}`);
  });
});

test('repintar reemplaza los datos y el aviso inicial, y el texto entra como texto', () => {
  contenedor.textContent = TEXTOS.sinDatosAun(30);
  const hostil = '<img src=x onerror=alert(1)>';
  pintarEstadoDatos(contenedor, [{ rotulo: 'Periodo con datos', valor: hostil, detalle: 'Primer y último mes cargados' }]);
  assert.equal(contenedor.children.length, 1);
  assert.equal(contenedor.children[0].children[1].textContent, hostil);
  assert.ok(!contenedor.textContent.includes(TEXTOS.sinDatosAun(30)), 'el aviso de carga inicial ya no se ve');
  pintarEstadoDatos(contenedor, DATOS);
  assert.equal(contenedor.children.length, 4);
});
