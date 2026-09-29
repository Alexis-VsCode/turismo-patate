/**
 * @file tablero.facade.test.mjs
 * @description Pruebas de la fachada del tablero con reloj, visibilidad y descarga simulados:
 *   política de actualización, conservación de datos ante errores, filtros y vista calculada.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XLSX, RAIZ, leerFixture } from '../helpers.mjs';
import { leerLibro } from '../../src/infrastructure/lector-libro.js';
import { empaquetar, desempaquetar } from '../../src/infrastructure/contrato-datos.js';
import { claveNormalizada } from '../../src/domain/catalogo.js';
import { CONFIG } from '../../src/infrastructure/config.js';
import { crearTableroFacade } from '../../src/application/tablero.facade.js';

const DATOS = desempaquetar(
  JSON.parse(JSON.stringify(empaquetar(leerLibro(leerFixture('test/fixtures/piloto-publicado.xlsx'), XLSX, CONFIG), '2026-09-29T13:00:00.000Z', 'Ecuador'))),
  claveNormalizada,
);
const esperado = JSON.parse(readFileSync(join(RAIZ, 'test/fixtures/esperado.json'), 'utf8'));

/** Fachada con reloj manual, visibilidad controlable y una descarga que cuenta sus llamadas. */
function montar({ falla = false } = {}) {
  const ctx = { ahora: 1_000_000, visible: true, llamadas: 0, falla, eventos: [] };
  const facade = crearTableroFacade({
    obtener: async () => {
      ctx.llamadas += 1;
      if (ctx.falla) throw Object.assign(new Error('sin red'), { codigo: 'RED' });
      return DATOS;
    },
    config: CONFIG,
    reloj: () => ctx.ahora,
    esVisible: () => ctx.visible,
  });
  facade.suscribir((e) => ctx.eventos.push(e));
  return { facade, ctx };
}

test('carga inicial forzada trae los datos y avisa en orden', async () => {
  const { facade, ctx } = montar();
  assert.equal(await facade.cargar(true), 'cargado');
  assert.equal(ctx.llamadas, 1);
  assert.deepEqual(ctx.eventos, ['cargando', 'datos', 'cargando']);
  assert.equal(facade.vista().kpis.total, esperado.todo.kpis.total);
});

test('cambio de establecimiento reusa la descarga si pasaron menos de 60 s', async () => {
  const { facade, ctx } = montar();
  await facade.cargar(true);
  ctx.ahora += CONFIG.REUSO_MINIMO_MS - 1;
  assert.equal(await facade.cargar(false), 'reusado');
  ctx.ahora += 1;
  assert.equal(await facade.cargar(false), 'cargado');
  assert.equal(ctx.llamadas, 2);
});

test('el botón Actualizar (forzar) ignora el reuso de 60 s', async () => {
  const { facade, ctx } = montar();
  await facade.cargar(true);
  ctx.ahora += 1000;
  assert.equal(await facade.cargar(true), 'cargado');
  assert.equal(ctx.llamadas, 2);
});

test('la actualización automática toca a los 5 minutos y solo con la pestaña visible', async () => {
  const { facade, ctx } = montar();
  await facade.cargar(true);
  ctx.ahora += CONFIG.INTERVALO_AUTO_MS - 1;
  assert.equal(facade.tocaActualizar(), false);
  ctx.ahora += 1;
  assert.equal(facade.tocaActualizar(), true);
  ctx.visible = false;
  assert.equal(facade.tocaActualizar(), false);
});

test('no lanza dos descargas a la vez', async () => {
  const { facade } = montar();
  const primera = facade.cargar(true);
  assert.equal(await facade.cargar(true), 'ocupado');
  assert.equal(await primera, 'cargado');
});

test('un error conserva los últimos datos buenos y expone el código', async () => {
  const { facade, ctx } = montar();
  await facade.cargar(true);
  ctx.falla = true;
  assert.equal(await facade.cargar(true), 'error');
  assert.equal(facade.estado.error.codigo, 'RED');
  assert.equal(facade.vista().kpis.total, esperado.todo.kpis.total);
  ctx.falla = false;
  await facade.cargar(true);
  assert.equal(facade.estado.error, null);
});

test('filtros: fijar, alternar, elegir mes y limpiar concilian con el oráculo', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  facade.fijarFiltro('procedencia', 'EXT');
  assert.equal(facade.vista().kpis.total, esperado['solo-extranjeros'].kpis.total);
  facade.alternarFiltro('procedencia', 'EXT');
  assert.equal(facade.estado.filtros.procedencia, '');
  facade.elegirMes(2026, 6);
  assert.equal(facade.vista().kpis.total, esperado['2026-julio'].kpis.total);
  facade.elegirMes(2026, 6);
  assert.equal(facade.estado.filtros.mes, null);
  facade.fijarFiltro('anio', '');
  assert.equal(facade.estado.filtros.anio, null);
  facade.fijarFiltro('establecimiento', 'Heladería Las Orquídeas');
  assert.equal(facade.vista().kpis.total, esperado['un-establecimiento'].kpis.total);
  facade.limpiarFiltros();
  assert.equal(facade.vista().kpis.total, esperado.todo.kpis.total);
});

test('opciones de los combos incluyen los 100 establecimientos y la procedencia agrupada', async () => {
  const { facade } = montar();
  assert.equal(facade.opciones(), null);
  await facade.cargar(true);
  const op = facade.opciones();
  assert.equal(op.establecimientos.length, 100);
  assert.equal(op.establecimiento.length, 101);
  assert.ok(op.procedencia.some((o) => o.valor === 'C:Ambato'));
  assert.ok(op.procedencia.some((o) => o.valor === 'P:Colombia'));
  assert.ok(op.procedencia.some((o) => o.valor === 'PR:Tungurahua'));
});

test('un suscriptor que lanza no convierte una carga correcta en error ni oculta el evento a los demás', async () => {
  const errores = [];
  const eventos = [];
  const facade = crearTableroFacade({
    obtener: async () => DATOS, config: CONFIG, reloj: () => 1_000_000, reportarError: (e) => errores.push(e),
  });
  facade.suscribir((e) => { if (e === 'datos') throw new Error('falla del pintado'); });
  facade.suscribir((e) => eventos.push(e));
  assert.equal(await facade.cargar(true), 'cargado');
  assert.equal(facade.estado.error, null);
  assert.deepEqual(eventos, ['cargando', 'datos', 'cargando']);
  assert.equal(errores.length, 1);
  assert.match(errores[0].message, /falla del pintado/);
});

test('frescura es «desconocido» sin datos y sigue al reloj con la fecha de publicación', async () => {
  const { facade, ctx } = montar();
  assert.deepEqual(facade.frescura(), { estado: 'desconocido', minutos: null });
  await facade.cargar(true);
  const publicado = Date.parse(DATOS.generadoEn);
  ctx.ahora = publicado + 5 * 60 * 1000;
  assert.deepEqual(facade.frescura(), { estado: 'alDia', minutos: 5 });
  ctx.ahora = publicado + 40 * 60 * 1000;
  assert.equal(facade.frescura().estado, 'retrasado');
  ctx.ahora = publicado + 90 * 60 * 1000;
  assert.equal(facade.frescura().estado, 'vencido');
});
