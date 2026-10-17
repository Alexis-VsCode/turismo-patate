/**
 * @file flujos.test.mjs
 * @description Pruebas de los flujos de GitHub Actions: cada job de la publicación recibe solo los permisos que usa,
 *   el sitio publica la carpeta de recursos completa y la validación de cambios ejecuta el constructor con el libro
 *   de prueba.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const PUBLICAR = readFileSync(join(RAIZ, '.github/workflows/publicar.yml'), 'utf8').replace(/\r\n/g, '\n');
const CI = readFileSync(join(RAIZ, '.github/workflows/ci.yml'), 'utf8').replace(/\r\n/g, '\n');

/** Texto de un job del flujo, desde su nombre hasta el job siguiente. */
function job(flujo, nombre) {
  const inicio = flujo.indexOf(`\n  ${nombre}:\n`);
  assert.ok(inicio >= 0, `falta el job ${nombre}`);
  const resto = flujo.slice(inicio + 1);
  const fin = resto.slice(1).search(/\n {2}[\w-]+:\n/);
  return fin < 0 ? resto : resto.slice(0, fin + 1);
}

/** Permisos del primer bloque `permissions:` con la sangría indicada, como objeto { permiso: nivel }. */
function permisos(texto, sangria) {
  const lineas = texto.split('\n');
  const inicio = lineas.indexOf(`${sangria}permissions:`);
  assert.ok(inicio >= 0, 'falta el bloque permissions');
  const resultado = {};
  for (const linea of lineas.slice(inicio + 1)) {
    const m = linea.match(new RegExp(`^${sangria} {2}([\\w-]+): (\\w+)$`));
    if (!m) break;
    resultado[m[1]] = m[2];
  }
  return resultado;
}

test('la publicación no reparte permisos a nivel de flujo: solo lectura del código por defecto', () => {
  assert.deepEqual(permisos(PUBLICAR.slice(0, PUBLICAR.indexOf('\njobs:')), ''), { contents: 'read' });
});

test('cada job de la publicación recibe solo los permisos que usa', () => {
  assert.deepEqual(permisos(job(PUBLICAR, 'destrabar'), '    '), { actions: 'write' });
  assert.deepEqual(permisos(job(PUBLICAR, 'construir'), '    '), { contents: 'read', pages: 'read' });
  assert.deepEqual(permisos(job(PUBLICAR, 'desplegar'), '    '), { pages: 'write', 'id-token': 'write' });
});

test('el job que lee la hoja declara sus permisos, sin heredar escritura en Pages ni tokens OIDC', () => {
  const construir = job(PUBLICAR, 'construir');
  assert.match(construir, /SHEET_URL: \$\{\{ secrets\.SHEET_URL \}\}/);
  assert.match(construir, /^ {4}permissions:$/m);
  assert.doesNotMatch(construir, /: write$/m);
  assert.doesNotMatch(construir, /id-token/);
});

test('el sitio publica la carpeta de recursos completa, así ningún archivo nuevo de assets/ se queda fuera', () => {
  assert.match(job(PUBLICAR, 'construir'), /^\s+cp -r (?:[\w-]+ )*assets sitio\/$/m);
});

test('todo recurso de assets/ que piden el HTML, el CSS y el código existe en el repositorio', () => {
  const fuentes = ['index.html',
    ...readdirSync(join(RAIZ, 'css')).filter((a) => a.endsWith('.css')).map((a) => `css/${a}`),
    ...readdirSync(join(RAIZ, 'src'), { recursive: true }).filter((a) => a.endsWith('.js')).map((a) => `src/${a}`)];
  const pedidos = new Set(fuentes.flatMap((f) => [...readFileSync(join(RAIZ, f), 'utf8').matchAll(/assets\/[\w./-]+\.\w+/g)].map((m) => m[0])));
  assert.ok(pedidos.size >= 4, `se esperaban al menos 4 recursos y hay ${pedidos.size}`);
  for (const ruta of pedidos) assert.ok(existsSync(join(RAIZ, ruta)), `${ruta} existe`);
});

test('la validación de cambios ejecuta el constructor con el libro de prueba después de las pruebas', () => {
  const pruebas = CI.indexOf('run: node --test');
  const humo = CI.indexOf('run: npm run datos');
  assert.ok(pruebas > 0, 'corre las pruebas');
  assert.ok(humo > pruebas, 'corre el constructor después de las pruebas');
  const { scripts } = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  assert.match(scripts.datos, /^node tools\/construir-datos\.mjs --desde-archivo test\/fixtures\/piloto-publicado\.xlsx$/);
});
