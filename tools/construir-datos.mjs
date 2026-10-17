/**
 * @file construir-datos.mjs
 * @description Punto de entrada del constructor de datos para GitHub Actions: lee los argumentos y el entorno, arma
 *   los adaptadores de src/publicacion/ y llama al caso de uso, que descarga la hoja publicada desde la URL guardada
 *   en el secreto SHEET_URL, la valida con las mismas reglas del dashboard y escribe `datos/datos.json`.
 *   La URL de la hoja nunca se escribe en el sitio. Emite una línea de log JSON por ejecución y un resumen
 *   en Actions. Si algo falla, sale con error y no toca el archivo anterior, así el sitio sigue mostrando los
 *   últimos datos buenos. La salida se resuelve desde la raíz del repositorio; el libro local, desde el
 *   directorio actual.
 *   Uso:
 *     SHEET_URL=... node tools/construir-datos.mjs [salida]
 *     node tools/construir-datos.mjs --desde-archivo libro.xlsx [salida]
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONFIG_PUBLICACION } from '../src/publicacion/config-publicacion.js';
import { construirDatos } from '../src/publicacion/aplicacion/construir-datos.js';
import { crearFuenteHojaGoogle } from '../src/publicacion/adaptadores/hoja-google.js';
import { cargarSheetJS, crearLectorXlsx } from '../src/publicacion/adaptadores/lector-xlsx.js';
import { crearDestinoArchivo } from '../src/publicacion/adaptadores/destino-archivo.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_HOJA_PUBLICADA = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[\w-]+\/pub\?output=xlsx$/;

/**
 * Indica si la URL es la de una hoja de Google publicada en xlsx, la única que el constructor descarga.
 * @param {string|undefined} url valor del secreto SHEET_URL
 * @returns {boolean}
 */
export function validarUrlHoja(url) {
  return typeof url === 'string' && URL_HOJA_PUBLICADA.test(url);
}

/**
 * Lee los argumentos de la línea de comandos.
 * @param {string[]} args argumentos que siguen al nombre del script
 * @returns {{ desdeArchivo: string|null, salida: string }} libro local (null: se descarga de SHEET_URL) y ruta de salida
 */
export function leerArgumentos(args) {
  const desdeArchivo = args[0] === '--desde-archivo' ? args[1] : null;
  if (args[0] === '--desde-archivo' && !desdeArchivo) throw new Error('Falta la ruta del libro tras --desde-archivo');
  return { desdeArchivo, salida: resolve(RAIZ, (desdeArchivo ? args[2] : args[0]) || 'datos/datos.json') };
}

/** Una línea de log JSON por evento. Solo cuentas y duraciones: los logs de Actions son públicos. */
function registrar(evento, campos) {
  console.log(JSON.stringify({ evento, ...campos }));
}

/** Tabla del resumen de la ejecución en Actions. Nunca detiene la publicación: si falla, solo se avisa. */
function escribirResumen(filas) {
  const destino = process.env.GITHUB_STEP_SUMMARY;
  if (!destino) return;
  try {
    const tabla = ['| Dato | Valor |', '|---|---|', ...Object.entries(filas).map(([k, v]) => `| ${k} | ${v} |`)];
    appendFileSync(destino, `### Construcción de datos\n\n${tabla.join('\n')}\n`);
  } catch (e) {
    console.warn(`AVISO: no se pudo escribir el resumen (${e.message})`);
  }
}

/**
 * Fuente del libro según los argumentos: un archivo local de prueba o la hoja publicada del secreto SHEET_URL.
 * @param {string|null} desdeArchivo ruta del libro local; null para descargar la hoja
 * @returns {import('../src/publicacion/puertos.js').FuenteHoja}
 * @throws {Error} si no hay libro local y SHEET_URL falta o no es la de una hoja publicada en xlsx
 */
function elegirFuente(desdeArchivo) {
  if (desdeArchivo) return { obtener: async () => new Uint8Array(readFileSync(desdeArchivo)) };
  const url = process.env.SHEET_URL;
  if (!validarUrlHoja(url)) {
    throw new Error('SHEET_URL ausente o con formato inesperado (debe ser .../pub?output=xlsx)');
  }
  return crearFuenteHojaGoogle(url, { timeoutMs: CONFIG_PUBLICACION.TIMEOUT_HOJA_MS, maxBytes: CONFIG_PUBLICACION.MAX_BYTES_HOJA }, {
    alReintentar: (intento, error) => registrar('descarga_reintento', { intento, codigo: error.codigo, detalle: error.detalle }),
  });
}

async function main() {
  const inicio = Date.now();
  const { desdeArchivo, salida } = leerArgumentos(process.argv.slice(2));

  // Paso 1: armar los adaptadores; la URL se valida antes de descargar nada
  const fuente = elegirFuente(desdeArchivo);
  const lector = crearLectorXlsx(cargarSheetJS(), CONFIG_PUBLICACION);
  const destino = crearDestinoArchivo(salida);

  // Paso 2: el caso de uso lee, valida, empaqueta y escribe de forma atómica
  const cuentas = await construirDatos({ fuente, lector, destino, config: CONFIG_PUBLICACION });

  // Paso 3: registro de una línea y resumen de Actions, solo con cuentas y duraciones
  const duracionMs = Date.now() - inicio;
  registrar('datos_construidos', { ...cuentas, duracionMs });
  escribirResumen({
    Resultado: 'Publicado', Establecimientos: cuentas.establecimientos, Filas: cuentas.filas, 'Registros de discapacidad': cuentas.discapacidad,
    'Tamaño (bytes)': cuentas.bytes, Rechazos: cuentas.rechazos, Avisos: cuentas.avisos, 'Duración (ms)': duracionMs,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    registrar('error_construccion', { mensaje: e.message });
    escribirResumen({ Resultado: 'Error', Motivo: e.message });
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  });
}
