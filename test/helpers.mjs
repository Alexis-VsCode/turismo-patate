/**
 * @file helpers.mjs
 * @description Utilidades comunes de las pruebas: carga SheetJS local y arma libros de prueba en memoria.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
// SheetJS es UMD: se evalúa aislado en un contexto propio, igual que en el navegador como script clásico
const contexto = {};
runInNewContext(readFileSync(join(RAIZ, 'tools/vendor/xlsx.mini.min.js'), 'utf8'), contexto);
export const XLSX = contexto.XLSX;

export const ENCABEZADO = ['Año', 'Mes', 'País', 'Provincia', 'Ciudad', 'Cantidad', 'Motivo de visita', 'Edad', 'Género'];
export const CATALOGO = [
  ['Año', 'Mes', 'País', 'Ciudad', 'Ciudad_Lat', 'Ciudad_Lon', 'Provincia', 'Ciudad_Provincia', 'Pais_Lat', 'Pais_Lon', 'Motivo', 'Género'],
  [2025, 'Enero', 'Ecuador', 'Ambato', -1.2491, -78.6168, 'Tungurahua', 'Tungurahua', -1.83, -78.18, 'Turismo', 'Masculino'],
  [2026, 'Febrero', 'Colombia', 'Riobamba', -1.6636, -78.6546, 'Chimborazo', 'Chimborazo', 4.57, -74.29, 'Negocios', 'Femenino'],
  [null, null, null, 'Quito', -0.1807, -78.4678, 'Pichincha', 'Pichincha', null, null, 'Gastronomía', null],
];

/** Libro xlsx en memoria: { nombrePestaña: filas[][] } → Uint8Array. */
export function libroEnMemoria(pestanas) {
  const libro = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(pestanas)) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), nombre);
  }
  return new Uint8Array(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
}

export const leerFixture = (ruta) => new Uint8Array(readFileSync(join(RAIZ, ruta)));
