/**
 * @file limites.test.mjs
 * @description Dominio e infraestructura. Los límites de validación (años de 2000 a 2100, edad hasta 110, cantidad
 *   hasta 100.000 y los nombres de los dos géneros del catálogo) son los mismos en la lectura de la hoja, el enlace
 *   compartido y el contrato de datos.json, y se escriben una sola vez, en catalogo.js.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, CATALOGO, ENCABEZADO } from '../helpers.mjs';
import { construirCatalogo, mapearEncabezados, claveNormalizada } from '../../src/domain/catalogo.js';
import { normalizarFila, normalizarFilaMensual } from '../../src/domain/visitante.js';
import { textoAFiltros } from '../../src/domain/enlace.js';
import { desempaquetar } from '../../src/contrato/contrato-datos.js';

const catalogo = construirCatalogo(CATALOGO);
const { indices } = mapearEncabezados(ENCABEZADO);
const fila = ({ anio = 2025, cantidad = 1, edad = 30 } = {}) => normalizarFila(
  [anio, 'Enero', 'Ecuador', 'Tungurahua', 'Ambato', cantidad, 'Turismo', edad, 'Masculino'], indices, catalogo, 'Ecuador',
);
const ENCABEZADO_MENSUAL = ['Año', 'Mes', 'País', 'Provincia', 'Ciudad', 'Motivo de visita',
  'Mujeres 0-30', 'Mujeres 31-45', 'Mujeres 46-60', 'Mujeres 61+', 'Hombres 0-30', 'Hombres 31-45', 'Hombres 46-60', 'Hombres 61+'];
const indicesMensual = mapearEncabezados(ENCABEZADO_MENSUAL).indices;
const filaMensual = (mujeres) => normalizarFilaMensual(
  [2025, 'Enero', 'Ecuador', 'Tungurahua', 'Ambato', 'Turismo', mujeres, 0, 0, 0, 0, 0, 0, 0], indicesMensual, catalogo, 'Ecuador',
);

/** Paquete mínimo de datos.json con una fila y los años de catálogo dados. */
const paquete = ({ edad = 30, mes = 0, anios = [] } = {}) => ({
  version: 1,
  generadoEn: '2026-09-30T10:00:00.000Z',
  paisLocal: 'Ecuador',
  diccionarios: { establecimientos: ['Hostal'], paises: ['Ecuador'], provincias: [''], ciudades: [''], motivos: ['Turismo'], generos: ['Masculino'] },
  filas: [[0, 2025, mes, 0, 0, 0, 2, 0, edad, 0]],
  catalogo: { anios },
  rechazos: [],
  avisos: [],
});

test('la hoja acepta años de 2000 a 2100 y rechaza los de fuera', () => {
  assert.deepEqual([1999, 2000, 2100, 2101].map((anio) => fila({ anio }).ok), [false, true, true, false]);
});

test('la hoja acepta una cantidad de hasta 100.000 visitantes por fila y una edad de hasta 110', () => {
  assert.deepEqual([100000, 100001].map((cantidad) => fila({ cantidad }).ok), [true, false]);
  assert.deepEqual([110, 111].map((edad) => fila({ edad }).ok), [true, false]);
  assert.deepEqual([100000, 100001].map((n) => filaMensual(n).ok), [true, false], 'el formato mensual usa el mismo tope');
});

test('el catálogo, el enlace y el contrato de datos usan el mismo rango de años', () => {
  const filas = [CATALOGO[0], ...[1999, 2000, 2100, 2101].map((a) => [a, ...CATALOGO[1].slice(1)])];
  assert.deepEqual(construirCatalogo(filas).anios, [2100, 2000]);
  assert.deepEqual([1999, 2000, 2100, 2101].map((a) => textoAFiltros(`a=${a}`).anio), [null, 2000, 2100, null]);
  assert.deepEqual(desempaquetar(paquete({ anios: [1999, 2000, 2100, 2101] }), claveNormalizada).catalogo.anios, [2100, 2000]);
});

test('el enlace y el contrato de datos aceptan los doce meses y la edad hasta 110', () => {
  assert.deepEqual([11, 12].map((m) => textoAFiltros(`m=${m}`).mes), [11, null]);
  assert.equal(desempaquetar(paquete({ mes: 11 }), claveNormalizada).filas.length, 1);
  assert.throws(() => desempaquetar(paquete({ mes: 12 }), claveNormalizada), /Valor fuera de rango/);
  assert.equal(desempaquetar(paquete({ edad: 110 }), claveNormalizada).filas.length, 1);
  assert.throws(() => desempaquetar(paquete({ edad: 111 }), claveNormalizada), /Valor fuera de rango/);
});

/** Archivos .js de una carpeta de src/, con su ruta relativa a src/ escrita con barras normales. */
const archivosDe = (carpeta) => readdirSync(join(RAIZ, 'src', carpeta), { recursive: true })
  .filter((a) => a.endsWith('.js'))
  .map((a) => `${carpeta}/${a.split('\\').join('/')}`);

/** Literales que solo puede escribir catalogo.js, y excepciones con otro significado (milisegundos de espera). */
const LIMITES = ['2000', '2100', '110', '100000'];
const OTRO_SIGNIFICADO = new Map([['publicacion/adaptadores/hoja-google.js', new Set(['2000'])]]);

test('los límites de validación se escriben una sola vez, en catalogo.js', () => {
  const mal = [];
  for (const archivo of [...archivosDe('domain'), ...archivosDe('contrato'), ...archivosDe('publicacion'), ...archivosDe('tablero/infrastructure')]) {
    if (archivo === 'domain/catalogo.js') continue;
    const codigo = readFileSync(join(RAIZ, 'src', archivo), 'utf8');
    for (const literal of LIMITES) {
      if (OTRO_SIGNIFICADO.get(archivo)?.has(literal)) continue;
      if (new RegExp(`(?<![\\w.])${literal}(?![\\w.])`).test(codigo)) mal.push(`${archivo}: ${literal}`);
    }
  }
  assert.deepEqual(mal, []);
});

test('los nombres de los géneros del catálogo solo se escriben en catalogo.js', () => {
  const mal = [];
  for (const archivo of readdirSync(join(RAIZ, 'src'), { recursive: true }).filter((a) => a.endsWith('.js'))) {
    const ruta = archivo.split('\\').join('/');
    if (ruta === 'domain/catalogo.js') continue;
    const codigo = readFileSync(join(RAIZ, 'src', archivo), 'utf8');
    for (const genero of ['Femenino', 'Masculino']) if (codigo.includes(`'${genero}'`)) mal.push(`${ruta}: ${genero}`);
  }
  assert.deepEqual(mal, []);
});
