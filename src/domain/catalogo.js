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
const ANIO_CATALOGO_MINIMO = 2000;
const ANIO_CATALOGO_MAXIMO = 2100;
/** Rectángulo que contiene a Ecuador con sus islas: una ciudad fuera de él es un error de captura. */
const LIMITES_ECUADOR = Object.freeze({ latMin: -5.1, latMax: 1.5, lonMin: -92, lonMax: -75 });
const COLUMNAS_OBLIGATORIAS = Object.freeze(['anio', 'mes', 'pais', 'cantidad', 'motivo', 'edad', 'genero']);

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
 * @param {Array<Array>|null} filasCatalogo filas de la pestaña `_Catalogos`, o null si no existe
 * @returns {{ completo: boolean, avisos: string[], anios: number[], paises: string[], motivos: string[], generos: string[], provincias: string[],
 *   ciudades: Map<string, object>, coordPaises: Map<string, object> }}
 */
export function construirCatalogo(filasCatalogo) {
  const catalogo = {
    completo: false, avisos: [], anios: [], paises: [], motivos: [], generos: [...GENEROS_BASE], provincias: [],
    ciudades: new Map(), coordPaises: new Map(),
  };
  if (!Array.isArray(filasCatalogo) || filasCatalogo.length < 2) return catalogo;
  const enc = filasCatalogo[0].map(claveNormalizada);
  const col = (nombre) => enc.indexOf(nombre);
  const c = {
    anio: enc.findIndex((h) => ENCABEZADOS.anio.includes(h)), pais: col('pais'), ciudad: col('ciudad'), lat: col('ciudad_lat'), lon: col('ciudad_lon'),
    provincia: col('provincia'), ciudadProv: col('ciudad_provincia'),
    paisLat: col('pais_lat'), paisLon: col('pais_lon'), motivo: col('motivo'), genero: col('genero'),
  };
  const agregarUnico = (lista, valor) => {
    const texto = limpiarTexto(valor);
    if (texto && !lista.some((v) => claveNormalizada(v) === claveNormalizada(texto))) lista.push(texto);
  };
  const generos = [];
  const ciudadesCrudas = [];
  for (const fila of filasCatalogo.slice(1)) {
    // Paso 1: listas simples de cada columna; los años solo cuentan si son enteros razonables
    const anio = Number(limpiarTexto(fila[c.anio]));
    if (Number.isInteger(anio) && anio >= ANIO_CATALOGO_MINIMO && anio <= ANIO_CATALOGO_MAXIMO && !catalogo.anios.includes(anio)) {
      catalogo.anios.push(anio);
    }
    agregarUnico(catalogo.paises, fila[c.pais]);
    agregarUnico(catalogo.motivos, fila[c.motivo]);
    agregarUnico(catalogo.provincias, fila[c.provincia]);
    agregarUnico(generos, fila[c.genero]);
    // Paso 2: ciudad con su provincia y coordenadas; se revisa después, cuando ya se conocen todas las provincias
    const ciudad = limpiarTexto(fila[c.ciudad]);
    const lat = Number(fila[c.lat]);
    const lon = Number(fila[c.lon]);
    if (ciudad && Number.isFinite(lat) && Number.isFinite(lon)) {
      ciudadesCrudas.push({ nombre: ciudad, provincia: limpiarTexto(fila[c.ciudadProv]), lat, lon });
    }
    // Paso 3: coordenadas del país, alineadas con la columna País
    const pais = limpiarTexto(fila[c.pais]);
    const pLat = Number(fila[c.paisLat]);
    const pLon = Number(fila[c.paisLon]);
    if (pais && Number.isFinite(pLat) && Number.isFinite(pLon)) {
      catalogo.coordPaises.set(claveNormalizada(pais), { nombre: pais, lat: pLat, lon: pLon });
    }
  }
  // Paso 4: cada ciudad se acepta si no se repite y cae dentro de Ecuador; la provincia ajena a la lista solo avisa
  const claveProvincias = new Set(catalogo.provincias.map(claveNormalizada));
  for (const ciudad of ciudadesCrudas) {
    const clave = claveNormalizada(ciudad.nombre);
    if (catalogo.ciudades.has(clave)) {
      catalogo.avisos.push(`Ciudad repetida en el catálogo: «${ciudad.nombre}» (se conserva la primera)`);
      continue;
    }
    const { latMin, latMax, lonMin, lonMax } = LIMITES_ECUADOR;
    if (ciudad.lat < latMin || ciudad.lat > latMax || ciudad.lon < lonMin || ciudad.lon > lonMax) {
      catalogo.avisos.push(`Ciudad fuera de Ecuador por sus coordenadas: «${ciudad.nombre}» (se omite)`);
      continue;
    }
    if (claveProvincias.size && ciudad.provincia && !claveProvincias.has(claveNormalizada(ciudad.provincia))) {
      catalogo.avisos.push(`La provincia «${ciudad.provincia}» de la ciudad «${ciudad.nombre}» no está en la lista de provincias`);
    }
    catalogo.ciudades.set(clave, ciudad);
  }
  // Paso 5: los años se ofrecen del más reciente al más antiguo
  catalogo.anios.sort((a, b) => b - a);
  // Paso 6: el catálogo es «completo» solo con países, motivos y ciudades; si no, el mapa avisa que faltan ubicaciones
  if (generos.length) catalogo.generos = generos;
  catalogo.completo = catalogo.paises.length > 0 && catalogo.motivos.length > 0 && catalogo.ciudades.size > 0;
  return catalogo;
}
