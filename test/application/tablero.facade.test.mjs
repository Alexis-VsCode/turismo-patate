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
  assert.deepEqual(facade.estado.filtros.procedencia, []);
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
  assert.equal(op.establecimiento.length, 100, 'los filtros de varias opciones no llevan la opción «Todos»');
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

test('la vista trae los textos del periodo según año y mes elegidos', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  assert.equal(facade.vista().textos.periodo, 'en todo el período');
  assert.equal(facade.vista().textos.centro, 'Visitantes');
  facade.fijarFiltro('anio', 2025);
  assert.equal(facade.vista().textos.periodo, 'durante el 2025');
  assert.equal(facade.vista().textos.centro, 'Visitantes 2025');
  assert.match(facade.vista().textos.notaMapa, /\(2025\)/);
  facade.fijarFiltro('mes', 2);
  assert.equal(facade.vista().textos.periodo, 'en marzo de 2025');
});

test('la vista del mapa empieza en provincias, acepta solo modos conocidos y avisa con su propio evento', async () => {
  const { facade, ctx } = montar();
  await facade.cargar(true);
  assert.equal(facade.vista().mapa.vista, 'provincias');
  ctx.eventos.length = 0;
  facade.fijarVistaMapa('ciudades');
  assert.equal(facade.vista().mapa.vista, 'ciudades');
  assert.deepEqual(ctx.eventos, ['vistaMapa']);
  facade.fijarVistaMapa('galaxias');
  assert.equal(facade.vista().mapa.vista, 'ciudades');
  facade.fijarVistaMapa('ciudades');
  assert.deepEqual(ctx.eventos, ['vistaMapa'], 'repetir el mismo modo no vuelve a avisar');
});

test('la pestaña del mapa sigue al filtro de procedencia y conserva la elegida con «todos» o «nacionales»', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  const vistaTras = (procedencia) => { facade.fijarFiltro('procedencia', procedencia); return facade.vista().mapa.vista; };
  assert.equal(vistaTras('P:Colombia'), 'paises');
  assert.equal(vistaTras('C:Ambato'), 'ciudades');
  assert.equal(vistaTras('PR:Tungurahua'), 'provincias');
  facade.fijarVistaMapa('paises');
  assert.equal(vistaTras('NAC'), 'paises');
  assert.equal(vistaTras(''), 'paises');
  assert.equal(vistaTras('EXT'), 'paises');
  facade.fijarVistaMapa('ciudades');
  facade.limpiarFiltros();
  assert.equal(facade.vista().mapa.vista, 'ciudades', 'limpiar filtros no cambia la pestaña elegida');
});

test('la lista de motivos no se reduce al motivo elegido, para poder cambiar de uno a otro', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  const completa = facade.vista().motivos;
  assert.ok(completa.length > 1);
  facade.fijarFiltro('motivo', completa[0].nombre);
  const filtrada = facade.vista().motivos;
  assert.deepEqual(filtrada, completa);
  assert.equal(facade.vista().kpis.total, completa[0].valor, 'el resto del tablero sí queda filtrado');
  facade.fijarFiltro('anio', 2025);
  assert.ok(facade.vista().motivos.length > 1, 'los demás filtros siguen aplicándose a la lista');
  assert.ok(facade.vista().motivos.reduce((s, m) => s + m.valor, 0) < completa.reduce((s, m) => s + m.valor, 0));
});

test('el combo de años une los años con visitantes y los del catálogo, de mayor a menor', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  const anios = facade.opciones().anio.filter((o) => o.valor !== '').map((o) => o.valor);
  assert.deepEqual(anios, [...DATOS.catalogo.anios, ...DATOS.filas.map((f) => f.anio)]
    .filter((a, i, l) => l.indexOf(a) === i).sort((a, b) => b - a).map(String));
  assert.ok(DATOS.catalogo.anios.some((a) => !DATOS.filas.some((f) => f.anio === a)), 'el libro de prueba tiene un año del catálogo sin visitantes');
});

test('un año con visitantes que el catálogo no lista también aparece en el combo', async () => {
  const datos = { ...DATOS, catalogo: { ...DATOS.catalogo, anios: [] } };
  const facade = crearTableroFacade({ obtener: async () => datos, config: CONFIG });
  await facade.cargar(true);
  const anios = facade.opciones().anio.filter((o) => o.valor !== '').map((o) => o.valor);
  assert.deepEqual(anios, [...new Set(DATOS.filas.map((f) => f.anio))].sort((a, b) => b - a).map(String));
});

test('un motivo del catálogo sin visitantes aparece en el combo de motivos', async () => {
  const datos = { ...DATOS, catalogo: { ...DATOS.catalogo, motivos: [...DATOS.catalogo.motivos, 'Motivo nuevo de la hoja'] } };
  const facade = crearTableroFacade({ obtener: async () => datos, config: CONFIG });
  await facade.cargar(true);
  const motivos = facade.opciones().motivo.map((o) => o.valor);
  assert.ok(motivos.includes('Motivo nuevo de la hoja'));
  assert.equal(new Set(motivos).size, motivos.length, 'sin motivos repetidos');
});

test('elegir un año del catálogo sin visitantes deja el tablero en cero sin romper nada', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  const vacio = Math.max(...DATOS.catalogo.anios);
  facade.fijarFiltro('anio', vacio);
  const v = facade.vista();
  assert.equal(v.kpis.total, 0);
  assert.equal(v.kpis.pctNacionales, null);
  assert.equal(v.textos.periodo, `durante el ${vacio}`);
});

test('el intervalo de actualización que se muestra sale de la configuración', async () => {
  const facade = crearTableroFacade({ obtener: async () => DATOS, config: { ...CONFIG, INTERVALO_AUTO_MS: 10 * 60 * 1000 } });
  assert.equal(facade.intervaloMinutos(), 10);
  assert.equal(crearTableroFacade({ obtener: async () => DATOS, config: CONFIG }).intervaloMinutos(), 5);
});

test('un motivo del catálogo escrito sin tilde no se duplica con el que trae el visitante', async () => {
  const conTilde = DATOS.filas.find((f) => /[áéíóú]/i.test(f.motivo));
  assert.ok(conTilde, 'el libro de prueba tiene un motivo con tilde');
  const sinTilde = conTilde.motivo.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const datos = { ...DATOS, catalogo: { ...DATOS.catalogo, motivos: [...DATOS.catalogo.motivos, sinTilde] } };
  const facade = crearTableroFacade({ obtener: async () => datos, config: CONFIG });
  await facade.cargar(true);
  const motivos = facade.opciones().motivo.map((o) => o.valor).filter((v) => v !== '');
  assert.equal(motivos.filter((m) => m.normalize('NFD').replace(/[̀-ͯ]/g, '') === sinTilde).length, 1);
});

test('los minutos de publicación salen de la configuración y no del refresco del navegador', () => {
  const config = { ...CONFIG, INTERVALO_AUTO_MS: 5 * 60 * 1000, PUBLICACION_MINUTOS: 15 };
  const facade = crearTableroFacade({ obtener: async () => DATOS, config });
  assert.equal(facade.publicacionMinutos(), 15);
  assert.equal(facade.intervaloMinutos(), 5);
  assert.equal(crearTableroFacade({ obtener: async () => DATOS, config: CONFIG }).publicacionMinutos(), CONFIG.PUBLICACION_MINUTOS);
});

test('varias opciones: alternar agrega, quitar saca solo una y cada valor tiene su etiqueta', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  const [a, b] = [...new Set(DATOS.filas.filter((x) => !x.nacional).map((x) => x.pais))].sort().slice(0, 2);
  facade.alternarFiltro('procedencia', `P:${a}`);
  facade.alternarFiltro('procedencia', `P:${b}`);
  facade.alternarFiltro('motivo', 'Turismo');
  assert.deepEqual(facade.estado.filtros.procedencia, [`P:${a}`, `P:${b}`]);
  assert.deepEqual(facade.chipsActivos().map((c) => [c.campo, c.valor, c.texto]), [
    ['procedencia', `P:${a}`, a], ['procedencia', `P:${b}`, b], ['motivo', 'Turismo', 'Turismo'],
  ]);
  const esperadoTotal = DATOS.filas
    .filter((x) => [a, b].includes(x.pais) && x.motivo === 'Turismo').reduce((s, x) => s + x.cantidad, 0);
  assert.equal(facade.vista().kpis.total, esperadoTotal);
  facade.quitarFiltro('procedencia', `P:${b}`);
  assert.deepEqual(facade.estado.filtros.procedencia, [`P:${a}`]);
  facade.quitarFiltro('motivo', 'Turismo');
  assert.deepEqual(facade.estado.filtros.motivo, []);
  facade.limpiarFiltros();
  assert.deepEqual(facade.estado.filtros.procedencia, []);
});

test('quitar año o mes los deja en null y el estado expuesto no comparte listas con el interno', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  facade.fijarFiltro('anio', 2025);
  facade.quitarFiltro('anio');
  assert.equal(facade.estado.filtros.anio, null);
  facade.alternarFiltro('motivo', 'Turismo');
  facade.estado.filtros.motivo.push('Intruso');
  assert.deepEqual(facade.estado.filtros.motivo, ['Turismo']);
  assert.deepEqual(facade.vista().filtros.motivo, ['Turismo']);
});

test('la pestaña del mapa sigue a la última opción agregada y no cambia al quitar una', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  facade.alternarFiltro('procedencia', 'P:Colombia');
  facade.alternarFiltro('procedencia', 'C:Ambato');
  assert.equal(facade.vista().mapa.vista, 'ciudades');
  assert.equal(facade.vista().mapa.procedencia, 'C:Ambato');
  facade.quitarFiltro('procedencia', 'C:Ambato');
  assert.equal(facade.vista().mapa.vista, 'ciudades');
  assert.equal(facade.vista().mapa.procedencia, 'P:Colombia');
  facade.quitarFiltro('procedencia', 'P:Colombia');
  assert.equal(facade.vista().mapa.procedencia, '');
});

test('las opciones de varias opciones salen agrupadas y sin la opción «Todos»', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  const op = facade.opciones();
  for (const campo of ['establecimiento', 'procedencia', 'motivo', 'rangoEdad', 'genero']) {
    assert.ok(op[campo].every((o) => o.valor !== ''), `${campo} no debe ofrecer «Todos»`);
  }
  assert.deepEqual(op.rangoEdad.map((o) => o.valor), ['0-30', '31-45', '46-60', '61+']);
  const grupos = [...new Set(op.procedencia.map((o) => o.grupo))];
  assert.deepEqual(grupos, ['Atajos', 'Provincias', 'Ciudades de Ecuador', 'Países']);
  assert.deepEqual(op.procedencia.filter((o) => o.grupo === 'Atajos').map((o) => o.valor), ['NAC', 'EXT']);
  assert.equal(op.anio[0].valor, '', 'año y mes conservan «Todos»');
});

test('la discapacidad de la vista respeta los filtros menos edad y género', async () => {
  const base = { anio: 2026, mes: 2, pais: 'Ecuador', provincia: 'Tungurahua', ciudad: 'Ambato', nacional: true };
  const registros = [
    { ...base, establecimiento: DATOS.establecimientos[0], motivo: 'Turismo', personas: 3 },
    { ...base, establecimiento: DATOS.establecimientos[1], motivo: 'Gastronomía', personas: 12 },
  ];
  const facade = crearTableroFacade({ obtener: async () => ({ ...DATOS, discapacidad: registros }), config: CONFIG });
  await facade.cargar(true);
  assert.equal(facade.vista().discapacidad.personas, 15);
  facade.alternarFiltro('motivo', 'Turismo');
  assert.equal(facade.vista().discapacidad.personas, 3);
  facade.alternarFiltro('rangoEdad', '61+');
  facade.alternarFiltro('genero', 'Masculino');
  const d = facade.vista().discapacidad;
  assert.equal(d.personas, 3, 'la edad y el género no se aplican a la discapacidad');
  const totalTurismo = DATOS.filas.filter((x) => x.motivo === 'Turismo').reduce((s, x) => s + x.cantidad, 0);
  assert.equal(d.pctVisitantes, 3 / totalTurismo, 'el porcentaje usa los visitantes de la misma selección, sin edad ni género');
});

test('sin datos de discapacidad la vista trae el resumen en cero', async () => {
  const { facade } = montar();
  await facade.cargar(true);
  assert.equal(facade.vista().discapacidad.personas, 0);
  assert.equal(facade.vista().discapacidad.registros, 0);
});
