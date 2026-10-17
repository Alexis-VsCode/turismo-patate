/**
 * @file destrabar-publicacion.mjs
 * @description Herramienta de Actions. Cancela las ejecuciones de la publicación que quedaron trabadas: un despliegue
 *   de Pages en `waiting` o `in_progress` que no termina retiene el grupo de concurrencia y hace que todas las
 *   ejecuciones siguientes se cancelen. Corre al inicio de cada publicación con el GITHUB_TOKEN del propio flujo y,
 *   de paso, mantiene el flujo activo: GitHub apaga un flujo tras 60 días sin commits, y con él también el disparo
 *   de cron-job.org.
 *   Uso en Actions: node tools/destrabar-publicacion.mjs (lee GITHUB_TOKEN, GITHUB_REPOSITORY y GITHUB_RUN_ID).
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { pathToFileURL } from 'node:url';

/** Minutos a partir de los cuales una ejecución sin terminar se considera trabada. Una publicación normal tarda ~2. */
export const MINUTOS_TRABADA = 25;

/** Estados de una ejecución que ya arrancó y debería haber terminado; `queued` y `pending` esperan turno y se respetan. */
const ESTADOS_ACTIVOS = new Set(['waiting', 'in_progress']);

/** Minutos que lleva una ejecución desde que arrancó (un re-run conserva su `created_at` original). */
function minutosActiva(e, ahora) {
  return (ahora - Date.parse(e.run_started_at ?? e.created_at)) / 60000;
}

/**
 * Indica si una ejecución que ya se intentó cancelar sigue viva tanto tiempo que hay que forzarla.
 * @param {{ status: string, run_started_at?: string, created_at?: string }} e ejecución
 * @param {number} ahora instante actual en milisegundos
 */
export function hayQueForzar(e, ahora) {
  return ESTADOS_ACTIVOS.has(e.status) && minutosActiva(e, ahora) > 2 * MINUTOS_TRABADA;
}

/**
 * Ejecuciones trabadas que hay que cancelar.
 * @param {Array<{ id: number, status: string, created_at: string, run_started_at?: string }>} ejecuciones ejecuciones del flujo
 * @param {number} ahora instante actual en milisegundos
 * @param {number} actual id de la ejecución que hace la limpieza, que nunca se cancela a sí misma
 * @returns {number[]} ids a cancelar
 */
export function ejecucionesTrabadas(ejecuciones, ahora, actual) {
  return ejecuciones
    .filter((e) => e.id !== actual && ESTADOS_ACTIVOS.has(e.status) && minutosActiva(e, ahora) > MINUTOS_TRABADA)
    .map((e) => e.id);
}

/**
 * Llama a la API de GitHub con el token del flujo. Una lectura con error lanza: sin ella no hay nada que revisar.
 * Las escrituras devuelven la respuesta tal cual, porque quien llama decide qué hacer si fallan.
 */
async function api(ruta, metodo = 'GET') {
  const respuesta = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (metodo === 'GET' && !respuesta.ok) throw new Error(`GitHub API ${ruta}: HTTP ${respuesta.status}`);
  return respuesta;
}

/**
 * Cancela las ejecuciones trabadas del flujo actual y lo mantiene activo.
 * @returns {Promise<void>} se rechaza si la API responde con error o si no se pudo mantener activo el flujo
 */
export async function principal() {
  // Paso 1: ejecuciones sin terminar del mismo flujo
  const actual = Number(process.env.GITHUB_RUN_ID);
  const { workflow_id: flujo } = await (await api(`/actions/runs/${actual}`)).json();
  const ejecuciones = [];
  for (const estado of ESTADOS_ACTIVOS) {
    const lista = await (await api(`/actions/workflows/${flujo}/runs?status=${estado}&per_page=50`)).json();
    ejecuciones.push(...(lista.workflow_runs ?? []));
  }
  // Paso 2: se cancelan las trabadas; si la cancelación normal no se admite o ya no alcanzó, se fuerza
  const ahora = Date.now();
  const trabadas = ejecucionesTrabadas(ejecuciones, ahora, actual);
  for (const id of trabadas) {
    const ejecucion = ejecuciones.find((e) => e.id === id);
    let respuesta = await api(`/actions/runs/${id}/cancel`, 'POST');
    if (!respuesta.ok || hayQueForzar(ejecucion, ahora)) respuesta = await api(`/actions/runs/${id}/force-cancel`, 'POST');
    console.log(JSON.stringify({ evento: 'ejecucion_destrabada', id, http: respuesta.status }));
  }
  console.log(JSON.stringify({ evento: 'destrabar_fin', revisadas: ejecuciones.length, canceladas: trabadas.length }));
  // Paso 3: habilitar el flujo reinicia el plazo de 60 días sin actividad tras el que GitHub lo apaga
  const mantenido = await api(`/actions/workflows/${flujo}/enable`, 'PUT');
  console.log(JSON.stringify({ evento: 'flujo_mantenido', http: mantenido.status }));
  if (!mantenido.ok) throw new Error(`No se pudo mantener activo el flujo: HTTP ${mantenido.status}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((error) => {
    console.log(JSON.stringify({ evento: 'destrabar_error', mensaje: error.message }));
    process.exitCode = 1;
  });
}
