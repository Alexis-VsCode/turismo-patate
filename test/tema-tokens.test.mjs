/**
 * @file tema-tokens.test.mjs
 * @description Protege el tema: todo `var(--token)` de la hoja de estilos y todo token que lee `coloresDelTema()`
 *   debe estar definido. Un token ausente hace que ECharts caiga en su paleta por defecto (azul) sin dar error.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './helpers.mjs';

const CSS = readFileSync(join(RAIZ, 'css/tema.css'), 'utf8');
const CONTAINER = readFileSync(join(RAIZ, 'src/application/components/tablero.container.js'), 'utf8');

// Además de los tokens de la hoja, valen las variables que el código fija en cada elemento con setProperty
const SRC = join(RAIZ, 'src');
const enTiempoDeEjecucion = readdirSync(SRC, { recursive: true })
  .filter((a) => a.endsWith('.js'))
  .flatMap((a) => [...readFileSync(join(SRC, a), 'utf8').matchAll(/setProperty\('(--[a-z0-9-]+)'/g)].map((m) => m[1]));
const definidos = new Set([...CSS.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]).concat(enTiempoDeEjecucion));

test('todo var(--token) de tema.css está definido', () => {
  const usados = [...CSS.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
  assert.ok(usados.length > 40, 'no se encontraron usos de tokens');
  const faltan = [...new Set(usados)].filter((t) => !definidos.has(t));
  assert.deepEqual(faltan, []);
});

test('todo token que lee coloresDelTema() está definido en tema.css', () => {
  const leidos = [...CONTAINER.matchAll(/v\('(--[a-z0-9-]+)'\)/g)].map((m) => m[1]);
  assert.ok(leidos.length >= 10, 'no se encontraron lecturas de tokens');
  const faltan = leidos.filter((t) => !definidos.has(t));
  assert.deepEqual(faltan, []);
});

test('los tokens que cambian con el tema están también en el bloque oscuro', () => {
  const oscuro = CSS.slice(CSS.indexOf(':root[data-theme="dark"]'), CSS.indexOf('/* ============ Base'));
  for (const token of ['--fondo', '--superficie', '--texto', '--texto-suave', '--borde', '--verde-texto', '--mapa-fondo']) {
    assert.ok(oscuro.includes(`${token}:`), `${token} falta en el bloque oscuro`);
  }
});
