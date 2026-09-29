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

test('todos los módulos de src/ pertenecen a una capa conocida', () => {
  assert.ok(archivos.length >= 18, `se esperaban al menos 18 módulos y hay ${archivos.length}`);
  for (const a of archivos) assert.notEqual(capaDe(a), 'desconocida', a);
});

for (const archivo of archivos) {
  test(`${archivo.split(sep).join('/')} respeta la regla de dependencias`, () => {
    const origen = capaDe(archivo);
    const codigo = readFileSync(join(SRC, archivo), 'utf8');
    const imports = [...codigo.matchAll(/^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    for (const especificador of imports) {
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
