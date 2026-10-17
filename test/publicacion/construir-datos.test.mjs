/**
 * @file construir-datos.test.mjs
 * @description Publicación. El caso de uso con puertos en memoria: empaqueta lo que lee y lo entrega al destino una sola
 *   vez, no escribe nada si la fuente falla o si no hay establecimientos, y la fuente de Google reintenta un fallo
 *   pasajero avisando cada reintento.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XLSX, leerFixture } from '../helpers.mjs';
import { VERSION_PAQUETE } from '../../src/contrato/contrato-datos.js';
import { construirDatos } from '../../src/publicacion/aplicacion/construir-datos.js';
import { crearLectorXlsx } from '../../src/publicacion/adaptadores/lector-xlsx.js';
import { crearFuenteHojaGoogle } from '../../src/publicacion/adaptadores/hoja-google.js';
import { CONFIG_PUBLICACION } from '../../src/publicacion/config-publicacion.js';

const AHORA = () => new Date('2026-10-17T12:00:00.000Z');

/** Destino en memoria que guarda cada texto recibido. */
function destinoEnMemoria() {
  const escritos = [];
  return { escritos, escribir: (texto) => escritos.push(texto) };
}

test('el caso de uso empaqueta el libro de prueba, lo escribe una vez y devuelve solo cuentas', async () => {
  const destino = destinoEnMemoria();
  const cuentas = await construirDatos({
    fuente: { obtener: async () => leerFixture('test/fixtures/piloto-publicado.xlsx') },
    lector: crearLectorXlsx(XLSX, CONFIG_PUBLICACION),
    destino,
    config: CONFIG_PUBLICACION,
    ahora: AHORA,
  });
  assert.equal(destino.escritos.length, 1);
  const paquete = JSON.parse(destino.escritos[0]);
  assert.equal(paquete.version, VERSION_PAQUETE);
  assert.equal(paquete.generadoEn, '2026-10-17T12:00:00.000Z');
  assert.equal(paquete.paisLocal, CONFIG_PUBLICACION.PAIS_LOCAL);
  assert.equal(cuentas.establecimientos, 100);
  assert.equal(cuentas.filas, paquete.filas.length);
  assert.equal(cuentas.bytes, Buffer.byteLength(destino.escritos[0]));
  assert.deepEqual(Object.keys(cuentas), ['establecimientos', 'filas', 'discapacidad', 'rechazos', 'avisos', 'bytes']);
});

test('sin establecimientos válidos el caso de uso falla y no escribe nada', async () => {
  const destino = destinoEnMemoria();
  const vacio = { filas: [], discapacidad: [], rechazos: [], avisos: [], establecimientos: [], catalogo: {} };
  await assert.rejects(
    construirDatos({ fuente: { obtener: async () => new Uint8Array() }, lector: { leer: () => vacio }, destino, config: CONFIG_PUBLICACION }),
    /La hoja no tiene establecimientos válidos/,
  );
  assert.deepEqual(destino.escritos, []);
});

test('si la fuente falla el error llega tal cual y el destino no se toca', async () => {
  const destino = destinoEnMemoria();
  const error = new Error('sin red');
  let leido = false;
  await assert.rejects(
    construirDatos({ fuente: { obtener: async () => { throw error; } }, lector: { leer: () => { leido = true; } }, destino, config: CONFIG_PUBLICACION }),
    (e) => e === error,
  );
  assert.equal(leido, false);
  assert.deepEqual(destino.escritos, []);
});

test('la fuente de Google reintenta un 503, avisa el reintento y entrega los bytes', async () => {
  let llamadas = 0;
  const fetchImpl = async () => {
    llamadas += 1;
    if (llamadas === 1) return { ok: false, status: 503, headers: new Headers() };
    return { ok: true, status: 200, headers: new Headers(), body: new Blob([new Uint8Array([1, 2, 3])]).stream() };
  };
  const reintentos = [];
  const esperas = [];
  const fuente = crearFuenteHojaGoogle('x', { timeoutMs: 5000, maxBytes: 100, fetchImpl }, {
    alReintentar: (intento, e) => reintentos.push([intento, e.codigo, e.detalle]),
    esperar: async (ms) => { esperas.push(ms); },
  });
  assert.deepEqual([...await fuente.obtener()], [1, 2, 3]);
  assert.deepEqual(reintentos, [[1, 'HTTP', '503']]);
  assert.deepEqual(esperas, [2000]);
});
