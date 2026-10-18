/**
 * @file problemas.test.mjs
 * @description Presentacional. Aviso de filas rechazadas y pestañas mal armadas: se oculta sin problemas, resume
 *   cuántos hay, pinta los avisos antes que los rechazos con su ubicación, corta la lista en 50 rechazos y escribe
 *   todo texto de la hoja como texto. El DOM se simula con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pintarProblemas, esModoRevision } from '../../../src/tablero/application/components/presentational/problemas.presentational.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Nodo, instalarDocumentoFalso } from '../../dom-falso.mjs';
import { RAIZ } from '../../helpers.mjs';

let restaurar;
let elementos;

beforeEach(() => {
  restaurar = instalarDocumentoFalso();
  elementos = { caja: new Nodo('div'), resumen: new Nodo('p'), lista: new Nodo('ul') };
});

afterEach(() => restaurar());

const rechazos = (n) => Array.from({ length: n }, (_, i) => ({ pestana: 'Hostal', fila: i + 2, motivo: `Motivo ${i + 2}` }));
const textos = () => elementos.lista.children.map((li) => li.textContent);

test('sin rechazos ni avisos la caja se oculta, el resumen queda vacío y la lista sin elementos', () => {
  pintarProblemas(elementos, { rechazos: [], avisos: [] }, { revision: true });
  assert.equal(elementos.caja.hidden, true);
  assert.equal(elementos.resumen.textContent, '');
  assert.equal(elementos.lista.children.length, 0);
});

test('con rechazos, con avisos o con ambos la caja se muestra y el resumen los cuenta en singular o plural', () => {
  pintarProblemas(elementos, { rechazos: rechazos(2), avisos: [{ pestana: 'Rota', mensaje: 'Faltan columnas' }] }, { revision: true });
  assert.equal(elementos.caja.hidden, false);
  assert.equal(elementos.resumen.textContent, '2 filas con problemas · 1 aviso');
  pintarProblemas(elementos, { rechazos: rechazos(1), avisos: [] }, { revision: true });
  assert.equal(elementos.caja.hidden, false, 'solo con rechazos');
  assert.equal(elementos.resumen.textContent, '1 fila con problemas');
  pintarProblemas(elementos, { rechazos: [], avisos: [{ pestana: 'A', mensaje: 'x' }, { pestana: 'B', mensaje: 'y' }] }, { revision: true });
  assert.equal(elementos.caja.hidden, false, 'solo con avisos');
  assert.equal(elementos.resumen.textContent, '2 avisos');
});

test('los avisos van antes que los rechazos, cada uno con su ubicación en negrita', () => {
  pintarProblemas(elementos, {
    rechazos: [{ pestana: 'Hostal', fila: 4, motivo: 'Cantidad no válida' }],
    avisos: [{ pestana: 'Rota', mensaje: 'Faltan columnas' }, { pestana: '', mensaje: 'Catálogo incompleto' }],
  }, { revision: true });
  assert.deepEqual(textos(), ['Rota: Faltan columnas', 'Libro completo: Catálogo incompleto', 'Hostal · fila 4: Cantidad no válida']);
  const [primero] = elementos.lista.children;
  assert.equal(primero.tagName, 'LI');
  assert.deepEqual(primero.children.map((n) => n.tagName), ['STRONG', '#TEXT']);
  assert.equal(primero.children[0].textContent, 'Rota');
});

test('se muestran como máximo 50 rechazos y una línea final dice cuántos hay en total', () => {
  pintarProblemas(elementos, { rechazos: rechazos(51), avisos: [{ pestana: 'Rota', mensaje: 'Faltan columnas' }] }, { revision: true });
  const lineas = textos();
  assert.equal(lineas.length, 1 + 50 + 1);
  assert.equal(lineas[50], 'Hostal · fila 51: Motivo 51');
  assert.equal(lineas.at(-1), 'Se muestran los primeros 50 de 51.');
  assert.equal(elementos.resumen.textContent, '51 filas con problemas · 1 aviso');
});

test('con exactamente 50 rechazos no aparece la línea de los primeros', () => {
  pintarProblemas(elementos, { rechazos: rechazos(50), avisos: [] }, { revision: true });
  assert.equal(elementos.lista.children.length, 50);
  assert.equal(textos().some((t) => t.startsWith('Se muestran')), false);
});

test('el texto de la hoja entra como texto, nunca como marcado', () => {
  const malicioso = '<img src=x onerror=alert(1)>';
  pintarProblemas(elementos, { rechazos: [{ pestana: malicioso, fila: 2, motivo: malicioso }], avisos: [{ pestana: malicioso, mensaje: malicioso }] }, { revision: true });
  assert.deepEqual(textos(), [`${malicioso}: ${malicioso}`, `${malicioso} · fila 2: ${malicioso}`]);
});

test('repintar vacía la lista anterior y ocultar no deja elementos viejos', () => {
  pintarProblemas(elementos, { rechazos: rechazos(3), avisos: [] }, { revision: true });
  pintarProblemas(elementos, { rechazos: rechazos(1), avisos: [] }, { revision: true });
  assert.deepEqual(textos(), ['Hostal · fila 2: Motivo 2']);
  pintarProblemas(elementos, { rechazos: [], avisos: [] }, { revision: true });
  assert.equal(elementos.lista.children.length, 0);
  assert.equal(elementos.caja.hidden, true);
});

test('se muestran como máximo 50 avisos y una línea dice cuántos hay en total', () => {
  const avisos = Array.from({ length: 60 }, (_, i) => ({ pestana: 'Hostal', mensaje: `Aviso ${i + 1}` }));
  pintarProblemas(elementos, { rechazos: [], avisos }, { revision: true });
  const lineas = textos();
  assert.equal(lineas.length, 50 + 1);
  assert.equal(lineas.at(-1), 'Se muestran los primeros 50 de 60.');
  assert.equal(elementos.resumen.textContent, '60 avisos');
});

test('el modo revisión se activa solo con el parámetro revision en la dirección', () => {
  assert.equal(esModoRevision('?revision'), true);
  assert.equal(esModoRevision('?revision=1'), true);
  assert.equal(esModoRevision('?x=1&revision'), true);
  assert.equal(esModoRevision(''), false);
  assert.equal(esModoRevision('?revisiones'), false);
  assert.equal(esModoRevision(undefined), false);
});

test('fuera del modo revisión el público no ve el panel aunque haya rechazos y avisos', () => {
  pintarProblemas(elementos, { rechazos: rechazos(3), avisos: [{ pestana: 'Rota', mensaje: 'Faltan columnas' }] });
  assert.equal(elementos.caja.hidden, true);
  assert.equal(elementos.resumen.textContent, '');
  assert.equal(elementos.lista.children.length, 0);
});

test('el container decide el modo revisión con la dirección de la página', () => {
  const fuente = readFileSync(join(RAIZ, 'src/tablero/application/components/tablero.container.js'), 'utf8');
  assert.match(fuente, /esModoRevision\(window\.location\.search\)/);
});
