/**
 * @file csp.test.mjs
 * @description Pruebas de la política de seguridad de contenido de index.html: cada librería externa se permite por su
 *   URL exacta (no por todo el dominio del CDN), lleva firma de integridad y se pide sin credenciales.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const CSP = HTML.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
const directiva = (nombre) => (CSP.split(';').map((d) => d.trim().split(/\s+/)).find((d) => d[0] === nombre) ?? []).slice(1);
const externos = (patron) => [...HTML.matchAll(patron)].map((m) => m[0]).filter((t) => /https:\/\//.test(t));
const SCRIPTS = externos(/<script [^>]*src="https:[^"]+"[^>]*>/g);
const ESTILOS = externos(/<link rel="stylesheet" [^>]*href="https:[^"]+"[^>]*>/g);
const url = (etiqueta) => etiqueta.match(/(?:src|href)="([^"]+)"/)[1];

test('script-src y style-src permiten solo las URL exactas que la página carga, no todo el CDN', () => {
  assert.deepEqual(directiva('script-src').sort(), ["'self'", ...SCRIPTS.map(url)].sort());
  assert.deepEqual(directiva('style-src').sort(), ["'self'", ...ESTILOS.map(url)].sort());
  assert.ok(!CSP.includes('https://cdnjs.cloudflare.com;') && !/cdnjs\.cloudflare\.com(\s|;|$)/.test(CSP));
});

test('la política no declara orígenes que la página no usa', () => {
  assert.deepEqual(directiva('font-src'), []);
  assert.deepEqual(directiva('default-src'), ["'none'"]);
});

test('cada librería externa lleva firma de integridad y se pide sin credenciales', () => {
  assert.ok(SCRIPTS.length + ESTILOS.length >= 3);
  for (const etiqueta of [...SCRIPTS, ...ESTILOS]) {
    assert.match(etiqueta, /integrity="sha(384|512)-[A-Za-z0-9+/=]+"/, url(etiqueta));
    assert.match(etiqueta, /crossorigin="anonymous"/, url(etiqueta));
  }
});
