/**
 * @file catalogo.js
 * @description Dominio. Catálogo publicado en `_Catalogos` (países, ciudades con coordenadas,
 *   provincias, motivos y géneros) y reconocimiento de encabezados de las pestañas.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { limpiarTexto } from './texto.js';

const GENEROS_BASE = ['Masculino', 'Femenino'];

/** Encabezados aceptados por columna, comparados en forma normalizada. */
const ENCABEZADOS = Object.freeze({
  anio: ['ano', 'anio', 'year'],
  mes: ['mes', 'month'],
  pais: ['pais', 'country'],
  provincia: ['provincia'],
  ciudad: ['ciudad', 'city'],
  cantidad: ['cantidad', 'visitantes', 'total de visitantes'],
  motivo: ['motivo de visita', 'motivo'],
  edad: ['edad', 'age'],
  genero: ['genero', 'sexo', 'gender'],
});
export const COLUMNAS_OBLIGATORIAS = Object.freeze(['anio', 'mes', 'pais', 'cantidad', 'motivo', 'edad', 'genero']);

/** Forma comparable de un texto: sin tildes, en minúsculas y con espacios simples. */
export function claveNormalizada(valor) {
  return limpiarTexto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Ubica cada columna conocida en la fila de encabezados.
 * Devuelve { indices, faltantes } donde faltantes son columnas obligatorias ausentes.
 */
export function mapearEncabezados(filaEncabezados) {
  const indices = {};
  (filaEncabezados || []).forEach((celda, i) => {
    const clave = claveNormalizada(celda);
    for (const [campo, alias] of Object.entries(ENCABEZADOS)) {
      if (indices[campo] === undefined && alias.includes(clave)) indices[campo] = i;
    }
  });
  const faltantes = COLUMNAS_OBLIGATORIAS.filter((c) => indices[c] === undefined);
  return { indices, faltantes };
}

/** Busca un valor en una lista canónica por clave normalizada y devuelve la forma canónica. */
export function canonico(lista, valor) {
  const clave = claveNormalizada(valor);
  if (!clave) return '';
  return lista.find((v) => claveNormalizada(v) === clave) || null;
}

/**
 * Construye el catálogo a partir de las filas de `_Catalogos` (primera fila = encabezados).
 * Si la pestaña falta o viene vacía, devuelve un catálogo mínimo y `completo: false`,
 * para que el dashboard siga funcionando y avise.
 */
export function construirCatalogo(filasCatalogo) {
  const catalogo = {
    completo: false, paises: [], motivos: [], generos: [...GENEROS_BASE], provincias: [],
    ciudades: new Map(), coordPaises: new Map(),
  };
  if (!Array.isArray(filasCatalogo) || filasCatalogo.length < 2) return catalogo;
  const enc = filasCatalogo[0].map(claveNormalizada);
  const col = (nombre) => enc.indexOf(nombre);
  const c = {
    pais: col('pais'), ciudad: col('ciudad'), lat: col('ciudad_lat'), lon: col('ciudad_lon'),
    provincia: col('provincia'), ciudadProv: col('ciudad_provincia'),
    paisLat: col('pais_lat'), paisLon: col('pais_lon'), motivo: col('motivo'), genero: col('genero'),
  };
  const agregarUnico = (lista, valor) => {
    const texto = limpiarTexto(valor);
    if (texto && !lista.some((v) => claveNormalizada(v) === claveNormalizada(texto))) lista.push(texto);
  };
  const generos = [];
  for (const fila of filasCatalogo.slice(1)) {
    // Paso 1: listas simples de cada columna
    agregarUnico(catalogo.paises, fila[c.pais]);
    agregarUnico(catalogo.motivos, fila[c.motivo]);
    agregarUnico(catalogo.provincias, fila[c.provincia]);
    agregarUnico(generos, fila[c.genero]);
    // Paso 2: ciudad con su provincia y coordenadas, en la misma fila
    const ciudad = limpiarTexto(fila[c.ciudad]);
    const lat = Number(fila[c.lat]);
    const lon = Number(fila[c.lon]);
    if (ciudad && Number.isFinite(lat) && Number.isFinite(lon)) {
      catalogo.ciudades.set(claveNormalizada(ciudad), {
        nombre: ciudad, provincia: limpiarTexto(fila[c.ciudadProv]), lat, lon,
      });
    }
    // Paso 3: coordenadas del país, alineadas con la columna País
    const pais = limpiarTexto(fila[c.pais]);
    const pLat = Number(fila[c.paisLat]);
    const pLon = Number(fila[c.paisLon]);
    if (pais && Number.isFinite(pLat) && Number.isFinite(pLon)) {
      catalogo.coordPaises.set(claveNormalizada(pais), { nombre: pais, lat: pLat, lon: pLon });
    }
  }
  if (generos.length) catalogo.generos = generos;
  catalogo.completo = catalogo.paises.length > 0 && catalogo.motivos.length > 0 && catalogo.ciudades.size > 0;
  return catalogo;
}
