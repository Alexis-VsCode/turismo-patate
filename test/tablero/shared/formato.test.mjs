/**
 * @file formato.test.mjs
 * @description Pruebas del formato compartido: separador de miles, porcentajes con coma decimal y texto
 *   de variación con signo.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numero, porcentaje, textoVariacion, fechaHora, hora, SIN_DATO } from '../../../src/tablero/shared/formato.js';
import { tiempoTranscurrido } from '../../../src/tablero/shared/textos.es.js';

test('numero usa el separador de miles de Ecuador y redondea', () => {
  assert.equal(numero(96452), '96.452');
  assert.equal(numero(0), '0');
  assert.equal(numero(null), '0');
  assert.equal(numero(1234.6), '1.235');
});

test('porcentaje usa una decimal con coma y «s/d» sin base', () => {
  assert.equal(porcentaje(0.821), '82,1%');
  assert.equal(porcentaje(1), '100,0%');
  assert.equal(porcentaje(0), '0,0%');
  assert.equal(porcentaje(null), SIN_DATO);
});

test('porcentaje redondea el medio hacia arriba a una decimal, sin el error de la coma flotante', () => {
  assert.equal(porcentaje(0.2875), '28,8%');
  assert.equal(porcentaje(0.0005), '0,1%');
  assert.equal(porcentaje(0.1235), '12,4%');
  assert.equal(porcentaje(0.9995), '100,0%');
  assert.equal(porcentaje(1), '100,0%');
  assert.equal(porcentaje(0.2874), '28,7%');
});

test('porcentaje redondea bien una fracción que arrastra el error de una resta, como 81/80 - 1', () => {
  assert.equal(porcentaje(81 / 80 - 1), '1,3%');
  assert.equal(textoVariacion(81 / 80 - 1), '+1,3%');
});

test('porcentaje de un negativo redondea el medio alejándose del cero, simétrico al positivo', () => {
  assert.equal(porcentaje(-0.2875), '-28,8%');
  assert.equal(porcentaje(-0.0004), '0,0%');
});

test('textoVariacion lleva signo y es null sin año anterior', () => {
  assert.equal(textoVariacion(0.119), '+11,9%');
  assert.equal(textoVariacion(-0.05), '−5,0%');
  assert.equal(textoVariacion(0), '0,0%');
  assert.equal(textoVariacion(null), null);
  assert.equal(textoVariacion(undefined), null);
});

test('fechaHora da día, mes, año y hora con segundos en hora de Ecuador, y «s/d» si no es válida', () => {
  assert.equal(fechaHora(Date.UTC(2026, 8, 29, 17, 31, 5)), '29/09/2026 12:31:05');
  assert.equal(fechaHora('2026-09-29T05:05:09Z'), '29/09/2026 00:05:09');
  assert.equal(fechaHora(null), SIN_DATO);
  assert.equal(fechaHora('no es fecha'), SIN_DATO);
});

test('tiempoTranscurrido usa minutos, horas y días y «s/d» sin dato', () => {
  assert.equal(tiempoTranscurrido(0), 'hace menos de 1 min');
  assert.equal(tiempoTranscurrido(7), 'hace 7 min');
  assert.equal(tiempoTranscurrido(60), 'hace 1 h');
  assert.equal(tiempoTranscurrido(135), 'hace 2 h 15 min');
  assert.equal(tiempoTranscurrido(60 * 24 * 3 + 30), 'hace 3 días');
  assert.equal(tiempoTranscurrido(60 * 24), 'hace 1 día');
  assert.equal(tiempoTranscurrido(null), SIN_DATO);
});

test('hora da solo hora y minutos en hora de Ecuador, y «s/d» si no es válida', () => {
  assert.equal(hora(Date.UTC(2026, 8, 29, 17, 31, 5)), '12:31');
  assert.equal(hora('2026-09-29T05:05:09Z'), '00:05');
  assert.equal(hora(null), SIN_DATO);
});
