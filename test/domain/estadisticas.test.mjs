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
  kpis, anioDeReferencia, evolucionMensual,
  porMotivo, porCiudad, porProvincia, porPais, edadGenero, variacionInteranual,
} from '../../src/domain/estadisticas.js';
import { filtrar, filtrosVacios } from '../../src/domain/filtros.js';

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

    const v = variacionInteranual(datos.filas, filtros);
    assert.deepEqual({ anio: v.anio, actual: v.actual, anterior: v.anterior }, e.variacion);
    assert.equal(v.variacion, e.variacion.anterior ? (e.variacion.actual - e.variacion.anterior) / e.variacion.anterior : null);
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

test('variación sin datos del año anterior es null, nunca infinito', () => {
  const filas = [{ anio: 2026, mes: 0, cantidad: 5, establecimiento: 'x', nacional: true, motivo: 'm', rangoEdad: '18-25', genero: 'F', procedencia: '' }];
  const v = variacionInteranual(filas, filtrosVacios());
  assert.equal(v.actual, 5);
  assert.equal(v.anterior, 0);
  assert.equal(v.variacion, null);
});

test('evolución sin año de referencia devuelve series vacías y no inventa años', () => {
  const evo = evolucionMensual([], anioDeReferencia([], null));
  assert.equal(evo.anio, null);
  assert.equal(evo.anioAnterior, null);
  assert.deepEqual(evo.actual, Array(12).fill(null));
  assert.deepEqual(evo.anterior, Array(12).fill(0));
});

test('un establecimiento sin filas produce la misma evolución vacía', () => {
  const filtros = { ...filtrosVacios(), establecimiento: 'No existe' };
  const base = filtrar(datos.filas, filtros, ['anio', 'mes']);
  const evo = evolucionMensual(base, anioDeReferencia(base, filtros.anio));
  assert.equal(evo.anio, null);
  assert.equal(evo.anioAnterior, null);
});
