/**
 * T-Datos: lectura del libro, pestañas de sistema, normalización y rechazos con ubicación.
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
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
  assert.equal(c.motivo, 'Gastronomía'); assert.equal(c.cantidad, 4); assert.equal(c.rangoEdad, '26-35');
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
