/**
 * @file textos.test.mjs
 * @description Pruebas de los textos que dependen de los filtros: periodo, resumen de participación y
 *   textos del mapa. Cubren cada combinación de año y mes y los casos límite de la participación.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTOS } from '../../src/shared/textos.es.js';

test('periodo describe año, mes, ambos o ninguno', () => {
  assert.equal(TEXTOS.periodo(2025, null), 'durante el 2025');
  assert.equal(TEXTOS.periodo(2025, 'Marzo'), 'en marzo de 2025');
  assert.equal(TEXTOS.periodo(null, 'Marzo'), 'en marzo de todos los años');
  assert.equal(TEXTOS.periodo(null, null), 'en todo el período');
});

test('el resumen de participación usa coma decimal y el periodo elegido', () => {
  const k = { total: 96452, pctNacionales: 0.821, pctExtranjeros: 0.179 };
  assert.equal(
    TEXTOS.resumenParticipacion(k, 'durante el 2025'),
    'Los visitantes nacionales representan el 82,1% del total y los extranjeros el 17,9% durante el 2025.',
  );
});

test('el resumen de participación cubre sin visitantes, solo nacionales y solo extranjeros', () => {
  assert.equal(TEXTOS.resumenParticipacion({ total: 0, pctNacionales: null, pctExtranjeros: null }, 'en todo el período'), 'Sin visitantes para los filtros elegidos.');
  assert.equal(TEXTOS.resumenParticipacion({ total: 10, pctNacionales: 1, pctExtranjeros: 0 }, 'durante el 2025'), 'Todos los visitantes son nacionales durante el 2025.');
  assert.equal(TEXTOS.resumenParticipacion({ total: 10, pctNacionales: 0, pctExtranjeros: 1 }, 'en marzo de 2025'), 'Todos los visitantes son extranjeros en marzo de 2025.');
});

test('el centro de la dona y la nota del mapa nombran el periodo sin inventar años', () => {
  assert.equal(TEXTOS.centroDona(2025), 'Visitantes 2025');
  assert.equal(TEXTOS.centroDona(null), 'Visitantes');
  assert.equal(TEXTOS.notaMapa(2025), 'Tamaño del círculo proporcional al total de visitantes (2025).');
  assert.equal(TEXTOS.notaMapa(null), 'Tamaño del círculo proporcional al total de visitantes (todos los años).');
  assert.deepEqual(Object.keys(TEXTOS.topVista), ['provincias', 'ciudades', 'paises']);
});

test('la frescura del chip habla de publicación y no de actualización', () => {
  for (const texto of Object.values(TEXTOS.frescura)) assert.doesNotMatch(texto, /actualiz/i);
});

test('los avisos del intervalo usan los minutos que reciben, sin cifras escritas a mano', () => {
  assert.match(TEXTOS.autoActualiza(10), /cada 10 minutos/);
  assert.match(TEXTOS.sinDatosAun(10), /cada 10 minutos/);
  assert.match(TEXTOS.frescuraAyuda(10), /cada 10 minutos/);
  assert.match(TEXTOS.autoActualiza(1), /cada minuto/);
});

test('ningún archivo de código escribe a mano una cifra de minutos', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { RAIZ } = await import('../helpers.mjs');
  const src = join(RAIZ, 'src');
  const mal = [];
  for (const a of readdirSync(src, { recursive: true }).filter((x) => x.endsWith('.js') && !x.endsWith('config.js'))) {
    const texto = readFileSync(join(src, a), 'utf8');
    for (const m of texto.matchAll(/(?:`[^`\n]*|'[^'\n]*)cada\s+\d+\s+minutos/g)) mal.push(`${a}: ${m[0].slice(0, 70)}`);
  }
  assert.deepEqual(mal, []);
  assert.equal(/cada\s+\d+\s+minutos/.test(readFileSync(join(RAIZ, 'index.html'), 'utf8')), false);
});

test('la ayuda del chip habla de la publicación con los minutos que recibe', () => {
  assert.match(TEXTOS.frescuraAyuda(15), /se publican solos cada 15 minutos/);
});
