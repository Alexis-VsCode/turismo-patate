/**
 * @file enlace.test.mjs
 * @description Dominio. Enlace compartible: los filtros viajan en el texto de la URL y se reconstruyen validados, porque quien abre
 *   un enlace puede haberlo editado a mano.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrosATexto, textoAFiltros } from '../../src/domain/enlace.js';
import { filtrosVacios } from '../../src/domain/filtros.js';

const COMPLETOS = {
  establecimiento: ['Hostería La Colina', 'Café & Té'],
  anio: 2026, mes: 0,
  procedencia: ['P:Colombia', 'C:Ambato', 'PR:Tungurahua', 'NAC'],
  motivo: ['Turismo'], rangoEdad: ['0-30', '61+'], genero: ['Femenino'],
};

test('sin filtros el enlace no lleva nada', () => {
  assert.equal(filtrosATexto(filtrosVacios()), '');
});

test('ida y vuelta: los filtros vuelven iguales, incluidos enero (0), tildes, símbolos y el signo +', () => {
  const texto = filtrosATexto(COMPLETOS);
  assert.deepEqual(textoAFiltros(texto), COMPLETOS);
  assert.ok(!texto.includes(' '), 'sin espacios en la URL');
});

test('un texto vacío o solo con el signo # da filtros vacíos', () => {
  assert.deepEqual(textoAFiltros(''), filtrosVacios());
  assert.deepEqual(textoAFiltros('#'), filtrosVacios());
});

test('acepta el texto con o sin el # inicial', () => {
  assert.deepEqual(textoAFiltros('#a=2026&m=3'), { ...filtrosVacios(), anio: 2026, mes: 3 });
  assert.deepEqual(textoAFiltros('a=2026&m=3'), { ...filtrosVacios(), anio: 2026, mes: 3 });
});

test('descarta claves desconocidas y valores fuera de rango o mal formados', () => {
  const f = textoAFiltros('a=1999&m=12&ed=99%2B&p=cualquier-cosa&p=P%3AColombia&x=1&g=Femenino');
  assert.deepEqual(f, { ...filtrosVacios(), procedencia: ['P:Colombia'], genero: ['Femenino'] });
});

test('año y mes deben ser enteros', () => {
  assert.deepEqual(textoAFiltros('a=2026.5&m=abc'), filtrosVacios());
  assert.equal(textoAFiltros('m=-1').mes, null);
});

test('recorta las listas desmesuradas y los textos largos, y quita repetidos', () => {
  const muchos = Array.from({ length: 50 }, (_, i) => `e=Local${i}`).join('&');
  assert.equal(textoAFiltros(muchos).establecimiento.length, 20);
  assert.deepEqual(textoAFiltros(`e=${'x'.repeat(500)}`).establecimiento, []);
  assert.deepEqual(textoAFiltros('mo=Turismo&mo=Turismo').motivo, ['Turismo']);
});

test('un valor con marcado se queda como texto inofensivo', () => {
  const f = textoAFiltros('e=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
  assert.deepEqual(f.establecimiento, ['<script>alert(1)</script>']);
});
