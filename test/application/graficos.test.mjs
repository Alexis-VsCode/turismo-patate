/**
 * @file graficos.test.mjs
 * @description Pruebas de las opciones de ECharts que no dependen del DOM: leyendas sin años inventados cuando
 *   no hay datos y formato de porcentajes con coma decimal en la dona.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesEvolucion, opcionesDona } from '../../src/application/components/presentational/graficos.presentational.js';
import { TEXTOS } from '../../src/shared/textos.es.js';

const colores = {
  verde: '#0a0', lima: '#8c4', amarillo: '#ee3', oliva: '#780', texto: '#111', rejilla: '#ddd', superficie: '#fff',
};

test('la evolución sin año no muestra «null» ni «-1» en la leyenda', () => {
  const evo = { anio: null, anioAnterior: null, actual: Array(12).fill(null), anterior: Array(12).fill(0) };
  const nombres = opcionesEvolucion(evo, colores, null).series.map((s) => s.name);
  assert.equal(nombres.length, 3);
  for (const nombre of nombres) assert.doesNotMatch(String(nombre), /null|undefined|-1/);
});

test('el subtítulo de la evolución dice «Sin datos» cuando no hay año', () => {
  assert.equal(TEXTOS.subtituloEvolucion(null, null), TEXTOS.sinDatosCorto);
  assert.equal(TEXTOS.subtituloEvolucion(2026, 2025), '2026 vs 2025 · por mes');
});

test('la dona usa coma decimal en la etiqueta y en el tooltip', () => {
  const dona = opcionesDona({ nacionales: 635, extranjeros: 365 }, colores);
  const etiqueta = dona.series[0].label.formatter;
  assert.equal(etiqueta({ percent: 63.5 }), '63,5%');
  assert.equal(etiqueta({ percent: 2 }), '');
  assert.equal(dona.tooltip.formatter({ name: 'Nacionales', value: 1000, percent: 63.5 }), 'Nacionales: 1.000 (63,5%)');
});

test('la dona muestra el total y el periodo al centro y no repite la leyenda', () => {
  const dona = opcionesDona({ total: 96452, nacionales: 79216, extranjeros: 17236 }, colores, 'Visitantes 2025');
  assert.equal(dona.title.text, '96.452');
  assert.equal(dona.title.subtext, 'Visitantes 2025');
  assert.equal(dona.legend, undefined);
});
