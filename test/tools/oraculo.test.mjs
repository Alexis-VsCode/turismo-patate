/**
 * @file oraculo.test.mjs
 * @description Pruebas del comando que regenera los oráculos: `npm run oraculo` rehace el de cada formato de pestaña
 *   con el mismo libro que concilia su prueba y termina corriendo esas conciliaciones.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const { scripts } = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
const CONCILIACIONES = ['test/domain/estadisticas.test.mjs', 'test/domain/mensual.test.mjs'];

/** Comando completo de un script, con cada `npm run otro` reemplazado por el comando de `otro`. */
function expandir(nombre) {
  assert.ok(scripts[nombre], `falta el script ${nombre}`);
  return scripts[nombre].replace(/npm run ([\w:-]+)/g, (_, otro) => expandir(otro));
}

/** Libro y oráculo que concilia una prueba, leídos de la propia prueba. */
function parDe(prueba) {
  const codigo = readFileSync(join(RAIZ, prueba), 'utf8');
  return {
    libro: codigo.match(/leerFixture\('(test\/fixtures\/[\w-]+\.xlsx)'\)/)[1],
    esperado: codigo.match(/'(test\/fixtures\/esperado[\w-]*\.json)'/)[1],
  };
}

test('npm run oraculo regenera el oráculo de cada formato con el mismo libro que concilia su prueba', () => {
  const comando = expandir('oraculo');
  const pares = CONCILIACIONES.map(parDe);
  assert.equal(new Set(pares.map((p) => p.esperado)).size, CONCILIACIONES.length, 'cada formato tiene su oráculo');
  for (const { libro, esperado } of pares) {
    assert.ok(comando.includes(`python tools/oraculo.py ${libro} ${esperado}`), `regenera ${esperado} desde ${libro}`);
  }
});

test('npm run oraculo termina corriendo la conciliación de los dos formatos, después de regenerar', () => {
  const pasos = expandir('oraculo').split('&&').map((p) => p.trim());
  const conciliacion = pasos.at(-1);
  assert.match(conciliacion, /^node --test /);
  for (const prueba of CONCILIACIONES) assert.ok(conciliacion.includes(prueba), `concilia ${prueba}`);
  assert.equal(pasos.filter((p) => p.startsWith('python tools/oraculo.py ')).length, CONCILIACIONES.length);
});
