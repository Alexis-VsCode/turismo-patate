/**
 * @file estadisticas.js
 * @description Dominio. Cálculos del dashboard como funciones puras sobre filas normalizadas. Ningún gráfico
 *   calcula por su cuenta: todos consumen lo que devuelve este módulo. Total de visitantes = suma de
 *   Cantidad de las filas filtradas.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { esClaveSegura } from './texto.js';
import { claveNormalizada } from './catalogo.js';
import { RANGOS_EDAD, MESES } from './visitante.js';
import { filtrar, valoresDeFiltro, leerProcedencia } from './filtros.js';

/**
 * Suma Cantidad agrupando por la clave que devuelve `claveDe`; descarta claves inseguras o vacías.
 * @param {Array<{ cantidad: number }>} filas filas normalizadas
 * @param {(fila: object) => string} claveDe clave de agrupación de cada fila
 * @returns {Map<string, number>} visitantes por clave, en el orden en que aparece cada una
 */
export function sumaPor(filas, claveDe) {
  const acumulado = new Map();
  for (const fila of filas) {
    const clave = claveDe(fila);
    if (!esClaveSegura(clave)) continue;
    acumulado.set(clave, (acumulado.get(clave) || 0) + fila.cantidad);
  }
  return acumulado;
}

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
  // Paso 2: sin visitantes los porcentajes son null (se muestran como «sin dato»), no 0 %
  return {
    total: todos, nacionales, extranjeros,
    pctNacionales: todos ? nacionales / todos : null,
    pctExtranjeros: todos ? extranjeros / todos : null,
  };
}

/**
 * Año de referencia: el filtrado o, sin filtro, el más reciente con datos.
 * @param {Array<{ anio: number }>} filas filas filtradas sin restringir el año
 * @param {number|null} anioFiltrado año elegido en el filtro, o null
 * @returns {number|null} el año; null si no hay filtro ni filas
 */
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

/**
 * Visitantes por motivo, de mayor a menor (a igual cifra, por nombre).
 * @param {Array<object>} filas filas filtradas
 * @returns {Array<{ nombre: string, valor: number }>}
 */
export const porMotivo = (filas) => ordenar(sumaPor(filas, (f) => f.motivo));

/**
 * Visitantes nacionales por ciudad, de mayor a menor; una fila sin ciudad no cuenta.
 * @param {Array<object>} filas filas filtradas
 * @returns {Array<{ nombre: string, valor: number }>}
 */
export const porCiudad = (filas) => ordenar(sumaPor(filas.filter((f) => f.nacional), (f) => f.ciudad));

/**
 * Visitantes nacionales por provincia, de mayor a menor; una fila sin provincia no cuenta.
 * @param {Array<object>} filas filas filtradas
 * @returns {Array<{ nombre: string, valor: number }>}
 */
export const porProvincia = (filas) => ordenar(sumaPor(filas.filter((f) => f.nacional), (f) => f.provincia));

/**
 * Visitantes extranjeros por país, de mayor a menor.
 * @param {Array<object>} filas filas filtradas
 * @returns {Array<{ nombre: string, valor: number }>}
 */
export const porPais = (filas) => ordenar(sumaPor(filas.filter((f) => !f.nacional), (f) => f.pais));

/**
 * Barras agrupadas por rango de edad y género, en el orden de rangos y géneros dados.
 * @param {Array<object>} filas filas filtradas
 * @param {string[]} generos géneros del catálogo, en el orden en que se leen
 * @returns {{ rangos: string[], series: Array<{ genero: string, valores: number[] }> }} un valor por rango en cada
 *   serie; cero donde no hay visitantes
 */
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
 * @returns {{ anios: number[], ciudades: string[], paises: string[], motivos: string[] }} años de mayor a menor y
 *   lo demás en orden alfabético, sin repetidos (los motivos se comparan sin tildes ni mayúsculas)
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

/**
 * Opciones facetadas de cada combo: salen de las filas que cumplen todos los demás filtros activos, menos el propio, así
 * un filtro nunca reduce sus propias opciones y se le puede sumar una segunda. Sin otro filtro activo son las de
 * siempre: todo el libro, los años y motivos del catálogo, los doce meses, los cuatro rangos de edad, los géneros del
 * catálogo y todos los establecimientos. Una opción ya elegida se conserva aunque quede sin datos, para poder quitarla.
 * @param {Array<object>} filas visitantes ya normalizados
 * @param {object} filtros estado de filtros (ver filtrosVacios)
 * @param {{ catalogo?: { anios?: number[], motivos?: string[], generos?: string[] }, establecimientos?: string[] }} contexto
 *   listas del catálogo y todas las pestañas de establecimiento, en su orden
 * @returns {{ establecimiento: string[], anio: number[], mes: number[], rangoEdad: string[], genero: string[], motivo: string[],
 *   procedencia: { atajos: string[], provincias: string[], ciudades: string[], paises: string[] } }} valores de cada
 *   combo: años de mayor a menor, meses por número, lugares y motivos en orden alfabético y lo demás en su orden fijo
 */
export function opcionesFacetadas(filas, filtros, { catalogo = {}, establecimientos = [] } = {}) {
  // Paso 1: la base de cada combo ignora su propio filtro; si ningún otro está activo, el combo ofrece lo de siempre
  const faceta = (clave) => ({ base: filtrar(filas, filtros, [clave]), libre: !hayOtroFiltro(filtros, clave) });
  const elegidas = (clave) => valoresDeFiltro(filtros[clave]);
  const alfabetico = (lista) => lista.sort((a, b) => a.localeCompare(b, 'es'));
  // Paso 2: las listas de orden fijo se recortan a lo que tiene la base, más lo elegido
  const enOrden = (clave, fijas, deFila) => {
    const { base, libre } = faceta(clave);
    const presentes = new Set(base.map(deFila));
    const conservar = elegidas(clave);
    const ofrecidas = libre ? [...fijas] : fijas.filter((v) => presentes.has(v) || conservar.includes(v));
    return [...ofrecidas, ...conservar.filter((v) => !ofrecidas.includes(v))];
  };
  // Paso 3: años y motivos suman el catálogo solo sin otros filtros, porque un año sin visitantes vaciaría la vista
  const anio = faceta('anio');
  const motivo = faceta('motivo');
  const deAnios = opcionesDeFiltros(anio.base, anio.libre ? catalogo : {}).anios;
  const deMotivos = opcionesDeFiltros(motivo.base, motivo.libre ? catalogo : {}).motivos;
  return {
    establecimiento: enOrden('establecimiento', establecimientos, (f) => f.establecimiento),
    anio: [...new Set([...deAnios, ...elegidas('anio')])].sort((a, b) => b - a),
    mes: enOrden('mes', MESES.map((_, i) => i), (f) => f.mes).sort((a, b) => a - b),
    procedencia: opcionesDeProcedencia(faceta('procedencia'), elegidas('procedencia'), alfabetico),
    motivo: alfabetico([...new Set([...deMotivos, ...elegidas('motivo')])]),
    rangoEdad: enOrden('rangoEdad', RANGOS_EDAD, (f) => f.rangoEdad),
    genero: enOrden('genero', catalogo.generos || [], (f) => f.genero),
  };
}

/**
 * Resumen de lo cargado, en las unidades de la hoja y no en filas internas: una fila de la hoja (mes, origen y motivo
 * de un establecimiento) se reparte en varias filas internas, una por casilla de edad y género con visitantes.
 * @param {Array<object>} filas filas internas ya validadas
 * @param {string[]} establecimientos todas las pestañas de establecimiento, tengan datos o no
 * @returns {{ registros: number, conDatos: number, establecimientos: number, desde: ?{ anio: number, mes: number },
 *   hasta: ?{ anio: number, mes: number } }} `desde` y `hasta` son el primer y el último mes con datos, o null sin filas
 */
export function resumenCarga(filas, establecimientos) {
  const registros = new Set(filas.map((f) => [f.establecimiento, f.anio, f.mes, f.pais, f.provincia, f.ciudad, f.motivo].join('\u0001')));
  // Paso 1: el periodo se mide en meses corridos (año * 12 + mes) para comparar sin fechas
  const meses = filas.map((f) => f.anio * 12 + f.mes);
  const mes = (n) => ({ anio: Math.floor(n / 12), mes: n % 12 });
  return {
    registros: registros.size,
    conDatos: new Set(filas.map((f) => f.establecimiento)).size,
    establecimientos: establecimientos.length,
    desde: meses.length ? mes(Math.min(...meses)) : null,
    hasta: meses.length ? mes(Math.max(...meses)) : null,
  };
}

const total = (filas) => filas.reduce((suma, f) => suma + f.cantidad, 0);

/** Lista ordenada de mayor a menor a partir de un Map de sumas. */
function ordenar(mapa) {
  return [...mapa.entries()].map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Indica si hay algún filtro activo además de `clave`: una lista con opciones, o un año o mes elegidos (enero es 0). */
function hayOtroFiltro(filtros, clave) {
  return Object.entries(filtros).some(([campo, valor]) => campo !== clave && valoresDeFiltro(valor).length > 0);
}

/** Atajos, provincias, ciudades y países que ofrece el combo de procedencia, con las opciones elegidas conservadas. */
function opcionesDeProcedencia({ base, libre }, elegidas, alfabetico) {
  const nacionales = base.filter((f) => f.nacional);
  const nombres = (tipo) => elegidas.map(leerProcedencia).filter((p) => p.tipo === tipo).map((p) => p.nombre);
  const unir = (deFilas, tipo) => alfabetico([...new Set([...deFilas.filter(Boolean), ...nombres(tipo)])]);
  const hay = { NAC: libre || nacionales.length > 0, EXT: libre || nacionales.length < base.length };
  return {
    atajos: ['NAC', 'EXT'].filter((a) => hay[a] || elegidas.includes(a)),
    provincias: unir(nacionales.map((f) => f.provincia), 'PR'),
    ciudades: unir(nacionales.map((f) => f.ciudad), 'C'),
    paises: unir(base.filter((f) => !f.nacional).map((f) => f.pais), 'P'),
  };
}
