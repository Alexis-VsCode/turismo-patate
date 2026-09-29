/**
 * @file frescura.js
 * @description Dominio. Clasifica qué tan reciente es la publicación de los datos. Función pura: recibe la
 *   hora actual y los umbrales, no lee el reloj ni la configuración.
 * @author Kevin Alexis Barrera Llerena 2026
 */

const MS_MINUTO = 60 * 1000;
/** Un reloj del visitante adelantado hasta este margen no invalida la lectura. */
const TOLERANCIA_RELOJ_MIN = 2;

/**
 * Clasifica la edad de la publicación de los datos.
 * @param {string|number|null|undefined} generadoEn instante en que el build generó `datos.json` (ISO o milisegundos)
 * @param {number} ahora hora actual en milisegundos
 * @param {{ alDiaMin: number, retrasadoMin: number }} umbrales minutos máximos de cada categoría
 * @returns {{ estado: 'alDia'|'retrasado'|'vencido'|'desconocido', minutos: number|null }}
 */
export function estadoFrescura(generadoEn, ahora, umbrales) {
  // Paso 1: sin una fecha válida no se afirma nada sobre la frescura
  const instante = generadoEn ? new Date(generadoEn).getTime() : NaN;
  if (Number.isNaN(instante)) return { estado: 'desconocido', minutos: null };

  // Paso 2: una fecha muy adelantada indica un reloj desajustado, no datos recientes
  const minutos = Math.floor((ahora - instante) / MS_MINUTO);
  if (minutos < -TOLERANCIA_RELOJ_MIN) return { estado: 'desconocido', minutos: null };

  // Paso 3: los límites exactos pertenecen a la categoría más sana
  const edad = Math.max(minutos, 0);
  if (edad <= umbrales.alDiaMin) return { estado: 'alDia', minutos: edad };
  if (edad <= umbrales.retrasadoMin) return { estado: 'retrasado', minutos: edad };
  return { estado: 'vencido', minutos: edad };
}
