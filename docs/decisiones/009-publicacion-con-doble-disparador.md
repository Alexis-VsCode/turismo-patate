# ADR 009: Publicación con doble disparador y limpieza de ejecuciones trabadas

**Estado:** Aceptada, **Fecha:** 2026-10-12, **Autor:** Ing. Kevin Alexis Barrera Llerena

## Contexto

Entre el 6 y el 12 de octubre de 2026 el dashboard estuvo seis días sin publicar datos nuevos. Un despliegue de GitHub Pages quedó en estado
`waiting` y retuvo el grupo de concurrencia. Como la concurrencia estaba declarada a nivel de flujo, cada ejecución siguiente quedó detrás de la
trabada y terminó cancelada: se acumularon 1.844 ejecuciones canceladas. Tampoco podía correr ninguna limpieza, porque habría estado dentro del
mismo flujo bloqueado.

Además, la publicación dependía de un solo disparador externo (cron-job.org). Si esa tarea se detenía, no había otro camino.

## Alternativas

- **A. Mantener un solo disparador y solo corregir la concurrencia.** Quita la causa de este incidente, pero deja un único punto de falla.
- **B. Usar solo el `schedule` de GitHub.** Elimina la dependencia externa, pero GitHub retrasa los `schedule` bajo carga y desactiva el flujo entero tras 60 días
  sin actividad en el repositorio.
- **C. Doble disparador, concurrencia solo en el despliegue y un job que limpia lo atascado** (elegida).
- **D. Cancelar lo anterior con `cancel-in-progress: true` en todo el flujo.** Descartada: cancelaría también despliegues sanos en curso y no
  resuelve que la limpieza quede bloqueada por el mismo grupo.
- **E. Subir la frecuencia de un solo disparador.** No resuelve la causa y no elimina el punto único de falla.

## Decisión

1. **Concurrencia solo en `desplegar`.** El grupo `pages` (`cancel-in-progress: false`) queda en ese job. `destrabar` y `construir` no
   pertenecen a ningún grupo, así que corren siempre, aunque otra ejecución esté atascada.
2. **Job `destrabar`.** Corre en cada ejecución, en paralelo con `construir`, con `continue-on-error: true` para que su falla no bloquee la
   publicación. Ejecuta [`tools/destrabar-publicacion.mjs`](../../tools/destrabar-publicacion.mjs), que consulta la API de Actions y cancela
   las ejecuciones del mismo flujo en `waiting` o `in_progress` cuya antigüedad, medida desde `run_started_at` (no desde `created_at`), supera
   `MINUTOS_TRABADA` (25) minutos. Si una ejecución sigue activa pasado el doble (dos veces `MINUTOS_TRABADA`, 50 minutos), fuerza la cancelación con
   `force-cancel`. Nunca cancela la ejecución en curso ni las que esperan turno (`queued`, `pending`). Una publicación normal tarda unos 2
   minutos.
3. **Mantenimiento del flujo activo.** En cada publicación, `destrabar` llama a `PUT /actions/workflows/{id}/enable`. Esa llamada mantiene el flujo
   activo y reinicia el plazo de 60 días de GitHub, y deja el evento `flujo_mantenido` en el registro.
4. **Dos disparadores desfasados 15 minutos:**
   - cron-job.org llama a `workflow_dispatch` en los minutos :00 y :30.
   - El `schedule` de GitHub, `15,45 * * * *`, corre en los minutos :15 y :45.

   Cada uno ejecuta el flujo completo y ninguno depende del otro. Si uno falla, el otro publica en 15 minutos o menos.

La cadencia que se comunica al público es una sola: publicación cada 30 minutos (`PUBLICACION_MINUTOS`). El navegador consulta cada 10 minutos
(`INTERVALO_AUTO_MS`) y el chip de frescura clasifica con `UMBRALES_FRESCURA` (45 y 100 minutos).

## Consecuencias

- Un despliegue atascado ya no detiene la publicación: la ejecución siguiente lo cancela cuando supera los 25 minutos y continúa; si sigue activo
  pasados 50 minutos, lo fuerza.
- Mientras se publique con regularidad, el flujo no llega a los 60 días de inactividad: cada publicación lo reactiva.
- Con ambos disparadores sanos hay una publicación cada 15 minutos. El contrato público sigue siendo 30 minutos; las ejecuciones adicionales
  regeneran el mismo resultado a partir de la hoja y no alteran los datos.
- Hay más ejecuciones por día que con un solo disparador.
- El registro de cada ejecución incluye los eventos `ejecucion_destrabada`, `destrabar_fin` y `flujo_mantenido`, que permiten auditar la limpieza y el mantenimiento.

## Límites

- GitHub puede retrasar el `schedule` bajo carga; por eso es refuerzo y no disparador principal.
- GitHub desactiva el flujo entero, no solo el `schedule`, tras 60 días sin actividad en el repositorio. Entonces también falla el
  `workflow_dispatch` de cron-job.org, así que cron-job.org no cubre ese caso. La mitigación es el `PUT /actions/workflows/{id}/enable` de
  `destrabar`, que corre en cada publicación y reinicia el plazo. Si alguna vez el flujo aparece desactivado, se reactiva a mano en
  **Actions > Publicar dashboard > «Enable workflow»**. Mientras tanto el chip del sitio pasa a «Publicación detenida» cuando la edad supera
  los 100 minutos (desde el minuto 101).
- `destrabar` depende de la API de GitHub y del `GITHUB_TOKEN` del flujo (permiso `actions: write`). Si la API falla, el job termina con error
  pero no bloquea la publicación.
- cron-job.org se configura y se vigila fuera del repositorio, que no puede comprobar que esté activo.
