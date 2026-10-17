/**
 * @file config.test.mjs
 * @description Pruebas de coherencia de la configuración: la cadencia de publicación, la consulta automática del
 *   navegador y los umbrales del chip de frescura tienen que encajar entre sí.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../../helpers.mjs';
import { CONFIG } from '../../../src/tablero/infrastructure/config.js';

const MINUTO_MS = 60 * 1000;

test('el sitio se publica cada media hora', () => {
  assert.equal(CONFIG.PUBLICACION_MINUTOS, 30);
});

test('el navegador consulta al menos una vez por ciclo de publicación', () => {
  assert.ok(CONFIG.INTERVALO_AUTO_MS <= CONFIG.PUBLICACION_MINUTOS * MINUTO_MS);
});

test('una publicación a tiempo se ve al día y perder un ciclo todavía no la vence', () => {
  const { alDiaMin, retrasadoMin } = CONFIG.UMBRALES_FRESCURA;
  assert.ok(alDiaMin > CONFIG.PUBLICACION_MINUTOS, 'al día debe cubrir un ciclo completo más la demora de Actions');
  assert.ok(retrasadoMin >= alDiaMin + CONFIG.PUBLICACION_MINUTOS, 'perder un ciclo no vence la publicación');
});

/**
 * Minutos entre dos disparos según el campo de minutos de un cron (horas en «*»).
 * @param {string} campo `*`, `*\/N`, un número o una lista separada por comas
 */
function intervaloCron(campo) {
  if (campo === '*') return 1;
  if (campo.startsWith('*/')) return Number(campo.slice(2));
  const minutos = campo.split(',').map(Number).sort((a, b) => a - b);
  const huecos = minutos.map((m, i) => (i === 0 ? m + 60 - minutos[minutos.length - 1] : m - minutos[i - 1]));
  return Math.min(...huecos);
}

test('intervaloCron lee las formas habituales del campo de minutos', () => {
  assert.equal(intervaloCron('*'), 1);
  assert.equal(intervaloCron('*/15'), 15);
  assert.equal(intervaloCron('15'), 60);
  assert.equal(intervaloCron('0,10,20,40'), 10);
});

test('el respaldo de GitHub no corre más seguido que la publicación', () => {
  const flujo = readFileSync(join(RAIZ, '.github/workflows/publicar.yml'), 'utf8');
  const [minutos, horas] = flujo.match(/cron: '([^']+)'/)[1].split(' ');
  assert.equal(horas, '*');
  assert.ok(intervaloCron(minutos) >= CONFIG.PUBLICACION_MINUTOS, `el cron dispara cada ${intervaloCron(minutos)} minutos`);
});

test('el respaldo de GitHub corre cada media hora desfasado de cron-job.org, que dispara en punto y a la media', () => {
  const flujo = readFileSync(join(RAIZ, '.github/workflows/publicar.yml'), 'utf8');
  assert.match(flujo, /cron: '15,45 \* \* \* \*'/);
});

test('el origen de las teselas del mapa está permitido en img-src de la CSP, y solo ese origen externo', () => {
  const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const imgSrc = csp.split(';').map((d) => d.trim().split(/\s+/)).find((d) => d[0] === 'img-src').slice(1);
  const origen = new URL(CONFIG.URL_TESELAS.replace(/\{[a-z]\}/g, '0')).origin;
  assert.ok(imgSrc.includes(origen), `img-src no permite ${origen}`);
  assert.deepEqual(imgSrc.filter((o) => o.startsWith('https:')), [origen]);
});
