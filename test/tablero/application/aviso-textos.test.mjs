/**
 * @file aviso-textos.test.mjs
 * @description Compartido. El aviso flotante no escribe textos propios: sin `textoCerrar`, su botón se nombra con el
 *   texto de textos.es.js. El DOM se simula con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mostrarAviso } from '../../../src/tablero/application/components/compartidos/aviso.js';
import { TEXTOS } from '../../../src/tablero/shared/textos.es.js';
import { Nodo, instalarDocumentoFalso } from '../../dom-falso.mjs';

test('sin textoCerrar el botón del aviso se nombra con el texto de textos.es.js', () => {
  const restaurar = instalarDocumentoFalso();
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const contenedor = new Nodo('div');
    const { cerrar } = mostrarAviso(contenedor, { titulo: 'T', mensaje: 'M' });
    assert.equal(contenedor.buscar('aviso-cerrar')[0].getAttribute('aria-label'), TEXTOS.avisoPronto.cerrar);
    cerrar();
  } finally {
    mock.timers.reset();
    restaurar();
  }
});
