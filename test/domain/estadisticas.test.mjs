/**
 * @file estadisticas.test.mjs
 * @description Dominio. T-Cálculos: los números del dashboard contra el oráculo independiente
 *   (tools/oraculo.py) sobre el libro publicado real, en todos los escenarios de
 *   test/fixtures/escenarios.json.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XLSX, RAIZ, leerFixture } from '../helpers.mjs';
import { leerLibro } from '../../src/infrastructure/lector-libro.js';
import { CONFIG } from '../../src/infrastructure/config.js';
import {
  filtrar, filtrosVacios, kpis, anioDeReferencia, evolucionMensual,
  porMotivo, porCiudad, porProvincia, porPais, edadGenero,
} from '../../src/domain/estadisticas.js';

const datos = leerLibro(leerFixture('test/fixtures/piloto-publicado.xlsx'), XLSX, CONFIG);
const escenarios = JSON.parse(readFileSync(join(RAIZ, 'test/fixtures/escenarios.json'), 'utf8'));
const esperado = JSON.parse(readFileSync(join(RAIZ, 'test/fixtures/esperado.json'), 'utf8'));

test('el libro publicado se lee completo y sin rechazos', () => {
  assert.equal(datos.establecimientos.length, 100);
  assert.equal(datos.rechazos.length, 0, JSON.stringify(datos.rechazos.slice(0, 3)));
  assert.equal(datos.catalogo.completo, true);
});

for (const { nombre, filtros: parciales } of escenarios) {
  test(`escenario ${nombre} concilia con el oráculo`, () => {
    const filtros = { ...filtrosVacios(), ...parciales };
    const sel = filtrar(datos.filas, filtros);
    const e = esperado[nombre];
    const k = kpis(sel);
    assert.deepEqual({ total: k.total, nacionales: k.nacionales, extranjeros: k.extranjeros }, e.kpis);
    if (k.total) assert.ok(Math.abs(k.pctNacionales + k.pctExtranjeros - 1) < 1e-9);

    const baseEvo = filtrar(datos.filas, filtros, ['anio', 'mes']);
    const evo = evolucionMensual(baseEvo, anioDeReferencia(baseEvo, filtros.anio));
    assert.equal(evo.anio, e.evolucion.anio);
    assert.deepEqual(evo.actual, e.evolucion.actual);
    assert.deepEqual(evo.anterior, e.evolucion.anterior);

    assert.deepEqual(porMotivo(sel), e.porMotivo);
    assert.deepEqual(porCiudad(sel), e.porCiudad);
    assert.deepEqual(porProvincia(sel), e.porProvincia);
    assert.deepEqual(porPais(sel), e.porPais);
    assert.deepEqual(edadGenero(sel, ['Masculino', 'Femenino']).series, e.edadGenero);
  });
}

test('sin visitantes los porcentajes son null, nunca NaN ni infinito', () => {
  const k = kpis([]);
  assert.equal(k.total, 0);
  assert.equal(k.pctNacionales, null);
  assert.equal(k.pctExtranjeros, null);
});
