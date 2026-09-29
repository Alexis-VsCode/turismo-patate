/**
 * @file kpis.presentational.js
 * @description Presentacional. Pinta las tres tarjetas de la esquina (total, nacionales y extranjeros),
 *   con una animación breve de las cifras y la variación contra el mismo período del año anterior.
 *   Sin estado de negocio ni acceso a datos.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { numero, porcentaje, textoVariacion } from '../../../shared/formato.js';
import { TEXTOS } from '../../../shared/textos.es.js';

const DURACION_MS = 600;

/** Sin animación si el usuario pidió reducir movimiento o si la página no está visible (rAF se pausa). */
const sinMovimiento = () => typeof window === 'undefined'
  || document.visibilityState !== 'visible'
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Anima un número entero desde el valor mostrado hasta el nuevo; el valor final siempre queda exacto. */
function animarNumero(elemento, destino, formatear) {
  const desde = Number(elemento.dataset.valor || 0);
  elemento.dataset.valor = String(destino);
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
    // Paso 1: curva de salida suave; se corta si llegó otro valor mientras animaba
    if (elemento.dataset.valor !== String(destino)) return;
    const t = Math.min(1, (ahora - inicio) / DURACION_MS);
    const suave = 1 - (1 - t) ** 3;
    elemento.textContent = formatear(t === 1 ? destino : desde + (destino - desde) * suave);
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/**
 * @param {{ total: HTMLElement, nacionales: HTMLElement, extranjeros: HTMLElement, variacion: HTMLElement }} elementos
 * @param {{ total: number, pctNacionales: number|null, pctExtranjeros: number|null }} k resultado de kpis()
 * @param {{ anioAnterior: number|null, variacion: number|null }} v resultado de variacionInteranual()
 */
export function pintarKpis(elementos, k, v) {
  animarNumero(elementos.total, k.total, numero);
  animarNumero(elementos.nacionales, Math.round((k.pctNacionales ?? 0) * 1000), (x) => (k.pctNacionales === null ? '—' : porcentaje(x / 1000)));
  animarNumero(elementos.extranjeros, Math.round((k.pctExtranjeros ?? 0) * 1000), (x) => (k.pctExtranjeros === null ? '—' : porcentaje(x / 1000)));

  // Paso 2: variación con flecha y color según el sentido
  const texto = textoVariacion(v.variacion);
  const caja = elementos.variacion;
  caja.classList.remove('sube', 'baja', 'neutra');
  if (texto === null) {
    caja.classList.add('neutra');
    caja.textContent = TEXTOS.sinComparacion;
    return;
  }
  caja.classList.add(v.variacion > 0 ? 'sube' : v.variacion < 0 ? 'baja' : 'neutra');
  caja.textContent = `${v.variacion > 0 ? '▲' : v.variacion < 0 ? '▼' : '■'} ${TEXTOS.variacion(texto, v.anioAnterior)}`;
}
