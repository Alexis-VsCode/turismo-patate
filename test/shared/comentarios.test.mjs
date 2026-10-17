/**
 * @file comentarios.test.mjs
 * @description Estilo del código. Dentro de src/ los comentarios internos son solo `// Paso N: ...` (con sus líneas de
 *   continuación justo debajo); lo que explica una constante o un ayudante va en un JSDoc `/** ... *\/`. Tampoco se
 *   apilan dos pasos sin código entre ellos, porque entonces la numeración deja de guiar la lectura.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const PASO = /^\/\/ Paso \d+: \S/;

/**
 * Comentarios que no siguen la regla en un texto de código.
 * @param {string} codigo contenido de un archivo
 * @returns {string[]} cada falta como «línea: comentario»
 */
function faltas(codigo) {
  const mal = [];
  let anterior = '';
  codigo.split('\n').forEach((cruda, i) => {
    const linea = cruda.trim();
    const esLinea = linea.startsWith('//');
    if (esLinea && !PASO.test(linea) && !anterior.startsWith('//')) mal.push(`${i + 1}: ${linea.slice(0, 60)}`);
    if (esLinea && PASO.test(linea) && PASO.test(anterior)) mal.push(`${i + 1}: paso apilado sobre otro sin código entre ellos`);
    if (linea.startsWith('/*') && !linea.startsWith('/**')) mal.push(`${i + 1}: comentario de bloque que no es JSDoc`);
    anterior = linea;
  });
  return mal;
}

test('la regla reconoce pasos, continuaciones y JSDoc, y rechaza lo demás', () => {
  assert.deepEqual(faltas('// Paso 1: algo\n// que sigue\nconst a = 1;\n/** Ayudante. */'), []);
  assert.deepEqual(faltas('const a = 1;\n// suelto'), ['2: // suelto']);
  assert.deepEqual(faltas('/* bloque */'), ['1: comentario de bloque que no es JSDoc']);
  assert.deepEqual(faltas('// Paso 2: uno\n// Paso 3: otro'), ['2: paso apilado sobre otro sin código entre ellos']);
});

test('los comentarios internos de src/ son pasos numerados o JSDoc', () => {
  const mal = [];
  for (const archivo of readdirSync(join(RAIZ, 'src'), { recursive: true }).filter((a) => a.endsWith('.js'))) {
    for (const falta of faltas(readFileSync(join(RAIZ, 'src', archivo), 'utf8'))) mal.push(`${archivo.split('\\').join('/')}:${falta}`);
  }
  assert.deepEqual(mal, []);
});
