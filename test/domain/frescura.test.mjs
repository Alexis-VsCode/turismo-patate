/**
 * @file frescura.test.mjs
 * @description Pruebas de la frescura de los datos: categorías, límites exactos y valores no confiables
 *   (vacío, inválido o en el futuro).
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoFrescura } from '../../src/domain/frescura.js';

const MIN = 60 * 1000;
const AHORA = Date.UTC(2026, 8, 29, 18, 0, 0);
const UMBRALES = { alDiaMin: 20, retrasadoMin: 60 };
const hace = (min) => new Date(AHORA - min * MIN).toISOString();

test('menos del primer umbral es «alDia» y devuelve los minutos transcurridos', () => {
  assert.deepEqual(estadoFrescura(hace(3), AHORA, UMBRALES), { estado: 'alDia', minutos: 3 });
  assert.deepEqual(estadoFrescura(hace(0), AHORA, UMBRALES), { estado: 'alDia', minutos: 0 });
});

test('los límites exactos pertenecen a la categoría más sana', () => {
  assert.equal(estadoFrescura(hace(20), AHORA, UMBRALES).estado, 'alDia');
  assert.equal(estadoFrescura(hace(21), AHORA, UMBRALES).estado, 'retrasado');
  assert.equal(estadoFrescura(hace(60), AHORA, UMBRALES).estado, 'retrasado');
  assert.equal(estadoFrescura(hace(61), AHORA, UMBRALES).estado, 'vencido');
});

test('los minutos se redondean hacia abajo', () => {
  assert.equal(estadoFrescura(new Date(AHORA - 5.9 * MIN).toISOString(), AHORA, UMBRALES).minutos, 5);
});

test('fecha vacía, inválida o ausente es «desconocido»', () => {
  for (const valor of [null, undefined, '', 'no es fecha']) {
    assert.deepEqual(estadoFrescura(valor, AHORA, UMBRALES), { estado: 'desconocido', minutos: null });
  }
});

test('una fecha en el futuro por reloj desajustado no se presenta como «al día»', () => {
  assert.deepEqual(estadoFrescura(hace(-10), AHORA, UMBRALES), { estado: 'desconocido', minutos: null });
});

test('un adelanto de hasta 2 minutos del reloj del visitante se tolera como «alDia» con 0 minutos', () => {
  assert.deepEqual(estadoFrescura(hace(-2), AHORA, UMBRALES), { estado: 'alDia', minutos: 0 });
  assert.equal(estadoFrescura(hace(-3), AHORA, UMBRALES).estado, 'desconocido');
});
