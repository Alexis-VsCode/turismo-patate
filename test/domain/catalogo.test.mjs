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
