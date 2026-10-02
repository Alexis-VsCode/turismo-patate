/**
 * @file visitante.js
 * @description Dominio. Normalización de filas crudas de las pestañas de establecimiento contra el catálogo
 *   publicado en `_Catalogos`. Cada fila termina limpia o rechazada con un motivo legible: nunca se
 *   descarta en silencio.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { limpiarTexto } from './texto.js';
import { claveNormalizada, canonico } from './catalogo.js';

export const MESES = Object.freeze([
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]);
export const RANGOS_EDAD = Object.freeze(['0-30', '31-45', '46-60', '61+']);
const EDAD_MAXIMA = 110;
const ANIO_MINIMO = 2000;
const ANIO_MAXIMO = 2100;

/** Errores de escritura frecuentes de meses, ya normalizados, hacia el índice de mes (0-11). */
const MESES_ALIAS = new Map([
  ['setiembre', 8], ['agosoto', 7], ['agsto', 7], ['febero', 1], ['obtubre', 9],
  ['ene', 0], ['feb', 1], ['mar', 2], ['abr', 3], ['may', 4], ['jun', 5],
  ['jul', 6], ['ago', 7], ['sep', 8], ['sept', 8], ['oct', 9], ['nov', 10], ['dic', 11],
]);

/** Rango de edad de un entero ya validado. */
export function rangoDeEdad(edad) {
  if (edad <= 30) return RANGOS_EDAD[0];
  if (edad <= 45) return RANGOS_EDAD[1];
  if (edad <= 60) return RANGOS_EDAD[2];
  return RANGOS_EDAD[3];
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

/** Año y mes de una fila; devuelve `{ error }` con un motivo legible si alguno no es válido. */
function leerPeriodo(celda) {
  const anio = enteroEn(celda('anio'), ANIO_MINIMO, ANIO_MAXIMO);
  if (anio === null) return { error: `Año no válido: «${limpiarTexto(celda('anio'))}»` };
  const mes = indiceDeMes(celda('mes'));
  if (mes < 0) return { error: `Mes no válido: «${limpiarTexto(celda('mes'))}»` };
  return { anio, mes };
}

/** País, nacionalidad, provincia y ciudad; solo los nacionales conservan provincia y ciudad. */
function leerOrigen(celda, catalogo, paisLocal) {
  // Paso 1: país y nacionalidad; el país decide si aplican provincia y ciudad
  const paisTexto = limpiarTexto(celda('pais'));
  if (!paisTexto) return { error: 'País vacío' };
  const pais = catalogo.paises.length ? canonico(catalogo.paises, paisTexto) : paisTexto;
  if (!pais) return { error: `País fuera del catálogo: «${paisTexto}»` };
  const nacional = claveNormalizada(pais) === claveNormalizada(paisLocal);
  // Paso 2: ciudad y provincia solo para nacionales; la provincia del catálogo manda sobre la escrita
  let ciudad = '';
  let provincia = '';
  if (nacional) {
    const ciudadTexto = limpiarTexto(celda('ciudad'));
    const ciudadCat = catalogo.ciudades.get(claveNormalizada(ciudadTexto));
    if (ciudadTexto && !ciudadCat && catalogo.ciudades.size) {
      return { error: `Ciudad fuera del catálogo: «${ciudadTexto}»` };
    }
    ciudad = ciudadCat ? ciudadCat.nombre : ciudadTexto;
    const provinciaTexto = limpiarTexto(celda('provincia'));
    provincia = (catalogo.provincias.length ? canonico(catalogo.provincias, provinciaTexto) : provinciaTexto) || '';
    if (ciudadCat && ciudadCat.provincia) provincia = ciudadCat.provincia;
  }
  return { pais, nacional, ciudad, provincia };
}

/** Motivo contra el catálogo; si el catálogo no trae motivos se acepta el texto escrito. */
function leerMotivo(celda, catalogo) {
  const motivoTexto = limpiarTexto(celda('motivo'));
  const motivo = catalogo.motivos.length ? canonico(catalogo.motivos, motivoTexto) : motivoTexto;
  return motivo ? { motivo } : { error: `Motivo fuera del catálogo: «${motivoTexto}»` };
}

/**
 * Normaliza una fila cruda de una pestaña de establecimiento.
 * @param {Array} cruda celdas de la fila tal como salen de la hoja
 * @param {object} indices posición de cada columna (ver mapearEncabezados)
 * @param {object} catalogo catálogo de listas y coordenadas (ver construirCatalogo)
 * @param {string} paisLocal país que define a un visitante como nacional
 * @returns {{ ok: true, fila: object } | { ok: false, motivo: string }} la fila limpia o el motivo, escrito para
 *   quien llena la hoja
 */
export function normalizarFila(cruda, indices, catalogo, paisLocal) {
  const celda = (campo) => (indices[campo] === undefined ? null : cruda[indices[campo]]);

  // Paso 1: período
  const periodo = leerPeriodo(celda);
  if (periodo.error) return { ok: false, motivo: periodo.error };

  // Paso 2: cantidad y edad
  const cantidad = enteroEn(celda('cantidad'), 1, 100000);
  if (cantidad === null) return { ok: false, motivo: `Cantidad no válida: «${limpiarTexto(celda('cantidad'))}»` };
  const edad = enteroEn(celda('edad'), 0, EDAD_MAXIMA);
  if (edad === null) return { ok: false, motivo: `Edad no válida: «${limpiarTexto(celda('edad'))}»` };

  // Paso 3: origen y motivo
  const origen = leerOrigen(celda, catalogo, paisLocal);
  if (origen.error) return { ok: false, motivo: origen.error };
  const motivo = leerMotivo(celda, catalogo);
  if (motivo.error) return { ok: false, motivo: motivo.error };

  // Paso 4: género contra el catálogo
  const generoTexto = limpiarTexto(celda('genero'));
  const genero = canonico(catalogo.generos, generoTexto);
  if (!genero) return { ok: false, motivo: `Género fuera del catálogo: «${generoTexto}»` };

  // Paso 5: fila limpia; el rango de edad se deriva de la edad validada
  return {
    ok: true,
    fila: {
      anio: periodo.anio, mes: periodo.mes, pais: origen.pais, provincia: origen.provincia, ciudad: origen.ciudad,
      cantidad, motivo: motivo.motivo, edad, rangoEdad: rangoDeEdad(edad), genero, nacional: origen.nacional,
    },
  };
}
