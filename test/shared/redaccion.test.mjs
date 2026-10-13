/**
 * @file redaccion.test.mjs
 * @description Pruebas de redacción del código y la documentación: sin emojis ni guiones largos (— y –), que se
 *   reemplazan por coma, dos puntos, paréntesis o «a» en los rangos. La única excepción es la marca ✓ de las
 *   casillas del combo, que es un símbolo de interfaz.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const GUIONES = /[\u2013\u2014]/;
const EMOJIS = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{2712}\u{2714}-\u{27BF}]/u;

/** Archivos de texto que escribe el proyecto (sin dependencias de terceros ni datos de prueba). */
function archivos() {
  const lista = ['index.html'];
  for (const r of readdirSync(RAIZ)) if (r.endsWith('.md')) lista.push(r);
  for (const carpeta of ['src', 'docs']) {
    for (const a of readdirSync(join(RAIZ, carpeta), { recursive: true })) {
      if (/\.(js|md)$/.test(a)) lista.push(join(carpeta, a));
    }
  }
  return lista;
}

test('ningún archivo del proyecto usa guiones largos ni emojis', () => {
  const hallazgos = [];
  for (const archivo of archivos()) {
    readFileSync(join(RAIZ, archivo), 'utf8').split('\n').forEach((linea, i) => {
      if (GUIONES.test(linea) || EMOJIS.test(linea)) hallazgos.push(`${archivo}:${i + 1}: ${linea.trim().slice(0, 70)}`);
    });
  }
  assert.deepEqual(hallazgos, []);
});
