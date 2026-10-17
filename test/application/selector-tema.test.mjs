/**
 * @file selector-tema.test.mjs
 * @description Compartido. Botón de tema: al montar respeta el atributo que puso el script inicial o, si falta, la
 *   elección guardada (por defecto el claro); cada clic alterna `data-theme`, `aria-pressed` y el título, guarda la
 *   elección y avisa con el tema nuevo, aunque el almacenamiento falle. El DOM se simula con test/dom-falso.mjs.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { crearSelectorTema } from '../../src/application/components/compartidos/selector-tema.js';
import { Nodo, instalarDocumentoFalso } from '../dom-falso.mjs';

let restaurar;
let boton;

beforeEach(() => {
  restaurar = instalarDocumentoFalso();
  boton = new Nodo('button');
});

afterEach(() => {
  delete globalThis.window;
  restaurar();
});

/** Almacenamiento en memoria con la misma interfaz que `localStorage`. */
function almacenamiento(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), datos };
}

const tema = () => document.documentElement.getAttribute('data-theme');

test('sin atributo previo ni almacenamiento el tema es el claro y el botón ofrece pasar a oscuro', () => {
  crearSelectorTema(boton, () => {});
  assert.equal(tema(), 'light');
  assert.equal(boton.getAttribute('aria-pressed'), 'false');
  assert.equal(boton.title, 'Cambiar a modo oscuro');
});

test('al montar respeta el atributo que ya puso el script inicial', () => {
  globalThis.window = { localStorage: almacenamiento({ 'tema-patate': 'light' }) };
  document.documentElement.setAttribute('data-theme', 'dark');
  crearSelectorTema(boton, () => {});
  assert.equal(tema(), 'dark');
  assert.equal(boton.getAttribute('aria-pressed'), 'true');
  assert.equal(boton.title, 'Cambiar a modo claro');
});

test('sin atributo previo usa la elección guardada', () => {
  globalThis.window = { localStorage: almacenamiento({ 'tema-patate': 'dark' }) };
  crearSelectorTema(boton, () => {});
  assert.equal(tema(), 'dark');
  assert.equal(boton.getAttribute('aria-pressed'), 'true');
});

test('montar no avisa: solo el clic llama a alCambiar', () => {
  const alCambiar = mock.fn();
  crearSelectorTema(boton, alCambiar);
  assert.equal(alCambiar.mock.callCount(), 0);
});

test('cada clic alterna el tema, aria-pressed y el título, guarda la elección y avisa con el tema nuevo', () => {
  const guardado = almacenamiento();
  globalThis.window = { localStorage: guardado };
  const alCambiar = mock.fn();
  crearSelectorTema(boton, alCambiar);
  boton.emitir('click');
  assert.equal(tema(), 'dark');
  assert.equal(boton.getAttribute('aria-pressed'), 'true');
  assert.equal(boton.title, 'Cambiar a modo claro');
  assert.equal(guardado.datos.get('tema-patate'), 'dark');
  boton.emitir('click');
  assert.equal(tema(), 'light');
  assert.equal(boton.getAttribute('aria-pressed'), 'false');
  assert.equal(boton.title, 'Cambiar a modo oscuro');
  assert.equal(guardado.datos.get('tema-patate'), 'light');
  assert.deepEqual(alCambiar.mock.calls.map((c) => c.arguments), [['dark'], ['light']]);
});

test('si el almacenamiento falla el tema cambia igual y se avisa', () => {
  globalThis.window = { localStorage: { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('lleno'); } } };
  const alCambiar = mock.fn();
  crearSelectorTema(boton, alCambiar);
  assert.equal(tema(), 'light');
  boton.emitir('click');
  assert.equal(tema(), 'dark');
  assert.deepEqual(alCambiar.mock.calls.map((c) => c.arguments), [['dark']]);
});
