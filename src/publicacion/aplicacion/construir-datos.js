/**
 * @file construir-datos.js
 * @description Publicación, caso de uso. Construye `datos.json` a partir de la hoja: pide el libro a la fuente, lo lee
 *   con las reglas del dominio, exige un mínimo de establecimientos, lo empaqueta con el contrato de datos y lo
 *   entrega al destino. Recibe sus puertos como argumentos: no sabe de Google, de SheetJS ni del disco, y se prueba
 *   en memoria. Si algo falla lanza el error antes de escribir, así el destino conserva los últimos datos buenos.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { empaquetar } from '../../contrato/contrato-datos.js';

// ===== API PUBLICA =====

/**
 * Ejecuta la construcción completa de una publicación.
 * @param {{
 *   fuente: import('../puertos.js').FuenteHoja,
 *   lector: import('../puertos.js').LectorLibro,
 *   destino: import('../puertos.js').DestinoPublicacion,
 *   config: { PAIS_LOCAL: string, MINIMO_ESTABLECIMIENTOS: number },
 *   ahora?: () => Date,
 * }} dependencias puertos, configuración de la publicación y reloj (inyectable en pruebas)
 * @returns {Promise<{ establecimientos: number, filas: number, discapacidad: number, rechazos: number, avisos: number,
 *   bytes: number }>} cuentas de lo publicado, para el registro; nunca datos de la hoja
 * @throws {Error} si la fuente falla, el libro no se puede leer o no trae establecimientos válidos
 */
export async function construirDatos({ fuente, lector, destino, config, ahora = () => new Date() }) {
  // Paso 1: obtener el libro de la fuente
  const buffer = await fuente.obtener();

  // Paso 2: leer y validar con las mismas reglas del dashboard
  const datos = lector.leer(buffer);
  if (datos.establecimientos.length < config.MINIMO_ESTABLECIMIENTOS) throw new Error('La hoja no tiene establecimientos válidos');

  // Paso 3: empaquetar con el contrato y entregar al destino, que escribe de forma atómica
  const paquete = empaquetar(datos, ahora().toISOString(), config.PAIS_LOCAL);
  const texto = JSON.stringify(paquete);
  destino.escribir(texto);
  return cuentasDe(datos, texto);
}

// ===== HELPERS PRIVADOS =====

/** Cuentas de lo publicado: solo números, porque los registros de Actions son públicos. */
function cuentasDe(datos, texto) {
  return {
    establecimientos: datos.establecimientos.length, filas: datos.filas.length, discapacidad: datos.discapacidad.length,
    rechazos: datos.rechazos.length, avisos: datos.avisos.length, bytes: new TextEncoder().encode(texto).byteLength,
  };
}
