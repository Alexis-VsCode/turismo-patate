/**
 * @file filtros.js
 * @description Dominio. Estado de los filtros del tablero y su aplicación sobre las filas normalizadas, como
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
 */
export function filtrosVacios() {
  return { establecimiento: [], anio: null, mes: null, procedencia: [], motivo: [], rangoEdad: [], genero: [] };
}

/** Lista de opciones de un filtro múltiple. Acepta una lista, un valor suelto o un vacío; sin repetidos. */
export function valoresDeFiltro(valor) {
  if (Array.isArray(valor)) return [...new Set(valor)];
  return valor === '' || valor === null || valor === undefined ? [] : [valor];
}

/** Agrega la opción si no estaba y la quita si estaba. No modifica la lista recibida. */
export function alternarValor(lista, valor) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

/** Quita una opción de la lista. No modifica la lista recibida ni falla si la opción no estaba. */
export function quitarValor(lista, valor) {
  return lista.filter((v) => v !== valor);
}

/** Copia del estado de filtros que no comparte listas con el original. */
export function copiarFiltros(filtros) {
  return Object.fromEntries(Object.entries(filtros).map(([clave, valor]) => [clave, Array.isArray(valor) ? [...valor] : valor]));
}

function cumpleProcedencia(fila, procedencia) {
  if (procedencia === 'NAC') return fila.nacional;
  if (procedencia === 'EXT') return !fila.nacional;
  const separador = procedencia.indexOf(':');
  const tipo = procedencia.slice(0, separador);
  const valor = procedencia.slice(separador + 1);
  if (tipo === 'C') return fila.nacional && fila.ciudad === valor;
  if (tipo === 'PR') return fila.nacional && fila.provincia === valor;
  if (tipo === 'P') return fila.pais === valor;
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
