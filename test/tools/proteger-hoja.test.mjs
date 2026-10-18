/**
 * @file proteger-hoja.test.mjs
 * @description Herramienta. El script de Google Sheets (tools/excel/proteger-hoja.gs) se pega a mano en Apps Script: una
 *   prueba comprueba que es JavaScript válido y que trae las funciones que nombran el manual y el activador.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const SCRIPT = readFileSync(join(RAIZ, 'tools/excel/proteger-hoja.gs'), 'utf8');

test('el script de la hoja es JavaScript válido', () => {
  assert.doesNotThrow(() => new Function(SCRIPT));
});

test('el script de la hoja trae las funciones que nombran el manual y el activador', () => {
  for (const nombre of ['protegerColumnasGrises', 'alAgregarPestana', 'restaurarFormulasGrises', 'agregarExtranjerosSinEspecificar']) {
    assert.ok(SCRIPT.includes(`function ${nombre}(`), nombre);
  }
});
