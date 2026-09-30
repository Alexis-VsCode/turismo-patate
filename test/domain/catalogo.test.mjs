/**
 * @file catalogo.test.mjs
 * @description Dominio. El catálogo de `_Catalogos` transporta los años que la hoja ofrece en sus desplegables,
 *   aunque todavía no tengan visitantes: enteros válidos, sin duplicados y de mayor a menor.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirCatalogo } from '../../src/domain/catalogo.js';

const ENC = ['Año', 'País', 'Ciudad', 'Ciudad_Lat', 'Ciudad_Lon', 'Motivo'];
const con = (anios) => construirCatalogo([ENC, ...anios.map((a) => [a, 'Ecuador', 'Ambato', -1.2, -78.6, 'Turismo'])]);

test('los años del catálogo salen ordenados de mayor a menor', () => {
  assert.deepEqual(con([2024, 2025, 2026, 2027, 2028]).anios, [2028, 2027, 2026, 2025, 2024]);
});

test('los años repetidos y los que llegan como texto numérico se unifican', () => {
  assert.deepEqual(con([2025, 2025, '2026', ' 2027 ']).anios, [2027, 2026, 2025]);
});

test('el texto basura y los años fuera de 2000 a 2100 se descartan', () => {
  assert.deepEqual(con(['dos mil', null, 1999, 2101, 2025.5, 2026]).anios, [2026]);
});

test('sin columna Año o sin catálogo, la lista de años queda vacía', () => {
  assert.deepEqual(construirCatalogo([['País', 'Ciudad'], ['Ecuador', 'Ambato']]).anios, []);
  assert.deepEqual(construirCatalogo(null).anios, []);
});

const ENC_C = ['País', 'Ciudad', 'Ciudad_Lat', 'Ciudad_Lon', 'Provincia', 'Ciudad_Provincia', 'Motivo'];
const ciudades = (...filas) => construirCatalogo([ENC_C, ...filas.map(([c, p, lat, lon]) => ['Ecuador', c, lat, lon, null, p, 'Turismo'])]);
const conProvincias = (filasCiudad, provincias) => construirCatalogo([
  ENC_C,
  ...filasCiudad.map(([c, p, lat, lon]) => ['Ecuador', c, lat, lon, null, p, 'Turismo']),
  ...provincias.map((p) => [null, null, null, null, p, null, null]),
]);

test('un catálogo limpio no genera avisos', () => {
  const cat = conProvincias([['Ambato', 'Tungurahua', -1.24, -78.62]], ['Tungurahua']);
  assert.deepEqual(cat.avisos, []);
});

test('una ciudad repetida, aunque cambien tildes o mayúsculas, conserva la primera y avisa', () => {
  const cat = conProvincias([['Baños', 'Tungurahua', -1.39, -78.42], ['BANOS', 'Tungurahua', -9, -9]], ['Tungurahua']);
  assert.equal(cat.ciudades.size, 1);
  assert.equal(cat.ciudades.get('banos').lat, -1.39);
  assert.ok(cat.avisos.some((a) => /repetida/i.test(a) && a.includes('BANOS')));
});

test('una ciudad con coordenadas fuera de Ecuador se omite y avisa', () => {
  const cat = conProvincias([['Madrid', 'Tungurahua', 40.4, -3.7], ['Ambato', 'Tungurahua', -1.24, -78.62]], ['Tungurahua']);
  assert.equal(cat.ciudades.has('madrid'), false);
  assert.equal(cat.ciudades.has('ambato'), true);
  assert.ok(cat.avisos.some((a) => /fuera de Ecuador/i.test(a) && a.includes('Madrid')));
});

test('una ciudad cuya provincia no está en la lista se conserva y avisa', () => {
  const cat = conProvincias([['Ambato', 'Tungurahuaa', -1.24, -78.62]], ['Tungurahua']);
  assert.equal(cat.ciudades.has('ambato'), true);
  assert.ok(cat.avisos.some((a) => /provincia/i.test(a) && a.includes('Tungurahuaa')));
});

test('sin lista de provincias no se exige provincia a las ciudades', () => {
  assert.deepEqual(ciudades(['Ambato', 'Tungurahua', -1.24, -78.62]).avisos, []);
});

test('cada límite de Ecuador se comprueba por separado, en los cuatro lados', () => {
  const fuera = [['Norte', 3, -78], ['Sur', -7, -78], ['Este', -1, -70], ['Oeste', -1, -95]];
  const cat = conProvincias([...fuera.map(([n, lat, lon]) => [n, 'Tungurahua', lat, lon]), ['Dentro', 'Tungurahua', -1, -78]], ['Tungurahua']);
  assert.deepEqual([...cat.ciudades.keys()], ['dentro']);
  assert.equal(cat.avisos.filter((a) => /fuera de Ecuador/i.test(a)).length, 4);
});
