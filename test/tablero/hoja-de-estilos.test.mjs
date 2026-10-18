/**
 * @file hoja-de-estilos.test.mjs
 * @description Compartido. Reglas de css/tema.css que se pueden leer en el texto: cada selector se declara una sola vez
 *   por bloque, el anillo de foco sale del token del tema, la impresión no hereda la maqueta de pantalla y la barra de
 *   estado y los avisos se alinean con el contenido en todo ancho. Lo que solo se ve al pintar se mide en el navegador.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from '../helpers.mjs';

const CSS = readFileSync(join(RAIZ, 'css/tema.css'), 'utf8').replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Reglas de la hoja con el bloque que las contiene: '' para la raíz o el encabezado del @media.
 * @returns {Array<{ bloque: string, selector: string, cuerpo: string }>}
 */
function reglas() {
  const lista = [];
  const pila = [];
  let desde = 0;
  for (let i = 0; i < CSS.length; i += 1) {
    if (CSS[i] === '{') {
      pila.push({ cabeza: CSS.slice(desde, i).trim(), inicio: i + 1 });
      desde = i + 1;
    } else if (CSS[i] === '}') {
      const abierta = pila.pop();
      if (!abierta.cabeza.startsWith('@')) {
        const bloque = pila.map((p) => p.cabeza).join(' ');
        lista.push({ bloque, selector: abierta.cabeza.replace(/\s+/g, ' '), cuerpo: CSS.slice(abierta.inicio, i).trim() });
      }
      desde = i + 1;
    }
  }
  return lista;
}

/** Cuerpo del bloque @media cuyo encabezado es exactamente `cabeza`. */
function bloque(cabeza) {
  return reglas().filter((r) => r.bloque === cabeza);
}

test('cada selector se declara una sola vez en cada bloque de la hoja', () => {
  const vistos = new Map();
  for (const { bloque: b, selector } of reglas()) {
    if (b.startsWith('@keyframes')) continue;
    const clave = `${b} » ${selector}`;
    vistos.set(clave, (vistos.get(clave) ?? 0) + 1);
  }
  assert.deepEqual([...vistos].filter(([, n]) => n > 1).map(([clave]) => clave), []);
});

test('la preferencia de reducir movimiento se declara una sola vez, para toda la página', () => {
  assert.equal(CSS.match(/@media \(prefers-reduced-motion: reduce\)/g).length, 1);
});

test('el aviso flotante tiene su propia sección, fuera del pie', () => {
  const crudo = readFileSync(join(RAIZ, 'css/tema.css'), 'utf8');
  const pie = crudo.indexOf('/* ============ Pie ============ */');
  const aviso = crudo.indexOf('/* ============ Aviso flotante ============ */');
  const finPie = crudo.indexOf('.pie-legal');
  assert.ok(aviso > finPie && pie < finPie, 'la sección del aviso empieza después de la última regla del pie');
});

test('la base del avatar va antes que sus variantes', () => {
  const posicion = (selector) => reglas().findIndex((r) => r.bloque === '' && r.selector === selector);
  for (const variante of ['.gad-sellos .autor-avatar', '.tarjeta-municipio .autor-avatar', '.tarjeta-persona .autor-avatar']) {
    assert.ok(posicion('.autor-avatar') < posicion(variante), variante);
  }
});

test('la impresión no repite selectores que ya cubre .boton', () => {
  const ocultos = bloque('@media print').find((r) => r.cuerpo.includes('display: none')).selector.split(', ');
  for (const redundante of ['.boton-filtros', '.boton-actualizar', '#btn-tema']) assert.ok(!ocultos.includes(redundante), redundante);
  assert.ok(ocultos.includes('.boton'));
});

test('ningún anillo de foco usa un color propio en lugar del token del tema', () => {
  const anillos = reglas().filter((r) => r.selector.includes(':focus-visible') && /outline(-color)?:/.test(r.cuerpo));
  assert.ok(anillos.length >= 1);
  for (const { selector, cuerpo } of anillos) {
    assert.doesNotMatch(cuerpo, /var\(--lima\)/, `${selector} usa --lima, que no llega a 3:1 sobre blanco`);
  }
});

test('los títulos del pie son h2 con los mismos estilos que tenían', () => {
  assert.ok(reglas().some((r) => r.selector === '.pie-columnas h2' && r.cuerpo.includes('font-size: 14px')));
  assert.ok(reglas().some((r) => r.selector === '.pie-columnas h2 svg'));
  assert.ok(!reglas().some((r) => r.selector.includes('.pie-columnas h3')));
});

test('las maquetas por ancho solo rigen en pantalla y la impresión devuelve cada panel a una celda', () => {
  assert.match(CSS, /@media screen and \(min-width: 860px\) and \(max-width: 1279px\) \{\s*\.tablero/);
  assert.match(CSS, /@media screen and \(max-width: 859px\) \{\s*\.tablero/);
  assert.match(CSS, /@media screen and \(max-width: 759px\) \{\s*body/);
  assert.doesNotMatch(CSS, /@media \(max-width: 759px\)|@media \(min-width: 860px\) and|@media \(max-width: 859px\) \{\s*\.tablero/);
  const impresion = bloque('@media print');
  const celda = impresion.findIndex((r) => r.selector === '.panel' && /grid-column: span 1/.test(r.cuerpo) && /grid-row: auto/.test(r.cuerpo));
  const anchos = impresion.findIndex((r) => r.selector === '.panel-evolucion, .panel-discapacidad');
  assert.ok(celda >= 0 && celda < anchos, 'la celda simple va antes de los paneles que ocupan dos columnas');
});

test('la barra de estado y los avisos se alinean con el contenido en todo ancho', () => {
  const margen = 'max(var(--esp-4), calc((100% - 1408px) / 2))';
  const base = reglas().filter((r) => r.bloque === '');
  const barra = base.find((r) => r.selector === '.barra-estado').cuerpo;
  assert.ok(barra.includes(margen), 'la barra de estado deja el mismo margen que el relleno de la cabecera');
  const avisos = base.find((r) => r.selector === '.aviso-error, .problemas').cuerpo;
  assert.ok(avisos.includes(margen), 'el error y los problemas de la hoja tampoco tocan los bordes');
  assert.doesNotMatch(CSS, /@media \(min-width: 1472px\)/);
  const ancho = bloque('@media (min-width: 1800px)').map((r) => r.cuerpo).join(' ');
  assert.ok(ancho.includes('max(var(--esp-4), calc((100% - 1648px) / 2))'), 'desde 1800 px siguen al contenido de 1648 px');
});
