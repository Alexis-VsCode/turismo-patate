/**
 * @file discapacidad.presentational.js
 * @description Presentacional. Panel «Personas con discapacidad»: la cifra total, su porcentaje sobre los
 *   visitantes y una barra por rango con el porcentaje de filas que cae en él. No guarda estado ni filtra: es solo
 *   informativo.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';
import { numero, porcentaje } from '../../../shared/formato.js';

/**
 * Filas de las barras, listas para pintar.
 * @param {{ rangos: Array<{ rango: string, registros: number, pct: number|null }> }} resumen ver resumenDiscapacidad()
 * @returns {Array<{ etiqueta: string, registros: number, pct: number|null, ancho: number }>} `ancho` va de 0 a 1 y es
 *   relativo al rango con más filas
 */
export function prepararFilasDiscapacidad(resumen) {
  const maximo = resumen.rangos.reduce((mayor, r) => Math.max(mayor, r.registros), 0);
  return resumen.rangos.map((r) => ({
    etiqueta: TEXTOS.rangoDiscapacidad(r.rango),
    registros: r.registros,
    pct: r.pct,
    ancho: maximo ? r.registros / maximo : 0,
  }));
}

/**
 * Dibuja el panel.
 * @param {{ total: HTMLElement, pct: HTMLElement, lista: HTMLElement }} elementos nodos del panel
 * @param {object} resumen ver resumenDiscapacidad()
 */
export function pintarDiscapacidad(elementos, resumen) {
  // Paso 1: cifra principal y su porcentaje sobre los visitantes
  elementos.total.textContent = TEXTOS.personasConDiscapacidad(resumen.personas);
  elementos.pct.textContent = resumen.pctVisitantes === null ? '' : TEXTOS.discapacidadDeVisitantes(porcentaje(resumen.pctVisitantes));
  // Paso 2: se rehace la lista completa; son pocas filas y así nunca queda una de un filtro anterior
  elementos.lista.replaceChildren();
  for (const fila of prepararFilasDiscapacidad(resumen)) {
    const item = document.createElement('li');
    item.className = 'discapacidad-fila';
    item.style.setProperty('--ancho', `${(fila.ancho * 100).toFixed(1)}%`);
    const nombre = document.createElement('span');
    nombre.className = 'discapacidad-nombre';
    nombre.textContent = fila.etiqueta;
    const pista = document.createElement('span');
    pista.className = 'discapacidad-pista';
    const barra = document.createElement('span');
    barra.className = 'discapacidad-barra';
    const valor = document.createElement('span');
    valor.className = 'discapacidad-valor';
    valor.textContent = numero(fila.registros);
    pista.append(barra, valor);
    const pct = document.createElement('span');
    pct.className = 'discapacidad-pct';
    pct.textContent = porcentaje(fila.pct);
    item.append(nombre, pista, pct);
    elementos.lista.appendChild(item);
  }
}
