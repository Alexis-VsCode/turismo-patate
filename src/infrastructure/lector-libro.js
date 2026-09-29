/**
 * @file lector-libro.js
 * @description Infraestructura. Lectura del libro publicado: cada pestaña que no es de sistema es un
 *   establecimiento. Devuelve filas normalizadas, rechazos con ubicación y avisos por pestaña; una
 *   pestaña mal armada se reporta sin tumbar a las demás.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { limpiarTexto } from '../domain/texto.js';
import { claveNormalizada, construirCatalogo, mapearEncabezados } from '../domain/catalogo.js';
import { normalizarFila } from '../domain/visitante.js';

/** Opciones restrictivas de SheetJS para un archivo que editan terceros. */
const OPCIONES_LECTURA = Object.freeze({
  type: 'array', dense: true, cellFormula: false, cellHTML: false, cellNF: false,
  cellStyles: false, cellDates: false, sheetStubs: false, bookVBA: false, WTF: false,
});

/** Indica si una pestaña es de sistema (catálogos, instrucciones, plantilla o su copia). */
export function esPestanaDeSistema(nombre) {
  const clave = claveNormalizada(nombre);
  return clave.startsWith('_') || clave.includes('plantilla');
}

function filasDeHoja(XLSX, hoja) {
  return XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null, blankrows: false });
}

/**
 * Lee el libro y arma el conjunto de datos del dashboard.
 * @param {ArrayBuffer} buffer libro xlsx descargado
 * @param {object} XLSX instancia de SheetJS
 * @param {object} config límites y nombres de CONFIG
 * @returns {{filas, rechazos, avisos, establecimientos, catalogo}}
 */
export function leerLibro(buffer, XLSX, config) {
  const libro = XLSX.read(buffer, { ...OPCIONES_LECTURA, sheetRows: config.MAX_FILAS_PESTANA + 1 });
  const avisos = [];
  const rechazos = [];
  const filas = [];
  const establecimientos = [];

  // Paso 1: catálogo; si falta, se sigue con uno mínimo y se avisa
  const hojaCatalogo = libro.Sheets[config.PESTANA_CATALOGOS];
  const catalogo = construirCatalogo(hojaCatalogo ? filasDeHoja(XLSX, hojaCatalogo) : null);
  if (!catalogo.completo) avisos.push({ pestana: config.PESTANA_CATALOGOS, mensaje: 'Catálogo ausente o incompleto: el mapa puede quedar sin ubicaciones' });

  // Paso 2: pestañas de establecimiento, con tope de cantidad
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
    const { indices, faltantes } = mapearEncabezados(crudas[0]);
    if (faltantes.length) {
      avisos.push({ pestana: establecimiento, mensaje: `Faltan columnas: ${faltantes.join(', ')}` });
      continue;
    }
    establecimientos.push(establecimiento);

    // Paso 4: filas de datos; la fila 1 de la hoja es el encabezado
    crudas.slice(1, config.MAX_FILAS_PESTANA + 1).forEach((cruda, i) => {
      if (!cruda || cruda.every((v) => limpiarTexto(v) === '')) return;
      const resultado = normalizarFila(cruda, indices, catalogo, config.PAIS_LOCAL);
      if (resultado.ok) filas.push({ ...resultado.fila, establecimiento });
      else rechazos.push({ pestana: establecimiento, fila: i + 2, motivo: resultado.motivo });
    });
  }
  establecimientos.sort((a, b) => a.localeCompare(b, 'es'));
  return { filas, rechazos, avisos, establecimientos, catalogo };
}
