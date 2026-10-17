/**
 * @file aviso.test.mjs
 * @description Compartido. Aviso flotante: filtro de enlaces seguros, estructura pintada con textContent, reemplazo
 *   de un aviso por otro y cierre por botón, por Escape y por tiempo. El DOM se simula con el documento mínimo en
 *   memoria de test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { prepararAviso, mostrarAviso } from '../../src/application/components/compartidos/aviso.js';
import { Nodo, DocumentoFalso } from '../dom-falso.mjs';

let documentoOriginal;
let contenedor;

beforeEach(() => {
  documentoOriginal = globalThis.document;
  globalThis.document = new DocumentoFalso();
  contenedor = new Nodo('div');
  contenedor.setAttribute('role', 'status');
  contenedor.setAttribute('aria-live', 'polite');
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  mock.timers.reset();
  globalThis.document = documentoOriginal;
});

const AVISO = {
  titulo: 'Datos actualizados',
  mensaje: 'Se cargó el mes de septiembre.',
  enlaces: [{ texto: 'Fuente', href: 'https://patate.gob.ec/datos' }],
};

test('prepararAviso solo acepta enlaces https y conserva su orden', () => {
  const r = prepararAviso({
    titulo: 'T',
    mensaje: 'M',
    enlaces: [
      { texto: 'Uno', href: 'https://a.ec/1' },
      { texto: 'Malo', href: 'javascript:alert(1)' },
      { texto: 'Plano', href: 'http://b.ec' },
      { texto: 'Dos', href: 'https://c.ec/2' },
      { texto: 'Relativo', href: '/interno' },
    ],
  });
  assert.deepEqual(r, {
    titulo: 'T',
    mensaje: 'M',
    enlaces: [{ texto: 'Uno', href: 'https://a.ec/1' }, { texto: 'Dos', href: 'https://c.ec/2' }],
  });
});

test('prepararAviso descarta lo que no empieza exactamente por https:// y tolera un aviso sin enlaces', () => {
  const r = prepararAviso({ titulo: 'T', mensaje: 'M', enlaces: [{ texto: 'X', href: ' javascript:https://a.ec' }] });
  assert.deepEqual(r.enlaces, []);
  assert.deepEqual(prepararAviso({ titulo: 'T', mensaje: 'M' }).enlaces, []);
});

test('mostrarAviso pinta título, mensaje, enlaces y botón con sus atributos', () => {
  mostrarAviso(contenedor, AVISO, { textoCerrar: 'Cerrar' });
  const [aviso] = contenedor.buscar('aviso');
  assert.ok(aviso, 'falta div.aviso');
  assert.equal(aviso.tagName, 'DIV');
  assert.equal(contenedor.buscar('aviso-titulo')[0].tagName, 'STRONG');
  assert.equal(contenedor.buscar('aviso-titulo')[0].textContent, 'Datos actualizados');
  assert.equal(contenedor.buscar('aviso-mensaje')[0].tagName, 'P');
  assert.equal(contenedor.buscar('aviso-mensaje')[0].textContent, 'Se cargó el mes de septiembre.');
  const lista = contenedor.buscar('aviso-enlaces')[0];
  assert.equal(lista.tagName, 'UL');
  assert.equal(lista.children[0].tagName, 'LI');
  const enlace = contenedor.buscar('aviso-enlace')[0];
  assert.equal(enlace.tagName, 'A');
  assert.equal(enlace.textContent, 'Fuente');
  assert.equal(enlace.href, 'https://patate.gob.ec/datos');
  assert.equal(enlace.target, '_blank');
  assert.equal(enlace.rel, 'noopener noreferrer');
  const boton = contenedor.buscar('aviso-cerrar')[0];
  assert.equal(boton.tagName, 'BUTTON');
  assert.equal(boton.type, 'button');
  assert.equal(boton.getAttribute('aria-label'), 'Cerrar');
  assert.equal(boton.textContent, '×');
});

test('mostrarAviso no pinta enlaces inseguros ni la lista si no queda ninguno', () => {
  mostrarAviso(contenedor, { titulo: 'T', mensaje: 'M', enlaces: [{ texto: 'X', href: 'javascript:alert(1)' }] });
  assert.equal(contenedor.buscar('aviso-enlace').length, 0);
  assert.equal(contenedor.buscar('aviso-enlaces').length, 0);
});

test('un segundo aviso reemplaza al primero', () => {
  mostrarAviso(contenedor, AVISO);
  mostrarAviso(contenedor, { titulo: 'Otro', mensaje: 'Segundo' });
  assert.equal(contenedor.buscar('aviso').length, 1);
  assert.equal(contenedor.buscar('aviso-titulo')[0].textContent, 'Otro');
  assert.equal(document.cuantosOyentes('keydown'), 1);
});

test('cerrar() vacía el contenedor y quita el oyente de teclado', () => {
  const { cerrar } = mostrarAviso(contenedor, AVISO);
  assert.equal(document.cuantosOyentes('keydown'), 1);
  cerrar();
  assert.equal(contenedor.children.length, 0);
  assert.equal(document.cuantosOyentes('keydown'), 0);
});

test('el botón cerrar cierra el aviso', () => {
  mostrarAviso(contenedor, AVISO);
  contenedor.buscar('aviso-cerrar')[0].emitir('click');
  assert.equal(contenedor.children.length, 0);
  assert.equal(document.cuantosOyentes('keydown'), 0);
});

test('Escape cierra el aviso y otra tecla no', () => {
  mostrarAviso(contenedor, AVISO);
  document.emitir('keydown', { key: 'Enter' });
  assert.equal(contenedor.buscar('aviso').length, 1);
  document.emitir('keydown', { key: 'Escape' });
  assert.equal(contenedor.children.length, 0);
  assert.equal(document.cuantosOyentes('keydown'), 0);
});

test('el aviso se cierra solo al cumplirse duracionMs, no antes', () => {
  mostrarAviso(contenedor, AVISO, { duracionMs: 5000 });
  mock.timers.tick(4999);
  assert.equal(contenedor.buscar('aviso').length, 1);
  mock.timers.tick(1);
  assert.equal(contenedor.children.length, 0);
  assert.equal(document.cuantosOyentes('keydown'), 0);
});

test('la duración por defecto es de 10 segundos', () => {
  mostrarAviso(contenedor, AVISO);
  mock.timers.tick(9999);
  assert.equal(contenedor.buscar('aviso').length, 1);
  mock.timers.tick(1);
  assert.equal(contenedor.children.length, 0);
});

test('el temporizador de un aviso reemplazado no cierra al siguiente', () => {
  mostrarAviso(contenedor, AVISO, { duracionMs: 1000 });
  mock.timers.tick(500);
  mostrarAviso(contenedor, { titulo: 'Nuevo', mensaje: 'M' }, { duracionMs: 1000 });
  mock.timers.tick(600);
  assert.equal(contenedor.buscar('aviso-titulo')[0].textContent, 'Nuevo');
  mock.timers.tick(400);
  assert.equal(contenedor.children.length, 0);
});

test('cerrar() de un aviso ya reemplazado no borra al vigente', () => {
  const primero = mostrarAviso(contenedor, AVISO);
  mostrarAviso(contenedor, { titulo: 'Vigente', mensaje: 'M' });
  primero.cerrar();
  assert.equal(contenedor.buscar('aviso-titulo')[0].textContent, 'Vigente');
});

test('con el puntero o el foco sobre el aviso no se cierra solo; al salir vuelve a contar la duración completa', () => {
  for (const [entrar, salir] of [['mouseenter', 'mouseleave'], ['focusin', 'focusout']]) {
    mostrarAviso(contenedor, { titulo: 't', mensaje: 'm' }, { duracionMs: 1000 });
    const caja = contenedor.children[0];
    caja.emitir(entrar);
    mock.timers.tick(5000);
    assert.equal(contenedor.children.length, 1, `${entrar} pausa el cierre`);
    caja.emitir(salir);
    mock.timers.tick(999);
    assert.equal(contenedor.children.length, 1);
    mock.timers.tick(1);
    assert.equal(contenedor.children.length, 0, `${salir} reanuda el cierre`);
  }
});

test('al cerrar con el botón o con Escape el foco vuelve a quien abrió el aviso', () => {
  for (const cerrarCon of ['boton', 'escape']) {
    const disparador = { focus: mock.fn() };
    mostrarAviso(contenedor, { titulo: 't', mensaje: 'm' }, { devolverFoco: disparador });
    if (cerrarCon === 'boton') contenedor.buscar('aviso-cerrar')[0].emitir('click');
    else document.emitir('keydown', { key: 'Escape' });
    assert.equal(disparador.focus.mock.callCount(), 1, cerrarCon);
  }
});
