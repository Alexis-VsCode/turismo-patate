/**
 * T-Seguridad: contenido hostil en la hoja, contaminación de prototipos y descarga acotada.
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XLSX, ENCABEZADO, CATALOGO, RAIZ, libroEnMemoria } from '../helpers.mjs';
import { leerLibro } from '../../src/infrastructure/lector-libro.js';
import { sumaPor } from '../../src/domain/estadisticas.js';
import { descargarAcotado } from '../../src/infrastructure/seguridad.js';
import { limpiarTexto } from '../../src/domain/texto.js';
import { CONFIG } from '../../src/infrastructure/config.js';

test('nombres de pestaña y celdas con HTML llegan como texto literal', () => {
  const hostil = '<img src=x onerror=alert(1)>';
  const buf = libroEnMemoria({
    _Catalogos: [...CATALOGO, [null, null, null, null, null, null, null, null, null, null, '<script>alert(2)</script>', null]],
    [hostil.slice(0, 31)]: [ENCABEZADO, [2025, 'Enero', 'Ecuador', '', 'Quito', 1, '<script>alert(2)</script>', 30, 'Masculino']],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.establecimientos[0], hostil.slice(0, 31));
  assert.equal(d.filas[0].motivo, '<script>alert(2)</script>');
});

test('claves __proto__ y constructor no contaminan Object.prototype', () => {
  const filas = ['__proto__', 'constructor', 'prototype', 'Turismo'].map((m) => ({ motivo: m, cantidad: 5 }));
  const suma = sumaPor(filas, (f) => f.motivo);
  assert.deepEqual([...suma.keys()], ['Turismo']);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'cantidad'), false);
});

test('limpiarTexto quita caracteres de control y acota el largo', () => {
  assert.equal(limpiarTexto('  Ambato\u0000\u200b  '), 'Ambato');
  assert.equal(limpiarTexto('x'.repeat(500)).length, 120);
  assert.equal(limpiarTexto(null), '');
});

function respuestaSimulada({ bytes, trozo = 1024, retardoMs = 0, contentLength }) {
  let enviados = 0;
  const body = new ReadableStream({
    async pull(control) {
      if (retardoMs) await new Promise((r) => setTimeout(r, retardoMs));
      if (enviados >= bytes) return control.close();
      const n = Math.min(trozo, bytes - enviados);
      enviados += n;
      control.enqueue(new Uint8Array(n));
    },
  });
  return { ok: true, status: 200, headers: new Headers(contentLength ? { 'content-length': String(contentLength) } : {}), body };
}

test('corta una respuesta que supera el tope aunque no declare Content-Length', async () => {
  const fetchImpl = async () => respuestaSimulada({ bytes: 5000, trozo: 1000 });
  await assert.rejects(descargarAcotado('x', { timeoutMs: 5000, maxBytes: 2500, fetchImpl }), (e) => e.codigo === 'DEMASIADO_GRANDE');
});

test('rechaza por Content-Length declarado antes de leer', async () => {
  const fetchImpl = async () => respuestaSimulada({ bytes: 10, contentLength: 99999999 });
  await assert.rejects(descargarAcotado('x', { timeoutMs: 5000, maxBytes: 1000, fetchImpl }), (e) => e.codigo === 'DEMASIADO_GRANDE');
});

test('corta por tiempo una respuesta lenta', async () => {
  const fetchImpl = (url, { signal }) => new Promise((_, rechazar) => signal.addEventListener('abort', () => rechazar(new Error('abortado'))));
  await assert.rejects(descargarAcotado('x', { timeoutMs: 50, maxBytes: 1000, fetchImpl }), (e) => e.codigo === 'TIEMPO_AGOTADO');
});

test('descarga normal devuelve el buffer completo', async () => {
  const fetchImpl = async () => respuestaSimulada({ bytes: 3000, trozo: 700 });
  const buf = await descargarAcotado('x', { timeoutMs: 5000, maxBytes: 10000, fetchImpl });
  assert.equal(buf.byteLength, 3000);
});

test('ningún módulo de src/ usa innerHTML, outerHTML, insertAdjacentHTML, eval ni new Function', () => {
  const prohibido = /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b|\beval\s*\(|new\s+Function\s*\(/;
  const archivos = readdirSync(join(RAIZ, 'src'), { recursive: true }).filter((a) => a.endsWith('.js'));
  assert.ok(archivos.length >= 15, 'no se encontraron los módulos de src/');
  for (const archivo of archivos) {
    const codigo = readFileSync(join(RAIZ, 'src', archivo), 'utf8');
    assert.equal(prohibido.test(codigo), false, `${archivo} usa una API prohibida`);
  }
});
