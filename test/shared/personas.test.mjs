/**
 * @file personas.test.mjs
 * @description Pruebas de las fotos del pie: cada foto que pide el HTML existe en el repositorio, trae texto
 *   alternativo y medidas, y el flujo de publicación la copia al sitio.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const FOTOS = [...HTML.matchAll(/<img class="autor-foto"[^>]*>/g)].map((m) => m[0]);

test('el pie muestra la foto de las dos personas, con texto alternativo, medidas y carga diferida', () => {
  assert.equal(FOTOS.length, 2);
  for (const img of FOTOS) {
    const ruta = img.match(/src="([^"]+)"/)[1];
    assert.match(ruta, /^assets\/personas\/[\w-]+\.jpg$/);
    assert.ok(existsSync(join(RAIZ, ruta)), `${ruta} existe`);
    assert.ok(statSync(join(RAIZ, ruta)).size < 30 * 1024, `${ruta} pesa menos de 30 KB`);
    assert.match(img, /alt="[^"]{6,}"/);
    assert.match(img, /width="\d+" height="\d+"/);
    assert.match(img, /loading="lazy"/);
  }
});

test('el flujo de publicación copia la carpeta de fotos al sitio', () => {
  const flujo = readFileSync(join(RAIZ, '.github/workflows/publicar.yml'), 'utf8');
  assert.match(flujo, /cp -r assets\/personas sitio\/assets\//);
});
