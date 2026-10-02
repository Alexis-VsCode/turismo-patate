/**
 * @file visitante.test.mjs
 * @description Dominio. Rangos de edad: cada borde cae en un solo rango y no hay edades sin rango.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RANGOS_EDAD, rangoDeEdad } from '../../src/domain/visitante.js';

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
