/**
 * @file construir-datos.test.mjs
 * @description Pruebas del constructor de datos que corre en cada publicación: la compuerta que solo admite la URL
 *   de la hoja publicada, la lectura de argumentos y una ejecución real con el libro de prueba, que también
 *   comprueba que un libro sin establecimientos sale con error sin tocar el `datos.json` anterior.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RAIZ, CATALOGO, libroEnMemoria } from '../helpers.mjs';
import { VERSION_PAQUETE } from '../../src/contrato/contrato-datos.js';
import { validarUrlHoja, leerArgumentos } from '../../tools/construir-datos.mjs';

const URL_BUENA = 'https://docs.google.com/spreadsheets/d/e/2PACX-falso/pub?output=xlsx';

/** Ejecuta el constructor como lo hace Actions, sin secreto real y sin escribir el resumen del job. */
function construir(args, env = {}) {
  return spawnSync(process.execPath, ['tools/construir-datos.mjs', ...args], {
    cwd: RAIZ, encoding: 'utf8', env: { ...process.env, SHEET_URL: '', GITHUB_STEP_SUMMARY: '', ...env },
  });
}

test('solo se acepta la URL de una hoja de Google publicada en xlsx', () => {
  assert.equal(validarUrlHoja(URL_BUENA), true);
});

test('se rechaza cualquier otra URL: http, otro host, otro formato, parámetros de más o vacía', () => {
  for (const url of [
    URL_BUENA.replace('https:', 'http:'),
    URL_BUENA.replace('docs.google.com', 'docs.google.com.evil.test'),
    'https://evil.test/spreadsheets/d/e/2PACX-falso/pub?output=xlsx',
    URL_BUENA.replace('output=xlsx', 'output=csv'),
    `${URL_BUENA}&gid=0`,
    'https://docs.google.com/spreadsheets/d/1abcDEF_ghi/export?format=xlsx',
    '',
    undefined,
  ]) {
    assert.equal(validarUrlHoja(url), false, String(url));
  }
});

test('sin argumentos la salida es datos/datos.json dentro del repositorio y el libro sale del secreto', () => {
  assert.deepEqual(leerArgumentos([]), { desdeArchivo: null, salida: join(RAIZ, 'datos/datos.json') });
  assert.equal(leerArgumentos(['sitio/datos/datos.json']).salida, join(RAIZ, 'sitio/datos/datos.json'));
});

test('una salida absoluta se respeta tal cual, en Windows y en Linux', () => {
  const absoluta = join(tmpdir(), 'turismo-patate', 'datos.json');
  assert.equal(leerArgumentos([absoluta]).salida, absoluta);
  assert.deepEqual(leerArgumentos(['--desde-archivo', 'libro.xlsx', absoluta]), { desdeArchivo: 'libro.xlsx', salida: absoluta });
});

test('--desde-archivo sin la ruta del libro es un error claro, no un intento de leer SHEET_URL', () => {
  assert.throws(() => leerArgumentos(['--desde-archivo']), /Falta la ruta del libro tras --desde-archivo/);
});

test('el constructor convierte el libro de prueba en un datos.json válido y lo registra', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'construir-datos-'));
  try {
    const salida = join(carpeta, 'datos.json');
    const r = construir(['--desde-archivo', 'test/fixtures/piloto-publicado.xlsx', salida]);
    assert.equal(r.status, 0, r.stderr);
    const paquete = JSON.parse(readFileSync(salida, 'utf8'));
    assert.equal(paquete.version, VERSION_PAQUETE);
    assert.equal(paquete.diccionarios.establecimientos.length, 100);
    assert.ok(paquete.filas.length > 0);
    assert.equal(existsSync(`${salida}.tmp`), false, 'no queda el archivo temporal');
    const evento = JSON.parse(r.stdout.trim().split('\n').at(-1));
    assert.equal(evento.evento, 'datos_construidos');
    assert.equal(evento.establecimientos, 100);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('un libro sin establecimientos sale con error y deja intacto el datos.json anterior', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'construir-datos-'));
  try {
    const libro = join(carpeta, 'vacio.xlsx');
    const salida = join(carpeta, 'datos.json');
    writeFileSync(libro, libroEnMemoria({ _Catalogos: CATALOGO }));
    writeFileSync(salida, '{"anterior":true}');
    const r = construir(['--desde-archivo', libro, salida]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /La hoja no tiene establecimientos válidos/);
    assert.equal(readFileSync(salida, 'utf8'), '{"anterior":true}');
    assert.equal(existsSync(`${salida}.tmp`), false);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
});

test('con una SHEET_URL ajena el constructor no descarga nada y sale con error', () => {
  const r = construir([join(tmpdir(), 'nunca-se-escribe.json')], { SHEET_URL: 'https://evil.test/hoja.xlsx' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /SHEET_URL ausente o con formato inesperado/);
  assert.equal(existsSync(join(tmpdir(), 'nunca-se-escribe.json')), false);
});
