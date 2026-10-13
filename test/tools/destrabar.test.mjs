/**
 * @file destrabar.test.mjs
 * @description Pruebas de la regla que decide qué ejecuciones de la publicación están trabadas, y del flujo de
 *   Actions que la aplica antes de desplegar.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';
import { ejecucionesTrabadas, MINUTOS_TRABADA } from '../../tools/destrabar-publicacion.mjs';

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

test('el límite deja margen de sobra a una publicación normal, que tarda un par de minutos', () => {
  assert.ok(MINUTOS_TRABADA >= 20 && MINUTOS_TRABADA < 30);
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
