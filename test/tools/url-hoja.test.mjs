/**
 * @file url-hoja.test.mjs
 * @description Pruebas de la regla «la URL de la hoja nunca se versiona»: ningún archivo del repositorio escribe el
 *   identificador de una hoja de Google, y la herramienta de catálogos lee el enlace de una variable de entorno.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

/** Un identificador real de Google Sheets (de edición o publicado) tiene decenas de caracteres. */
const ID_DE_HOJA = /docs\.google\.com\/spreadsheets\/d\/(?:e\/)?[\w-]{25,}/;
const BINARIOS = /\.(png|jpg|jpeg|gif|webp|ico|xlsx|pdf)$/i;

/** Archivos versionados o nuevos que git no ignora: lo que llegaría a un commit. */
function archivosDelRepositorio() {
  const r = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: RAIZ, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || String(r.error));
  return r.stdout.split('\n').filter((ruta) => ruta && !BINARIOS.test(ruta));
}

test('ningún archivo del repositorio escribe el identificador de una hoja de Google', () => {
  const archivos = archivosDelRepositorio();
  assert.ok(archivos.length > 50, `se esperaban más de 50 archivos de texto y hay ${archivos.length}`);
  const conId = archivos.filter((ruta) => {
    try {
      return ID_DE_HOJA.test(readFileSync(join(RAIZ, ruta), 'utf8'));
    } catch {
      return false;
    }
  });
  assert.deepEqual(conId, []);
});

test('la foto base de catálogos no guarda de qué enlace se descargó', () => {
  const foto = JSON.parse(readFileSync(join(RAIZ, 'tools/catalogos/base-actual-2026-10-01.json'), 'utf8'));
  assert.doesNotMatch(foto.fuente, /https?:|docs\.google/);
});

test('la herramienta de catálogos toma el enlace de la hoja de la variable HOJA_CATALOGOS_URL', () => {
  const codigo = readFileSync(join(RAIZ, 'tools/catalogos/generar-catalogos.py'), 'utf8');
  assert.match(codigo, /os\.environ\.get\("HOJA_CATALOGOS_URL"/);
});
