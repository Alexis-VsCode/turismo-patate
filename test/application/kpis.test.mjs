/**
 * @file kpis.test.mjs
 * @description Presentacional. Tarjetas de cifras: total, nacionales y extranjeros con separador de miles, porcentajes
 *   con «s/d» sin base, variación con flecha y clase según el sentido (sube, baja o neutra) y, sin año anterior,
 *   el texto de sin comparación. La animación nunca deja una cifra a medias: sin `window` o con movimiento reducido
 *   se escribe directa, y si el navegador no pinta cuadros el valor exacto llega por el respaldo. El DOM se simula
 *   con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pintarKpis } from '../../src/application/components/presentational/kpis.presentational.js';
import { Nodo, instalarDocumentoFalso } from '../dom-falso.mjs';

let restaurar;
let elementos;

beforeEach(() => {
  restaurar = instalarDocumentoFalso();
  elementos = Object.fromEntries(
    ['total', 'variacion', 'nacionales', 'nacionalesPct', 'extranjeros', 'extranjerosPct', 'resumen'].map((n) => [n, new Nodo('span')]),
  );
});

afterEach(() => {
  mock.timers.reset();
  delete globalThis.window;
  delete globalThis.requestAnimationFrame;
  restaurar();
});

const K = { total: 96452, nacionales: 79187, extranjeros: 17265, pctNacionales: 0.821, pctExtranjeros: 0.179 };
const SIN_VISITANTES = { total: 0, nacionales: 0, extranjeros: 0, pctNacionales: null, pctExtranjeros: null };
const clases = () => elementos.variacion.className.split(' ').filter(Boolean);

test('en Node, sin window, las cifras se escriben directas con separador de miles y sin animar', () => {
  pintarKpis(elementos, K, { anioAnterior: 2025, variacion: 0.119 }, 'Resumen de participación.');
  assert.equal(elementos.total.textContent, '96.452');
  assert.equal(elementos.nacionales.textContent, '79.187');
  assert.equal(elementos.extranjeros.textContent, '17.265');
  assert.equal(elementos.total.dataset.valor, '96452');
  assert.equal(elementos.nacionalesPct.textContent, '82,1%');
  assert.equal(elementos.extranjerosPct.textContent, '17,9%');
  assert.equal(elementos.resumen.textContent, 'Resumen de participación.');
});

test('sin visitantes los porcentajes dicen «s/d» y las cifras cero', () => {
  pintarKpis(elementos, SIN_VISITANTES, { anioAnterior: null, variacion: null }, 'Sin visitantes para los filtros elegidos.');
  assert.equal(elementos.total.textContent, '0');
  assert.equal(elementos.nacionalesPct.textContent, 's/d');
  assert.equal(elementos.extranjerosPct.textContent, 's/d');
});

test('la variación lleva flecha y una sola clase según el sentido, contra el año anterior', () => {
  const casos = [
    [0, 'neutra', '■ 0,0% vs 2025'],
    [0.119, 'sube', '▲ +11,9% vs 2025'],
    [-0.05, 'baja', '▼ −5,0% vs 2025'],
    [0, 'neutra', '■ 0,0% vs 2025'],
  ];
  for (const [variacion, clase, texto] of casos) {
    pintarKpis(elementos, K, { anioAnterior: 2025, variacion }, '');
    assert.deepEqual(clases(), [clase], `variación ${variacion}: la clase del pintado anterior se quita`);
    assert.equal(elementos.variacion.textContent, texto);
  }
});

test('sin año anterior la variación es neutra y dice que no hay con qué comparar', () => {
  pintarKpis(elementos, K, { anioAnterior: 2025, variacion: 0.2 }, '');
  pintarKpis(elementos, K, { anioAnterior: null, variacion: null }, '');
  assert.deepEqual(clases(), ['neutra'], 'la clase del pintado anterior se quita');
  assert.equal(elementos.variacion.textContent, 'Sin datos del año anterior');
});

test('con movimiento reducido la cifra se escribe directa, sin pedir cuadros', () => {
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  document.visibilityState = 'visible';
  globalThis.requestAnimationFrame = mock.fn();
  elementos.total.dataset.valor = '10';
  pintarKpis(elementos, K, { anioAnterior: null, variacion: null }, '');
  assert.equal(elementos.total.textContent, '96.452');
  assert.equal(globalThis.requestAnimationFrame.mock.callCount(), 0);
});

test('si el navegador no pinta cuadros, el valor exacto llega igual por el respaldo', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  document.visibilityState = 'visible';
  globalThis.requestAnimationFrame = mock.fn();
  elementos.total.dataset.valor = '10';
  pintarKpis(elementos, K, { anioAnterior: null, variacion: null }, '');
  assert.ok(globalThis.requestAnimationFrame.mock.callCount() > 0, 'con movimiento permitido se anima');
  assert.notEqual(elementos.total.textContent, '96.452');
  mock.timers.tick(650);
  assert.equal(elementos.total.textContent, '96.452');
});
