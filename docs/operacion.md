# Manual de operación

Guía para quien administra la hoja de cálculo y el dashboard. No hace falta saber programar.

## Cómo llegan los datos al dashboard

1. Cada establecimiento llena **su propia pestaña** en la Google Sheet compartida.
2. Esa hoja está publicada en la web como Excel (.xlsx). Cada 30 minutos, GitHub Actions descarga el Excel publicado, lo valida y
   publica el dashboard con los datos nuevos en GitHub Pages.
3. Quien visita el dashboard ve la hora de la última publicación y un chip de estado: «Datos al día» hasta el minuto 45, «Datos con retraso»
   desde el 46 y «Publicación detenida» desde el 101. Ver [observabilidad.md](observabilidad.md).

No hay que subir ni enviar nada: basta con escribir en la hoja de Google. Si la publicación falla, el dashboard conserva los últimos datos buenos.

**Cuánto tarda un dato nuevo en aparecer:** hasta unos 35 minutos al recargar la página y unos 45 con la página abierta (la publicación corre
cada 30 minutos y el navegador consulta cada 10). Google republica la hoja cada ~5 minutos, así que ese tiempo ya está incluido. GitHub puede
retrasar su tarea de respaldo en horas de mucha carga.

### Qué quieren decir las cifras de la barra de estado

La barra muestra cuatro datos y, debajo de cada uno, una explicación visible. La hora de consulta del navegador ya no se muestra.

| Dato | Explicación visible | Qué cuenta |
|---|---|---|
| **Última publicación** | Datos nuevos cada 30 minutos | La hora en que Actions construyó los datos a partir de la hoja. No es la hora en que alguien escribió en el Excel |
| **Periodo con datos** | Primer y último mes cargados | El primer y el último mes con registros, por ejemplo «ene 2025 – sep 2026» |
| **Establecimientos con datos** | Con al menos un mes registrado | «17 de 39»: cuántas pestañas de establecimiento tienen al menos un registro válido, sobre el total de pestañas que cuentan como establecimiento |
| **Registros mensuales** | Cada uno: un mes, un origen y un motivo | Filas de la hoja: cada una es un mes de un origen y un motivo de visita en un establecimiento. No es el número de visitantes |

## Qué pestañas cuentan como establecimiento

Todas, excepto:
- las que **empiezan con `_`**, como `_Instrucciones` y `_Catalogos`;
- las que **contienen «plantilla»**, como `Plantilla`, `Plantilla (2)` y `Copia de Plantilla`.

El nombre de la pestaña es el nombre que aparece en el dashboard.

## Columnas de cada pestaña

El dashboard reconoce **dos formatos** por los encabezados de la pestaña. Una misma pestaña no puede mezclarlos: si lo hace, se omite y
el aviso lo dice.

### Formato mensual (el de la plantilla)

Cada fila es **un mes de un origen y un motivo**. Usted escribe los números; la hoja calcula los totales y marca en rojo lo que no cuadra.

| Escribe usted | Calcula la hoja (columnas grises) |
|---|---|
| Año · Mes · País · Ciudad · Motivo de visita · Mujeres 0-30 · 31-45 · 46-60 · 61+ · Hombres 0-30 · 31-45 · 46-60 · 61+ · Personas con discapacidad | Provincia · Total mujeres · Total hombres · Total visitantes · Nacionales · Extranjeros · Estado |

- **Los ocho números** son enteros de 0 en adelante. Una celda vacía cuenta como cero y una fila sin ningún número se ignora.
- **Personas con discapacidad** no puede superar el total de visitantes de la fila. La hoja no deja escribir un valor mayor y la fila se pinta de
  rojo; si aun así llegara al dashboard, esa fila se rechaza con su pestaña y su fila.
- **Estado** dice «OK» o qué corregir («Revisar: discapacidad 19 mayor que el total 16», «Falta la ciudad»). Las filas en rojo no se publican.
- **Nacionales y extranjeros** se calculan por el país: Ecuador es nacional. Las columnas grises no se escriben; para que nadie las pise,
  protéjalas en Google Sheets (*Datos → Proteger hojas y rangos*).
- **Por qué ocho columnas y no una por género:** así el dashboard puede filtrar por edad y por género a la vez y mostrar «Total mujeres» y
  «Total hombres» por rango de edad con cifras exactas.

### Formato anterior (sigue funcionando)

| Año | Mes | País | Provincia | Ciudad | Cantidad | Motivo de visita | Edad | Género |
|---|---|---|---|---|---|---|---|---|

- **Cada fila es un grupo de visitantes** con el mismo mes, procedencia, motivo, edad y género. Una persona
  sola se anota con Cantidad = 1.
- **Nacional o extranjero no se escribe:** el dashboard lo deduce del País (Ecuador = nacional).
- **Edad** es un número entero de 0 a 110. El dashboard la agrupa en 0-30, 31-45, 46-60 y 61+.
- **Visitantes extranjeros:** Provincia y Ciudad quedan vacías.
- **No se escriben datos personales:** ni nombres, ni cédulas, ni teléfonos.
- **No se mueven ni se renombran las columnas.** El dashboard las reconoce por su nombre, con variantes (por
  ejemplo «Motivo» o «Motivo de visita», «Sexo» o «Género»). **Provincia y Ciudad son opcionales**; las demás son
  obligatorias.
- **Las personas con discapacidad solo existen en el formato mensual.** Una columna con ese nombre en una pestaña del formato anterior se ignora.

## Agregar un establecimiento

1. Haga clic derecho en la pestaña `Plantilla` → **Duplicar**.
2. Renombre la copia con el nombre del establecimiento.
3. Llene las filas con los desplegables.

Aparece en el dashboard en la siguiente publicación, hasta unos 35 minutos después: en el combo, en los filtros, en las tarjetas y en el mapa.

## Catálogos (`_Catalogos`)

Alimentan los desplegables de la hoja y el mapa. Están en **cuatro bloques**, separados por una columna vacía y con un color de
encabezado distinto, y cada pareja de datos queda pegada:

| Bloque | Columnas |
|---|---|
| Listas | Año · Mes · Motivo · Género |
| Países | País · Pais_Lat · Pais_Lon |
| Ciudades de Ecuador | Ciudad · Ciudad_Provincia · Ciudad_Lat · Ciudad_Lon |
| Provincias | Provincia · Provincia_Lat · Provincia_Lon |

- **Cómo agregar algo:** escríbalo en la primera fila vacía del bloque. Los desplegables de todas las pestañas llegan hasta la fila 1000,
  así que lo nuevo aparece solo.
- **Cómo ordenar:** seleccione el bloque completo y use *Datos → Ordenar rango*. Nunca ordene una columna suelta: separaría la ciudad de
  su provincia y de sus coordenadas.
- **Repetidos:** la hoja rechaza un nombre que ya existe y pinta de rojo los repetidos. Si aun así llegara uno al dashboard, el aviso de
  «filas con problemas» lo indica y se conserva el primero.
- **Coordenadas de provincia:** son el centro aproximado de su contorno en el mapa. Hoy sirven de referencia; el dashboard ubica las burbujas
  con el contorno.

**Qué opciones ofrecen los combos del dashboard.** Una regla simple, para saber dónde tocar:

| Combo | De dónde sale | Qué significa |
|---|---|---|
| **Año** y **Motivo** | Los visitantes **y** el catálogo | Un año o motivo nuevo aparece al agregarlo en `_Catalogos`, aunque todavía no tenga visitantes. Si se elige uno sin visitantes, el dashboard dice «Sin visitantes para los filtros elegidos» |
| **Ciudad, país y provincia** | Solo los visitantes | El catálogo trae más de 200 ciudades y 190 países sin visitantes; ofrecerlos todos llenaría el filtro de opciones vacías. Los desplegables de la hoja, en cambio, sí ofrecen todo el catálogo |
| **Mes** y **rango de edad** | Fijos | Siempre son los 12 meses y los rangos 0-30, 31-45, 46-60 y 61+ |

Para abrir un año nuevo basta escribirlo en la columna Año de `_Catalogos`. Los desplegables de las pestañas leen ese
mismo rango, así que también aparecerá al capturar.
- **Coordenadas:** `Ciudad_Lat`/`Ciudad_Lon` y `Ciudad_Provincia` para cada ciudad; `Pais_Lat`/`Pais_Lon` para
  cada país.

Para sumar una ciudad o un país, agréguelo en su columna con las coordenadas. Si una fila trae un valor que no
está en el catálogo, el dashboard **no la descarta en silencio**: la muestra en el aviso «N filas con problemas»,
con la pestaña y el número de fila.

## Permisos recomendados en Google

- **Compartir → Acceso general: Restringido.** Agregue solo los correos de los establecimientos.
- **Datos → Proteger hojas y rangos:** proteja `_Catalogos` y `Plantilla`, dejando como editores solo a los
  administradores.
- **Opcional:** proteja cada pestaña para que solo la edite su establecimiento.

## Cómo se dispara la publicación (cron-job.org)

La publicación la arranca principalmente **cron-job.org**, un servicio externo gratuito. Se configura una **sola tarea** que corre **cada 30 minutos,
en punto y a la media** (:00 y :30), todo el día. La tarea llama a la API de GitHub para ejecutar el flujo «Publicar dashboard»
(`workflow_dispatch`) y usa un token de GitHub con el permiso mínimo necesario. El token es una credencial: se guarda solo en cron-job.org
y no se comparte.

Como refuerzo, GitHub tiene su propio horario (`schedule`) en los minutos :15 y :45. Así, si cron-job.org falla, GitHub publica a los 15 minutos
como máximo, y al revés. Además, en cada publicación el job `destrabar` llama a `PUT /actions/workflows/{id}/enable`, que mantiene activo el flujo
y reinicia el plazo de 60 días de GitHub (evento `flujo_mantenido`). Detalle en [observabilidad.md](observabilidad.md#los-disparadores) y [configuracion.md](configuracion.md#disparadores-de-la-publicación).

## Si algo falla

**Publicación trabada (runbook).** Síntoma: el chip dice «Publicación detenida» (desde el minuto 101) desde hace horas y en **Actions → Publicar dashboard** las ejecuciones
salen todas como «cancelled».

- **Qué pasó en el incidente real (6 al 12 de octubre de 2026):** un despliegue de Pages quedó en estado `waiting` y retuvo el grupo de
  concurrencia `pages`. Las ejecuciones siguientes se fueron cancelando una tras otra (1.844 en total) y el dashboard estuvo seis días sin datos nuevos.
- **Qué hace ahora el sistema solo:** al inicio de cada publicación corre el job `destrabar` (`tools/destrabar-publicacion.mjs`), que cancela toda
  ejecución del flujo que lleve más de 25 minutos en `waiting` o `in_progress`, contados desde que arrancó (`run_started_at`). Si una ejecución sigue activa pasado el doble (50 minutos), la cancela a la fuerza con la API `force-cancel`. La concurrencia quedó solo en el despliegue, de modo que la
  limpieza corre aunque otra ejecución esté trabada. Si la limpieza fallara, la publicación sigue igual.
- **Si no quiere esperar a la siguiente publicación (cancelar a mano):**
  1. Abra **Actions → Publicar dashboard**.
  2. Entre en la ejecución que esté en `waiting` o `in_progress` desde hace mucho.
  3. Pulse **Cancel workflow**. Si no basta, no hace falta nada más: `destrabar` la fuerza sola en la siguiente publicación, con la API `force-cancel`, cuando la ejecución sigue activa pasado el doble de 25 minutos.
  4. Lance una publicación nueva con **Run workflow** y compruebe que termine en verde.

| Síntoma | Qué revisar |
|---|---|
| El dashboard muestra «No se pudo actualizar…» | El dashboard conserva los últimos datos buenos. Revise la pestaña **Actions** del repositorio: la última ejecución en rojo dice en qué paso falló |
| Actions falla en «Construir datos desde la hoja» | La hoja dejó de estar publicada o cambió su URL. Ver [configuracion.md](configuracion.md#rotar-la-url) |
| Actions falla en «Pruebas» | Un cambio de código rompió una regla. No se publica nada hasta corregirlo |
| Un establecimiento no aparece | Compruebe que su pestaña no empiece con `_`, no contenga «plantilla» y conserve los encabezados |
| Aparece «N filas con problemas» | Despliegue el aviso: indica pestaña, fila y motivo (por ejemplo, `Ciudad fuera del catálogo: «Ambatoo»`). Las erratas de mes como «agosoto» se corrigen solas |
| El chip dice «Publicación detenida» | La publicación automática no corre. Revise **Actions** y siga [observabilidad.md](observabilidad.md#qué-hacer-si-el-chip-no-está-en-verde) |
| Ninguna publicación corre, ni la de cron-job.org ni la de GitHub | GitHub desactiva el flujo entero tras 60 días sin actividad, y entonces también falla el disparo de cron-job.org. `destrabar` lo evita reactivando el flujo en cada publicación. Si aun así aparece desactivado, en **Actions → Publicar dashboard → «Enable workflow»** se reactiva a mano y con **Run workflow** se fuerza una publicación |

## Datos reales y datos de prueba

El dashboard ya publica los datos reales del municipio: `DATOS_DE_PRUEBA` está en `false` en
[`src/infrastructure/config.js`](../src/infrastructure/config.js) y la franja amarilla «DATOS DE PRUEBA» no aparece. Esa franja solo se
usaría de nuevo si se pusiera el valor en `true` para probar con una hoja ficticia.

Para cambiar la foto de la cabecera, reemplace [`assets/fondo-cabecera.jpg`](../assets/fondo-cabecera.jpg) por una propia del GAD, con el mismo
nombre, y actualice el crédito en `index.html` y en `THIRD_PARTY_NOTICES.md`.

## Publicar el LinkedIn de la Lic. Vanessa Lesano

La Lic. Vanessa Lesano es Licenciada en Turismo. El pie del dashboard, en su columna «Acerca del dashboard», muestra el contacto del municipio con tres redes, siempre en este orden: Facebook, TikTok y LinkedIn. Facebook y TikTok ya
tienen su enlace (el de Facebook es https://www.facebook.com/vane.lesano.martinez). LinkedIn está vacío: mientras siga así, su botón dice **«Pronto»** y, al pulsarlo, abre un aviso con los otros enlaces.

Para publicarlo:

1. Copie la dirección de su perfil de LinkedIn. Debe empezar con `https://` y tener la forma `https://www.linkedin.com/in/su-usuario`, sin
   parámetros de rastreo (nada después de un `?`).
2. En [`src/infrastructure/config.js`](../src/infrastructure/config.js), péguela entre las comillas de `CONTACTO_MUNICIPIO.enlaces.linkedin`.
3. Suba el cambio al repositorio. Al llegar a `main`, el dashboard se publica de nuevo con el botón ya convertido en enlace.

Una dirección que no cumpla la forma esperada no se muestra: el botón desaparece en lugar de quedar roto. Si no aparece, revise que la dirección esté bien escrita.

## Varias opciones en los filtros

Los filtros de establecimiento, país / ciudad / provincia, motivo, edad y género aceptan **varias opciones a la vez**: cada opción elegida
queda como una etiqueta sobre los gráficos y se quita con su «×» o todas juntas con «Quitar todos». Dentro de un filtro las opciones se
suman (Colombia y Perú) y entre filtros se cruzan (Colombia o Perú, y además turismo). Año y mes son de una sola opción. Lo elegido también se ve como etiquetas debajo de cada filtro, a la izquierda, y el panel de filtros
se mantiene a la izquierda hasta los 860 px de ancho; por debajo pasa a ser un botón «Filtros».

## Catálogos completos

`_Catalogos` trae todas las provincias, los cantones del Ecuador (con su provincia y sus coordenadas aproximadas) y los países
reconocidos. Se regeneran con [`tools/catalogos/`](../tools/catalogos/LEEME.md) y el libro de captura con
[`tools/excel/generar-excel.py`](../tools/excel/generar-excel.py). Nada de lo que ya estaba se quita ni se renombra.
