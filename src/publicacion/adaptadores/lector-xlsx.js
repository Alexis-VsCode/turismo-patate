/**
 * @file lector-xlsx.js
 * @description Publicación, adaptador del lector. Lectura del libro publicado con SheetJS: cada pestaña que no es de
 *   sistema es un establecimiento. Devuelve filas normalizadas, rechazos con ubicación y avisos por pestaña; una
 *   pestaña mal armada se reporta sin tumbar a las demás. Las columnas grises Nacionales y Extranjeros no se leen
 *   como dato: el país decide; si alguien las escribe a mano y contradicen al país, la fila se publica igual y se
 *   avisa, y también se avisa una fila mensual que pasa el tope de sensatez. Implementa el puerto LectorLibro y carga
 *   la copia local de SheetJS, aislada en un contexto propio.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { limpiarTexto } from '../../domain/texto.js';
import { claveNormalizada, construirCatalogo, mapearEncabezados, etiquetaDeColumna } from '../../domain/catalogo.js';
import { normalizarFila, normalizarFilaMensual } from '../../domain/visitante.js';

/** Opciones restrictivas de SheetJS para un archivo que editan terceros. */
const OPCIONES_LECTURA = Object.freeze({
  type: 'array', dense: true, cellFormula: false, cellHTML: false, cellNF: false,
  cellStyles: false, cellDates: false, sheetStubs: false, bookVBA: false, WTF: false,
});
/** Copia local de SheetJS, versionada junto a las herramientas. */
const RUTA_SHEETJS = join(dirname(fileURLToPath(import.meta.url)), '../../../tools/vendor/xlsx.mini.min.js');
/** Encabezados normalizados de las columnas grises que la hoja calcula a partir del país. */
const COLUMNAS_GRISES = Object.freeze({ nacionales: 'nacionales', extranjeros: 'extranjeros' });

/**
 * Indica si una pestaña es de sistema (catálogos, instrucciones, plantilla o su copia).
 * @param {string} nombre nombre de la pestaña
 * @returns {boolean} true si empieza por «_» o contiene «plantilla», sin importar tildes ni mayúsculas
 */
export function esPestanaDeSistema(nombre) {
  const clave = claveNormalizada(nombre);
  return clave.startsWith('_') || clave.includes('plantilla');
}

/**
 * Lee el libro y arma el conjunto de datos del dashboard.
 * @param {ArrayBuffer} buffer libro xlsx descargado
 * @param {object} XLSX instancia de SheetJS
 * @param {object} config límites y nombres de CONFIG_PUBLICACION
 * @returns {{ filas: object[], discapacidad: object[], rechazos: Array<{ pestana: string, fila: number, motivo: string }>,
 *   avisos: Array<{ pestana: string, fila?: number, mensaje: string }>, establecimientos: string[], catalogo: object }}
 *   las filas ya normalizadas, lo rechazado con su ubicación, los avisos por pestaña (con su fila si son de una fila)
 *   y los establecimientos ordenados por nombre
 */
export function leerLibro(buffer, XLSX, config) {
  const libro = XLSX.read(buffer, { ...OPCIONES_LECTURA, sheetRows: config.MAX_FILAS_PESTANA + 1 });
  const avisos = [];
  const rechazos = [];
  const filas = [];
  const discapacidad = [];
  const establecimientos = [];

  // Paso 1: catálogo; si falta, se sigue con uno mínimo y se avisa
  const hojaCatalogo = libro.Sheets[config.PESTANA_CATALOGOS];
  const catalogo = construirCatalogo(hojaCatalogo ? filasDeHoja(XLSX, hojaCatalogo) : null);
  for (const mensaje of catalogo.avisos) avisos.push({ pestana: config.PESTANA_CATALOGOS, mensaje });
  if (!catalogo.completo) avisos.push({ pestana: config.PESTANA_CATALOGOS, mensaje: 'Catálogo ausente o incompleto: el mapa puede quedar sin ubicaciones' });

  // Paso 2: pestañas de establecimiento, con tope de cantidad; un nombre vacío o repetido se omite y se avisa
  let nombres = libro.SheetNames.filter((n) => !esPestanaDeSistema(n));
  if (nombres.length > config.MAX_PESTANAS) {
    avisos.push({ pestana: '', mensaje: `Hay ${nombres.length} pestañas; se leen solo las primeras ${config.MAX_PESTANAS}` });
    nombres = nombres.slice(0, config.MAX_PESTANAS);
  }
  const vistos = new Set();
  for (const nombreCrudo of nombres) {
    const establecimiento = limpiarTexto(nombreCrudo);
    if (!establecimiento || vistos.has(claveNormalizada(establecimiento))) {
      avisos.push({ pestana: establecimiento, mensaje: 'Nombre de pestaña vacío o repetido: se omite' });
      continue;
    }
    vistos.add(claveNormalizada(establecimiento));

    // Paso 3: encabezados; si faltan columnas, se reporta la pestaña y se sigue con la siguiente
    const crudas = filasDeHoja(XLSX, libro.Sheets[nombreCrudo]);
    if (crudas.length > config.MAX_FILAS_PESTANA + 1) {
      avisos.push({ pestana: establecimiento, mensaje: `Más de ${config.MAX_FILAS_PESTANA} filas: se leen solo las primeras` });
    }
    const { indices, faltantes, formato } = mapearEncabezados(crudas[0]);
    if (formato === 'mixto') {
      avisos.push({ pestana: establecimiento, mensaje: 'Mezcla los dos formatos (Cantidad, Edad y Género con Mujeres y Hombres por rango): se omite' });
      continue;
    }
    if (faltantes.length) {
      avisos.push({ pestana: establecimiento, mensaje: `Faltan columnas: ${faltantes.map(etiquetaDeColumna).join(', ')}` });
      continue;
    }
    establecimientos.push(establecimiento);

    // Paso 4: filas de datos de la pestaña
    const grises = ubicarColumnasGrises(crudas[0]);
    leerFilasDePestana(crudas, establecimiento, { indices, formato, grises }, catalogo, config, { filas, discapacidad, rechazos, avisos });
  }
  // Paso 5: el resultado sale ordenado por nombre; el orden de los combos depende de esto
  establecimientos.sort((a, b) => a.localeCompare(b, 'es'));
  return { filas, discapacidad, rechazos, avisos, establecimientos, catalogo };
}

/**
 * Carga la copia local de SheetJS. Es UMD: se evalúa aislada en un contexto propio, igual que en el navegador como
 * script clásico.
 * @returns {object} la instancia de SheetJS (`XLSX`)
 */
export function cargarSheetJS() {
  const contexto = {};
  runInNewContext(readFileSync(RUTA_SHEETJS, 'utf8'), contexto);
  return contexto.XLSX;
}

/**
 * Lector del libro con SheetJS y los límites de la publicación.
 * @param {object} XLSX instancia de SheetJS
 * @param {object} config límites y nombres de CONFIG_PUBLICACION
 * @returns {import('../puertos.js').LectorLibro} el lector que convierte los bytes del libro en el conjunto de datos
 */
export function crearLectorXlsx(XLSX, config) {
  return { leer: (buffer) => leerLibro(buffer, XLSX, config) };
}

/** Filas de una pestaña como listas de celdas, con las vacías en null. */
function filasDeHoja(XLSX, hoja) {
  return XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null, blankrows: false });
}

/**
 * Normaliza las filas de datos de una pestaña (la fila 1 de la hoja es el encabezado) y deja cada resultado en su
 * lista: las filas internas, la discapacidad del formato mensual, los rechazos con su fila de la hoja y los avisos de
 * las filas aceptadas que conviene revisar.
 * @param {Array<Array>} crudas filas de la pestaña, encabezado incluido
 * @param {string} establecimiento nombre limpio de la pestaña
 * @param {{ indices: object, formato: 'anterior'|'mensual', grises: { nacionales?: number, extranjeros?: number } }}
 *   encabezados resultado de mapearEncabezados() más la posición de las columnas grises
 * @param {object} catalogo catálogo de la hoja (ver construirCatalogo)
 * @param {{ MAX_FILAS_PESTANA: number, PAIS_LOCAL: string, UMBRAL_FILA_SOSPECHOSA: number, MAX_AVISOS_FILA_POR_PESTANA: number }}
 *   config tope de filas, país local, tope de sensatez de una fila mensual y avisos de fila que se guardan por pestaña
 * @param {{ filas: object[], discapacidad: object[], rechazos: object[], avisos: object[] }} destino listas del libro
 *   que reciben lo leído
 */
function leerFilasDePestana(crudas, establecimiento, { indices, formato, grises }, catalogo, config, destino) {
  let filasAvisadas = 0;
  const avisadas = new Set();
  crudas.slice(1, config.MAX_FILAS_PESTANA + 1).forEach((cruda, i) => {
    if (!cruda || cruda.every((v) => limpiarTexto(v) === '')) return;
    const fila = i + 2;
    const avisar = (mensaje) => {
      if (!avisadas.has(fila)) {
        avisadas.add(fila);
        filasAvisadas += 1;
      }
      if (filasAvisadas <= config.MAX_AVISOS_FILA_POR_PESTANA) {
        destino.avisos.push({ pestana: establecimiento, fila, mensaje: `Fila ${fila}: ${mensaje}` });
      }
    };
    if (formato === 'mensual') {
      const resultado = normalizarFilaMensual(cruda, indices, catalogo, config.PAIS_LOCAL);
      if (!resultado.ok) {
        destino.rechazos.push({ pestana: establecimiento, fila, motivo: resultado.motivo });
        return;
      }
      for (const f of resultado.filas) destino.filas.push({ ...f, establecimiento });
      if (resultado.discapacidad) destino.discapacidad.push({ ...resultado.discapacidad, establecimiento });
      revisarFila(cruda, resultado.filas, grises, config.UMBRAL_FILA_SOSPECHOSA).forEach(avisar);
      return;
    }
    const resultado = normalizarFila(cruda, indices, catalogo, config.PAIS_LOCAL);
    if (!resultado.ok) {
      destino.rechazos.push({ pestana: establecimiento, fila, motivo: resultado.motivo });
      return;
    }
    destino.filas.push({ ...resultado.fila, establecimiento });
    revisarFila(cruda, [resultado.fila], grises, Infinity).forEach(avisar);
  });
  const restantes = filasAvisadas - config.MAX_AVISOS_FILA_POR_PESTANA;
  if (restantes > 0) {
    destino.avisos.push({ pestana: establecimiento, mensaje: `Hay ${restantes} filas más con avisos en esta pestaña: revísela completa` });
  }
}

/** Posición de las columnas grises Nacionales y Extranjeros en el encabezado; undefined si la pestaña no las trae. */
function ubicarColumnasGrises(filaEncabezados) {
  const claves = (filaEncabezados || []).map(claveNormalizada);
  const posicion = (clave) => (claves.includes(clave) ? claves.indexOf(clave) : undefined);
  return { nacionales: posicion(COLUMNAS_GRISES.nacionales), extranjeros: posicion(COLUMNAS_GRISES.extranjeros) };
}

/**
 * Avisos de una fila ya aceptada: columnas grises escritas a mano que contradicen al país y total por encima del tope.
 * Nunca cambia lo publicado: el total y la nacionalidad siguen saliendo de las columnas de entrada y del país.
 */
function revisarFila(cruda, filasInternas, grises, umbral) {
  if (!filasInternas.length) return [];
  const avisos = [];
  const total = filasInternas.reduce((suma, f) => suma + f.cantidad, 0);
  const { pais, nacional } = filasInternas[0];

  // Paso 1: una celda gris en blanco no se compara; una escrita tiene que dar lo mismo que el país
  const esperado = { nacionales: nacional ? total : 0, extranjeros: nacional ? 0 : total };
  const escrito = { nacionales: textoDeCelda(cruda, grises.nacionales), extranjeros: textoDeCelda(cruda, grises.extranjeros) };
  const contradice = Object.keys(esperado).some((c) => escrito[c] !== '' && Number(escrito[c].replace(',', '.')) !== esperado[c]);
  if (contradice) {
    avisos.push(`Nacionales dice «${escrito.nacionales}» y Extranjeros dice «${escrito.extranjeros}», pero con el país `
      + `${pais} y ${total} visitantes deben ser ${esperado.nacionales} nacionales y ${esperado.extranjeros} extranjeros. `
      + 'El dashboard usa el país: corrija el país o vuelva a poner la fórmula en las columnas grises.');
  }
  // Paso 2: el tope de sensatez avisa sin rechazar, porque la cifra puede ser real
  if (total > umbral) {
    avisos.push(`${total} visitantes en una sola fila, más que el tope de ${umbral}; revise si sobra una cifra `
      + '(por ejemplo, un cero de más). La fila se publica igual.');
  }
  return avisos;
}

/** Texto limpio de una celda por posición; vacío si la columna no existe. */
function textoDeCelda(cruda, posicion) {
  return posicion === undefined ? '' : limpiarTexto(cruda[posicion]);
}
