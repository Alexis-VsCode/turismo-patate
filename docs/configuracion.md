# Configuración: qué, dónde y cómo se cambia

## Mapa de la configuración

| Qué | Dónde | Quién lo cambia |
|---|---|---|
| URL de la hoja (secreta) | GitHub > **Settings > Secrets and variables > Actions > `SHEET_URL`** | Administrador del repositorio |
| Publicación del sitio | GitHub > **Settings > Pages > Source: GitHub Actions** | Administrador del repositorio |
| Frecuencia de publicación | Tarea de cron-job.org (cada 30 min) y [`.github/workflows/publicar.yml`](../.github/workflows/publicar.yml) (`schedule: '15,45 * * * *'`) | Desarrollo y operación |
| Intervalos, umbrales, límites de descarga del navegador, franja de prueba y personas del pie | [`src/tablero/infrastructure/config.js`](../src/tablero/infrastructure/config.js) | Desarrollo |
| Topes de la descarga y de la lectura de la hoja, país local y tope de sensatez de una fila | [`src/publicacion/config-publicacion.js`](../src/publicacion/config-publicacion.js) | Desarrollo |
| Límites de validación (años, edad y cantidad) | [`src/domain/catalogo.js`](../src/domain/catalogo.js) | Desarrollo |
| Textos visibles | [`src/tablero/shared/textos.es.js`](../src/tablero/shared/textos.es.js) | Desarrollo |
| Colores del tema | [`css/tema.css`](../css/tema.css), variables `--verde`, `--lima`, `--amarillo`... | Desarrollo |
| Política de seguridad (CSP) | `<meta http-equiv="Content-Security-Policy">` en [`index.html`](../index.html) | Desarrollo |
| Permisos de la hoja | Google Sheets > **Compartir** y el script [`tools/excel/proteger-hoja.gs`](../tools/excel/proteger-hoja.gs) | Administrador de la hoja |
| Catálogos y coordenadas | Pestaña `_Catalogos` de la hoja | Administrador de la hoja |

## Cómo se oculta la URL de la hoja

La URL publicada de la hoja (`.../pub?output=xlsx`) funciona como una contraseña de lectura: quien la tenga puede
descargar el libro completo. Por eso **no aparece en ningún archivo del repositorio ni del sitio**.

```mermaid
flowchart LR
    S[Secreto SHEET_URL cifrado en GitHub] -->|variable de entorno enmascarada| W[Flujo publicar.yml]
    W --> T[tools/construir-datos.mjs valida la URL]
    T --> UC[caso de uso construir-datos]
    UC -->|solo cifras validadas| J[datos/datos.json]
    J --> P[GitHub Pages]
    P --> N[Navegador, solo su propio origen]
```

1. **Guardado cifrado.** GitHub guarda el secreto cifrado. Desde la web no se puede leer, ni siquiera por el
   dueño: solo se puede reemplazar.
2. **Uso exclusivo del flujo.** Solo lo recibe el paso «Construir datos desde la hoja» del job `construir`, como
   variable de entorno. Si llegara a imprimirse en los registros, GitHub lo reemplaza por asteriscos.
3. **Validación del formato.** [`tools/construir-datos.mjs`](../tools/construir-datos.mjs) comprueba que tenga
   el formato esperado (`https://docs.google.com/spreadsheets/d/e/.../pub?output=xlsx`) antes de descargar nada. El caso de uso
   descarga el libro con límites de tiempo y tamaño y escribe **solo** `datos/datos.json`, con filas ya validadas y sin la URL.
4. **Se publica solo lo público.** El sitio se arma copiando `index.html`, `css/`, `src/` sin `src/publicacion/` y la carpeta
   `assets/` completa (logo, foto de cabecera, imagen para compartir, límites provinciales y las fotos del pie en `assets/personas/`).
   `tools/`, `test/` y los libros de prueba nunca se publican.
5. **El navegador nunca contacta Google.** La CSP del sitio (`connect-src 'self'`) le prohíbe pedir datos a
   cualquier otro origen.
6. **Unas pruebas lo vigilan.** `test/contrato/contrato-datos.test.mjs` falla si la URL o el dominio de Google aparecen en
   `datos.json`, y `test/tools/url-hoja.test.mjs` falla si algún archivo versionado escribe el ID de una hoja de Google.

### Reemplazar el secreto

1. **Settings > Secrets and variables > Actions**.
2. En `SHEET_URL`, pulsa el lápiz (**Update**), pega la URL nueva y guarda.
3. **Actions > Publicar dashboard > Run workflow** para publicar de inmediato.

### Rotar la URL

Hay que hacerlo si la URL se filtró o si cambió la hoja:

1. En Google Sheets: **Archivo > Compartir > Publicar en la web > Detener publicación**.
2. Vuelve a publicar: **Todo el documento**, formato **Microsoft Excel (.xlsx)** y **Volver a publicar
   automáticamente** activado. Google genera una URL nueva y la anterior deja de funcionar.
3. Reemplaza el secreto `SHEET_URL` con la URL nueva, como se explica arriba.

## Parámetros del navegador: `src/tablero/infrastructure/config.js`

Es la única fuente de estos números en el navegador: ningún otro módulo los repite.
`test/tablero/infrastructure/config.test.mjs` comprueba que la consulta del navegador, los umbrales y el `schedule` encajen con la
cadencia, y que el origen de las teselas esté permitido en la CSP.

| Clave | Valor | Para qué sirve |
|---|---|---|
| `URL_DATOS` | `'datos/datos.json'` | Archivo que lee el navegador, siempre del mismo sitio. La URL de la hoja vive solo en el secreto `SHEET_URL` |
| `INTERVALO_AUTO_MS` | 10 min (`10 * 60 * 1000`) | Consulta automática mientras la pestaña está visible. Más seguida que la publicación, para ver pronto cada ciclo nuevo |
| `PUBLICACION_MINUTOS` | `30` | Cada cuántos minutos se vuelve a publicar el sitio (cron-job.org). Lo usan el texto del chip y la barra de estado |
| `REVISION_AUTOMATICA_MS` | 30 s (`30 * 1000`) | Cada cuánto el navegador revisa si toca la consulta automática y repinta el chip de frescura |
| `URL_LIMITES` | `'assets/ecu-provincias.geojson'` | Límites provinciales del mapa, servidos por el propio sitio |
| `URL_TESELAS` | `'https://tile.openstreetmap.org/{z}/{x}/{y}.png'` | Teselas del fondo del mapa. Su origen tiene que estar en `img-src` de la CSP |
| `REUSO_MINIMO_MS` | 60 s (`60 * 1000`) | Al cambiar de establecimiento se reusa la descarga si es más reciente que esto |
| `UMBRALES_FRESCURA.alDiaMin` | `45` | Edad máxima, en minutos, de la publicación para el chip «Datos al día»: un ciclo de 30 minutos más la demora de Actions |
| `UMBRALES_FRESCURA.retrasadoMin` | `100` | Edad máxima para «Datos con retraso»: tolera perder un ciclo entero. Más allá, «Publicación detenida» |
| `TIMEOUT_MS` | 15 s (`15 * 1000`) | Tiempo máximo de cada descarga del navegador (`datos.json` y límites del mapa) |
| `MAX_BYTES` | 20 MB (`20 * 1024 * 1024`) | Tamaño máximo de cada descarga del navegador |
| `DATOS_DE_PRUEBA` | `false` | Muestra la franja «DATOS DE PRUEBA». Apagada desde que la hoja trae los datos reales del municipio |
| `CONTACTO_MUNICIPIO.nombre` | `'Lic. Vanessa Lesano Martínez'` | Nombre del contacto del municipio en su tarjeta del pie |
| `CONTACTO_MUNICIPIO.referencia` | `'la Lic. Vanessa Lesano Martínez'` | Cómo se la nombra dentro de una frase (agradecimiento, aviso «Pronto», texto alternativo de la foto) |
| `CONTACTO_MUNICIPIO.enlaces.facebook` | `https://www.facebook.com/vane.lesano.martinez` | Enlace de Facebook |
| `CONTACTO_MUNICIPIO.enlaces.tiktok` | `https://www.tiktok.com/@vanelesano` | Enlace de TikTok |
| `CONTACTO_MUNICIPIO.enlaces.linkedin` | `''` (vacío) | Enlace de LinkedIn. Vacío: el botón muestra «Pronto» y abre un aviso con los demás enlaces |
| `AUTORIDAD_MUNICIPIO.nombre` | `'Ing. Emerson Hernán Medina Castro'` | Autoridad del cantón en la franja del GAD |
| `AUTORIDAD_MUNICIPIO.cargo` | `'Alcalde'` | Cargo que se muestra junto al periodo |
| `AUTORIDAD_MUNICIPIO.periodo` | `'2023 a 2027'` | Periodo de la administración («Alcalde · Administración 2023 a 2027») |
| `AUTORIDAD_MUNICIPIO.enlace` | `'https://patate.gob.ec/'` | Botón «Sitio del GAD». Se usa solo si es `https://`; si no, el botón se oculta |
| `PROVINCIA_RESALTADA` | `'Tungurahua'` | Provincia que el mapa resalta siempre |

## Parámetros de la publicación: `src/publicacion/config-publicacion.js`

Solo los usa la publicación en GitHub Actions; el navegador no los conoce.

| Clave | Valor | Para qué sirve |
|---|---|---|
| `MAX_BYTES_HOJA` | 50 MB (`50 * 1024 * 1024`) | Tope de la hoja completa en xlsx: con más de cien pestañas y fórmulas pesa más que el `datos.json` publicado |
| `TIMEOUT_HOJA_MS` | 120 s (`120 * 1000`) | Tiempo máximo de cada intento de descarga de la hoja |
| `MAX_PESTANAS` | `300` | Máximo de pestañas que se leen; el resto se omite con un aviso |
| `MAX_FILAS_PESTANA` | `5000` | Máximo de filas que se leen por pestaña; el resto se omite con un aviso |
| `PESTANA_CATALOGOS` | `'_Catalogos'` | Pestaña con listas y coordenadas. Toda pestaña que empieza por `_` o contiene «plantilla» no es establecimiento |
| `PAIS_LOCAL` | `'Ecuador'` | País que define a un visitante como nacional |
| `MINIMO_ESTABLECIMIENTOS` | `1` | Con menos establecimientos válidos no se publica y el sitio sigue con los últimos datos buenos |
| `UMBRAL_FILA_SOSPECHOSA` | `450000` | Si el total de una fila mensual pasa de este número, la fila se publica igual y se avisa |

## Límites de validación: `src/domain/catalogo.js`

Se escriben una sola vez y los usan el lector, el enlace compartido y el contrato de datos (`test/domain/limites.test.mjs` lo vigila).

| Clave | Valor | Para qué sirve |
|---|---|---|
| `ANIO_MINIMO` y `ANIO_MAXIMO` | `2000` y `2100` | Años aceptados |
| `EDAD_MAXIMA` | `110` | Edad máxima del formato anterior |
| `CANTIDAD_MAXIMA` | `100000` | Máximo de una celda de visitantes |

### Reglas de los enlaces de `CONTACTO_MUNICIPIO`

Los valida `prepararEnlacesContacto` en
[`contacto.presentational.js`](../src/tablero/application/components/presentational/contacto.presentational.js). Solo se aceptan direcciones
`https://` sin parámetros ni fragmentos (nada después de `?` o `#`). Las redes se muestran siempre en el orden Facebook, TikTok, LinkedIn.

| Red | Forma aceptada |
|---|---|
| Facebook | `https://facebook.com/...`, `https://www.facebook.com/...` o `https://m.facebook.com/...` |
| TikTok | `https://tiktok.com/@usuario` o `https://www.tiktok.com/@usuario` |
| LinkedIn | `https://linkedin.com/in/usuario` o `https://www.linkedin.com/in/usuario` |

Un valor vacío se muestra como botón «Pronto». Un valor que no cumple la forma no se muestra.

## Disparadores de la publicación

El flujo [`publicar.yml`](../.github/workflows/publicar.yml) se arranca de tres maneras. Las horas son de cada hora, sin importar la zona horaria.

| Disparador | Cuándo | Qué hace |
|---|---|---|
| **cron-job.org** (una sola tarea) | Cada 30 minutos, en punto y a la media (:00 y :30), vía `workflow_dispatch`. Es el principal | Construye los datos y despliega, sin correr las pruebas |
| `schedule` de GitHub `'15,45 * * * *'` | :15 y :45, todo el día. Refuerzo propio | Igual que cron-job.org. GitHub puede retrasarlo bajo carga |
| `push` a `main` | Cada cambio de código | Corre las pruebas (`node --test "test/**/*.test.mjs"`), construye y despliega |

La tarea de cron-job.org usa un **token de grano fino** de GitHub, solo para este repositorio, con el único permiso **Actions: Read and write**
y con vencimiento. Al vencer, la tarea recibe un `401` y la publicación sigue solo con el `schedule`. El paso a paso está en
[operacion.md](operacion.md#cómo-se-dispara-la-publicación-cron-joborg).

Además, el job `destrabar` corre al inicio de cada ejecución, sin importar quién la disparó (ver [observabilidad.md](observabilidad.md#el-job-destrabar)).

La cifra de 30 minutos vive en `PUBLICACION_MINUTOS`. El `schedule` del YAML y la tarea de cron-job.org no pueden leer esa constante y se cambian a mano.

- **Para cambiar la frecuencia:** edita la tarea en cron-job.org, el `schedule` de `publicar.yml` y `PUBLICACION_MINUTOS`; ajusta también `UMBRALES_FRESCURA` si cambia el ciclo.
- **Para pausarlo:** **Actions > Publicar dashboard > ... > Disable workflow** y pausa la tarea en cron-job.org. Pausar el flujo a mano detiene también el mantenimiento que hace `destrabar`; si queda pausado más de 60 días, GitHub lo desactiva y hay que reactivarlo con «Enable workflow».
