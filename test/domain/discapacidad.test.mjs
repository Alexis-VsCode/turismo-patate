/**
 * @file discapacidad.test.mjs
 * @description Dominio. Personas con discapacidad: el rango de cada fila (1-5, 6-10, 11-15 y 16 o más), la suma de
 *   personas y el porcentaje sobre los visitantes.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RANGOS_DISCAPACIDAD, rangoDeDiscapacidad, resumenDiscapacidad } from '../../src/domain/discapacidad.js';

test('los rangos de discapacidad son 1-5, 6-10, 11-15 y 16+', () => {
  assert.deepEqual([...RANGOS_DISCAPACIDAD], ['1-5', '6-10', '11-15', '16+']);
});

test('cada borde cae en un solo rango', () => {
  const esperado = [[1, '1-5'], [5, '1-5'], [6, '6-10'], [10, '6-10'], [11, '11-15'], [15, '11-15'], [16, '16+'], [900, '16+']];
  for (const [personas, rango] of esperado) assert.equal(rangoDeDiscapacidad(personas), rango, `${personas} personas`);
});

const registros = (...personas) => personas.map((n) => ({ personas: n }));

test('suma las personas, cuenta las filas por rango y calcula el porcentaje sobre los visitantes', () => {
  const r = resumenDiscapacidad(registros(3, 7, 4, 12), 100);
  assert.equal(r.personas, 26);
  assert.equal(r.registros, 4);
  assert.equal(r.pctVisitantes, 0.26);
  assert.deepEqual(r.rangos.map((x) => [x.rango, x.registros, x.pct]), [['1-5', 2, 0.5], ['6-10', 1, 0.25], ['11-15', 1, 0.25]]);
});

test('el rango 16+ solo aparece cuando hay filas en él', () => {
  assert.equal(resumenDiscapacidad(registros(3), 10).rangos.length, 3);
  const r = resumenDiscapacidad(registros(3, 20), 100);
  assert.deepEqual(r.rangos.map((x) => x.rango), ['1-5', '6-10', '11-15', '16+']);
  assert.equal(r.personas, 23);
});

test('sin filas las cifras son cero y los porcentajes son null, nunca NaN', () => {
  const r = resumenDiscapacidad([], 50);
  assert.equal(r.personas, 0);
  assert.equal(r.registros, 0);
  assert.equal(r.pctVisitantes, 0);
  assert.ok(r.rangos.every((x) => x.registros === 0 && x.pct === null));
});

test('sin visitantes el porcentaje sobre los visitantes es null', () => {
  assert.equal(resumenDiscapacidad(registros(3), 0).pctVisitantes, null);
});
