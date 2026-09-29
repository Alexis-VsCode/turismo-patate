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
 */
export function filtrar(filas, filtros, ignorar = []) {
  const usa = (clave) => !ignorar.includes(clave) && filtros[clave] !== '' && filtros[clave] !== null;
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

/** Tarjetas: total, nacionales y extranjeros; los porcentajes son null sin visitantes. */
export function kpis(filas) {
  const todos = total(filas);
  const nacionales = total(filas.filter((f) => f.nacional));
  const extranjeros = todos - nacionales;
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

/** Evolución de 12 meses del año de referencia y del anterior (null en meses sin datos del año actual). */
export function evolucionMensual(filas, anio) {
  const serie = (a) => {
    const valores = Array(12).fill(0);
    for (const f of filas) if (f.anio === a) valores[f.mes] += f.cantidad;
    return valores;
  };
  const actual = serie(anio);
  const ultimoMes = filas.reduce((max, f) => (f.anio === anio ? Math.max(max, f.mes) : max), -1);
  return {
    anio, anioAnterior: anio - 1,
    actual: actual.map((v, i) => (i > ultimoMes ? null : v)),
    anterior: serie(anio - 1),
  };
}

/** Lista ordenada de mayor a menor a partir de un Map de sumas. */
export function ordenar(mapa) {
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
