/**
 * @file destrabar.test.mjs
 * @description Pruebas de la regla que decide qué ejecuciones de la publicación están trabadas, del recorrido contra
 *   la API de GitHub (simulada: un error de la API o del mantenimiento termina en error, nunca en un fin exitoso) y
 *   del flujo de Actions que la aplica antes de desplegar.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';
import { ejecucionesTrabadas, hayQueForzar, principal, MINUTOS_TRABADA } from '../../tools/destrabar-publicacion.mjs';

const AHORA = Date.parse('2026-10-12T12:00:00Z');
const hace = (min) => new Date(AHORA - min * 60 * 1000).toISOString();

test('una ejecución en waiting o in_progress más vieja que el límite está trabada', () => {
  const runs = [
    { id: 1, status: 'waiting', created_at: hace(MINUTOS_TRABADA + 1) },
    { id: 2, status: 'in_progress', created_at: hace(6 * 24 * 60) },
  ];
  assert.deepEqual(ejecucionesTrabadas(runs, AHORA, 99), [1, 2]);
});

test('las recientes, las terminadas y las que esperan turno en la cola no se tocan', () => {
  const runs = [
    { id: 1, status: 'waiting', created_at: hace(MINUTOS_TRABADA - 1) },
    { id: 2, status: 'completed', created_at: hace(600) },
    { id: 3, status: 'queued', created_at: hace(600) },
    { id: 4, status: 'pending', created_at: hace(600) },
  ];
  assert.deepEqual(ejecucionesTrabadas(runs, AHORA, 99), []);
});

test('la ejecución actual nunca se cancela a sí misma', () => {
  const runs = [{ id: 7, status: 'in_progress', created_at: hace(600) }];
  assert.deepEqual(ejecucionesTrabadas(runs, AHORA, 7), []);
});

test('la antigüedad se mide desde que la ejecución arrancó, no desde que se creó (un re-run de una vieja es nuevo)', () => {
  const rerun = { id: 5, status: 'in_progress', created_at: hace(600), run_started_at: hace(2) };
  assert.deepEqual(ejecucionesTrabadas([rerun], AHORA, 99), []);
});

test('se fuerza la cancelación si la ejecución sigue activa pasado el doble del límite', () => {
  assert.equal(hayQueForzar({ status: 'waiting', run_started_at: hace(2 * MINUTOS_TRABADA + 1) }, AHORA), true);
  assert.equal(hayQueForzar({ status: 'waiting', run_started_at: hace(MINUTOS_TRABADA + 1) }, AHORA), false);
  assert.equal(hayQueForzar({ status: 'completed', run_started_at: hace(600) }, AHORA), false);
});

test('el límite deja margen de sobra a una publicación normal, que tarda un par de minutos', () => {
  assert.ok(MINUTOS_TRABADA >= 20 && MINUTOS_TRABADA < 30);
});

/**
 * Corre principal() contra una API de GitHub simulada y devuelve los eventos registrados y las llamadas hechas.
 * @param {(ruta: string, metodo: string) => { status: number, cuerpo?: object }} responder respuesta de cada llamada
 */
async function conApiSimulada(responder) {
  const VARIABLES = { GITHUB_REPOSITORY: 'autor/repo', GITHUB_RUN_ID: '7', GITHUB_TOKEN: 'token-de-prueba' };
  const original = { fetch: globalThis.fetch, log: console.log, env: Object.keys(VARIABLES).map((k) => [k, process.env[k]]) };
  const eventos = [];
  const llamadas = [];
  globalThis.fetch = async (url, { method }) => {
    const ruta = url.replace('https://api.github.com/repos/autor/repo', '');
    llamadas.push(`${method} ${ruta}`);
    const { status, cuerpo } = responder(ruta, method);
    return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status });
  };
  console.log = (linea) => eventos.push(JSON.parse(linea));
  Object.assign(process.env, VARIABLES);
  try {
    const error = await principal().then(() => null, (e) => e);
    return { error, eventos, llamadas };
  } finally {
    globalThis.fetch = original.fetch;
    console.log = original.log;
    for (const [k, v] of original.env) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/** API sana: la ejecución actual pertenece al flujo 42, `ejecuciones` son las activas y enable responde `enable`. */
const apiSana = (ejecuciones = [], enable = 204) => (ruta, metodo) => {
  if (ruta === '/actions/runs/7') return { status: 200, cuerpo: { workflow_id: 42 } };
  if (ruta.startsWith('/actions/workflows/42/runs')) {
    const estado = new URLSearchParams(ruta.split('?')[1]).get('status');
    return { status: 200, cuerpo: { workflow_runs: ejecuciones.filter((e) => e.status === estado) } };
  }
  if (ruta === '/actions/workflows/42/enable' && metodo === 'PUT') return { status: enable };
  if (ruta.endsWith('/cancel')) return { status: 409, cuerpo: { message: 'no se puede cancelar' } };
  if (ruta.endsWith('/force-cancel')) return { status: 202, cuerpo: {} };
  return { status: 404, cuerpo: { message: 'Not Found' } };
};

test('con la API en orden, la limpieza registra el fin y mantiene activo el flujo', async () => {
  const { error, eventos, llamadas } = await conApiSimulada(apiSana());
  assert.equal(error, null);
  assert.deepEqual(eventos.map((e) => e.evento), ['destrabar_fin', 'flujo_mantenido']);
  assert.equal(eventos[1].http, 204);
  assert.ok(llamadas.includes('PUT /actions/workflows/42/enable'));
});

test('una cancelación rechazada no detiene la limpieza: se fuerza y se sigue', async () => {
  // Paso 1: trabada hace 30 minutos, más que el límite pero menos que el doble: solo el rechazo del cancel obliga a forzar
  const hace30 = new Date(Date.now() - 30 * 60000).toISOString();
  const trabada = { id: 3, status: 'waiting', created_at: hace30, run_started_at: hace30 };
  const { error, eventos, llamadas } = await conApiSimulada(apiSana([trabada]));
  assert.equal(error, null);
  assert.ok(llamadas.includes('POST /actions/runs/3/force-cancel'));
  assert.deepEqual(eventos.find((e) => e.evento === 'ejecucion_destrabada'), { evento: 'ejecucion_destrabada', id: 3, http: 202 });
});

test('si la API de GitHub responde con error, la limpieza falla y nunca registra un fin exitoso', async () => {
  for (const status of [401, 403, 404]) {
    const { error, eventos } = await conApiSimulada(() => ({ status, cuerpo: { message: 'Resource not accessible' } }));
    assert.match(String(error?.message), new RegExp(`HTTP ${status}`));
    assert.deepEqual(eventos, [], `con HTTP ${status} no se registra destrabar_fin ni flujo_mantenido`);
  }
});

test('si falla el mantenimiento del flujo, el job termina con error aunque la limpieza haya ido bien', async () => {
  const { error, eventos } = await conApiSimulada(apiSana([], 403));
  assert.match(String(error?.message), /HTTP 403/);
  assert.deepEqual(eventos.map((e) => e.evento), ['destrabar_fin', 'flujo_mantenido']);
  assert.equal(eventos[1].http, 403);
});

const FLUJO = readFileSync(join(RAIZ, '.github/workflows/publicar.yml'), 'utf8');

test('la concurrencia de Pages vive solo en el despliegue, así la limpieza corre aunque haya una trabada', () => {
  const antesDeJobs = FLUJO.slice(0, FLUJO.indexOf('\njobs:'));
  assert.doesNotMatch(antesDeJobs, /^concurrency:/m);
  const desplegar = FLUJO.slice(FLUJO.indexOf('\n  desplegar:'));
  assert.match(desplegar, /concurrency:\s*\n\s+group: pages/);
});

test('el despliegue espera a la limpieza, y la limpieza nunca bloquea la publicación', () => {
  const destrabar = FLUJO.slice(FLUJO.indexOf('\n  destrabar:'), FLUJO.indexOf('\n  construir:'));
  assert.match(destrabar, /continue-on-error: true/);
  assert.match(destrabar, /actions: write/);
  assert.match(destrabar, /node tools\/destrabar-publicacion\.mjs/);
  assert.match(FLUJO, /needs: \[construir, destrabar\]/);
});

test('cada publicación mantiene activo el flujo, para que GitHub no lo apague a los 60 días sin commits', () => {
  const codigo = readFileSync(join(RAIZ, 'tools/destrabar-publicacion.mjs'), 'utf8');
  assert.match(codigo, /\/actions\/workflows\/\$\{flujo\}\/enable`, 'PUT'/);
});
