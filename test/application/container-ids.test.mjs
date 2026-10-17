/**
 * @file container-ids.test.mjs
 * @description Container. Todo elemento que el container busca en la página existe en index.html: cada id que pide con
 *   `$('…')`, cada combo y cada clase que recorre con querySelector. Un id renombrado en el HTML deja el dashboard en
 *   blanco al montarlo, y ninguna otra prueba lo notaría. También fija que las pestañas del mapa del HTML son las
 *   mismas que nombra la lista «Top».
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';
import { TEXTOS } from '../../src/shared/textos.es.js';

const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const leer = (ruta) => readFileSync(join(RAIZ, 'src/application/components', ruta), 'utf8');
const CONTAINER = leer('tablero.container.js');

const idsDelHtml = new Set([...HTML.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const clasesDelHtml = new Set([...HTML.matchAll(/\sclass="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));

/** Ids que el container pide a la página: los de `$('…')` y los de los combos de varias opciones. */
function idsDelContainer() {
  const directos = [...CONTAINER.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]);
  const combos = [...CONTAINER.matchAll(/'(combo-[\w-]+)'/g)].map((m) => m[1]);
  return [...new Set([...directos, ...combos])];
}

test('cada id que busca el container existe en index.html', () => {
  const ids = idsDelContainer();
  assert.ok(ids.length >= 40, `se esperaban al menos 40 ids y se leyeron ${ids.length}`);
  assert.deepEqual(ids.filter((id) => !idsDelHtml.has(id)), []);
});

test('cada clase que recorren el container y el panel de filtros existe en index.html', () => {
  const codigo = CONTAINER + leer('compartidos/panel-filtros.js');
  const clases = [...new Set([...codigo.matchAll(/querySelector(?:All)?\('\.([\w-]+)'\)/g)].map((m) => m[1]))];
  assert.ok(clases.length >= 3, 'no se encontraron las clases buscadas');
  assert.deepEqual(clases.filter((c) => !clasesDelHtml.has(c)), []);
});

test('las pestañas del mapa del HTML son las mismas que nombra la lista «Top»', () => {
  const vistas = [...HTML.matchAll(/data-vista="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(vistas, Object.keys(TEXTOS.topVista));
});

test('la lectura de ids reconoce los dos estilos del container', () => {
  assert.ok(idsDelContainer().includes('btn-actualizar'));
  assert.ok(idsDelContainer().includes('combo-procedencia'));
});
