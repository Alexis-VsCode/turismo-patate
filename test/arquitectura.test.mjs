/**
 * @file arquitectura.test.mjs
 * @description Guardián de la arquitectura semihexagonal: lee los `import` de cada módulo de `src/`
 *   y falla si una capa depende de otra que no le corresponde. Así la estructura no se degrada.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { RAIZ } from './helpers.mjs';

const SRC = join(RAIZ, 'src');

/** Capa de un archivo según su ruta dentro de src/. */
function capaDe(rutaRelativa) {
  const r = rutaRelativa.split(sep).join('/');
  if (r === 'main.js') return 'raiz';
  if (r.startsWith('domain/')) return 'domain';
  if (r.startsWith('infrastructure/')) return 'infrastructure';
  if (r.startsWith('shared/')) return 'shared';
  if (r.startsWith('application/components/presentational/')) return 'presentational';
  if (r.startsWith('application/components/compartidos/')) return 'compartidos';
  if (r.startsWith('application/components/')) return 'container';
  if (r.startsWith('application/')) return 'facade';
  return 'desconocida';
}

/** Qué capas puede importar cada capa. La raíz de composición puede unir todas. */
const PERMITIDAS = Object.freeze({
  domain: ['domain'],
  infrastructure: ['domain', 'infrastructure'],
  shared: ['shared'],
  facade: ['domain', 'shared'],
  presentational: ['domain', 'shared'],
  compartidos: ['domain', 'shared'],
  container: ['shared', 'presentational', 'compartidos'],
  raiz: ['domain', 'infrastructure', 'shared', 'facade', 'container', 'presentational', 'compartidos'],
});

const archivos = readdirSync(SRC, { recursive: true }).filter((a) => a.endsWith('.js'));

/**
 * Especificadores que un módulo carga: `import ... from`, `import '...'`, `export ... from` y `import('...')`.
 * Los import() se buscan fuera de los comentarios de bloque, porque el JSDoc usa `import('...')` como tipo.
 */
function especificadoresDe(codigo) {
  const estaticos = [...codigo.matchAll(/^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)];
  const reexportados = [...codigo.matchAll(/^\s*export\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/gm)];
  const dinamicos = [...codigo.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)];
  return [...estaticos, ...reexportados, ...dinamicos].map((m) => m[1]);
}

/** Ruta relativa a src/, con barras normales, del módulo que carga `especificador` desde `archivo`. */
const destinoDe = (archivo, especificador) => relative(SRC, resolve(dirname(join(SRC, archivo)), especificador)).split(sep).join('/');

/** Grafo de dependencias entre los módulos de src/: archivo -> módulos que carga. */
const GRAFO = new Map(archivos.map((a) => [
  a.split(sep).join('/'),
  especificadoresDe(readFileSync(join(SRC, a), 'utf8')).filter((e) => e.startsWith('.')).map((e) => destinoDe(a, e)),
]));

/** Primer ciclo del grafo como lista de archivos (el primero se repite al final), o null si no hay ninguno. */
function primerCiclo(grafo) {
  const estado = new Map();
  const camino = [];
  const visitar = (nodo) => {
    estado.set(nodo, 'abierto');
    camino.push(nodo);
    for (const siguiente of grafo.get(nodo) || []) {
      if (estado.get(siguiente) === 'abierto') return [...camino.slice(camino.indexOf(siguiente)), siguiente];
      if (!estado.has(siguiente)) {
        const ciclo = visitar(siguiente);
        if (ciclo) return ciclo;
      }
    }
    camino.pop();
    estado.set(nodo, 'cerrado');
    return null;
  };
  for (const nodo of grafo.keys()) {
    if (!estado.has(nodo)) {
      const ciclo = visitar(nodo);
      if (ciclo) return ciclo;
    }
  }
  return null;
}

test('todos los módulos de src/ pertenecen a una capa conocida', () => {
  assert.ok(archivos.length >= 18, `se esperaban al menos 18 módulos y hay ${archivos.length}`);
  for (const a of archivos) assert.notEqual(capaDe(a), 'desconocida', a);
});

for (const archivo of archivos) {
  test(`${archivo.split(sep).join('/')} respeta la regla de dependencias`, () => {
    const origen = capaDe(archivo);
    const codigo = readFileSync(join(SRC, archivo), 'utf8');
    for (const especificador of especificadoresDe(codigo)) {
      // Paso 1: sin paquetes externos; las librerías de terceros entran por <script> con SRI
      assert.ok(especificador.startsWith('.'), `${archivo} importa el paquete externo «${especificador}»`);
      // Paso 2: la capa destino tiene que estar permitida para la capa origen
      const destino = relative(SRC, resolve(dirname(join(SRC, archivo)), especificador));
      assert.ok(!destino.startsWith('..'), `${archivo} importa fuera de src/: ${especificador}`);
      const capaDestino = capaDe(destino);
      assert.ok(
        PERMITIDAS[origen].includes(capaDestino),
        `${archivo} (${origen}) no puede importar ${destino.split(sep).join('/')} (${capaDestino})`,
      );
    }
  });
}

test('ningún módulo de src/ forma un ciclo de dependencias', () => {
  const ciclo = primerCiclo(GRAFO);
  assert.equal(ciclo, null, `ciclo: ${ciclo && ciclo.join(' -> ')}`);
});

test('la lectura de dependencias ve reexportaciones e import() y no confunde el tipo de un JSDoc', () => {
  const codigo = [
    "import { a } from './a.js';",
    "import './b.js';",
    "export { c } from './c.js';",
    "export * from './d.js';",
    "const e = await import('./e.js');",
    "/** @param {import('./f.js').Tipo} x */",
    "export const g = 'from';",
  ].join('\n');
  assert.deepEqual(especificadoresDe(codigo), ['./a.js', './b.js', './c.js', './d.js', './e.js']);
});

test('la búsqueda de ciclos encuentra uno y no inventa ninguno', () => {
  assert.deepEqual(primerCiclo(new Map([['a', ['b']], ['b', ['c']], ['c', ['a']]])), ['a', 'b', 'c', 'a']);
  assert.equal(primerCiclo(new Map([['a', ['b', 'c']], ['b', ['c']], ['c', []]])), null);
});
