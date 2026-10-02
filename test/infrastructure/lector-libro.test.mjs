/**
 * @file lector-libro.test.mjs
 * @description Infraestructura. T-Datos: lectura del libro, pestañas de sistema, normalización y rechazos con
 *   ubicación.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XLSX, ENCABEZADO, CATALOGO, libroEnMemoria } from '../helpers.mjs';
import { leerLibro, esPestanaDeSistema } from '../../src/infrastructure/lector-libro.js';
import { CONFIG } from '../../src/infrastructure/config.js';

const fila = (...v) => v;

test('excluye pestañas de sistema y copias de la plantilla', () => {
  for (const n of ['_Catalogos', '_Instrucciones', 'Plantilla', 'Plantilla (2)', 'Copia de Plantilla', 'PLANTILLA']) {
    assert.equal(esPestanaDeSistema(n), true, n);
  }
  for (const n of ['EL Valle', 'Patate Gardens  ', 'Heladería Las Orquídeas']) assert.equal(esPestanaDeSistema(n), false, n);
});

test('normaliza errores reales de la hoja original: meses mal escritos, espacios y tildes', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Patate Gardens  ': [ENCABEZADO,
      fila(2025, 'agosoto', 'ecuador ', '', 'ambato ', 3, 'turismo', 35, 'femenino'),
      fila(2025, 'setiembre', 'Ecuador', '', 'Riobamba', 2, 'NEGOCIOS', 40, 'Masculino'),
      fila('2026', 'Octubre ', 'Colombia', 'Pichincha', 'Quito', '4', 'Gastronomia', '29', 'Femenino')],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.deepEqual(d.establecimientos, ['Patate Gardens']);
  assert.equal(d.rechazos.length, 0, JSON.stringify(d.rechazos));
  const [a, b, c] = d.filas;
  assert.equal(a.mes, 7); assert.equal(a.pais, 'Ecuador'); assert.equal(a.ciudad, 'Ambato');
  assert.equal(a.provincia, 'Tungurahua'); assert.equal(a.motivo, 'Turismo'); assert.equal(a.genero, 'Femenino');
  assert.equal(b.mes, 8); assert.equal(b.provincia, 'Chimborazo');
  assert.equal(c.nacional, false); assert.equal(c.ciudad, ''); assert.equal(c.provincia, '');
  assert.equal(c.motivo, 'Gastronomía'); assert.equal(c.cantidad, 4); assert.equal(c.rangoEdad, '0-30');
});

test('rechaza filas inválidas con pestaña, fila y motivo, sin descartarlas en silencio', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    Hostal: [ENCABEZADO,
      fila(2025, 'Enero', 'Ecuador', '', 'Ambato', 0, 'Turismo', 30, 'Masculino'),
      fila(2025, 'Mesx', 'Ecuador', '', 'Ambato', 2, 'Turismo', 30, 'Masculino'),
      fila(2025, 'Enero', 'Marte', '', '', 2, 'Turismo', 30, 'Masculino'),
      fila(2025, 'Enero', 'Ecuador', '', 'Gotham', 2, 'Turismo', 30, 'Masculino'),
      fila(2025, 'Enero', 'Ecuador', '', 'Ambato', 2, 'Turismo', 300, 'Masculino'),
      fila(2025, 'Enero', 'Ecuador', '', 'Ambato', 2, 'Turismo', 30, 'Masculino')],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.filas.length, 1);
  assert.deepEqual(d.rechazos.map((r) => [r.pestana, r.fila]), [['Hostal', 2], ['Hostal', 3], ['Hostal', 4], ['Hostal', 5], ['Hostal', 6]]);
  assert.match(d.rechazos[0].motivo, /Cantidad/);
  assert.match(d.rechazos[2].motivo, /País/);
  assert.match(d.rechazos[3].motivo, /Ciudad/);
});

test('una pestaña sin columnas se reporta y no tumba a las demás', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    Rota: [['Mes', 'Pais/Ciudad', 'Total de Visitantes']],
    Buena: [ENCABEZADO, fila(2025, 'Enero', 'Ecuador', '', 'Quito', 5, 'Turismo', 30, 'Masculino')],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.deepEqual(d.establecimientos, ['Buena']);
  assert.equal(d.filas.length, 1);
  assert.ok(d.avisos.some((a) => a.pestana === 'Rota' && /Faltan columnas/.test(a.mensaje)));
});

test('sin catálogo sigue funcionando y avisa', () => {
  const buf = libroEnMemoria({ Solo: [ENCABEZADO, fila(2025, 'Enero', 'Perú', '', '', 5, 'Turismo', 30, 'Femenino')] });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.filas.length, 1);
  assert.equal(d.filas[0].nacional, false);
  assert.ok(d.avisos.some((a) => /Catálogo/.test(a.mensaje)));
});

test('los avisos del catálogo llegan a los avisos del libro con la pestaña del catálogo', () => {
  const catalogo = [...CATALOGO, [null, null, null, 'Madrid', 40.4, -3.7, null, 'Pichincha', null, null, null, null]];
  const buf = libroEnMemoria({
    _Catalogos: catalogo,
    Hostal: [ENCABEZADO, [2025, 'Enero', 'Ecuador', 'Tungurahua', 'Ambato', 1, 'Turismo', 30, 'Masculino']],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  const aviso = d.avisos.find((a) => a.pestana === CONFIG.PESTANA_CATALOGOS && /fuera de Ecuador/i.test(a.mensaje));
  assert.ok(aviso, JSON.stringify(d.avisos));
});

const ENC_MENSUAL = [
  'Año', 'Mes', 'País', 'Provincia', 'Ciudad', 'Motivo de visita',
  'Mujeres 0-30', 'Mujeres 31-45', 'Mujeres 46-60', 'Mujeres 61+', 'Hombres 0-30', 'Hombres 31-45', 'Hombres 46-60', 'Hombres 61+',
  'Personas con discapacidad', 'Total mujeres', 'Total hombres', 'Total visitantes', 'Nacionales', 'Extranjeros', 'Estado',
];
const mensual = (...v) => [...v, 6, 4, 10, 10, 0, 'OK'];

test('lee pestañas del formato mensual junto a las del formato anterior', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Nuevo': [ENC_MENSUAL,
      mensual(2026, 'Marzo', 'Ecuador', '', 'Ambato', 'Turismo', 2, 2, 1, 1, 1, 2, 1, 0, 2),
      mensual(2026, 'Marzo', 'Colombia', '', '', 'Negocios', 1, 0, 0, 0, 0, 0, 0, 0, 0)],
    'Hostal Antiguo': [ENCABEZADO, fila(2026, 'Marzo', 'Ecuador', '', 'Ambato', 4, 'Turismo', 29, 'Femenino')],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.deepEqual(d.establecimientos, ['Hostal Antiguo', 'Hostal Nuevo']);
  assert.equal(d.rechazos.length, 0, JSON.stringify(d.rechazos));
  const nuevo = d.filas.filter((f) => f.establecimiento === 'Hostal Nuevo');
  assert.equal(nuevo.length, 8);
  assert.equal(nuevo.reduce((s, f) => s + f.cantidad, 0), 11);
  assert.equal(d.filas.filter((f) => f.establecimiento === 'Hostal Antiguo').length, 1);
  assert.deepEqual(d.discapacidad.map((x) => [x.establecimiento, x.personas, x.pais]), [['Hostal Nuevo', 2, 'Ecuador']]);
});

test('las filas mensuales inválidas se rechazan con pestaña, fila de la hoja y motivo', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Nuevo': [ENC_MENSUAL,
      mensual(2026, 'Marzo', 'Ecuador', '', 'Ambato', 'Turismo', 1, 0, 0, 0, 0, 0, 0, 0, 0),
      mensual(2026, 'Abril', 'Ecuador', '', 'Ambato', 'Turismo', 1, 0, 0, 0, 0, 0, 0, 0, 9),
      mensual(2026, 'Mayo', 'Ecuador', '', 'Ambato', 'Turismo', -3, 0, 0, 0, 0, 0, 0, 0, 0)],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.filas.length, 1);
  assert.deepEqual(d.rechazos.map((r) => [r.pestana, r.fila]), [['Hostal Nuevo', 3], ['Hostal Nuevo', 4]]);
});

test('una pestaña que mezcla los dos formatos se omite con un aviso claro', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Mixto': [[...ENC_MENSUAL, 'Cantidad', 'Edad', 'Género'], mensual(2026, 'Marzo', 'Ecuador', '', 'Ambato', 'Turismo', 1, 0, 0, 0, 0, 0, 0, 0, 0)],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.filas.length, 0);
  assert.deepEqual(d.establecimientos, []);
  assert.match(d.avisos.find((a) => a.pestana === 'Hostal Mixto').mensaje, /formatos/i);
});

test('una pestaña mensual con una columna ausente se reporta y las demás siguen', () => {
  const sinUna = ENC_MENSUAL.filter((h) => h !== 'Hombres 61+');
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Incompleto': [sinUna, [2026, 'Marzo', 'Ecuador', '', 'Ambato', 'Turismo', 1]],
    'Hostal Antiguo': [ENCABEZADO, fila(2026, 'Marzo', 'Ecuador', '', 'Ambato', 4, 'Turismo', 29, 'Femenino')],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.deepEqual(d.establecimientos, ['Hostal Antiguo']);
  assert.match(d.avisos.find((a) => a.pestana === 'Hostal Incompleto').mensaje, /Faltan columnas/);
});

test('el resultado siempre trae la lista de discapacidad, vacía si ninguna pestaña la usa', () => {
  const buf = libroEnMemoria({ _Catalogos: CATALOGO, A: [ENCABEZADO, fila(2026, 'Marzo', 'Ecuador', '', 'Ambato', 4, 'Turismo', 29, 'Femenino')] });
  assert.deepEqual(leerLibro(buf, XLSX, CONFIG).discapacidad, []);
});
