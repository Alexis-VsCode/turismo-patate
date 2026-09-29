/**
 * @file motivos.test.mjs
 * @description Pruebas de la preparación de filas del panel «Motivo de visita»: porcentaje sobre el total,
 *   ancho relativo al mayor, tono por posición y elección del ícono sin depender del DOM.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararFilasMotivo, claveIconoMotivo } from '../../src/application/components/presentational/motivos.presentational.js';

test('cada fila trae porcentaje del total, ancho relativo al mayor y su rango', () => {
  const filas = prepararFilasMotivo([{ nombre: 'Turismo', valor: 60 }, { nombre: 'Gastronomía', valor: 30 }, { nombre: 'Evento', valor: 10 }]);
  assert.deepEqual(filas.map((f) => f.rango), [0, 1, 2]);
  assert.deepEqual(filas.map((f) => f.ancho), [1, 0.5, 10 / 60]);
  assert.deepEqual(filas.map((f) => f.pct), [0.6, 0.3, 0.1]);
});

test('sin motivos o con total cero no divide entre cero', () => {
  assert.deepEqual(prepararFilasMotivo([]), []);
  const [fila] = prepararFilasMotivo([{ nombre: 'Turismo', valor: 0 }]);
  assert.equal(fila.pct, null);
  assert.equal(fila.ancho, 0);
});

test('el rango de tono se detiene en el último escalón aunque haya muchos motivos', () => {
  const lista = Array.from({ length: 9 }, (_, i) => ({ nombre: `M${i}`, valor: 100 - i }));
  assert.equal(Math.max(...prepararFilasMotivo(lista).map((f) => f.rango)), 5);
});

test('el ícono se elige por el nombre sin tildes ni mayúsculas y hay uno genérico de respaldo', () => {
  assert.equal(claveIconoMotivo('Gastronomía'), 'gastronomia');
  assert.equal(claveIconoMotivo('  VISITA familiar '), 'visita familiar');
  assert.equal(claveIconoMotivo('Turismo'), 'turismo');
  assert.equal(claveIconoMotivo('Motivo nuevo de la hoja'), 'generico');
});
