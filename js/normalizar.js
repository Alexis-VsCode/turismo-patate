/**
 * Normalización de filas crudas de las pestañas de establecimiento contra el catálogo
 * publicado en `_Catalogos`. Cada fila termina limpia o rechazada con un motivo legible:
 * nunca se descarta en silencio.
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
import { limpiarTexto } from './seguridad.js';

export const MESES = Object.freeze([
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]);
export const RANGOS_EDAD = Object.freeze(['0-17', '18-25', '26-35', '36-45', '46-59', '60+']);
const GENEROS_BASE = ['Masculino', 'Femenino'];
const EDAD_MAXIMA = 110;
const ANIO_MINIMO = 2000;
const ANIO_MAXIMO = 2100;

/** Errores de escritura frecuentes de meses, ya normalizados, hacia el índice de mes (0-11). */
const MESES_ALIAS = new Map([
  ['setiembre', 8], ['agosoto', 7], ['agsto', 7], ['febero', 1], ['obtubre', 9],
  ['ene', 0], ['feb', 1], ['mar', 2], ['abr', 3], ['may', 4], ['jun', 5],
  ['jul', 6], ['ago', 7], ['sep', 8], ['sept', 8], ['oct', 9], ['nov', 10], ['dic', 11],
]);

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

/** Rango de edad de un entero ya validado. */
export function rangoDeEdad(edad) {
  if (edad < 18) return RANGOS_EDAD[0];
  if (edad < 26) return RANGOS_EDAD[1];
  if (edad < 36) return RANGOS_EDAD[2];
  if (edad < 46) return RANGOS_EDAD[3];
  if (edad < 60) return RANGOS_EDAD[4];
  return RANGOS_EDAD[5];
}

function indiceDeMes(valor) {
  // Paso 1: número de mes (1-12) o fecha de Excel convertida a número por la hoja
  if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 12) return valor - 1;
  const clave = claveNormalizada(valor);
  if (!clave) return -1;
  // Paso 2: nombre completo o alias conocido
  const exacto = MESES.findIndex((m) => claveNormalizada(m) === clave);
  if (exacto >= 0) return exacto;
  return MESES_ALIAS.has(clave) ? MESES_ALIAS.get(clave) : -1;
}

function enteroEn(valor, minimo, maximo) {
  const numero = typeof valor === 'number' ? valor : Number(limpiarTexto(valor).replace(',', '.'));
  if (!Number.isFinite(numero) || !Number.isInteger(numero) || numero < minimo || numero > maximo) return null;
  return numero;
}

/** Busca un valor en una lista canónica por clave normalizada y devuelve la forma canónica. */
function canonico(lista, valor) {
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

/**
 * Normaliza una fila cruda de una pestaña de establecimiento.
 * Devuelve { ok: true, fila } o { ok: false, motivo } con un texto que entiende quien llena la hoja.
 */
export function normalizarFila(cruda, indices, catalogo, paisLocal) {
  const celda = (campo) => (indices[campo] === undefined ? null : cruda[indices[campo]]);

  // Paso 1: periodo
  const anio = enteroEn(celda('anio'), ANIO_MINIMO, ANIO_MAXIMO);
  if (anio === null) return { ok: false, motivo: `Año no válido: «${limpiarTexto(celda('anio'))}»` };
  const mes = indiceDeMes(celda('mes'));
  if (mes < 0) return { ok: false, motivo: `Mes no válido: «${limpiarTexto(celda('mes'))}»` };

  // Paso 2: cantidad y edad
  const cantidad = enteroEn(celda('cantidad'), 1, 100000);
  if (cantidad === null) return { ok: false, motivo: `Cantidad no válida: «${limpiarTexto(celda('cantidad'))}»` };
  const edad = enteroEn(celda('edad'), 0, EDAD_MAXIMA);
  if (edad === null) return { ok: false, motivo: `Edad no válida: «${limpiarTexto(celda('edad'))}»` };

  // Paso 3: procedencia; el país decide si es nacional y si aplican provincia y ciudad
  const paisTexto = limpiarTexto(celda('pais'));
  if (!paisTexto) return { ok: false, motivo: 'País vacío' };
  const pais = catalogo.paises.length ? canonico(catalogo.paises, paisTexto) : paisTexto;
  if (!pais) return { ok: false, motivo: `País fuera del catálogo: «${paisTexto}»` };
  const nacional = claveNormalizada(pais) === claveNormalizada(paisLocal);
  let ciudad = '';
  let provincia = '';
  if (nacional) {
    const ciudadTexto = limpiarTexto(celda('ciudad'));
    const ciudadCat = catalogo.ciudades.get(claveNormalizada(ciudadTexto));
    if (ciudadTexto && !ciudadCat && catalogo.ciudades.size) {
      return { ok: false, motivo: `Ciudad fuera del catálogo: «${ciudadTexto}»` };
    }
    ciudad = ciudadCat ? ciudadCat.nombre : ciudadTexto;
    const provinciaTexto = limpiarTexto(celda('provincia'));
    provincia = (catalogo.provincias.length ? canonico(catalogo.provincias, provinciaTexto) : provinciaTexto) || '';
    if (ciudadCat && ciudadCat.provincia) provincia = ciudadCat.provincia;
  }

  // Paso 4: motivo y género contra el catálogo
  const motivoTexto = limpiarTexto(celda('motivo'));
  const motivo = catalogo.motivos.length ? canonico(catalogo.motivos, motivoTexto) : motivoTexto;
  if (!motivo) return { ok: false, motivo: `Motivo fuera del catálogo: «${motivoTexto}»` };
  const generoTexto = limpiarTexto(celda('genero'));
  const genero = canonico(catalogo.generos, generoTexto);
  if (!genero) return { ok: false, motivo: `Género fuera del catálogo: «${generoTexto}»` };

  return {
    ok: true,
    fila: {
      anio, mes, periodo: anio * 100 + mes + 1, pais, provincia, ciudad, cantidad, motivo,
      edad, rangoEdad: rangoDeEdad(edad), genero, nacional,
    },
  };
}
