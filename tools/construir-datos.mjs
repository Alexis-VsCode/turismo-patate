/**
 * @file construir-datos.mjs
 * @description Constructor de datos para GitHub Actions: descarga la hoja publicada desde la URL guardada en el
 *   secreto SHEET_URL, la valida con las mismas reglas del dashboard y escribe `datos/datos.json`.
 *   La URL de la hoja nunca se escribe en el sitio. Emite una línea de log JSON por ejecución y un resumen
 *   en Actions. Si algo falla, sale con error y no toca el
 *   archivo anterior, así el sitio sigue mostrando los últimos datos buenos. Uso: SHEET_URL=... node
 *   tools/construir-datos.mjs [salida] node tools/construir-datos.mjs --desde-archivo libro.xlsx
 *   [salida]
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { CONFIG } from '../src/infrastructure/config.js';
import { descargarConReintentos } from '../src/infrastructure/seguridad.js';
import { leerLibro } from '../src/infrastructure/lector-libro.js';
import { empaquetar } from '../src/infrastructure/contrato-datos.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINIMO_ESTABLECIMIENTOS = 1;

function cargarSheetJS() {
  const contexto = {};
  runInNewContext(readFileSync(join(RAIZ, 'tools/vendor/xlsx.mini.min.js'), 'utf8'), contexto);
  return contexto.XLSX;
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

async function main() {
  const inicio = Date.now();
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
    buffer = new Uint8Array(await descargarConReintentos(url, { timeoutMs: CONFIG.TIMEOUT_HOJA_MS, maxBytes: CONFIG.MAX_BYTES_HOJA }, {
      alReintentar: (intento, error) => registrar('descarga_reintento', { intento, codigo: error.codigo, detalle: error.detalle }),
    }));
  }

  // Paso 2: leer y validar con las mismas reglas del dashboard
  const datos = leerLibro(buffer, cargarSheetJS(), CONFIG);
  if (datos.establecimientos.length < MINIMO_ESTABLECIMIENTOS) throw new Error('La hoja no tiene establecimientos válidos');

  // Paso 3: escritura atómica (archivo temporal y renombrado)
  const paquete = empaquetar(datos, new Date().toISOString(), CONFIG.PAIS_LOCAL);
  mkdirSync(dirname(salida), { recursive: true });
  const temporal = `${salida}.tmp`;
  const texto = JSON.stringify(paquete);
  writeFileSync(temporal, texto);
  renameSync(temporal, salida);
  const cuentas = {
    establecimientos: datos.establecimientos.length, filas: datos.filas.length, discapacidad: datos.discapacidad.length,
    rechazos: datos.rechazos.length, avisos: datos.avisos.length, bytes: Buffer.byteLength(texto),
  };
  const duracionMs = Date.now() - inicio;
  registrar('datos_construidos', { ...cuentas, duracionMs });
  escribirResumen({
    Resultado: 'Publicado', Establecimientos: cuentas.establecimientos, Filas: cuentas.filas, 'Registros de discapacidad': cuentas.discapacidad,
    'Tamaño (bytes)': cuentas.bytes, Rechazos: cuentas.rechazos, Avisos: cuentas.avisos, 'Duración (ms)': duracionMs,
  });
}

main().catch((e) => {
  registrar('error_construccion', { mensaje: e.message });
  escribirResumen({ Resultado: 'Error', Motivo: e.message });
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});
