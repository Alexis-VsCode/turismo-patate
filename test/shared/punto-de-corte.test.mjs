/**
 * @file punto-de-corte.test.mjs
 * @description Compartido. El ancho desde el que el panel de filtros queda fijo a la izquierda está en dos lugares, el CSS y
 *   el componente que lo convierte en panel deslizable; una prueba vigila que digan lo mismo.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const css = readFileSync(join(RAIZ, 'css/tema.css'), 'utf8');
const panel = readFileSync(join(RAIZ, 'src/application/components/compartidos/panel-filtros.js'), 'utf8');

test('el panel de filtros pasa a ser deslizable por debajo del mismo ancho en el CSS y en el componente', () => {
  const desdeCss = /@media \(max-width: (\d+)px\) \{\s*\.tablero \{ grid-template-columns: minmax\(0, 1fr\); \}/.exec(css);
  const desdeJs = /matchMedia\('\(min-width: (\d+)px\)'\)/.exec(panel);
  assert.ok(desdeCss, 'bloque de pantallas angostas del CSS');
  assert.ok(desdeJs, 'consulta de ancho del componente');
  assert.equal(Number(desdeJs[1]), Number(desdeCss[1]) + 1);
});

test('el panel de filtros sigue a la izquierda hasta los 860 px', () => {
  assert.match(css, /@media \(max-width: 859px\) \{\s*\.tablero \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(panel, /min-width: 860px/);
});

test('entre 860 y 1279 px la columna de filtros se conserva y es más angosta', () => {
  assert.match(css, /@media \(min-width: 860px\) and \(max-width: 1279px\) \{[^}]*\.tablero \{ grid-template-columns: 230px minmax\(0, 1fr\) minmax\(0, 1fr\); \}/);
});
