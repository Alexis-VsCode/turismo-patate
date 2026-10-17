/**
 * @file estadisticas.test.mjs
 * @description Dominio. T-Cálculos: los números del dashboard contra el oráculo independiente
 *   (tools/oraculo.py) sobre el libro publicado real, en todos los escenarios de
 *   test/fixtures/escenarios.json.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XLSX, leerFixture } from '../helpers.mjs';
import { ESCENARIOS, conciliarEscenario, leerJson } from '../conciliacion.mjs';
import { leerLibro } from '../../src/infrastructure/lector-libro.js';
import { CONFIG } from '../../src/infrastructure/config.js';
import { kpis, anioDeReferencia, evolucionMensual, variacionInteranual, resumenCarga } from '../../src/domain/estadisticas.js';
import { filtrar, filtrosVacios } from '../../src/domain/filtros.js';

const datos = leerLibro(leerFixture('test/fixtures/piloto-publicado.xlsx'), XLSX, CONFIG);
const esperado = leerJson('test/fixtures/esperado.json');

test('el libro publicado se lee completo y sin rechazos', () => {
  assert.equal(datos.establecimientos.length, 100);
  assert.equal(datos.rechazos.length, 0, JSON.stringify(datos.rechazos.slice(0, 3)));
  assert.equal(datos.catalogo.completo, true);
});

for (const { nombre, filtros } of ESCENARIOS) {
  test(`escenario ${nombre} concilia con el oráculo`, () => {
    conciliarEscenario(datos, filtros, esperado[nombre]);
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

test('resumenCarga cuenta filas de la hoja (mes, origen y motivo) y establecimientos con datos, no filas internas', () => {
  const base = { anio: 2026, mes: 0, pais: 'Ecuador', provincia: 'Tungurahua', ciudad: 'Ambato', motivo: 'Turismo' };
  const filas = [
    { ...base, establecimiento: 'A', edad: 0, genero: 'Femenino', cantidad: 3 },
    { ...base, establecimiento: 'A', edad: 31, genero: 'Masculino', cantidad: 2 },
    { ...base, establecimiento: 'A', motivo: 'Ocio', edad: 0, genero: 'Femenino', cantidad: 1 },
    { ...base, establecimiento: 'B', mes: 1, edad: 46, genero: 'Femenino', cantidad: 4 },
  ];
  assert.deepEqual(resumenCarga(filas, ['A', 'B', 'C']), {
    registros: 3, conDatos: 2, establecimientos: 3, desde: { anio: 2026, mes: 0 }, hasta: { anio: 2026, mes: 1 },
  });
  assert.deepEqual(resumenCarga([], ['A']), { registros: 0, conDatos: 0, establecimientos: 1, desde: null, hasta: null });
  const viejo = { ...base, establecimiento: 'C', anio: 2024, mes: 10, edad: 0, genero: 'Femenino', cantidad: 1 };
  assert.deepEqual(resumenCarga([...filas, viejo], ['A']).desde, { anio: 2024, mes: 10 });
});
