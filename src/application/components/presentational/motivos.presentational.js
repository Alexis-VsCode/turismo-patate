/**
 * @file motivos.presentational.js
 * @description Presentacional. Panel «Motivo de visita»: una fila por motivo con ícono, barra, cifra y
 *   porcentaje. Cada fila es un botón que filtra por ese motivo y vuelve a quitar el filtro al repetirse.
 *   El ícono se elige por el nombre del motivo, con uno genérico si la hoja trae un motivo nuevo. Todo texto de la
 *   hoja se inserta como nodo de texto y los íconos son trazos fijos del código, nunca HTML.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { numero, porcentaje } from '../../../shared/formato.js';
import { claveNormalizada } from '../../../domain/catalogo.js';
import { valoresDeFiltro } from '../../../domain/filtros.js';

/* Íconos de línea de cada motivo del catálogo. Sus trazos son constantes del código y se crean con la API del DOM. */
const ESPACIO_SVG = 'http://www.w3.org/2000/svg';

/** Elementos de cada ícono en un lienzo de 24 x 24: [etiqueta, atributos]. */
const ICONOS = Object.freeze({
  turismo: [['path', { d: 'M4 8h3l2-3h6l2 3h3v11H4z' }], ['circle', { cx: 12, cy: 13, r: 3.5 }]],
  gastronomia: [['path', { d: 'M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17' }]],
  descanso: [['path', { d: 'M3 19V6M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-7v5' }], ['circle', { cx: 7, cy: 11, r: 1.6 }]],
  'visita familiar': [['circle', { cx: 8, cy: 8, r: 3 }], ['circle', { cx: 17, cy: 9, r: 2.5 }], ['path', { d: 'M2 20c0-4 3-6 6-6s6 2 6 6M14 20c0-3 2-5 4-5s4 2 4 5' }]],
  evento: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }], ['path', { d: 'M3 10h18M8 3v4M16 3v4' }], ['circle', { cx: 12, cy: 15, r: 1.6 }]],
  negocios: [['rect', { x: 3, y: 7, width: 18, height: 13, rx: 2 }], ['path', { d: 'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18' }]],
  generico: [['path', { d: 'M4 12V5h7l9 9-7 7z' }], ['circle', { cx: 8, cy: 9, r: 1.4 }]],
});

/** Nombre del ícono que corresponde a un motivo; «generico» si no está en el catálogo de íconos. */
export function claveIconoMotivo(motivo) {
  const clave = claveNormalizada(motivo);
  return Object.hasOwn(ICONOS, clave) ? clave : 'generico';
}

/** Crea el SVG del motivo, decorativo (`aria-hidden`), del color del texto que lo rodea. */
export function crearIconoMotivo(motivo) {
  const svg = document.createElementNS(ESPACIO_SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const [etiqueta, atributos] of ICONOS[claveIconoMotivo(motivo)]) {
    const nodo = document.createElementNS(ESPACIO_SVG, etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) nodo.setAttribute(nombre, String(valor));
    svg.appendChild(nodo);
  }
  return svg;
}

/** Escalones de tono de la barra: el mayor es el más oscuro y el resto se aclara hasta el último escalón. */
const ESCALONES = 6;

/**
 * Calcula lo que cada fila necesita para dibujarse, sin tocar el DOM.
 * @param {Array<{ nombre: string, valor: number }>} lista motivos de mayor a menor, resultado de porMotivo()
 * @returns {Array<{ nombre: string, valor: number, pct: number|null, ancho: number, rango: number }>}
 */
export function prepararFilasMotivo(lista) {
  const total = lista.reduce((suma, m) => suma + m.valor, 0);
  const maximo = lista.reduce((mayor, m) => Math.max(mayor, m.valor), 0);
  return lista.map((m, i) => ({
    nombre: m.nombre,
    valor: m.valor,
    pct: total ? m.valor / total : null,
    ancho: maximo ? m.valor / maximo : 0,
    rango: Math.min(i, ESCALONES - 1),
  }));
}

/**
 * Dibuja las filas dentro de la lista.
 * @param {HTMLElement} lista elemento `<ol>` del panel
 * @param {Array<{ nombre: string, valor: number }>} motivos resultado de porMotivo()
 * @param {string[]} seleccionados motivos filtrados; una lista vacía no resalta ninguno
 * @param {(nombre: string) => void} alElegir se llama al pulsar una fila
 */
export function pintarMotivos(lista, motivos, seleccionados, alElegir) {
  const elegidos = valoresDeFiltro(seleccionados);
  // Paso 1: se rehace la lista completa; son pocas filas y así nunca queda una fila de un filtro anterior
  lista.replaceChildren();
  for (const fila of prepararFilasMotivo(motivos)) {
    const item = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'motivo';
    boton.setAttribute('aria-pressed', String(elegidos.includes(fila.nombre)));
    boton.classList.toggle('atenuado', elegidos.length > 0 && !elegidos.includes(fila.nombre));
    boton.style.setProperty('--ancho', `${(fila.ancho * 100).toFixed(1)}%`);
    boton.style.setProperty('--rango', String(fila.rango));

    const icono = document.createElement('span');
    icono.className = 'motivo-icono';
    icono.appendChild(crearIconoMotivo(fila.nombre));
    const nombre = document.createElement('span');
    nombre.className = 'motivo-nombre';
    nombre.textContent = fila.nombre;
    const pista = document.createElement('span');
    pista.className = 'motivo-pista';
    const barra = document.createElement('span');
    barra.className = 'motivo-barra';
    const valor = document.createElement('span');
    valor.className = 'motivo-valor';
    valor.textContent = numero(fila.valor);
    pista.append(barra, valor);
    const pct = document.createElement('span');
    pct.className = 'motivo-pct';
    pct.textContent = porcentaje(fila.pct);

    boton.append(icono, nombre, pista, pct);
    boton.addEventListener('click', () => alElegir(fila.nombre));
    item.appendChild(boton);
    lista.appendChild(item);
  }
}
