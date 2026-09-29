/**
 * Constructor de datos para GitHub Actions: descarga la hoja publicada desde la URL guardada en el
 * secreto SHEET_URL, la valida con las mismas reglas del dashboard y escribe `datos/datos.json`.
 * La URL de la hoja nunca se escribe en el sitio. Si algo falla, sale con error y no toca el archivo
 * anterior, así el sitio sigue mostrando los últimos datos buenos.
 *
 * Uso: SHEET_URL=... node tools/construir-datos.mjs [salida]
 *      node tools/construir-datos.mjs --desde-archivo libro.xlsx [salida]
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { CONFIG } from '../src/infrastructure/config.js';
import { descargarAcotado } from '../src/infrastructure/seguridad.js';
import { leerLibro } from '../src/infrastructure/lector-libro.js';
import { empaquetar } from '../src/infrastructure/contrato-datos.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINIMO_ESTABLECIMIENTOS = 1;

function cargarSheetJS() {
  const contexto = {};
  runInNewContext(readFileSync(join(RAIZ, 'tools/vendor/xlsx.mini.min.js'), 'utf8'), contexto);
  return contexto.XLSX;
}

async function main() {
  const args = process.argv.slice(2);
  const desdeArchivo = args[0] === '--desde-archivo' ? args[1] : null;
  const salida = join(RAIZ, (desdeArchivo ? args[2] : args[0]) || 'datos/datos.json');

  // Paso 1: obtener el libro, desde el secreto o desde un archivo local de prueba
  let buffer;
  if (desdeArchivo) {
    buffer = new Uint8Array(readFileSync(desdeArchivo));
  } else {
    const url = process.env.SHEET_URL;
    if (!url || !/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[\w-]+\/pub\?output=xlsx$/.test(url)) {
      throw new Error('SHEET_URL ausente o con formato inesperado (debe ser .../pub?output=xlsx)');
    }
    buffer = new Uint8Array(await descargarAcotado(url, { timeoutMs: 60 * 1000, maxBytes: CONFIG.MAX_BYTES }));
  }

  // Paso 2: leer y validar con las mismas reglas del dashboard
  const datos = leerLibro(buffer, cargarSheetJS(), CONFIG);
  if (datos.establecimientos.length < MINIMO_ESTABLECIMIENTOS) throw new Error('La hoja no tiene establecimientos válidos');

  // Paso 3: escritura atómica (archivo temporal y renombrado)
  const paquete = empaquetar(datos, new Date().toISOString(), CONFIG.PAIS_LOCAL);
  mkdirSync(dirname(salida), { recursive: true });
  const temporal = `${salida}.tmp`;
  writeFileSync(temporal, JSON.stringify(paquete));
  renameSync(temporal, salida);
  console.log(`datos.json: ${datos.establecimientos.length} establecimientos, ${datos.filas.length} filas, ${datos.rechazos.length} rechazos, ${datos.avisos.length} avisos`);
}

main().catch((e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
