/**
 * @file estadisticas.js
 * @description Dominio. Cálculos del dashboard como funciones puras sobre filas normalizadas. Ningún gráfico
 *   calcula por su cuenta: todos consumen lo que devuelve este módulo. Total de visitantes = suma de
 *   Cantidad de las filas filtradas.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { esClaveSegura } from './texto.js';
import { claveNormalizada } from './catalogo.js';
import { RANGOS_EDAD } from './visitante.js';
import { filtrar } from './filtros.js';

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

/**
 * Opciones de los combos. Años y motivos son listas cortas que la hoja también ofrece en sus desplegables, así que
 * se unen los que tienen visitantes con los del catálogo; ciudades y países salen solo de los visitantes.
 * @param {Array<object>} filas visitantes ya normalizados
 * @param {{ anios?: number[], motivos?: string[] }} [catalogo] listas del catálogo de la hoja
 */
export function opcionesDeFiltros(filas, catalogo = {}) {
  const unicos = (fn) => [...new Set(filas.map(fn))];
  const unir = (deLasFilas, delCatalogo, clave = (v) => v) => {
    const vistos = new Set();
    return [...deLasFilas, ...(delCatalogo || [])].filter((v) => {
      const k = clave(v);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  };
  return {
    anios: unir(unicos((f) => f.anio), catalogo.anios).sort((a, b) => b - a),
    ciudades: unicos((f) => (f.nacional ? f.ciudad : '')).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
    paises: unicos((f) => (f.nacional ? '' : f.pais)).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
    motivos: unir(unicos((f) => f.motivo), catalogo.motivos, claveNormalizada).sort((a, b) => a.localeCompare(b, 'es')),
  };
}
