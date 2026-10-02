/**
 * @file enlace.js
 * @description Dominio. Enlace compartible: los filtros viajan en el texto de la URL (después del #) y se reconstruyen con
 *   validación estricta, porque quien abre un enlace puede haberlo editado a mano. Funciones puras; no tocan la página.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { filtrosVacios, valoresDeFiltro } from './filtros.js';
import { RANGOS_EDAD } from './visitante.js';

/** Clave corta de cada filtro de varias opciones en la URL. */
const CLAVES = Object.freeze({ establecimiento: 'e', procedencia: 'p', motivo: 'mo', rangoEdad: 'ed', genero: 'g' });
const MAXIMO_OPCIONES = 20;
const MAXIMO_LARGO = 80;
const PROCEDENCIA_VALIDA = /^(NAC|EXT|(C|P|PR):.+)$/;

/** Número entero dentro de un rango, o null. */
function enteroEn(texto, minimo, maximo) {
  if (!/^-?\d+$/.test(texto ?? '')) return null;
  const n = Number(texto);
  return n >= minimo && n <= maximo ? n : null;
}

/**
 * Texto de URL para unos filtros, listo para ir después del #.
 * @param {object} filtros estado de filtros (ver filtrosVacios)
 * @returns {string} vacío si no hay ningún filtro
 */
export function filtrosATexto(filtros) {
  const parametros = new URLSearchParams();
  for (const [campo, clave] of Object.entries(CLAVES)) {
    for (const valor of valoresDeFiltro(filtros[campo])) parametros.append(clave, valor);
  }
  if (filtros.anio !== null && filtros.anio !== undefined) parametros.append('a', String(filtros.anio));
  if (filtros.mes !== null && filtros.mes !== undefined) parametros.append('m', String(filtros.mes));
  return parametros.toString();
}

/**
 * Filtros que describe un texto de URL. Lo que no se reconoce o no cumple las reglas se descarta en silencio.
 * @param {string} texto lo que va después del #, con o sin el # inicial
 * @returns {object} estado de filtros (ver filtrosVacios)
 */
export function textoAFiltros(texto) {
  const parametros = new URLSearchParams(String(texto ?? '').replace(/^#/, ''));
  const filtros = filtrosVacios();
  // Paso 1: listas de varias opciones, sin repetidos, con tope de cantidad y de largo
  const admitido = {
    establecimiento: (v) => v.length > 0,
    procedencia: (v) => PROCEDENCIA_VALIDA.test(v),
    motivo: (v) => v.length > 0,
    rangoEdad: (v) => RANGOS_EDAD.includes(v),
    genero: (v) => v.length > 0,
  };
  for (const [campo, clave] of Object.entries(CLAVES)) {
    const validos = parametros.getAll(clave).filter((v) => v.length <= MAXIMO_LARGO && admitido[campo](v));
    filtros[campo] = [...new Set(validos)].slice(0, MAXIMO_OPCIONES);
  }
  // Paso 2: año y mes, de una sola opción
  filtros.anio = enteroEn(parametros.get('a'), 2000, 2100);
  filtros.mes = enteroEn(parametros.get('m'), 0, 11);
  return filtros;
}
