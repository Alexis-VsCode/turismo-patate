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
import { filtrar, filtrosVacios } from '../../src/domain/filtros.js';
import { kpis, porCiudad, porPais, edadGenero } from '../../src/domain/estadisticas.js';

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

test('el paquete lleva los años y los motivos del catálogo y vuelven intactos', () => {
  assert.deepEqual(json.catalogo.anios, original.catalogo.anios);
  assert.ok(json.catalogo.anios.length > 0);
  assert.deepEqual(vuelta.catalogo.anios, original.catalogo.anios);
  assert.deepEqual(vuelta.catalogo.motivos, original.catalogo.motivos);
  assert.ok(vuelta.catalogo.motivos.length > 0);
});

test('un paquete anterior, sin años ni motivos en el catálogo, sigue siendo válido', () => {
  const viejo = JSON.parse(JSON.stringify(json));
  delete viejo.catalogo.anios;
  delete viejo.catalogo.motivos;
  const datos = desempaquetar(viejo, claveNormalizada);
  assert.deepEqual(datos.catalogo.anios, []);
  assert.deepEqual(datos.catalogo.motivos, []);
  assert.equal(datos.filas.length, original.filas.length);
});

test('los años alterados del catálogo se descartan: texto, decimales y fuera de rango', () => {
  const alterado = JSON.parse(JSON.stringify(json));
  alterado.catalogo.anios = [2027, '<script>', 2026.5, 1500, 2026, 2026];
  assert.deepEqual(desempaquetar(alterado, claveNormalizada).catalogo.anios, [2027, 2026]);
  alterado.catalogo.anios = 'no es una lista';
  assert.deepEqual(desempaquetar(alterado, claveNormalizada).catalogo.anios, []);
});

const REGISTROS = [
  { establecimiento: original.establecimientos[0], anio: 2026, mes: 2, pais: 'Ecuador', provincia: 'Tungurahua', ciudad: 'Ambato', motivo: original.catalogo.motivos[0], personas: 3, nacional: true },
  { establecimiento: original.establecimientos[1], anio: 2026, mes: 3, pais: 'Colombia', provincia: '', ciudad: '', motivo: original.catalogo.motivos[0], personas: 7, nacional: false },
];
const jsonConDiscapacidad = () => JSON.parse(JSON.stringify(empaquetar({ ...original, discapacidad: REGISTROS }, '2026-09-29T13:00:00.000Z', CONFIG.PAIS_LOCAL)));

test('la discapacidad viaja como filas de ocho números y vuelve con los mismos datos', () => {
  const paquete = jsonConDiscapacidad();
  assert.equal(paquete.discapacidad.length, 2);
  assert.ok(paquete.discapacidad.every((r) => r.length === 8 && r.every(Number.isFinite)));
  assert.deepEqual(desempaquetar(paquete, claveNormalizada).discapacidad, REGISTROS);
});

test('sin discapacidad el paquete lleva la lista vacía y las filas de visitantes no cambian', () => {
  assert.deepEqual(json.discapacidad, []);
  assert.deepEqual(vuelta.discapacidad, []);
  assert.ok(json.filas.every((r) => r.length === 10), 'el formato de las filas de visitantes no cambia');
});

test('un paquete anterior sin la clave de discapacidad sigue siendo válido', () => {
  const viejo = JSON.parse(JSON.stringify(json));
  delete viejo.discapacidad;
  assert.deepEqual(desempaquetar(viejo, claveNormalizada).discapacidad, []);
});

test('rechaza una discapacidad alterada: forma, índice o personas inválidas', () => {
  const alterar = (cambio) => { const p = jsonConDiscapacidad(); cambio(p); return p; };
  assert.throws(() => desempaquetar(alterar((p) => { p.discapacidad = 'x'; }), claveNormalizada), /Discapacidad no válida/);
  assert.throws(() => desempaquetar(alterar((p) => { p.discapacidad[0].pop(); }), claveNormalizada), /Fila de discapacidad no válida/);
  assert.throws(() => desempaquetar(alterar((p) => { p.discapacidad[0][3] = 9999; }), claveNormalizada), /Índice fuera de rango/);
  assert.throws(() => desempaquetar(alterar((p) => { p.discapacidad[0][7] = 0; }), claveNormalizada), /Valor fuera de rango/);
  assert.throws(() => desempaquetar(alterar((p) => { p.discapacidad[0][2] = 12; }), claveNormalizada), /Valor fuera de rango/);
});
