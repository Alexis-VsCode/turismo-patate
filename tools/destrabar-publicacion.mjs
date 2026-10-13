/**
 * @file destrabar-publicacion.mjs
 * @description Herramienta de Actions. Cancela las ejecuciones de la publicación que quedaron trabadas: un despliegue
 *   de Pages en `waiting` o `in_progress` que no termina retiene el grupo de concurrencia y hace que todas las
 *   ejecuciones siguientes se cancelen. Corre al inicio de cada publicación con el GITHUB_TOKEN del propio flujo.
 *   Uso en Actions: node tools/destrabar-publicacion.mjs (lee GITHUB_TOKEN, GITHUB_REPOSITORY y GITHUB_RUN_ID).
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { pathToFileURL } from 'node:url';

/** Minutos a partir de los cuales una ejecución sin terminar se considera trabada. Una publicación normal tarda ~2. */
export const MINUTOS_TRABADA = 25;

/** Estados de una ejecución que ya arrancó y debería haber terminado; `queued` y `pending` esperan turno y se respetan. */
const ESTADOS_ACTIVOS = new Set(['waiting', 'in_progress']);

/**
 * Ejecuciones trabadas que hay que cancelar.
 * @param {Array<{ id: number, status: string, created_at: string }>} ejecuciones ejecuciones del flujo
 * @param {number} ahora instante actual en milisegundos
 * @param {number} actual id de la ejecución que hace la limpieza, que nunca se cancela a sí misma
 * @returns {number[]} ids a cancelar
 */
export function ejecucionesTrabadas(ejecuciones, ahora, actual) {
  const limite = MINUTOS_TRABADA * 60 * 1000;
  return ejecuciones
    .filter((e) => e.id !== actual && ESTADOS_ACTIVOS.has(e.status) && ahora - Date.parse(e.created_at) > limite)
    .map((e) => e.id);
}

/** Llama a la API de GitHub con el token del flujo. */
async function api(ruta, metodo = 'GET') {
  const respuesta = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  return respuesta;
}

async function principal() {
  // Paso 1: ejecuciones sin terminar del mismo flujo
  const actual = Number(process.env.GITHUB_RUN_ID);
  const { workflow_id: flujo } = await (await api(`/actions/runs/${actual}`)).json();
  const ejecuciones = [];
  for (const estado of ESTADOS_ACTIVOS) {
    const lista = await (await api(`/actions/workflows/${flujo}/runs?status=${estado}&per_page=50`)).json();
    ejecuciones.push(...(lista.workflow_runs ?? []));
  }
  // Paso 2: se cancelan las trabadas; si la cancelación normal no se admite, se fuerza
  const trabadas = ejecucionesTrabadas(ejecuciones, Date.now(), actual);
  for (const id of trabadas) {
    let respuesta = await api(`/actions/runs/${id}/cancel`, 'POST');
    if (!respuesta.ok) respuesta = await api(`/actions/runs/${id}/force-cancel`, 'POST');
    console.log(JSON.stringify({ evento: 'ejecucion_destrabada', id, http: respuesta.status }));
  }
  console.log(JSON.stringify({ evento: 'destrabar_fin', revisadas: ejecuciones.length, canceladas: trabadas.length }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  principal().catch((error) => {
    console.log(JSON.stringify({ evento: 'destrabar_error', mensaje: error.message }));
    process.exitCode = 1;
  });
}
