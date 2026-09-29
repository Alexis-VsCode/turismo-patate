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
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUERTO = Number(process.argv[2]) || 8765;
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xlsx': 'application/octet-stream',
};

createServer(async (peticion, respuesta) => {
  // Paso 1: la ruta se resuelve dentro de la raíz del proyecto; cualquier intento de salir de ella es un 403
  const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
  const archivo = resolve(join(RAIZ, ruta === '/' ? 'index.html' : ruta));
  if (archivo !== RAIZ && !archivo.startsWith(RAIZ + sep)) {
    respuesta.writeHead(403).end('Prohibido');
    return;
  }
  // Paso 2: siempre sin caché, para que cada recarga vea los archivos actuales
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
}).listen(PUERTO, '127.0.0.1', () => process.stdout.write(`Sirviendo ${RAIZ} en http://127.0.0.1:${PUERTO}/ (sin caché)\n`));
