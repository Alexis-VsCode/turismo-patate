# Manual de operación

Guía para quien administra la hoja de cálculo y el sitio. No hace falta saber programar.

## Cómo llegan los datos al sitio

1. Cada establecimiento llena **su propia pestaña** en la Google Sheet compartida.
2. Cada 5 minutos, GitHub Actions descarga la hoja, la valida y publica el sitio con los datos nuevos.
3. Quien visita el sitio ve cuándo se actualizó en su navegador, cuándo se publicaron los datos y un chip de estado
   («Publicación al día», «retrasada» o «detenida»). Ver [observabilidad.md](observabilidad.md).

**Cuánto tarda un dato nuevo en aparecer:** hasta 10 minutos (la publicación corre cada 5 minutos). Google republica la hoja cada ~5 minutos y
GitHub puede retrasar la tarea programada en horas de mucha carga.

## Qué pestañas cuentan como establecimiento

Todas, excepto:
- las que **empiezan con `_`**, como `_Instrucciones` y `_Catalogos`;
- las que **contienen «plantilla»**, como `Plantilla`, `Plantilla (2)` y `Copia de Plantilla`.

El nombre de la pestaña es el nombre que aparece en el sitio.

## Columnas fijas de cada pestaña

| Año | Mes | País | Provincia | Ciudad | Cantidad | Motivo de visita | Edad | Género |
|---|---|---|---|---|---|---|---|---|

- **Cada fila es un grupo de visitantes** con el mismo mes, procedencia, motivo, edad y género. Una persona
  sola se anota con Cantidad = 1.
- **Nacional o extranjero no se escribe:** el sitio lo deduce del País (Ecuador = nacional).
- **Edad** es un número entero de 0 a 110. El sitio la agrupa en 0-17, 18-25, 26-35, 36-45, 46-59 y 60+.
- **Visitantes extranjeros:** Provincia y Ciudad quedan vacías.
- **No se escriben datos personales:** ni nombres, ni cédulas, ni teléfonos.
- **No se mueven ni se renombran las columnas.** El sitio las reconoce por su nombre, con variantes (por
  ejemplo «Motivo» o «Motivo de visita», «Sexo» o «Género»). **Provincia y Ciudad son opcionales**; las demás son
  obligatorias.

## Agregar un establecimiento

1. Clic derecho en la pestaña `Plantilla` → **Duplicar**.
2. Renombrar la copia con el nombre del establecimiento.
3. Llenar las filas con los desplegables.

En unos minutos aparece en el sitio: en el combo, en los filtros, en las tarjetas y en el mapa.

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
- **Repetidos:** la hoja rechaza un nombre que ya existe y pinta de rojo los repetidos. Si aun así llegara uno al tablero, el aviso de
  «filas con problemas» lo indica y se conserva el primero.
- **Coordenadas de provincia:** son el centro aproximado de su contorno en el mapa. Hoy sirven de referencia; el tablero ubica las burbujas
  con el contorno.

**Qué opciones ofrecen los combos del sitio.** Una regla simple, para saber dónde tocar:

| Combo | De dónde sale | Qué significa |
|---|---|---|
| **Año** y **Motivo** | Los visitantes **y** el catálogo | Un año o motivo nuevo aparece al agregarlo en `_Catalogos`, aunque todavía no tenga visitantes. Si se elige uno sin visitantes, el tablero dice «Sin visitantes para los filtros elegidos» |
| **Ciudad, país y provincia** | Solo los visitantes | El catálogo trae decenas de ciudades sin visitantes; ofrecerlas todas llenaría el combo de opciones vacías |
| **Mes** y **rango de edad** | Fijos | Siempre son los 12 meses y los rangos 0-17, 18-25, 26-35, 36-45, 46-59 y 60+ |

Para abrir un año nuevo basta escribirlo en la columna Año de `_Catalogos`. Los desplegables de las pestañas leen ese
mismo rango, así que también aparecerá al capturar.
- **Coordenadas:** `Ciudad_Lat`/`Ciudad_Lon` y `Ciudad_Provincia` para cada ciudad; `Pais_Lat`/`Pais_Lon` para
  cada país.

Para sumar una ciudad o un país, se agrega en su columna con las coordenadas. Si una fila trae un valor que no
está en el catálogo, el sitio **no la descarta en silencio**: la muestra en el aviso «N filas con problemas»,
con la pestaña y el número de fila.

## Permisos recomendados en Google

- **Compartir → Acceso general: Restringido.** Solo se agregan los correos de los establecimientos.
- **Datos → Proteger hojas y rangos:** protege `_Catalogos` y `Plantilla`, dejando como editores solo a los
  administradores.
- **Opcional:** protege cada pestaña para que solo la edite su establecimiento.

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El sitio muestra «No se pudo actualizar…» | El sitio conserva los últimos datos buenos. Revisa la pestaña **Actions** del repositorio: la última ejecución en rojo dice en qué paso falló |
| Actions falla en «Construir datos desde la hoja» | La hoja dejó de estar publicada o cambió su URL. Ver [configuracion.md](configuracion.md#rotar-la-url) |
| Actions falla en «Pruebas» | Un cambio de código rompió una regla. No se publica nada hasta corregirlo |
| Un establecimiento no aparece | Que su pestaña no empiece con `_`, no contenga «plantilla» y conserve los encabezados |
| Aparece «N filas con problemas» | Despliega el aviso: indica pestaña, fila y motivo (por ejemplo, `Ciudad fuera del catálogo: «Ambatoo»`). Las erratas de mes como «agosoto» se corrigen solas |
| El chip dice «Publicación detenida» | La publicación automática no corre. Revisa **Actions** y sigue [observabilidad.md](observabilidad.md#qué-hacer-si-el-chip-no-está-en-verde) |
| Las actualizaciones se detuvieron | GitHub pausa las tareas programadas tras 60 días sin actividad en el repositorio. En **Actions → Publicar dashboard → Enable workflow** se reactivan, y con **Run workflow** se fuerza una publicación |

## Pasar a datos reales

1. En [`src/infrastructure/config.js`](../src/infrastructure/config.js), poner `DATOS_DE_PRUEBA: false`. Así
   se quita la franja amarilla.
2. Reemplazar en la hoja las pestañas ficticias por las de los establecimientos reales, duplicando la
   `Plantilla`.
3. Para cambiar la foto de la cabecera, reemplazar [`assets/fondo-cabecera.jpg`](../assets/fondo-cabecera.jpg)
   por una propia del GAD, con el mismo nombre, y actualizar el crédito en `index.html` y en
   `THIRD_PARTY_NOTICES.md`.
