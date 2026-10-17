/**
 * @file servir.mjs
 * @description Herramienta de desarrollo. Servidor estático local sin caché: el navegador no puede mezclar módulos
 *   JavaScript viejos con un CSS o un HTML nuevos, que es lo que hace `python -m http.server` al no enviar
 *   cabeceras de caché. No se publica.
 *   Uso: node tools/servir.mjs [puerto]
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xlsx': 'application/octet-stream',
};

/**
 * Archivo que corresponde a una petición, siempre dentro de la carpeta servida.
 * @param {string} raiz carpeta servida, absoluta
 * @param {string} url ruta de la petición, tal como llega
 * @returns {{ estado: 200, archivo: string } | { estado: 400 | 403 }} el archivo, o el código de error que corresponde
 */
export function resolverPeticion(raiz, url) {
  // Paso 1: una URL mal codificada se rechaza con un 400; si lanzara, tumbaría el servidor
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return { estado: 400 };
  }
  // Paso 2: la ruta se resuelve dentro de la raíz del proyecto; cualquier intento de salir de ella es un 403
  const archivo = resolve(join(raiz, ruta === '/' ? 'index.html' : ruta));
  if (archivo !== raiz && !archivo.startsWith(raiz + sep)) return { estado: 403 };
  return { estado: 200, archivo };
}

/**
 * Servidor sin caché de la carpeta indicada.
 * @param {string} [raiz] carpeta servida, absoluta; por defecto, la raíz del repositorio
 * @returns {import('node:http').Server} servidor sin arrancar
 */
export function crearServidor(raiz = RAIZ) {
  return createServer(async (peticion, respuesta) => {
    const { estado, archivo } = resolverPeticion(raiz, peticion.url);
    if (estado === 400) {
      respuesta.writeHead(400).end('Solicitud no válida');
      return;
    }
    if (estado === 403) {
      respuesta.writeHead(403).end('Prohibido');
      return;
    }
    // Paso 3: siempre sin caché, para que cada recarga vea los archivos actuales
    try {
      const contenido = await readFile(archivo);
      respuesta.writeHead(200, {
        'Content-Type': TIPOS[extname(archivo).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      respuesta.end(contenido);
    } catch {
      respuesta.writeHead(404, { 'Cache-Control': 'no-store' }).end('No encontrado');
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const puerto = Number(process.argv[2]) || 8765;
  crearServidor().listen(puerto, '127.0.0.1', () => process.stdout.write(`Sirviendo ${RAIZ} en http://127.0.0.1:${puerto}/ (sin caché)\n`));
}
