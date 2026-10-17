/**
 * @file frescura.test.mjs
 * @description Presentacional. Chip de frescura: el estado viaja en `data-estado`, cada estado tiene su rótulo, el
 *   rótulo solo se reescribe si cambió (reescribirlo igual lo vuelve a anunciar) y el detalle queda vacío sin
 *   minutos. El DOM se simula con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pintarFrescura } from '../../src/application/components/presentational/frescura.presentational.js';
import { Nodo } from '../dom-falso.mjs';

let zonas;

beforeEach(() => {
  zonas = { chip: new Nodo('span'), etiqueta: new Nodo('span'), detalle: new Nodo('span') };
});

test('cada estado pone su data-estado y su rótulo', () => {
  const rotulos = {
    alDia: 'Datos al día', retrasado: 'Datos con retraso', vencido: 'Publicación detenida', desconocido: 'Sin verificar',
  };
  for (const [estado, rotulo] of Object.entries(rotulos)) {
    pintarFrescura(zonas, { estado, minutos: 5 });
    assert.equal(zonas.chip.dataset.estado, estado);
    assert.equal(zonas.etiqueta.textContent, rotulo, estado);
  }
});

test('el detalle dice cuánto hace que se publicaron', () => {
  pintarFrescura(zonas, { estado: 'alDia', minutos: 5 });
  assert.equal(zonas.detalle.textContent, 'publicados hace 5 min');
  pintarFrescura(zonas, { estado: 'retrasado', minutos: 135 });
  assert.equal(zonas.detalle.textContent, 'publicados hace 2 h 15 min');
});

test('sin minutos el detalle queda vacío', () => {
  pintarFrescura(zonas, { estado: 'alDia', minutos: 5 });
  pintarFrescura(zonas, { estado: 'desconocido', minutos: null });
  assert.equal(zonas.detalle.textContent, '');
  assert.equal(zonas.etiqueta.textContent, 'Sin verificar');
});

test('el rótulo no se reescribe si no cambió, para no anunciarlo cada minuto', () => {
  pintarFrescura(zonas, { estado: 'alDia', minutos: 1 });
  pintarFrescura(zonas, { estado: 'alDia', minutos: 2 });
  pintarFrescura(zonas, { estado: 'alDia', minutos: 3 });
  assert.equal(zonas.etiqueta.escriturasDeTexto, 1);
  assert.equal(zonas.detalle.escriturasDeTexto, 3, 'el detalle sí se actualiza cada vez');
  pintarFrescura(zonas, { estado: 'retrasado', minutos: 40 });
  assert.equal(zonas.etiqueta.escriturasDeTexto, 2);
});
