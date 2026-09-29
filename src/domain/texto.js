/**
 * @file texto.js
 * @description Dominio. Reglas puras sobre texto que llega de la hoja: limpieza y claves seguras
 *   para agrupar sin riesgo de contaminar prototipos.
 * @author Kevin Alexis Barrera Llerena 2026
 */

const CLAVES_PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
const LARGO_MAXIMO_TEXTO = 120;

/**
 * Convierte cualquier valor de celda en texto plano seguro: sin caracteres de control,
 * espacios colapsados, recortado y con largo máximo. Nunca devuelve HTML interpretable
 * porque la interfaz solo escribe con textContent.
 */
export function limpiarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LARGO_MAXIMO_TEXTO);
}

/** Indica si un texto puede usarse como clave de agrupación sin riesgo de contaminar prototipos. */
export function esClaveSegura(clave) {
  return typeof clave === 'string' && clave.length > 0 && !CLAVES_PROHIBIDAS.has(clave);
}
