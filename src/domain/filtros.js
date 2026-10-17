/**
 * @file filtros.js
 * @description Dominio. Estado de los filtros del dashboard y su aplicación sobre las filas normalizadas, como
 *   funciones puras. Cinco filtros admiten varias opciones (establecimiento, procedencia, motivo, rango de edad
 *   y género); año y mes siguen siendo de una sola, porque la variación y la evolución comparan dos años.
 *   Dentro de un filtro las opciones se suman (O); entre filtros distintos se cruzan (Y). No conoce la
 *   interfaz ni la red.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Filtros que guardan una lista de opciones; una lista vacía significa «sin restricción». */
export const CLAVES_MULTIPLES = Object.freeze(['establecimiento', 'procedencia', 'motivo', 'rangoEdad', 'genero']);

/**
 * Estado de filtros vacío. Cada opción de `procedencia` es 'NAC', 'EXT', 'C:<ciudad>', 'P:<país>' o
 * 'PR:<provincia>'. Año y mes son null cuando no hay filtro (enero es 0).
 * @returns {{ establecimiento: string[], anio: null, mes: null, procedencia: string[], motivo: string[],
 *   rangoEdad: string[], genero: string[] }} un estado nuevo, sin listas compartidas
 */
export function filtrosVacios() {
  return { establecimiento: [], anio: null, mes: null, procedencia: [], motivo: [], rangoEdad: [], genero: [] };
}

/**
 * Lista de opciones de un filtro múltiple. Acepta una lista, un valor suelto o un vacío; sin repetidos.
 * @param {*} valor lista, valor suelto, '' , null o undefined
 * @returns {Array} lista nueva sin repetidos, en el orden recibido; vacía si no hay valor
 */
export function valoresDeFiltro(valor) {
  if (Array.isArray(valor)) return [...new Set(valor)];
  return valor === '' || valor === null || valor === undefined ? [] : [valor];
}

/**
 * Agrega la opción si no estaba y la quita si estaba. No modifica la lista recibida.
 * @param {Array} lista opciones elegidas
 * @param {*} valor opción que se alterna
 * @returns {Array} lista nueva con la opción al final, o sin ella
 */
export function alternarValor(lista, valor) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

/**
 * Quita una opción de la lista. No modifica la lista recibida ni falla si la opción no estaba.
 * @param {Array} lista opciones elegidas
 * @param {*} valor opción que se quita
 * @returns {Array} lista nueva sin esa opción
 */
export function quitarValor(lista, valor) {
  return lista.filter((v) => v !== valor);
}

/**
 * Copia del estado de filtros que no comparte listas con el original.
 * @param {object} filtros estado de filtros (ver filtrosVacios)
 * @returns {object} copia con listas nuevas; año y mes se copian tal cual
 */
export function copiarFiltros(filtros) {
  return Object.fromEntries(Object.entries(filtros).map(([clave, valor]) => [clave, Array.isArray(valor) ? [...valor] : valor]));
}

/**
 * Tipo y nombre de una opción de procedencia ('C:<ciudad>', 'P:<país>' o 'PR:<provincia>'). Corta en el primer «:», así
 * un nombre que lleva «:» se conserva entero. Los atajos 'NAC' y 'EXT' no llevan «:» y salen sin tipo.
 * @param {string} valor opción de procedencia
 * @returns {{ tipo: string, nombre: string }} `tipo` vacío si no hay «:»; entonces `nombre` es el valor entero
 */
export function leerProcedencia(valor) {
  const separador = valor.indexOf(':');
  if (separador < 0) return { tipo: '', nombre: valor };
  return { tipo: valor.slice(0, separador), nombre: valor.slice(separador + 1) };
}

function cumpleProcedencia(fila, procedencia) {
  if (procedencia === 'NAC') return fila.nacional;
  if (procedencia === 'EXT') return !fila.nacional;
  const { tipo, nombre } = leerProcedencia(procedencia);
  if (tipo === 'C') return fila.nacional && fila.ciudad === nombre;
  if (tipo === 'PR') return fila.nacional && fila.provincia === nombre;
  if (tipo === 'P') return fila.pais === nombre;
  return false;
}

/**
 * Aplica los filtros. `ignorar` lista claves de filtro que no se aplican,
 * p. ej. la evolución mensual ignora año y mes para mostrar los 12 meses.
 * @param {Array<object>} filas filas normalizadas
 * @param {object} filtros estado de filtros (ver filtrosVacios)
 * @param {string[]} [ignorar] claves de filtro que se dejan sin aplicar
 * @returns {Array<object>} las filas que cumplen todos los filtros activos
 */
export function filtrar(filas, filtros, ignorar = []) {
  // Paso 1: una lista vacía o ignorada no restringe; los filtros de una sola opción se comparan con null y '' porque 0 (enero) es válido
  const lista = (clave) => (ignorar.includes(clave) ? [] : valoresDeFiltro(filtros[clave]));
  const usaUnico = (clave) => !ignorar.includes(clave) && filtros[clave] !== '' && filtros[clave] !== null && filtros[clave] !== undefined;
  const establecimientos = lista('establecimiento');
  const procedencias = lista('procedencia');
  const motivos = lista('motivo');
  const rangos = lista('rangoEdad');
  const generos = lista('genero');
  // Paso 2: la fila se queda solo si cumple todos los filtros activos a la vez; dentro de cada lista basta una opción
  return filas.filter((f) =>
    (!establecimientos.length || establecimientos.includes(f.establecimiento)) &&
    (!usaUnico('anio') || f.anio === filtros.anio) &&
    (!usaUnico('mes') || f.mes === filtros.mes) &&
    (!procedencias.length || procedencias.some((p) => cumpleProcedencia(f, p))) &&
    (!motivos.length || motivos.includes(f.motivo)) &&
    (!rangos.length || rangos.includes(f.rangoEdad)) &&
    (!generos.length || generos.includes(f.genero)));
}
