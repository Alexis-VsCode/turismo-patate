/**
 * @file filtros.js
 * @description Dominio. Estado de los filtros del tablero y su aplicación sobre las filas normalizadas, como
 *   funciones puras. No conoce la interfaz ni la red.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Estado de filtros vacío. `procedencia` admite '', 'NAC', 'EXT', 'C:<ciudad>', 'P:<país>' o 'PR:<provincia>'. */
export function filtrosVacios() {
  return { establecimiento: '', anio: null, mes: null, procedencia: '', motivo: '', rangoEdad: '', genero: '' };
}

function cumpleProcedencia(fila, procedencia) {
  if (!procedencia) return true;
  if (procedencia === 'NAC') return fila.nacional;
  if (procedencia === 'EXT') return !fila.nacional;
  const separador = procedencia.indexOf(':');
  const tipo = procedencia.slice(0, separador);
  const valor = procedencia.slice(separador + 1);
  if (tipo === 'C') return fila.nacional && fila.ciudad === valor;
  if (tipo === 'PR') return fila.nacional && fila.provincia === valor;
  if (tipo === 'P') return fila.pais === valor;
  return true;
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
  // Paso 1: un filtro vacío o ignorado no restringe; 0 (enero) es un valor válido, por eso se compara con null
  const usa = (clave) => !ignorar.includes(clave) && filtros[clave] !== '' && filtros[clave] !== null;
  // Paso 2: la fila se queda solo si cumple todos los filtros activos a la vez
  return filas.filter((f) =>
    (!usa('establecimiento') || f.establecimiento === filtros.establecimiento) &&
    (!usa('anio') || f.anio === filtros.anio) &&
    (!usa('mes') || f.mes === filtros.mes) &&
    (!usa('procedencia') || cumpleProcedencia(f, filtros.procedencia)) &&
    (!usa('motivo') || f.motivo === filtros.motivo) &&
    (!usa('rangoEdad') || f.rangoEdad === filtros.rangoEdad) &&
    (!usa('genero') || f.genero === filtros.genero));
}
