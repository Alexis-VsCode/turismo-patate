/**
 * @file sin-azul.test.mjs
 * @description Protege la paleta verde y amarillo: ningún color azul (hex, rgb, hsl o nombre) en los estilos, el
 *   HTML ni el código, salvo la bandera de Ecuador y los colores oficiales de LinkedIn y Facebook.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './helpers.mjs';

const PERMITIDOS = new Map([
  ['index.html', new Set(['#034ea2'])],
  ['css/tema.css', new Set(['#0a66c2', '#1877f2'])],
]);
const NOMBRES = /(?<![\w-])(blue|navy|azure|cyan|teal|indigo|royalblue|dodgerblue|skyblue|steelblue|deepskyblue|cornflowerblue|midnightblue)(?![\w-])/;

/** True si el color cae entre cian y azul violeta con saturación visible. */
function esAzul(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  const saturacion = max === 0 ? 0 : d / max;
  if (saturacion <= 0.12 || max <= 0.08) return false;
  let h;
  if (max === rr) h = ((gg - bb) / d) % 6;
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  const grados = (h * 60 + 360) % 360;
  return grados >= 180 && grados <= 270;
}

const archivos = [
  'css/tema.css',
  'index.html',
  ...readdirSync(join(RAIZ, 'src'), { recursive: true })
    .filter((a) => a.endsWith('.js'))
    .map((a) => `src/${a.split('\\').join('/')}`),
];

function hallazgos(ruta, texto) {
  const lista = [];
  for (const m of texto.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    const hex = `#${m[1].toLowerCase()}`;
    if (esAzul(r, g, b) && !(PERMITIDOS.get(ruta) || new Set()).has(hex)) lista.push(hex);
  }
  for (const m of texto.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    if (esAzul(Number(m[1]), Number(m[2]), Number(m[3]))) lista.push(m[0]);
  }
  for (const m of texto.matchAll(/hsla?\(\s*(\d+)/g)) {
    if (Number(m[1]) >= 180 && Number(m[1]) <= 270) lista.push(m[0]);
  }
  for (const linea of texto.split('\n')) {
    if (/(color|fill|stroke|background)\s*[:=]/.test(linea) && NOMBRES.test(linea)) lista.push(linea.trim().slice(0, 60));
  }
  return lista;
}

test('la detección reconoce azules y no confunde verdes ni amarillos', () => {
  assert.equal(esAzul(10, 102, 194), true);
  assert.equal(esAzul(0, 200, 255), true);
  assert.equal(esAzul(48, 168, 72), false);
  assert.equal(esAzul(228, 228, 48), false);
  assert.equal(esAzul(240, 240, 240), false);
});

test('ningún archivo de estilos, HTML o código usa azules fuera de la lista permitida', () => {
  const mal = archivos.flatMap((a) => hallazgos(a, readFileSync(join(RAIZ, a), 'utf8')).map((h) => `${a}: ${h}`));
  assert.deepEqual(mal, []);
});

test('un azul nuevo en un archivo cualquiera sí se detecta', () => {
  assert.deepEqual(hallazgos('css/tema.css', 'a { color: #1e90ff; }'), ['#1e90ff']);
  assert.deepEqual(hallazgos('css/tema.css', 'a { color: #0A66C2; }'), []);
  assert.deepEqual(hallazgos('src/x.js', "const c = 'rgb(0, 100, 255)';"), ['rgb(0, 100, 255']);
});
