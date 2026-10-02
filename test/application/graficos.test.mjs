/**
 * @file graficos.test.mjs
 * @description Pruebas de las opciones de ECharts que no dependen del DOM: leyendas sin años inventados cuando
 *   no hay datos y formato de porcentajes con coma decimal en la dona.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesEvolucion, opcionesDona, opcionesEdadGenero } from '../../src/application/components/presentational/graficos.presentational.js';
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

const edadGenero = {
  rangos: ['0-30', '31-45'],
  series: [{ genero: 'Masculino', valores: [1, 2] }, { genero: 'Femenino', valores: [3, 4] }],
};

test('el gráfico de edad nombra las series «Total mujeres» y «Total hombres» y pone a las mujeres primero', () => {
  const series = opcionesEdadGenero(edadGenero, colores, '').series;
  assert.deepEqual(series.map((s) => s.name), ['Total mujeres', 'Total hombres']);
  assert.deepEqual(series[0].data.map((d) => d.value), [3, 4]);
  assert.deepEqual(series[1].data.map((d) => d.value), [1, 2]);
});

test('un género que no es masculino ni femenino conserva su nombre y va al final', () => {
  const eg = { rangos: ['0-30'], series: [{ genero: 'Otro', valores: [5] }, ...edadGenero.series.map((s) => ({ ...s, valores: [1] }))] };
  assert.deepEqual(opcionesEdadGenero(eg, colores, '').series.map((s) => s.name), ['Total mujeres', 'Total hombres', 'Otro']);
});

test('el gráfico de edad resalta todos los rangos elegidos y atenúa los demás', () => {
  const eg = { rangos: ['0-30', '31-45', '46-60', '61+'], series: [{ genero: 'Femenino', valores: [1, 2, 3, 4] }] };
  const opacidades = (seleccion) => opcionesEdadGenero(eg, colores, seleccion).series[0].data.map((d) => d.itemStyle.opacity);
  assert.deepEqual(opacidades(['0-30', '46-60']), [1, 0.35, 1, 0.35]);
  assert.deepEqual(opacidades([]), [1, 1, 1, 1], 'sin selección ninguna barra se atenúa');
  assert.deepEqual(opacidades(''), [1, 1, 1, 1], 'un vacío del formato anterior tampoco atenúa');
});

test('la leyenda del gráfico de edad suma los totales de mujeres y de hombres con su porcentaje', () => {
  const o = opcionesEdadGenero(edadGenero, colores, '');
  assert.equal(o.legend.formatter('Total mujeres'), 'Total mujeres 7 (70,0%)');
  assert.equal(o.legend.formatter('Total hombres'), 'Total hombres 3 (30,0%)');
});

test('la leyenda no divide entre cero cuando no hay visitantes', () => {
  const eg = { rangos: ['0-30'], series: [{ genero: 'Femenino', valores: [0] }, { genero: 'Masculino', valores: [0] }] };
  assert.equal(opcionesEdadGenero(eg, colores, '').legend.formatter('Total mujeres'), 'Total mujeres 0 (—)');
});

test('un género sin visitantes que no es de mujeres ni de hombres no ocupa un lugar en la leyenda', () => {
  const sinOtro = { rangos: ['0-30'], series: [...edadGenero.series, { genero: 'Otro', valores: [0, 0] }] };
  assert.deepEqual(opcionesEdadGenero(sinOtro, colores, '').series.map((s) => s.name), ['Total mujeres', 'Total hombres']);
  const conOtro = { rangos: ['0-30'], series: [...edadGenero.series, { genero: 'Otro', valores: [2, 0] }] };
  assert.deepEqual(opcionesEdadGenero(conOtro, colores, '').series.map((s) => s.name), ['Total mujeres', 'Total hombres', 'Otro']);
});

test('mujeres y hombres siempre aparecen, aunque no tengan visitantes', () => {
  const vacio = { rangos: ['0-30'], series: [{ genero: 'Masculino', valores: [0] }, { genero: 'Femenino', valores: [0] }] };
  assert.deepEqual(opcionesEdadGenero(vacio, colores, '').series.map((s) => s.name), ['Total mujeres', 'Total hombres']);
});
