/**
 * @file discapacidad.test.mjs
 * @description Presentacional. Preparación de las filas del panel «Personas con discapacidad»: ancho relativo al
 *   mayor, porcentaje y textos, sin depender del DOM.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararFilasDiscapacidad } from '../../src/application/components/presentational/discapacidad.presentational.js';
import { TEXTOS } from '../../src/shared/textos.es.js';

const resumen = {
  personas: 26, registros: 4, pctVisitantes: 0.26,
  rangos: [{ rango: '1-5', registros: 2, pct: 0.5 }, { rango: '6-10', registros: 1, pct: 0.25 }, { rango: '11-15', registros: 1, pct: 0.25 }],
};

test('cada fila trae su etiqueta, su porcentaje y su ancho relativo al rango mayor', () => {
  const filas = prepararFilasDiscapacidad(resumen);
  assert.deepEqual(filas.map((f) => f.etiqueta), ['1 a 5 personas', '6 a 10 personas', '11 a 15 personas']);
  assert.deepEqual(filas.map((f) => f.pct), [0.5, 0.25, 0.25]);
  assert.deepEqual(filas.map((f) => f.ancho), [1, 0.5, 0.5]);
});

test('el rango abierto se llama «16 o más personas»', () => {
  const filas = prepararFilasDiscapacidad({ ...resumen, rangos: [{ rango: '16+', registros: 1, pct: 1 }] });
  assert.equal(filas[0].etiqueta, '16 o más personas');
});

test('sin registros no divide entre cero y todos los anchos son cero', () => {
  const vacio = { personas: 0, registros: 0, pctVisitantes: 0, rangos: resumen.rangos.map((r) => ({ ...r, registros: 0, pct: null })) };
  const filas = prepararFilasDiscapacidad(vacio);
  assert.ok(filas.every((f) => f.ancho === 0 && f.pct === null));
});

test('los textos del panel concuerdan en singular y plural', () => {
  assert.equal(TEXTOS.personasConDiscapacidad(1), '1 persona');
  assert.equal(TEXTOS.personasConDiscapacidad(412), '412 personas');
  assert.equal(TEXTOS.discapacidadDeVisitantes('2,2%'), '2,2% de los visitantes');
});
