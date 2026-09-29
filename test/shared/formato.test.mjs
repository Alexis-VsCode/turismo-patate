/**
 * @file formato.test.mjs
 * @description Pruebas del formato compartido: separador de miles, porcentajes con coma decimal y texto
 *   de variación con signo.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numero, porcentaje, textoVariacion } from '../../src/shared/formato.js';

test('numero usa el separador de miles de Ecuador y redondea', () => {
  assert.equal(numero(96452), '96.452');
  assert.equal(numero(0), '0');
  assert.equal(numero(null), '0');
  assert.equal(numero(1234.6), '1.235');
});

test('porcentaje usa una decimal con coma y «—» sin base', () => {
  assert.equal(porcentaje(0.821), '82,1%');
  assert.equal(porcentaje(1), '100,0%');
  assert.equal(porcentaje(0), '0,0%');
  assert.equal(porcentaje(null), '—');
});

test('textoVariacion lleva signo y es null sin año anterior', () => {
  assert.equal(textoVariacion(0.119), '+11,9%');
  assert.equal(textoVariacion(-0.05), '−5,0%');
  assert.equal(textoVariacion(0), '0,0%');
  assert.equal(textoVariacion(null), null);
  assert.equal(textoVariacion(undefined), null);
});
