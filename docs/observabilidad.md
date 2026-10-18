# Observabilidad

Observabilidad **básica**: permite saber, sin abrir nada más, si el sitio muestra datos recientes y por qué
una publicación falló. No sustituye un monitoreo externo (ver [Límites](#límites)).

## Qué se mide

| Elemento | Definición |
|---|---|
| **SLI** | Edad de la publicación: minutos desde `generadoEn` en `datos/datos.json`, la hora en que Actions construyó el archivo |
| **SLO** | Publicación cada `PUBLICACION_MINUTOS` (30) minutos. Al día mientras la edad no supere `UMBRALES_FRESCURA.alDiaMin` (45) de [`src/tablero/infrastructure/config.js`](../src/tablero/infrastructure/config.js). Los umbrales viven solo allí |
| **Cálculo** | Función pura [`estadoFrescura`](../src/domain/frescura.js), expuesta por la fachada como `frescura()` y probada con límites exactos |

Los límites exactos pertenecen a la categoría más sana: con 45 minutos todavía es «al día» y con 100 todavía es «con retraso».

## Lo que ve el visitante

Un chip junto a la barra de estado, con texto y color (nunca solo color):

| Chip | Edad de la publicación | Significado |
|---|---|---|
| **Datos al día** | 45 minutos o menos (`alDiaMin`) | Cubre un ciclo de 30 minutos más la demora de Actions |
| **Datos con retraso** | Desde el minuto 46 hasta el 100 (`retrasadoMin`) | Se perdió algún ciclo, pero la publicación probablemente sigue activa |
| **Publicación detenida** | Desde el minuto 101 | La publicación automática probablemente se detuvo |
| **Sin verificar** | Fecha ausente, inválida o más de 2 minutos en el futuro | Reloj del visitante desajustado o dato sin fecha |

Junto a la etiqueta el chip dice «publicados hace ...». Al pasar el cursor por encima explica qué hace *Actualizar*.

La barra de estado muestra cuatro datos, cada uno con una explicación visible debajo:

| Dato | Explicación visible |
|---|---|
| Última publicación | Datos nuevos cada 30 minutos |
| Periodo con datos (p. ej. «ene 2025 a sep 2026») | Primer y último mes cargados |
| Establecimientos con datos | Con al menos un mes registrado |
| Registros mensuales | Cada uno: un mes, un origen y un motivo |

La hora de consulta del navegador no se muestra.

*Actualizar* vuelve a descargar `datos.json` sin caché, pero **no obliga a Actions a reconstruirlo desde la hoja**: un
cambio hecho en el Excel aparece cuando corre la siguiente publicación. Si la publicación automática está detenida, cada clic descarga otra vez el
mismo archivo viejo, y el chip lo dice. Por eso el chip mide la edad de la publicación y nunca dice «actualizado».

**En local** no corre la publicación automática: el chip pasa a «Publicación detenida» a los 101 minutos de generar los datos con
`npm run datos`, y se vuelve a poner al día regenerándolos.

## Los disparadores

Dos disparadores independientes publican el mismo flujo completo (descarga el Excel publicado, valida y despliega Pages).

| Disparador | Cuándo | Si falla |
|---|---|---|
| cron-job.org, tarea única vía `workflow_dispatch` | :00 y :30, todo el día | A los 15 minutos corre el `schedule` de GitHub |
| `schedule` de GitHub `'15,45 * * * *'` | :15 y :45, todo el día | A los 15 minutos corre cron-job.org |

Con ambos funcionando, una publicación nueva sale cada 15 minutos aproximadamente; si uno falla, el otro sigue publicando cada 30. Los 45 minutos
del umbral «al día» cubren un ciclo de 30 minutos más la demora de Actions. Un `push` a `main` también publica, después de correr las pruebas.

### El job destrabar

Corre al inicio de cada ejecución del flujo, con el `GITHUB_TOKEN` del propio flujo (permiso `actions: write`, `continue-on-error: true`, límite de 3 minutos).
Ejecuta [`tools/destrabar-publicacion.mjs`](../tools/destrabar-publicacion.mjs):

1. Lista las ejecuciones del mismo flujo en estado `waiting` o `in_progress`. Las que están en `queued` o `pending` esperan turno y se respetan.
2. Cancela las que llevan más de `MINUTOS_TRABADA` (25) minutos, contados desde `run_started_at` y no desde `created_at`. Una publicación normal tarda unos 2. Nunca se cancela a sí misma.
3. Si una ejecución sigue activa pasado el doble (dos veces `MINUTOS_TRABADA`, 50 minutos), fuerza la cancelación con la API `force-cancel`.
4. Llama a `PUT /actions/workflows/{id}/enable`: mantiene el flujo activo y reinicia el plazo de 60 días de GitHub (ver [Límites](#límites)). Deja el evento `flujo_mantenido`.

La concurrencia de Pages (`group: pages`, `cancel-in-progress: false`) vive **solo** en el job `desplegar`, para que la limpieza corra siempre aunque otra ejecución esté
trabada. `desplegar` espera a `construir` y a `destrabar`, pero como `destrabar` tiene `continue-on-error`, un fallo suyo no impide publicar.

Se creó por el incidente del 6 al 12 de octubre de 2026: un despliegue de Pages quedó en `waiting`, retuvo el grupo de concurrencia y las ejecuciones
siguientes se cancelaron una tras otra (1.844 en total) durante seis días.

## Lo que ve quien opera

### Eventos de log

Los logs de Actions son públicos: solo llevan cuentas y duraciones, nunca nombres de pestañas ni la URL de la hoja. Cada línea es JSON.

`tools/construir-datos.mjs` (paso «Construir datos desde la hoja»), con las cuentas que devuelve el caso de uso, y una tabla en el resumen de
la ejecución:

| Evento | Cuándo | Campos |
|---|---|---|
| `datos_construidos` | Construcción correcta | `establecimientos`, `filas`, `discapacidad`, `rechazos`, `avisos`, `bytes`, `duracionMs` |
| `descarga_reintento` | La descarga de la hoja falló por algo pasajero (corte de red, 429 o 5xx de Google) | `intento`, `codigo`, `detalle` |
| `error_construccion` | La construcción falló y sale con error, sin tocar el `datos.json` anterior | `mensaje` |

La descarga hace hasta 3 intentos en total (2 reintentos), con esperas de 2 s y 4 s (`descargarConReintentos` en
`src/publicacion/adaptadores/hoja-google.js`). Un error de cliente (403, 404) o una hoja demasiado grande no se reintentan.
Si el resumen no se puede escribir, se avisa y la publicación continúa.

`avisos` cuenta también los avisos de fila del lector: columnas grises que contradicen el País y filas mensuales que pasan de
`UMBRAL_FILA_SOSPECHOSA` (450000). Esas filas se publican; el detalle se ve en el panel de problemas del dashboard, en el modo revisión (`?revision`), nunca en el log.

`tools/destrabar-publicacion.mjs` (paso «Cancelar ejecuciones trabadas»):

| Evento | Cuándo | Campos |
|---|---|---|
| `ejecucion_destrabada` | Por cada ejecución trabada que intentó cancelar | `id`, `http` (código de la respuesta de la API) |
| `destrabar_fin` | Siempre al terminar bien | `revisadas`, `canceladas` |
| `flujo_mantenido` | Tras llamar a `enable` sobre el flujo | `http` (código de la respuesta de la API) |
| `destrabar_error` | La API de GitHub respondió con error o no se pudo mantener activo el flujo; el job termina en rojo, visible en Actions, pero no impide publicar | `mensaje` |

Ejemplos. El primero sale del libro ficticio de prueba
(`node tools/construir-datos.mjs --desde-archivo test/fixtures/piloto-publicado.xlsx <salida>`); la duración cambia en cada máquina:

```json
{"evento":"datos_construidos","establecimientos":100,"filas":29628,"discapacidad":0,"rechazos":0,"avisos":0,"bytes":819281,"duracionMs":5376}
{"evento":"error_construccion","mensaje":"SHEET_URL ausente o con formato inesperado (debe ser .../pub?output=xlsx)"}
{"evento":"destrabar_fin","revisadas":1,"canceladas":0}
```

### Cómo verificar con la API de Actions

El repositorio es público, así que estas consultas no necesitan token (con un límite de peticiones por IP). Reemplaza `OWNER/REPO` por el repositorio.

```bash
# Últimas ejecuciones: evento (schedule, workflow_dispatch, push), estado, conclusión y hora
curl -s "https://api.github.com/repos/OWNER/REPO/actions/runs?per_page=20" \
  | jq -r '.workflow_runs[] | "\(.created_at) \(.event) \(.status) \(.conclusion)"'

# Solo las ejecuciones atascadas
curl -s "https://api.github.com/repos/OWNER/REPO/actions/runs?status=waiting"
curl -s "https://api.github.com/repos/OWNER/REPO/actions/runs?status=in_progress"

# Edad de la publicación vigente
curl -s https://SITIO/datos/datos.json | jq .generadoEn
```

Qué mirar:

- Que se alternen ejecuciones de `workflow_dispatch` (cron-job.org) y de `schedule` (GitHub), con conclusión `success`.
- Que en el log de cada ejecución aparezca `destrabar_fin` y `flujo_mantenido`.
- Que `generadoEn` tenga menos de 45 minutos.

Si solo ves `workflow_dispatch` o solo `schedule`, el otro disparador no está funcionando.

## Qué hacer si el chip no está en verde

1. Abre **Actions > Publicar dashboard** y mira la última ejecución.
2. Si está en rojo, el evento `error_construccion` y el resumen dicen el motivo.
3. Si todas salen `cancelled` o hay una en `waiting` desde hace más de 25 minutos, es una publicación trabada: sigue el
   [runbook de operación](operacion.md#si-algo-falla).
4. Si no hay ejecuciones recientes de ningún tipo, revisa cron-job.org y que el flujo no esté desactivado: en **Actions > Publicar dashboard** pulsa «Enable workflow» si aparece.

## Límites

- GitHub puede **retrasar el `schedule`** bajo carga: la ejecución de :15 o :45 puede salir con minutos u horas de demora. Por eso el principal es cron-job.org.
- GitHub **desactiva el flujo entero tras 60 días sin actividad** en el repositorio, no solo el `schedule`; entonces también falla el `workflow_dispatch` de cron-job.org. La mitigación es el `PUT /actions/workflows/{id}/enable` que hace `destrabar` en cada publicación: mantiene el flujo activo y reinicia el plazo (evento `flujo_mantenido`). Si el flujo aparece desactivado, se reactiva a mano con «Enable workflow». Mientras esté desactivado, el chip pasa a «Publicación detenida».
- Los umbrales (45 y 100 minutos) se calcularon de la cadencia teórica; conviene revisarlos con el historial real de ejecuciones.
- El chip lo ven los visitantes; **no avisa a quien opera**. La alerta para el operador es la notificación de GitHub
  por un workflow fallido, que hay que verificar en *Settings > Notifications*.
- Si el workflow no se ejecuta, tampoco hay error que notificar: por eso existe el chip.
- No hay `estado.json` ni monitoreo externo. Son el siguiente paso si el sitio crece.
