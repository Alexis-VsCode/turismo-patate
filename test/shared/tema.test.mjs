/**
 * @file tema.test.mjs
 * @description Pruebas del tema: la regla pura, y que el script clásico del `<head>` da el mismo resultado en
 *   todas las combinaciones, incluidos los fallos del almacenamiento y de `matchMedia`.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { RAIZ } from '../helpers.mjs';
import { CLAVE_TEMA, resolverTema, alternarTema } from '../../src/shared/tema.js';

const SCRIPT = readFileSync(join(RAIZ, 'src/shared/tema-inicial.js'), 'utf8');

test('resolverTema respeta la elección válida y si no, usa el claro', () => {
  assert.equal(resolverTema('dark'), 'dark');
  assert.equal(resolverTema('light'), 'light');
  assert.equal(resolverTema(null), 'light');
  assert.equal(resolverTema(undefined), 'light');
  assert.equal(resolverTema('basura'), 'light');
  assert.equal(resolverTema(''), 'light');
});

test('alternarTema invierte el tema y ante un valor desconocido pasa a oscuro', () => {
  assert.equal(alternarTema('dark'), 'light');
  assert.equal(alternarTema('light'), 'dark');
  assert.equal(alternarTema(null), 'dark');
});

/** Ejecuta el script clásico en un contexto aislado y devuelve el tema que dejó en el atributo. */
function correrScript({ almacenamiento, sistema }) {
  const atributos = {};
  const window = {};
  if (almacenamiento === 'lanza-al-leer') {
    window.localStorage = { getItem() { throw new Error('bloqueado'); } };
  } else if (almacenamiento === 'lanza-al-acceder') {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
  } else {
    // solo responde a la clave real: si el script usara otra, devolvería null y la prueba lo delataría
    window.localStorage = { getItem: (clave) => (clave === CLAVE_TEMA ? almacenamiento : null) };
  }
  if (sistema === 'lanza') window.matchMedia = () => { throw new Error('sin matchMedia'); };
  else if (sistema !== 'ausente') window.matchMedia = () => ({ matches: sistema });
  const document = { documentElement: { setAttribute: (k, v) => { atributos[k] = v; } } };
  runInNewContext(SCRIPT, { window, document });
  return atributos['data-theme'];
}

test('el script clásico coincide con resolverTema en todas las combinaciones', () => {
  for (const guardado of [null, 'light', 'dark', 'basura']) {
    for (const oscuro of [true, false]) {
      const esperado = resolverTema(guardado);
      assert.equal(correrScript({ almacenamiento: guardado, sistema: oscuro }), esperado, `${guardado}/${oscuro}`);
    }
  }
});

test('el script clásico tolera almacenamiento bloqueado: sin elección legible queda el claro', () => {
  assert.equal(correrScript({ almacenamiento: 'lanza-al-leer', sistema: true }), 'light');
  assert.equal(correrScript({ almacenamiento: 'lanza-al-acceder', sistema: true }), 'light');
  assert.equal(correrScript({ almacenamiento: 'dark', sistema: 'lanza' }), 'dark');
  assert.equal(correrScript({ almacenamiento: null, sistema: 'ausente' }), 'light');
});

test('el modo oscuro del sistema del visitante no cambia el tema por defecto', () => {
  assert.equal(correrScript({ almacenamiento: null, sistema: false }), 'light');
  assert.equal(correrScript({ almacenamiento: null, sistema: true }), 'light');
});

test('el script clásico usa la misma clave que tema.js', () => {
  assert.ok(SCRIPT.includes(`'${CLAVE_TEMA}'`));
});
