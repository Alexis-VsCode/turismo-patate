/**
 * @file visitante.test.mjs
 * @description Dominio. Rangos de edad: cada borde cae en un solo rango y no hay edades sin rango.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RANGOS_EDAD, EDAD_BASE_RANGO, rangoDeEdad, normalizarFilaMensual } from '../../src/domain/visitante.js';
import { construirCatalogo } from '../../src/domain/catalogo.js';
import { CATALOGO } from '../helpers.mjs';

test('los rangos de edad son 0-30, 31-45, 46-60 y 61+', () => {
  assert.deepEqual([...RANGOS_EDAD], ['0-30', '31-45', '46-60', '61+']);
});

test('cada borde de edad cae en un solo rango', () => {
  const esperado = [
    [0, '0-30'], [30, '0-30'], [31, '31-45'], [45, '31-45'],
    [46, '46-60'], [60, '46-60'], [61, '61+'], [110, '61+'],
  ];
  for (const [edad, rango] of esperado) assert.equal(rangoDeEdad(edad), rango, `edad ${edad}`);
});

test('todas las edades válidas tienen rango y respetan el orden', () => {
  let anterior = 0;
  for (let edad = 0; edad <= 110; edad += 1) {
    const indice = RANGOS_EDAD.indexOf(rangoDeEdad(edad));
    assert.ok(indice >= anterior, `la edad ${edad} retrocede de rango`);
    anterior = indice;
  }
});

test('la edad base de cada rango cae dentro de su propio rango', () => {
  EDAD_BASE_RANGO.forEach((edad, i) => assert.equal(rangoDeEdad(edad), RANGOS_EDAD[i]));
});

const INDICES = {
  anio: 0, mes: 1, pais: 2, provincia: 3, ciudad: 4, motivo: 5,
  mujeres0: 6, mujeres1: 7, mujeres2: 8, mujeres3: 9, hombres0: 10, hombres1: 11, hombres2: 12, hombres3: 13, discapacidad: 14,
};
const catalogo = construirCatalogo(CATALOGO);
const mensual = (...v) => normalizarFilaMensual(v, INDICES, catalogo, 'Ecuador');

test('una fila mensual se expande en una fila interna por cada número mayor que cero', () => {
  const r = mensual(2026, 'Marzo', 'Ecuador', '', 'Ambato', 'Turismo', 2, 2, 1, 1, 1, 2, 1, 0, 2);
  assert.equal(r.ok, true);
  assert.equal(r.filas.length, 7);
  assert.equal(r.filas.reduce((suma, f) => suma + f.cantidad, 0), 10);
  const mujeres = r.filas.filter((f) => f.genero === 'Femenino');
  assert.deepEqual(mujeres.map((f) => [f.rangoEdad, f.cantidad]), [['0-30', 2], ['31-45', 2], ['46-60', 1], ['61+', 1]]);
  const hombres = r.filas.filter((f) => f.genero === 'Masculino');
  assert.deepEqual(hombres.map((f) => [f.rangoEdad, f.cantidad]), [['0-30', 1], ['31-45', 2], ['46-60', 1]]);
  for (const f of r.filas) {
    assert.equal(f.rangoEdad, rangoDeEdad(f.edad));
    assert.deepEqual([f.anio, f.mes, f.pais, f.ciudad, f.provincia, f.motivo, f.nacional], [2026, 2, 'Ecuador', 'Ambato', 'Tungurahua', 'Turismo', true]);
  }
});

test('la discapacidad sale aparte, con el mismo origen y motivo de la fila', () => {
  const r = mensual(2026, 'Marzo', 'Colombia', '', '', 'Turismo', 3, 0, 0, 0, 2, 0, 0, 0, 4);
  assert.equal(r.ok, true);
  assert.deepEqual(r.discapacidad, {
    anio: 2026, mes: 2, pais: 'Colombia', provincia: '', ciudad: '', motivo: 'Turismo', personas: 4, nacional: false,
  });
});

test('las celdas en blanco cuentan como cero y una fila sin ningún número se ignora', () => {
  const vacia = mensual(2026, 'Abril', '', '', '', '', null, null, null, null, '', '', '', '', null);
  assert.deepEqual(vacia, { ok: true, filas: [], discapacidad: null });
  const parcial = mensual(2026, 'Abril', 'Ecuador', '', 'Ambato', 'Turismo', null, 5, '', '', '', '', '', '', '');
  assert.equal(parcial.ok, true);
  assert.deepEqual(parcial.filas.map((f) => [f.genero, f.rangoEdad, f.cantidad]), [['Femenino', '31-45', 5]]);
  assert.equal(parcial.discapacidad, null);
});

test('rechaza números negativos, decimales y texto diciendo qué columna es', () => {
  for (const [valor, texto] of [[-1, '-1'], [1.5, '1.5'], ['abc', 'abc']]) {
    const r = mensual(2026, 'Marzo', 'Ecuador', '', 'Ambato', 'Turismo', valor, 0, 0, 0, 0, 0, 0, 0, 0);
    assert.equal(r.ok, false);
    assert.match(r.motivo, /Mujeres 0-30/);
    assert.ok(r.motivo.includes(texto), r.motivo);
  }
});

test('rechaza discapacidad mayor que el total de visitantes de la fila', () => {
  const r = mensual(2026, 'Abril', 'Ecuador', '', 'Latacunga', 'Descanso', 3, 4, 2, 1, 2, 3, 1, 0, 19);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /19/);
  assert.match(r.motivo, /16/);
  assert.equal(mensual(2026, 'Abril', 'Ecuador', '', 'Latacunga', 'Descanso', 0, 0, 0, 0, 0, 0, 0, 0, 1).ok, false);
});

test('reutiliza las reglas de período, origen y motivo', () => {
  const base = [2026, 'Marzo', 'Ecuador', '', 'Ambato', 'Turismo', 1, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.match(mensual(...base.map((v, i) => (i === 0 ? 'x' : v))).motivo, /Año no válido/);
  assert.match(mensual(...base.map((v, i) => (i === 1 ? 'Marzoo' : v))).motivo, /Mes no válido/);
  assert.match(mensual(...base.map((v, i) => (i === 2 ? 'Narnia' : v))).motivo, /País fuera del catálogo/);
  assert.match(mensual(...base.map((v, i) => (i === 4 ? 'Mordor' : v))).motivo, /Ciudad fuera del catálogo/);
  assert.match(mensual(...base.map((v, i) => (i === 5 ? 'Magia' : v))).motivo, /Motivo fuera del catálogo/);
});
