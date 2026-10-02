# Observabilidad

Observabilidad **básica**: permite saber, sin abrir nada más, si el sitio muestra datos recientes y por qué
una publicación falló. No sustituye un monitoreo externo (ver [Límites](#límites)).

## Qué se mide

| Elemento | Definición |
|---|---|
| **SLI** | Edad de la publicación: minutos desde `generadoEn` en `datos/datos.json`, la hora en que Actions construyó el archivo |
| **SLO** | Al día mientras la edad no supere `UMBRALES_FRESCURA.alDiaMin` de [`src/infrastructure/config.js`](../src/infrastructure/config.js). Los umbrales viven solo allí |
| **Cálculo** | Función pura [`estadoFrescura`](../src/domain/frescura.js), expuesta por la fachada como `frescura()` y probada con límites exactos |

Los umbrales son **provisionales**: la publicación la dispara cron-job.org cada 5 minutos (el `schedule` de GitHub nunca se disparó en este
repositorio), así que el intervalo real se puede medir en el historial público de Actions. Se
recalculan con la mediana y el P95 del intervalo real entre ejecuciones cuando exista ese historial.

## Lo que ve el visitante

Un chip junto a la barra de estado, con texto y color (nunca solo color):

| Chip | Significado |
|---|---|
| **Publicación al día** | La última publicación está dentro del primer umbral |
| **Publicación retrasada** | Superó el primer umbral pero no el segundo |
| **Publicación detenida** | Superó el segundo umbral: la publicación automática probablemente se detuvo |
| **Sin verificar** | La fecha falta, es inválida o está más de 2 minutos en el futuro (reloj del visitante desajustado) |

Junto a la etiqueta el chip dice «Última hace …» (en celular se oculta ese detalle por falta de espacio), y al
pasar el cursor por encima explica qué hace *Actualizar*.

Junto al chip, el texto de estado muestra dos horas distintas:

- **Actualizado el…**: la última vez que este navegador descargó `datos.json`. Cambia con cada clic en *Actualizar*.
- **Datos publicados el…**: cuándo construyó Actions ese archivo desde la hoja.

*Actualizar* vuelve a descargar `datos.json` sin caché, pero **no obliga a Actions a reconstruirlo desde la hoja**: un
cambio hecho en el Excel aparece cuando corre la siguiente publicación.

**¿Por qué puede decir «Actualizado hace un momento» y «Publicación detenida» a la vez?** No es una contradicción:
son dos relojes distintos. El primero es cuándo *este navegador* consultó; el segundo, cuándo *Actions* publicó por
última vez. Si la publicación automática está detenida, cada clic descarga otra vez el mismo archivo viejo, y el chip
lo dice. Por eso el chip habla de «publicación» y nunca de «datos actualizados».

**En local** no corre la publicación automática: el chip pasa a «detenida» poco después de generar los datos con
`npm run datos`, y se vuelve a poner al día regenerándolos.

## Lo que ve quien opera

`tools/construir-datos.mjs` escribe en cada ejecución una línea de log JSON y una tabla en el resumen de la
ejecución (pestaña **Actions**):

```json
{"evento":"datos_construidos","establecimientos":106,"filas":92702,"discapacidad":1808,"rechazos":0,"avisos":0,"bytes":2593317,"duracionMs":9287}
{"evento":"error_construccion","mensaje":"SHEET_URL ausente o con formato inesperado (debe ser .../pub?output=xlsx)"}
```

Si la descarga de la hoja falla por algo pasajero (corte de red, límite de peticiones o error 5xx de Google), el constructor reintenta hasta 3 veces esperando cada vez el doble y deja
una línea `descarga_reintento` con el intento y el código; un error de cliente o una hoja demasiado grande no se reintentan.

Los logs de Actions son públicos: solo llevan cuentas y duraciones, nunca nombres de pestañas ni la URL de la hoja.
Si el resumen no se puede escribir, se avisa y la publicación continúa.

## Qué hacer si el chip no está en verde

1. Abre **Actions → Publicar dashboard** y mira la última ejecución programada.
2. Si está en rojo, el evento `error_construccion` y el resumen dicen el motivo.
3. Si no hay ejecuciones recientes, GitHub pausó el cron: sigue [Si algo falla](operacion.md#si-algo-falla) para
   reactivar el workflow y forzar una publicación.

## Límites

- El chip lo ven los visitantes; **no avisa a quien opera**. La alerta para el operador es la notificación de GitHub
  por un workflow fallido, que hay que verificar en *Settings → Notifications*.
- Si el workflow no se ejecuta, tampoco hay error que notificar: por eso existe el chip.
- No hay `estado.json` ni monitoreo externo. Son el siguiente paso si el sitio pasa a producción.
