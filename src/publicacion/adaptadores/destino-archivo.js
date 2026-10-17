/**
 * @file destino-archivo.js
 * @description Publicación, adaptador del destino. Escribe `datos.json` de forma atómica: primero un archivo temporal
 *   y después el renombrado, así un fallo a mitad de camino nunca deja un archivo a medias y el sitio sigue con los
 *   últimos datos buenos. Implementa el puerto DestinoPublicacion.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Destino que escribe el paquete en un archivo, creando su carpeta si hace falta.
 * @param {string} salida ruta absoluta del archivo final
 * @returns {import('../puertos.js').DestinoPublicacion} el destino que recibe el texto de datos.json
 */
export function crearDestinoArchivo(salida) {
  return {
    escribir(texto) {
      // Paso 1: la carpeta puede no existir en un checkout limpio
      mkdirSync(dirname(salida), { recursive: true });
      // Paso 2: el renombrado reemplaza el archivo anterior de una sola vez
      const temporal = `${salida}.tmp`;
      writeFileSync(temporal, texto);
      renameSync(temporal, salida);
    },
  };
}
