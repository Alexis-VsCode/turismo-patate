/**
 * @file contrato-datos.test.mjs
 * @description Infraestructura. T-Paquete: datos.json conserva exactamente los números (ida y vuelta contra el
 *   oráculo) y el navegador rechaza un paquete alterado.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XLSX, RAIZ, leerFixture } from '../helpers.mjs';
import { leerLibro } from '../../src/infrastructure/lector-libro.js';
import { empaquetar, desempaquetar } from '../../src/infrastructure/contrato-datos.js';
import { claveNormalizada } from '../../src/domain/catalogo.js';
import { CONFIG } from '../../src/infrastructure/config.js';
import { filtrar, filtrosVacios, kpis, porCiudad, porPais, edadGenero } from '../../src/domain/estadisticas.js';

const original = leerLibro(leerFixture('test/fixtures/piloto-publicado.xlsx'), XLSX, CONFIG);
const json = JSON.parse(JSON.stringify(empaquetar(original, '2026-09-29T13:00:00.000Z', CONFIG.PAIS_LOCAL)));
const vuelta = desempaquetar(json, claveNormalizada);
const esperado = JSON.parse(readFileSync(join(RAIZ, 'test/fixtures/esperado.json'), 'utf8'));
const escenarios = JSON.parse(readFileSync(join(RAIZ, 'test/fixtures/escenarios.json'), 'utf8'));

test('el paquete no incluye la URL de la hoja', () => {
  assert.equal(JSON.stringify(json).includes('docs.google.com'), false);
  assert.equal(JSON.stringify(json).includes('googleusercontent'), false);
});

test('ida y vuelta: mismas filas, establecimientos y catálogo del mapa', () => {
  assert.equal(vuelta.filas.length, original.filas.length);
  assert.deepEqual(vuelta.establecimientos, original.establecimientos);
  assert.equal(vuelta.catalogo.ciudades.size, original.catalogo.ciudades.size);
  assert.equal(vuelta.generadoEn, '2026-09-29T13:00:00.000Z');
});

for (const { nombre, filtros } of escenarios) {
  test(`escenario ${nombre} concilia con el oráculo después del paquete`, () => {
    const sel = filtrar(vuelta.filas, { ...filtrosVacios(), ...filtros });
    const k = kpis(sel);
    assert.deepEqual({ total: k.total, nacionales: k.nacionales, extranjeros: k.extranjeros }, esperado[nombre].kpis);
    assert.deepEqual(porCiudad(sel), esperado[nombre].porCiudad);
    assert.deepEqual(porPais(sel), esperado[nombre].porPais);
    assert.deepEqual(edadGenero(sel, ['Masculino', 'Femenino']).series, esperado[nombre].edadGenero);
  });
}

test('rechaza un paquete alterado: índice fuera de rango, tipo inválido o versión desconocida', () => {
  const copia = () => JSON.parse(JSON.stringify(json));
  const a = copia(); a.filas[0][3] = 9999;
  assert.throws(() => desempaquetar(a, claveNormalizada), /Índice fuera de rango/);
  const b = copia(); b.filas[0][6] = '<script>';
  assert.throws(() => desempaquetar(b, claveNormalizada), /Fila no válida/);
  const c = copia(); c.version = 99;
  assert.throws(() => desempaquetar(c, claveNormalizada), /Paquete/);
});
