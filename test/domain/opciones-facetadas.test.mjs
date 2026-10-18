/**
 * @file opciones-facetadas.test.mjs
 * @description Dominio. Opciones facetadas de los combos: cada combo ofrece lo que tienen las filas que cumplen todos
 *   los demás filtros activos, menos el suyo. Sin otro filtro activo ofrece lo de siempre (todo el libro y el
 *   catálogo), y una opción ya elegida se conserva aunque quede sin datos, para poder quitarla.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesFacetadas } from '../../src/domain/estadisticas.js';
import { filtrosVacios } from '../../src/domain/filtros.js';

const fila = (extra) => ({
  establecimiento: 'E1', anio: 2025, mes: 0, nacional: true, pais: 'Ecuador', provincia: 'Tungurahua', ciudad: 'Ambato',
  motivo: 'Turismo', rangoEdad: '0-30', genero: 'Femenino', cantidad: 1, ...extra,
});
const FILAS = [
  fila({}),
  fila({ mes: 1, nacional: false, pais: 'Colombia', provincia: '', ciudad: '', motivo: 'Gastronomía', rangoEdad: '31-45' }),
  fila({ establecimiento: 'E2', anio: 2026, mes: 2, provincia: 'Chimborazo', ciudad: 'Riobamba', motivo: 'Descanso', rangoEdad: '46-60', genero: 'Masculino' }),
  fila({ establecimiento: 'E3', anio: 2026, mes: 3, nacional: false, pais: 'Perú', provincia: '', ciudad: '', rangoEdad: '61+', genero: 'Masculino' }),
];
const CONTEXTO = {
  catalogo: { anios: [2027, 2026], motivos: ['Negocios', 'Turismo'], generos: ['Masculino', 'Femenino'] },
  establecimientos: ['E1', 'E2', 'E3', 'E4'],
};
const con = (extra) => ({ ...filtrosVacios(), ...extra });
const opciones = (extra) => opcionesFacetadas(FILAS, con(extra), CONTEXTO);

/** Lo que el dashboard ofrecía antes de facetar: todo el libro, el catálogo, los 12 meses y los cuatro rangos. */
const DE_HOY = {
  establecimiento: ['E1', 'E2', 'E3', 'E4'],
  anio: [2027, 2026, 2025],
  mes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  procedencia: { atajos: ['NAC', 'EXT'], provincias: ['Chimborazo', 'Tungurahua'], ciudades: ['Ambato', 'Riobamba'], paises: ['Colombia', 'Perú'] },
  motivo: ['Descanso', 'Gastronomía', 'Negocios', 'Turismo'],
  rangoEdad: ['0-30', '31-45', '46-60', '61+'],
  genero: ['Masculino', 'Femenino'],
};

test('sin otros filtros, las opciones son las de hoy', () => {
  assert.deepEqual(opciones({}), DE_HOY);
});

test('con un establecimiento, cada combo ofrece solo lo de sus filas', () => {
  assert.deepEqual(opciones({ establecimiento: ['E1'] }), {
    establecimiento: DE_HOY.establecimiento,
    anio: [2025],
    mes: [0, 1],
    procedencia: { atajos: ['NAC', 'EXT'], provincias: ['Tungurahua'], ciudades: ['Ambato'], paises: ['Colombia'] },
    motivo: ['Gastronomía', 'Turismo'],
    rangoEdad: ['0-30', '31-45'],
    genero: ['Femenino'],
  });
});

test('con dos establecimientos, la unión de los dos', () => {
  assert.deepEqual(opciones({ establecimiento: ['E1', 'E2'] }), {
    establecimiento: DE_HOY.establecimiento,
    anio: [2026, 2025],
    mes: [0, 1, 2],
    procedencia: { atajos: ['NAC', 'EXT'], provincias: ['Chimborazo', 'Tungurahua'], ciudades: ['Ambato', 'Riobamba'], paises: ['Colombia'] },
    motivo: ['Descanso', 'Gastronomía', 'Turismo'],
    rangoEdad: ['0-30', '31-45', '46-60'],
    genero: ['Masculino', 'Femenino'],
  });
});

test('un filtro no reduce sus propias opciones', () => {
  const op = opciones({ motivo: ['Turismo'] });
  assert.deepEqual(op.motivo, DE_HOY.motivo, 'el motivo sigue ofreciendo todos para sumar un segundo');
  assert.deepEqual(op.establecimiento, ['E1', 'E3'], 'Motivo = Turismo deja solo los establecimientos con Turismo');
  assert.deepEqual(op.procedencia.paises, ['Perú']);
  assert.deepEqual(opciones({ establecimiento: ['E1'] }).establecimiento, DE_HOY.establecimiento);
  assert.deepEqual(opciones({ anio: 2025 }).anio, DE_HOY.anio);
  assert.deepEqual(opciones({ procedencia: ['EXT'] }).procedencia, DE_HOY.procedencia);
});

test('combinaciones cruzadas (motivo + procedencia, año + establecimiento)', () => {
  const motivoYOrigen = opciones({ motivo: ['Turismo'], procedencia: ['EXT'] });
  assert.deepEqual(motivoYOrigen.motivo, ['Gastronomía', 'Turismo'], 'motivos de los extranjeros');
  assert.deepEqual(motivoYOrigen.procedencia, { atajos: ['NAC', 'EXT'], provincias: ['Tungurahua'], ciudades: ['Ambato'], paises: ['Perú'] });
  assert.deepEqual(motivoYOrigen.establecimiento, ['E3'], 'el único con extranjeros que vienen por turismo');
  const anioYEstablecimiento = opciones({ anio: 2026, establecimiento: ['E2'] });
  assert.deepEqual(anioYEstablecimiento.anio, [2026], 'años de E2');
  assert.deepEqual(anioYEstablecimiento.establecimiento, ['E2', 'E3'], 'establecimientos con visitantes en 2026');
  assert.deepEqual(anioYEstablecimiento.mes, [2]);
  assert.deepEqual(anioYEstablecimiento.procedencia.atajos, ['NAC'], 'E2 en 2026 no tiene extranjeros');
});

test('una opción elegida sin datos se conserva', () => {
  const op = opciones({ establecimiento: ['E1'], genero: ['Masculino'], anio: 2030, mes: 11, procedencia: ['P:Japón', 'EXT'], rangoEdad: ['61+'] });
  assert.deepEqual(op.genero, ['Masculino'], 'Masculino no está en E1 pero se puede quitar');
  assert.ok(op.establecimiento.includes('E1'));
  assert.ok(op.anio.includes(2030));
  assert.ok(op.mes.includes(11));
  assert.ok(op.procedencia.paises.includes('Japón'));
  assert.ok(op.procedencia.atajos.includes('EXT'));
  assert.ok(op.rangoEdad.includes('61+'));
});
