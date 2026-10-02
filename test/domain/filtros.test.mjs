/**
 * @file filtros.test.mjs
 * @description Dominio. Filtros de varias opciones: dentro de un filtro las opciones se suman (O) y entre filtros
 *   distintos se cruzan (Y); una lista vacía no restringe.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filtrar, filtrosVacios, valoresDeFiltro, alternarValor, quitarValor, copiarFiltros,
} from '../../src/domain/filtros.js';

const fila = (extra) => ({
  establecimiento: 'E1', anio: 2026, mes: 0, nacional: true, pais: 'Ecuador', provincia: 'Tungurahua', ciudad: 'Ambato',
  motivo: 'Turismo', rangoEdad: '0-30', genero: 'Femenino', cantidad: 1, ...extra,
});
const FILAS = [
  fila({}),
  fila({ motivo: 'Gastronomía' }),
  fila({ motivo: 'Descanso' }),
  fila({ nacional: false, pais: 'Colombia', provincia: '', ciudad: '' }),
  fila({ nacional: false, pais: 'Perú', provincia: '', ciudad: '', genero: 'Masculino' }),
  fila({ ciudad: 'Baños', genero: 'Masculino', establecimiento: 'E2' }),
];

test('el estado vacío usa listas para los filtros de varias opciones y null para año y mes', () => {
  assert.deepEqual(filtrosVacios(), {
    establecimiento: [], anio: null, mes: null, procedencia: [], motivo: [], rangoEdad: [], genero: [],
  });
});

test('sin filtros pasan todas las filas', () => {
  assert.equal(filtrar(FILAS, filtrosVacios()).length, FILAS.length);
});

test('varias opciones del mismo filtro se suman', () => {
  const sel = filtrar(FILAS, { ...filtrosVacios(), motivo: ['Turismo', 'Gastronomía'] });
  assert.equal(sel.length, 5);
  assert.ok(sel.every((f) => f.motivo !== 'Descanso'));
});

test('filtros distintos se cruzan', () => {
  const sel = filtrar(FILAS, { ...filtrosVacios(), motivo: ['Turismo', 'Gastronomía'], genero: ['Masculino'] });
  assert.deepEqual(sel.map((f) => `${f.pais}|${f.ciudad}`), ['Perú|', 'Ecuador|Baños']);
});

test('varios países y una ciudad a la vez', () => {
  const sel = filtrar(FILAS, { ...filtrosVacios(), procedencia: ['P:Colombia', 'P:Perú', 'C:Baños'] });
  assert.deepEqual(sel.map((f) => f.pais + (f.ciudad ? `/${f.ciudad}` : '')), ['Colombia', 'Perú', 'Ecuador/Baños']);
});

test('el atajo de nacionales se suma a un país', () => {
  const sel = filtrar(FILAS, { ...filtrosVacios(), procedencia: ['NAC', 'P:Colombia'] });
  assert.equal(sel.length, 5);
  assert.ok(!sel.some((f) => f.pais === 'Perú'));
});

test('varios establecimientos', () => {
  assert.equal(filtrar(FILAS, { ...filtrosVacios(), establecimiento: ['E2'] }).length, 1);
  assert.equal(filtrar(FILAS, { ...filtrosVacios(), establecimiento: ['E1', 'E2'] }).length, 6);
});

test('un valor suelto del formato anterior sigue funcionando', () => {
  assert.equal(filtrar(FILAS, { ...filtrosVacios(), motivo: 'Turismo' }).length, 4);
  assert.equal(filtrar(FILAS, { ...filtrosVacios(), motivo: '' }).length, FILAS.length);
});

test('año y mes siguen siendo de una sola opción y enero (0) es un valor válido', () => {
  assert.equal(filtrar(FILAS, { ...filtrosVacios(), anio: 2026, mes: 0 }).length, FILAS.length);
  assert.equal(filtrar(FILAS, { ...filtrosVacios(), mes: 1 }).length, 0);
});

test('las claves ignoradas no restringen', () => {
  const filtros = { ...filtrosVacios(), anio: 1999, motivo: ['Descanso'] };
  assert.equal(filtrar(FILAS, filtros, ['anio']).length, 1);
  assert.equal(filtrar(FILAS, filtros, ['anio', 'motivo']).length, FILAS.length);
});

test('valoresDeFiltro normaliza vacíos, valores sueltos y repetidos', () => {
  assert.deepEqual(valoresDeFiltro(''), []);
  assert.deepEqual(valoresDeFiltro(null), []);
  assert.deepEqual(valoresDeFiltro(undefined), []);
  assert.deepEqual(valoresDeFiltro('a'), ['a']);
  assert.deepEqual(valoresDeFiltro(['a', 'b', 'a']), ['a', 'b']);
});

test('alternarValor agrega o quita sin modificar la lista original', () => {
  const original = ['a'];
  assert.deepEqual(alternarValor(original, 'b'), ['a', 'b']);
  assert.deepEqual(alternarValor(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(original, ['a']);
});

test('quitarValor quita solo ese valor y no falla si no estaba', () => {
  assert.deepEqual(quitarValor(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(quitarValor(['a'], 'z'), ['a']);
});

test('copiarFiltros no comparte las listas con el original', () => {
  const original = { ...filtrosVacios(), motivo: ['Turismo'] };
  const copia = copiarFiltros(original);
  copia.motivo.push('Descanso');
  assert.deepEqual(original.motivo, ['Turismo']);
});
