/**
 * @file repositorio-datos.test.mjs
 * @description Infraestructura. El repositorio pide datos.json con un parámetro anti-caché, lo valida al
 *   desempaquetarlo y propaga los errores de descarga con su código.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerDatos, obtenerLimites } from '../../../src/tablero/infrastructure/repositorio-datos.js';

const respuestaJson = (objeto, ok = true, status = 200) => {
  const bytes = new TextEncoder().encode(JSON.stringify(objeto));
  let leido = false;
  return {
    ok,
    status,
    headers: { get: () => String(bytes.byteLength) },
    body: {
      getReader: () => ({
        read: async () => {
          if (leido) return { done: true };
          leido = true;
          return { done: false, value: bytes };
        },
      }),
    },
  };
};

const paqueteMinimo = {
  version: 1,
  generadoEn: '2026-09-30T10:00:00.000Z',
  paisLocal: 'Ecuador',
  diccionarios: { establecimientos: ['Hostal'], paises: ['Ecuador'], provincias: [''], ciudades: [''], motivos: ['Turismo'], generos: ['Masculino'] },
  filas: [[0, 2025, 0, 0, 0, 0, 2, 0, 30, 0]],
  catalogo: {},
  rechazos: [],
  avisos: [],
};

const opciones = (fetchImpl, ahora = () => 1234) => ({ url: 'datos/datos.json', timeoutMs: 1000, maxBytes: 100000, ahora, fetchImpl });

test('la petición lleva el parámetro anti-caché con la hora inyectada', async () => {
  let pedida;
  await obtenerDatos(opciones(async (url) => { pedida = url; return respuestaJson(paqueteMinimo); }));
  assert.equal(pedida, 'datos/datos.json?t=1234');
});

test('un paquete válido se reconstruye con sus filas y la fecha de publicación', async () => {
  const datos = await obtenerDatos(opciones(async () => respuestaJson(paqueteMinimo)));
  assert.equal(datos.filas.length, 1);
  assert.equal(datos.generadoEn, '2026-09-30T10:00:00.000Z');
});

test('un paquete con la versión equivocada se rechaza entero', async () => {
  await assert.rejects(obtenerDatos(opciones(async () => respuestaJson({ ...paqueteMinimo, version: 99 }))), /Paquete de datos no válido/);
});

test('un error HTTP llega con su código para que la interfaz lo traduzca', async () => {
  await assert.rejects(obtenerDatos(opciones(async () => respuestaJson({}, false, 503))), (e) => e.codigo === 'HTTP');
});

const GEOJSON = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { nombre: 'Tungurahua' }, geometry: null }] };

test('los límites del mapa se descargan anónimos, con la caché del navegador y sin parámetro anti-caché', async () => {
  const pedidas = [];
  const geojson = await obtenerLimites({
    url: 'assets/ecu-provincias.geojson', timeoutMs: 1000, maxBytes: 100000,
    fetchImpl: async (url, opciones) => { pedidas.push([url, opciones.cache, opciones.credentials]); return respuestaJson(GEOJSON); },
  });
  assert.deepEqual(geojson, GEOJSON);
  assert.deepEqual(pedidas, [['assets/ecu-provincias.geojson', 'default', 'omit']]);
});

test('unos límites que no llegan bien rechazan la promesa, para que el mapa muestre «Sin datos»', async () => {
  const opciones = (fetchImpl) => ({ url: 'assets/ecu-provincias.geojson', timeoutMs: 1000, maxBytes: 100000, fetchImpl });
  await assert.rejects(obtenerLimites(opciones(async () => respuestaJson({}, false, 404))), (e) => e.codigo === 'HTTP');
  await assert.rejects(obtenerLimites({ ...opciones(async () => respuestaJson(GEOJSON)), maxBytes: 10 }), (e) => e.codigo === 'DEMASIADO_GRANDE');
  const noEsJson = { ...respuestaJson({}), body: { getReader: () => ({ read: async () => ({ done: true }) }) }, headers: { get: () => null } };
  await assert.rejects(obtenerLimites(opciones(async () => noEsJson)), SyntaxError);
});
