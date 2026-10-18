/**
 * @file lector-xlsx.test.mjs
 * @description Infraestructura. T-Datos: lectura del libro, pestañas de sistema, normalización y rechazos con
 *   ubicación.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XLSX, ENCABEZADO, CATALOGO, libroEnMemoria } from '../helpers.mjs';
import { leerLibro, esPestanaDeSistema } from '../../src/publicacion/adaptadores/lector-xlsx.js';
import { CONFIG_PUBLICACION as CONFIG } from '../../src/publicacion/config-publicacion.js';

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

/** Fila mensual con las columnas grises que escribe la hoja: totales, nacionales y extranjeros calculados del país. */
function mensualCuadrada(anio, mes, pais, ciudad, conteos, { nacionales, extranjeros } = {}) {
  const mujeres = conteos.slice(0, 4).reduce((s, n) => s + n, 0);
  const hombres = conteos.slice(4).reduce((s, n) => s + n, 0);
  const total = mujeres + hombres;
  const nac = pais === 'Ecuador' ? total : 0;
  return [anio, mes, pais, '', ciudad, 'Turismo', ...conteos, 0, mujeres, hombres, total,
    nacionales === undefined ? nac : nacionales, extranjeros === undefined ? total - nac : extranjeros, 'OK'];
}
const avisosDeColumnasGrises = (d) => d.avisos.filter((a) => /Nacionales/.test(a.mensaje) && /Extranjeros/.test(a.mensaje));
const avisosDeUmbral = (d) => d.avisos.filter((a) => /revise si sobra una cifra/i.test(a.mensaje));

test('avisa la fila mensual de Ecuador con Extranjeros escritos a mano, y el total sigue saliendo del país', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Gris': [ENC_MENSUAL,
      mensualCuadrada(2026, 'Marzo', 'Ecuador', 'Ambato', [3, 0, 0, 0, 2, 0, 0, 0]),
      mensualCuadrada(2026, 'Abril', 'Ecuador', 'Ambato', [3, 0, 0, 0, 2, 0, 0, 0], { nacionales: 0, extranjeros: 5 })],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.rechazos.length, 0, JSON.stringify(d.rechazos));
  const [aviso, ...otros] = avisosDeColumnasGrises(d);
  assert.equal(otros.length, 0, JSON.stringify(d.avisos));
  assert.equal(aviso.pestana, 'Hostal Gris');
  assert.equal(aviso.fila, 3);
  assert.match(aviso.mensaje, /^Fila 3: /);
  assert.match(aviso.mensaje, /Ecuador/);
  assert.match(aviso.mensaje, /5 nacionales y 0 extranjeros/);
  assert.equal(d.filas.reduce((s, f) => s + f.cantidad, 0), 10);
  assert.ok(d.filas.every((f) => f.nacional), 'el país manda: todo sigue siendo nacional');
});

test('avisa la fila mensual de un país extranjero con Nacionales mayores que cero', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Gris': [ENC_MENSUAL, mensualCuadrada(2026, 'Marzo', 'Colombia', '', [1, 1, 0, 0, 0, 0, 0, 0], { nacionales: 2, extranjeros: 0 })],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  const avisos = avisosDeColumnasGrises(d);
  assert.deepEqual(avisos.map((a) => [a.pestana, a.fila]), [['Hostal Gris', 2]]);
  assert.match(avisos[0].mensaje, /Colombia/);
  assert.ok(d.filas.every((f) => !f.nacional));
});

test('avisa la fila mensual cuya suma escrita en las columnas grises no cuadra con su total', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Gris': [ENC_MENSUAL, mensualCuadrada(2026, 'Marzo', 'Ecuador', 'Ambato', [4, 0, 0, 0, 0, 0, 0, 0], { nacionales: 3, extranjeros: 0 })],
  });
  assert.deepEqual(avisosDeColumnasGrises(leerLibro(buf, XLSX, CONFIG)).map((a) => a.fila), [2]);
});

test('no avisa las columnas grises que cuadran con el país ni las que vienen en blanco', () => {
  const enBlanco = mensualCuadrada(2026, 'Abril', 'Colombia', '', [0, 2, 0, 0, 0, 0, 0, 0], { nacionales: null, extranjeros: '' });
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Gris': [ENC_MENSUAL, mensualCuadrada(2026, 'Marzo', 'Colombia', '', [1, 0, 0, 0, 0, 0, 0, 0]), enBlanco],
  });
  assert.deepEqual(leerLibro(buf, XLSX, CONFIG).avisos, []);
});

test('avisa también en el formato anterior cuando trae Nacionales y Extranjeros que contradicen al país', () => {
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Antiguo': [[...ENCABEZADO, 'Nacionales', 'Extranjeros'],
      fila(2026, 'Marzo', 'Ecuador', '', 'Ambato', 4, 'Turismo', 29, 'Femenino', 4, 0),
      fila(2026, 'Marzo', 'Colombia', '', '', 2, 'Turismo', 29, 'Femenino', 2, 0)],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.deepEqual(avisosDeColumnasGrises(d).map((a) => [a.pestana, a.fila]), [['Hostal Antiguo', 3]]);
  assert.equal(d.filas.length, 2);
});

test('el umbral de fila sospechosa vive en la configuración de la publicación y vale 450000', () => {
  assert.equal(CONFIG.UMBRAL_FILA_SOSPECHOSA, 450000);
});

test('una fila mensual en el umbral exacto no avisa y una por encima avisa, y las dos se publican', () => {
  const enElUmbral = [100000, 100000, 100000, 100000, 50000, 0, 0, 0];
  const encima = [100000, 100000, 100000, 100000, 50001, 0, 0, 0];
  const buf = libroEnMemoria({
    _Catalogos: CATALOGO,
    'Hostal Grande': [ENC_MENSUAL,
      mensualCuadrada(2026, 'Marzo', 'Ecuador', 'Ambato', enElUmbral),
      mensualCuadrada(2026, 'Abril', 'Ecuador', 'Ambato', encima)],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.rechazos.length, 0, JSON.stringify(d.rechazos));
  const avisos = avisosDeUmbral(d);
  assert.deepEqual(avisos.map((a) => [a.pestana, a.fila]), [['Hostal Grande', 3]]);
  assert.match(avisos[0].mensaje, /^Fila 3: /);
  assert.match(avisos[0].mensaje, /450001/);
  assert.equal(d.filas.reduce((s, f) => s + f.cantidad, 0), 900001);
});

test('una pestaña con muchas filas avisadas guarda solo los primeros avisos de fila y uno que resume cuántas más hay', () => {
  const tope = CONFIG.MAX_AVISOS_FILA_POR_PESTANA;
  assert.equal(tope, 20);
  const filasMalas = Array.from({ length: tope + 15 }, () =>
    mensualCuadrada(2026, 'Marzo', 'Ecuador', 'Ambato', [3, 0, 0, 0, 2, 0, 0, 0], { nacionales: 0, extranjeros: 5 }));
  const buf = libroEnMemoria({ _Catalogos: CATALOGO, 'Hostal Gris': [ENC_MENSUAL, ...filasMalas] });
  const d = leerLibro(buf, XLSX, CONFIG);
  const deLaPestana = d.avisos.filter((a) => a.pestana === 'Hostal Gris');
  assert.equal(deLaPestana.length, tope + 1);
  assert.equal(deLaPestana.filter((a) => a.fila).length, tope);
  assert.match(deLaPestana.at(-1).mensaje, /15 filas más con avisos/);
  assert.equal(d.filas.reduce((s, f) => s + f.cantidad, 0), 5 * (tope + 15), 'todas las filas se publican igual');
});

test('una fila con Extranjeros (sin especificar) se acepta como extranjera, sin avisos y sin coordenadas en el mapa', () => {
  const catalogo = [...CATALOGO, [null, null, 'Extranjeros (sin especificar)', null, null, null, null, null, null, null, null, null]];
  const buf = libroEnMemoria({
    _Catalogos: catalogo,
    'Hostal Mixto': [ENC_MENSUAL,
      mensualCuadrada(2026, 'Marzo', 'Ecuador', 'Ambato', [3, 0, 0, 0, 2, 0, 0, 0]),
      mensualCuadrada(2026, 'Marzo', 'Extranjeros (sin especificar)', '', [1, 0, 0, 0, 1, 0, 0, 0])],
  });
  const d = leerLibro(buf, XLSX, CONFIG);
  assert.equal(d.rechazos.length, 0, JSON.stringify(d.rechazos));
  assert.equal(d.avisos.filter((a) => a.pestana === 'Hostal Mixto').length, 0, JSON.stringify(d.avisos));
  const extranjeras = d.filas.filter((f) => !f.nacional);
  assert.equal(extranjeras.reduce((s, f) => s + f.cantidad, 0), 2);
  assert.ok(extranjeras.every((f) => f.pais === 'Extranjeros (sin especificar)'));
  assert.equal(d.catalogo.coordPaises.has('extranjeros (sin especificar)'), false);
});
