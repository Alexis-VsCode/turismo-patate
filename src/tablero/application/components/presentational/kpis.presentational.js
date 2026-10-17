/**
 * @file kpis.presentational.js
 * @description Presentacional. Pinta la tarjeta del total con su variación contra el mismo período del año
 *   anterior y las tarjetas de nacionales y extranjeros del panel de participación, con una animación breve de
 *   las cifras. Sin estado de negocio ni acceso a datos.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { numero, porcentaje, textoVariacion } from '../../../shared/formato.js';
import { TEXTOS } from '../../../shared/textos.es.js';

const DURACION_MS = 600;

/**
 * Pinta las tarjetas de cifras y la variación contra el año anterior.
 * @param {{ total: HTMLElement, variacion: HTMLElement, nacionales: HTMLElement, nacionalesPct: HTMLElement,
 *   extranjeros: HTMLElement, extranjerosPct: HTMLElement, resumen: HTMLElement }} elementos
 * @param {{ total: number, nacionales: number, extranjeros: number, pctNacionales: number|null, pctExtranjeros: number|null }} kpis resultado de kpis()
 * @param {{ anioAnterior: number|null, variacion: number|null }} interanual resultado de variacionInteranual()
 * @param {string} textoResumen frase de participación ya redactada para los filtros vigentes
 * @returns {void} solo escribe en el DOM
 */
export function pintarKpis(elementos, kpis, interanual, textoResumen) {
  // Paso 1: las cifras se animan hacia su valor nuevo; los porcentajes y la frase cambian de una vez
  animarNumero(elementos.total, kpis.total, numero);
  animarNumero(elementos.nacionales, kpis.nacionales, numero);
  animarNumero(elementos.extranjeros, kpis.extranjeros, numero);
  elementos.nacionalesPct.textContent = porcentaje(kpis.pctNacionales);
  elementos.extranjerosPct.textContent = porcentaje(kpis.pctExtranjeros);
  elementos.resumen.textContent = textoResumen;

  // Paso 2: variación con flecha y color según el sentido
  const texto = textoVariacion(interanual.variacion);
  const caja = elementos.variacion;
  caja.classList.remove('sube', 'baja', 'neutra');
  if (texto === null) {
    caja.classList.add('neutra');
    caja.textContent = TEXTOS.sinComparacion;
    return;
  }
  caja.classList.add(interanual.variacion > 0 ? 'sube' : interanual.variacion < 0 ? 'baja' : 'neutra');
  caja.textContent = `${interanual.variacion > 0 ? '▲' : interanual.variacion < 0 ? '▼' : '■'} ${TEXTOS.variacion(texto, interanual.anioAnterior)}`;
}

/** Sin animación si el usuario pidió reducir movimiento o si la página no está visible (rAF se pausa). */
const sinMovimiento = () => typeof window === 'undefined'
  || document.visibilityState !== 'visible'
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Anima un número entero desde el valor mostrado hasta el nuevo; el valor final siempre queda exacto. */
function animarNumero(elemento, destino, formatear) {
  const desde = Number(elemento.dataset.valor || 0);
  elemento.dataset.valor = String(destino);
  // Paso 1: sin movimiento reducido o sin cambio, el valor se escribe directo
  if (sinMovimiento() || desde === destino) {
    elemento.textContent = formatear(destino);
    return;
  }
  // Paso 2: respaldo; si el navegador no pinta cuadros (pestaña en segundo plano), el valor exacto llega igual
  setTimeout(() => {
    if (elemento.dataset.valor === String(destino)) elemento.textContent = formatear(destino);
  }, DURACION_MS + 50);
  const inicio = performance.now();
  const paso = (ahora) => {
    // Paso 3: curva de salida suave; se corta si llegó otro valor mientras animaba
    if (elemento.dataset.valor !== String(destino)) return;
    const t = Math.min(1, (ahora - inicio) / DURACION_MS);
    const suave = 1 - (1 - t) ** 3;
    elemento.textContent = formatear(t === 1 ? destino : desde + (destino - desde) * suave);
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
