/**
 * @file mensual.test.mjs
 * @description Dominio. Formato mensual de pestaña: el libro de prueba generado por tools/excel/generar-excel.py,
 *   leído con el lector del proyecto, concilia con el oráculo independiente (tools/oraculo.py) en todos los
 *   escenarios de test/fixtures/escenarios.json, incluida la discapacidad.
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
  kpis, anioDeReferencia, evolucionMensual, porMotivo, porCiudad, porProvincia, porPais, edadGenero, variacionInteranual,
} from '../../src/domain/estadisticas.js';
import { filtrar, filtrosVacios } from '../../src/domain/filtros.js';
import { resumenDiscapacidad } from '../../src/domain/discapacidad.js';

const datos = leerLibro(leerFixture('test/fixtures/piloto-mensual.xlsx'), XLSX, CONFIG);
const escenarios = JSON.parse(readFileSync(join(RAIZ, 'test/fixtures/escenarios.json'), 'utf8'));
const esperado = JSON.parse(readFileSync(join(RAIZ, 'test/fixtures/esperado-mensual.json'), 'utf8'));

test('el libro mensual se lee completo, sin rechazos ni avisos y con discapacidad', () => {
  assert.equal(datos.establecimientos.length, 14);
  assert.equal(datos.rechazos.length, 0, JSON.stringify(datos.rechazos.slice(0, 3)));
  assert.equal(datos.avisos.length, 0, JSON.stringify(datos.avisos.slice(0, 3)));
  assert.ok(datos.discapacidad.length > 0);
  assert.equal(datos.catalogo.completo, true);
});

test('los catálogos completos entran enteros: más de 200 ciudades y más de 190 países', () => {
  assert.ok(datos.catalogo.ciudades.size >= 237);
  assert.ok(datos.catalogo.coordPaises.size >= 195);
  assert.ok(datos.catalogo.motivos.includes('Ocio'));
});

for (const { nombre, filtros: parciales } of escenarios) {
  test(`escenario ${nombre} del formato mensual concilia con el oráculo`, () => {
    const filtros = { ...filtrosVacios(), ...parciales };
    const sel = filtrar(datos.filas, filtros);
    const e = esperado[nombre];
    const k = kpis(sel);
    assert.deepEqual({ total: k.total, nacionales: k.nacionales, extranjeros: k.extranjeros }, e.kpis);
    const baseEvo = filtrar(datos.filas, filtros, ['anio', 'mes']);
    const evo = evolucionMensual(baseEvo, anioDeReferencia(baseEvo, filtros.anio));
    assert.deepEqual(evo.actual, e.evolucion.actual);
    assert.deepEqual(evo.anterior, e.evolucion.anterior);
    const v = variacionInteranual(datos.filas, filtros);
    assert.deepEqual({ anio: v.anio, actual: v.actual, anterior: v.anterior }, e.variacion);
    assert.deepEqual(porMotivo(sel), e.porMotivo);
    assert.deepEqual(porCiudad(sel), e.porCiudad);
    assert.deepEqual(porProvincia(sel), e.porProvincia);
    assert.deepEqual(porPais(sel), e.porPais);
    assert.deepEqual(edadGenero(sel, ['Masculino', 'Femenino']).series, e.edadGenero);

    const sinPerfil = ['rangoEdad', 'genero'];
    const visitantes = kpis(filtrar(datos.filas, filtros, sinPerfil)).total;
    const d = resumenDiscapacidad(filtrar(datos.discapacidad, filtros, sinPerfil), visitantes);
    assert.equal(d.personas, e.discapacidad.personas);
    assert.equal(d.registros, e.discapacidad.registros);
    assert.equal(d.pctVisitantes, e.discapacidad.pctVisitantes);
    for (const [rango, registros] of Object.entries(e.discapacidad.rangos)) {
      assert.equal(d.rangos.find((r) => r.rango === rango)?.registros ?? 0, registros, `rango ${rango}`);
    }
  });
}

test('cada fila interna del libro mensual cae en el rango que dice su edad base', () => {
  for (const f of datos.filas) assert.ok([0, 31, 46, 61].includes(f.edad), `edad base ${f.edad}`);
});
