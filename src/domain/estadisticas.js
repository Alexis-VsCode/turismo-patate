/**
 * @file estadisticas.js
 * @description Dominio. Cálculos del dashboard como funciones puras sobre filas normalizadas. Ningún gráfico
 *   calcula por su cuenta: todos consumen lo que devuelve este módulo. Total de visitantes = suma de
 *   Cantidad de las filas filtradas.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { esClaveSegura } from './texto.js';
import { RANGOS_EDAD } from './visitante.js';

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

/** Suma Cantidad agrupando por la clave que devuelve `claveDe`; descarta claves inseguras o vacías. */
export function sumaPor(filas, claveDe) {
  const acumulado = new Map();
  for (const fila of filas) {
    const clave = claveDe(fila);
    if (!esClaveSegura(clave)) continue;
    acumulado.set(clave, (acumulado.get(clave) || 0) + fila.cantidad);
  }
  return acumulado;
}

const total = (filas) => filas.reduce((suma, f) => suma + f.cantidad, 0);

/**
 * Tarjetas: total, nacionales y extranjeros; los porcentajes son null sin visitantes.
 * @param {Array<object>} filas filas ya filtradas
 * @returns {{ total: number, nacionales: number, extranjeros: number, pctNacionales: number|null, pctExtranjeros: number|null }}
 */
export function kpis(filas) {
  // Paso 1: los extranjeros salen por diferencia, así nacionales + extranjeros siempre suman el total
  const todos = total(filas);
  const nacionales = total(filas.filter((f) => f.nacional));
  const extranjeros = todos - nacionales;
  // Paso 2: sin visitantes los porcentajes son null (se muestran «—»), no 0 %
  return {
    total: todos, nacionales, extranjeros,
    pctNacionales: todos ? nacionales / todos : null,
    pctExtranjeros: todos ? extranjeros / todos : null,
  };
}

/** Año de referencia: el filtrado o, sin filtro, el más reciente con datos. */
export function anioDeReferencia(filas, anioFiltrado) {
  if (anioFiltrado) return anioFiltrado;
  return filas.reduce((max, f) => Math.max(max, f.anio), 0) || null;
}

/**
 * Evolución de 12 meses del año de referencia y del anterior (null en meses sin datos del año actual).
 * @param {Array<object>} filas filas filtradas sin restringir año ni mes
 * @param {number|null} anio año de referencia (ver anioDeReferencia)
 * @returns {{ anio: number|null, anioAnterior: number|null, actual: Array<number|null>, anterior: number[] }}
 */
export function evolucionMensual(filas, anio) {
  // Paso 1: sin año de referencia no hay nada que comparar; no se inventa un «año anterior»
  if (!anio) return { anio: null, anioAnterior: null, actual: Array(12).fill(null), anterior: Array(12).fill(0) };
  // Paso 2: una serie de 12 meses por año
  const serie = (a) => {
    const valores = Array(12).fill(0);
    for (const f of filas) if (f.anio === a) valores[f.mes] += f.cantidad;
    return valores;
  };
  const actual = serie(anio);
  // Paso 3: los meses posteriores al último con datos del año actual quedan en null, no en 0
  const ultimoMes = filas.reduce((max, f) => (f.anio === anio ? Math.max(max, f.mes) : max), -1);
  return {
    anio, anioAnterior: anio - 1,
    actual: actual.map((v, i) => (i > ultimoMes ? null : v)),
    anterior: serie(anio - 1),
  };
}

/**
 * Variación del período elegido contra el mismo período del año anterior.
 * Con mes elegido compara ese mes; sin mes, compara de enero al último mes con datos del año de referencia
 * (lo que va del año), para no enfrentar un año incompleto contra uno completo.
 * @param {Array<object>} filas filas normalizadas
 * @param {object} filtros estado de filtros
 * @returns {{ anio: number|null, anioAnterior: number|null, actual: number, anterior: number, variacion: number|null }}
 */
export function variacionInteranual(filas, filtros) {
  // Paso 1: misma base que la evolución mensual (todos los filtros salvo el período)
  const base = filtrar(filas, filtros, ['anio', 'mes']);
  const anio = anioDeReferencia(base, filtros.anio);
  if (!anio) return { anio: null, anioAnterior: null, actual: 0, anterior: 0, variacion: null };
  // Paso 2: meses comparables
  const ultimoMes = base.reduce((max, f) => (f.anio === anio ? Math.max(max, f.mes) : max), -1);
  const enPeriodo = (mes) => (filtros.mes === null || filtros.mes === undefined ? mes <= ultimoMes : mes === filtros.mes);
  // Paso 3: totales de ambos años y variación relativa (null sin base)
  let actual = 0;
  let anterior = 0;
  for (const f of base) {
    if (!enPeriodo(f.mes)) continue;
    if (f.anio === anio) actual += f.cantidad;
    else if (f.anio === anio - 1) anterior += f.cantidad;
  }
  return { anio, anioAnterior: anio - 1, actual, anterior, variacion: anterior ? (actual - anterior) / anterior : null };
}

/** Lista ordenada de mayor a menor a partir de un Map de sumas. */
function ordenar(mapa) {
  return [...mapa.entries()].map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, 'es'));
}

export const porMotivo = (filas) => ordenar(sumaPor(filas, (f) => f.motivo));
export const porCiudad = (filas) => ordenar(sumaPor(filas.filter((f) => f.nacional), (f) => f.ciudad));
export const porProvincia = (filas) => ordenar(sumaPor(filas.filter((f) => f.nacional), (f) => f.provincia));
export const porPais = (filas) => ordenar(sumaPor(filas.filter((f) => !f.nacional), (f) => f.pais));

/** Barras agrupadas por rango de edad y género, en el orden de rangos y géneros dados. */
export function edadGenero(filas, generos) {
  const suma = sumaPor(filas, (f) => `${f.rangoEdad}|${f.genero}`);
  return {
    rangos: [...RANGOS_EDAD],
    series: generos.map((genero) => ({ genero, valores: RANGOS_EDAD.map((r) => suma.get(`${r}|${genero}`) || 0) })),
  };
}

/** Opciones de los combos a partir de los datos cargados. */
export function opcionesDeFiltros(filas) {
  const unicos = (fn) => [...new Set(filas.map(fn))];
  return {
    anios: unicos((f) => f.anio).sort((a, b) => b - a),
    ciudades: unicos((f) => (f.nacional ? f.ciudad : '')).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
    paises: unicos((f) => (f.nacional ? '' : f.pais)).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
    motivos: unicos((f) => f.motivo).sort((a, b) => a.localeCompare(b, 'es')),
  };
}
