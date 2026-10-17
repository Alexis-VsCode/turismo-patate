/**
 * @file servir.test.mjs
 * @description Pruebas del servidor local de desarrollo: nunca sirve archivos fuera del repositorio, responde 400 a
 *   una URL mal codificada sin caerse, y todo lo que sirve va sin caché.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';
import { resolverPeticion, crearServidor } from '../../tools/servir.mjs';

/** Pide una ruta tal cual, sin que el cliente la normalice; si el servidor no contesta en 2 s, falla. */
function pedir(puerto, ruta) {
  return new Promise((resolver, rechazar) => {
    const peticion = request({ host: '127.0.0.1', port: puerto, path: ruta, timeout: 2000 }, (r) => {
      r.resume();
      r.on('end', () => resolver({ estado: r.statusCode, cache: r.headers['cache-control'] }));
    });
    peticion.on('timeout', () => peticion.destroy(new Error(`sin respuesta a ${ruta}`)));
    peticion.on('error', rechazar).end();
  });
}

test('la raíz sirve index.html y cualquier otra ruta se resuelve dentro del repositorio', () => {
  assert.deepEqual(resolverPeticion(RAIZ, '/'), { estado: 200, archivo: join(RAIZ, 'index.html') });
  assert.deepEqual(resolverPeticion(RAIZ, '/css/tema.css?v=1'), { estado: 200, archivo: join(RAIZ, 'css', 'tema.css') });
});

test('una ruta que intenta salir del repositorio es un 403', () => {
  assert.deepEqual(resolverPeticion(RAIZ, '/..%2f..%2fsecreto.txt'), { estado: 403 });
  assert.deepEqual(resolverPeticion(RAIZ, '/..%5c..%5csecreto.txt').estado, process.platform === 'win32' ? 403 : 200);
});

test('una URL mal codificada es un 400, no una excepción', () => {
  assert.deepEqual(resolverPeticion(RAIZ, '/%'), { estado: 400 });
  assert.deepEqual(resolverPeticion(RAIZ, '/%E0%A4%A'), { estado: 400 });
});

test('el servidor responde 400 a una URL mal codificada y sigue sirviendo, siempre sin caché', { timeout: 10000 }, async () => {
  const servidor = crearServidor(RAIZ);
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const { port } = servidor.address();
  try {
    assert.equal((await pedir(port, '/%')).estado, 400);
    assert.equal((await pedir(port, '/..%2f..%2fsecreto.txt')).estado, 403);
    assert.deepEqual(await pedir(port, '/index.html'), { estado: 200, cache: 'no-store' });
    assert.deepEqual(await pedir(port, '/no-existe.js'), { estado: 404, cache: 'no-store' });
  } finally {
    servidor.closeAllConnections();
    await new Promise((cerrado) => servidor.close(cerrado));
  }
});
