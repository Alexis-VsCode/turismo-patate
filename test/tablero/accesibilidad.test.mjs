/**
 * @file accesibilidad.test.mjs
 * @description Accesibilidad que se lee en el código: los gráficos de lienzo tienen nombre y resumen para el lector de
 *   pantalla, el botón Actualizar se nombra por su texto visible, los títulos del pie cuelgan de la página y no del
 *   último panel, la barra de chips es un grupo con nombre y el movimiento se apaga cuando se pide reducirlo.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';
import { TEXTOS } from '../../src/tablero/shared/textos.es.js';
import { conMovimiento } from '../../src/tablero/application/components/presentational/graficos.presentational.js';
import { opcionesDeVuelo } from '../../src/tablero/application/components/compartidos/mapa.js';

const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const CONTAINER = readFileSync(join(RAIZ, 'src/tablero/application/components/tablero.container.js'), 'utf8');

/** Etiqueta de apertura del elemento con ese id. */
const etiqueta = (id) => new RegExp(`<[a-z]+ [^>]*id="${id}"[^>]*>`).exec(HTML)?.[0] ?? '';

test('los gráficos de evolución y de edad son imágenes con un resumen que el container escribe al pintar', () => {
  for (const id of ['g-evolucion', 'g-edad']) {
    assert.match(etiqueta(id), /role="img"/, id);
    assert.match(CONTAINER, new RegExp(`\\$\\('${id}'\\)\\.setAttribute\\('aria-label', TEXTOS\\.resumen`), id);
  }
});

test('el resumen de la evolución dice el año, el total y el mes con más visitantes', () => {
  const evolucion = { anio: 2026, anioAnterior: 2025, actual: [10, 1200, 30, null], anterior: [5, 5, 1000, 0] };
  assert.equal(
    TEXTOS.resumenEvolucion(evolucion),
    'Visitantes por mes de 2026 comparados con 2025. En 2026 hubo 1.240 visitantes y el mes con más fue feb, con 1.200. En 2025 hubo 1.010.',
  );
  assert.equal(TEXTOS.resumenEvolucion({ anio: null, anioAnterior: null, actual: [null], anterior: [0] }), 'Sin visitantes para los filtros elegidos.');
});

test('el resumen de edad y género lee cada rango con sus géneros', () => {
  const edadGenero = { rangos: ['0-30', '31-45'], series: [{ genero: 'Masculino', valores: [1500, 2] }, { genero: 'Femenino', valores: [3, 0] }] };
  assert.equal(
    TEXTOS.resumenEdadGenero(edadGenero),
    'Visitantes por rango de edad y género. 0-30 años: Masculino 1.500, Femenino 3. 31-45 años: Masculino 2, Femenino 0.',
  );
});

test('el botón Actualizar se nombra por su texto visible, así el lector oye también «Actualizando datos…»', () => {
  const boton = etiqueta('btn-actualizar');
  assert.ok(boton, 'el botón existe');
  assert.doesNotMatch(boton, /aria-label=/);
  assert.match(HTML, new RegExp(`<span id="btn-actualizar-texto">${TEXTOS.actualizar}</span>`));
});

test('los títulos del pie son h2 y la barra de chips es un grupo con nombre', () => {
  const pie = HTML.slice(HTML.indexOf('<footer'), HTML.indexOf('</footer>'));
  assert.doesNotMatch(pie, /<h3/);
  assert.equal((pie.match(/<h2>/g) ?? []).length, 3);
  assert.match(etiqueta('chips'), /role="group"/);
  assert.match(etiqueta('chips'), /aria-label="Filtros aplicados"/);
});

test('quitar el último chip deja el foco en el inicio del dashboard', () => {
  assert.match(CONTAINER, /pintarChips\(\$\('chips'\),[^;]*\$\('tablero'\)\)/);
});

test('con «reducir movimiento» los gráficos no se animan y el mapa no vuela', () => {
  const opciones = { animationDuration: 400, series: [] };
  assert.deepEqual(conMovimiento(opciones, true), opciones);
  assert.deepEqual(conMovimiento(opciones, false), { animationDuration: 400, series: [], animation: false });
  assert.deepEqual(opcionesDeVuelo(true, false), { duration: 0, animate: false }, 'el primer encuadre es instantáneo');
  assert.deepEqual(opcionesDeVuelo(false, false), { duration: 0.6, animate: true });
  assert.deepEqual(opcionesDeVuelo(false, true), { duration: 0, animate: false });
  assert.match(CONTAINER, /conMovimiento\(opcionesEvolucion\(/);
  assert.match(CONTAINER, /conMovimiento\(opcionesEdadGenero\(/);
  assert.match(CONTAINER, /conMovimiento\(opcionesDona\(/);
});
