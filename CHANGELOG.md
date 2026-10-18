# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico.

## [2.10.1] - 2026-10-17

### Corregido
- **Un país del catálogo sin coordenadas ya no se dibuja en el punto (0, 0) del mapa:** una celda vacía de latitud o longitud contaba como cero. Ahora «Extranjeros (sin especificar)» cuenta en las cifras y los filtros sin círculo en el mapa, como dice la documentación.
- **Copiar enlace desde la página de revisión** quita el parámetro `revision`: quien recibe el enlace ve la página pública con los mismos filtros.
- **Script de la hoja:** `agregarExtranjerosSinEspecificar` no escribe sobre el encabezado si la lista de países está llena, y `restaurarFormulasGrises` solo toca las pestañas con las mismas columnas que «Plantillas», se detiene si falta esa pestaña y respeta el tope de tiempo.
- **Guía `_Inicio` de la hoja:** nombra la pestaña «Plantillas», explica que la copia queda protegida sola, agrega la regla de extranjeros y corrige la frase de las filas en rojo.

### Pruebas
- Un país del catálogo sin coordenadas entra en la lista y no en el mapa; una fila con «Extranjeros (sin especificar)» se lee como extranjera y sin avisos; el enlace que se copia no lleva el modo revisión.

## [2.10.0] - 2026-10-17

### Añadido
- **Página de revisión oculta:** el panel de problemas (filas rechazadas y avisos) ya no lo ve el público. Se ve abriendo el dashboard con `?revision` al final de la dirección, para quien corrige la hoja (`esModoRevision` en `problemas.presentational.js`).
- **«Extranjeros (sin especificar)»** en el catálogo de países, para los extranjeros cuyo país no se anotó: cuenta como extranjero en las cifras y los filtros, y no se dibuja en el mapa porque no tiene coordenadas. Lo agrega el generador del Excel y, en la hoja viva, la función `agregarExtranjerosSinEspecificar` del script.
- **Funciones nuevas en `tools/excel/proteger-hoja.gs`:** `restaurarFormulasGrises`, que repone las fórmulas grises de la plantilla, y `agregarExtranjerosSinEspecificar`.
- **Guía del Excel:** los extranjeros van en una fila aparte, con su país o con «Extranjeros (sin especificar)», y nunca en la fila de Ecuador.

### Corregido
- **Extranjeros contados como nacionales en la hoja (corrección del 17/10/2026):** 34 filas con País Ecuador traían escritos a mano los nacionales y los extranjeros en las columnas grises. Cada una se partió en dos, la fila Ecuador con los nacionales y una fila «Extranjeros (sin especificar)» con los extranjeros, con totales exactos; la edad y el género de los extranjeros se repartieron en la misma proporción que la fila original. Antes se guardó la versión «Antes de corregir extranjeros 17-10-2026» en el historial de Google.
- **Plantilla con números fijos:** la fila 2 de «Plantillas» tenía escritos 960 y 240 en Nacionales y Extranjeros en lugar de sus fórmulas, y cada pestaña nacida de duplicarla los heredaba. Se repuso la fórmula en la plantilla y en todas las pestañas; las tres filas que solo tenían ese residuo quedaron como nacionales, como dice su País. Las dos filas cuyos números escritos a mano no cuadraban con su total recibieron también su fórmula y cuentan según su País; los números originales quedan en la versión de respaldo. Después de la corrección, el lector no deja ningún aviso ni rechazo.

## [2.9.0] - 2026-10-17

### Añadido
- **Filtros facetados:** cada combo ofrece solo las opciones que tienen visitantes bajo los demás filtros activos, sin contar el suyo, así que se puede sumar otra opción del mismo filtro. Una opción ya elegida se conserva aunque deje de tener visitantes. La regla es una sola (`opcionesFacetadas` en `src/domain/estadisticas.js`) y vale por todos los caminos: los combos, la barra de etiquetas, «Quitar todos», el panel del celular, el clic en un motivo o en un gráfico y el enlace compartido.
- **Franja del GAD en el pie:** escudo, foto y nombre del Ing. Emerson Hernán Medina Castro, Alcalde, Administración 2023 a 2027, con el agradecimiento y el enlace al sitio del GAD. Debajo, las tarjetas de la Lic. Vanessa Lesano Martínez (contacto del municipio) y del autor. Los nombres completos salen de `config.js` (`AUTORIDAD_MUNICIPIO` y `CONTACTO_MUNICIPIO`), nunca del HTML.
- **Avisos del lector, sin rechazar la fila:** cuando Nacionales o Extranjeros vienen escritos a mano y contradicen el País (el dashboard sigue usando el País), y cuando el total de una fila mensual pasa de `UMBRAL_FILA_SOSPECHOSA` = 450000 (la fila se publica igual). Aparecen en el panel de problemas con su pestaña y su fila. Se guardan como máximo 20 avisos de fila por pestaña, más uno que resume cuántas filas más tienen avisos, y el panel muestra como máximo 50 avisos.
- **Excel con columnas grises bloqueadas:** cada pestaña de captura y la plantilla salen protegidas y solo las celdas de entrada quedan libres, así cada copia hereda las reglas.
- **`tools/excel/proteger-hoja.gs`:** Apps Script que protege cada pestaña de captura en Google Sheets, y activador «Al producirse un cambio» que protege sola cada pestaña nueva (comprobado el 17/10/2026 duplicando la plantilla).
- **Pruebas:** DOM falso compartido y pruebas de cada presentacional; caso de uso de la publicación en memoria; punto de entrada del constructor; permisos de los flujos; servidor local; que ningún archivo escriba el ID de una hoja; orden de los módulos; CSP; hoja de estilos; accesibilidad; foco al repintar.
- **Validación en cada push a `main` y en cada pull request (`ci.yml`):** además de `npm test`, corre el constructor con el libro de prueba, las pruebas de Python del Excel (`test/excel/plantilla.test.py`) y del oráculo (`test/tools/oraculo.test.py`) y `npm run oraculo`, con las versiones de `openpyxl` y `xlsxwriter` fijadas.
- ADR 010 (publicación hexagonal y tablero semihexagonal).

### Cambiado
- **El repositorio no guarda cifras reales:** el generador del Excel dejó de traer las cinco hojas con cifras de establecimientos reales; arma solo la plantilla y datos ficticios. Los datos reales viven únicamente en la hoja de Google.
- **Arquitectura:** `src/` se separa en `domain/` (puro), `contrato/` (contrato de `datos.json` y descarga acotada), `publicacion/` (hexagonal: caso de uso `aplicacion/construir-datos.js`, puertos JSDoc en `puertos.js`, adaptadores `hoja-google.js`, `lector-xlsx.js` y `destino-archivo.js`, y `config-publicacion.js`) y `tablero/` (semihexagonal: fachada, container, presentacionales, compartidos, infraestructura y `shared/` con `textos.es.js`). `tools/construir-datos.mjs` queda como punto de entrada delgado. Lo vigilan `test/arquitectura.test.mjs` y `test/orden-de-modulos.test.mjs`. Las carpetas `application`, `infrastructure` y `shared` de la raíz de `src` y su `main.js` pasan a `src/tablero/`; el antiguo lector del libro pasa a `lector-xlsx.js` y el antiguo módulo de descarga, a `descarga-acotada.js` y `hoja-google.js`.
- La recarga al cambiar de establecimiento la decide la fachada, y el container ya no descarga los límites del mapa: le llegan por una función inyectada desde `main.js`. El mapa pasa a `compartidos/` y guarda solo el estado que exige Leaflet.
- Los límites de validación (años, edad y cantidad) se escriben una sola vez, en `src/domain/catalogo.js`.
- **CSP con las URL exactas** de ECharts y Leaflet en cdnjs, en lugar del CDN entero.
- **Publicación con permisos mínimos:** el flujo solo da `contents: read` y cada job declara lo que usa. El sitio publica la carpeta `assets/` completa y quita `src/publicacion/`.
- **Sin el ID de la hoja en el repositorio:** la herramienta de catálogos lo toma de la variable `HOJA_CATALOGOS_URL`.
- `destrabar` termina con error, visible en Actions, si la API de GitHub falla o si no pudo mantener activo el flujo. Sigue sin bloquear la publicación.
- `npm run oraculo` regenera el esperado de los dos formatos y corre su conciliación.
- **Accesibilidad:** el foco vuelve a su lugar al repintar las etiquetas, los motivos y las etiquetas del combo; los gráficos de evolución y de edad y género se leen como imágenes con un resumen; con «reducir movimiento» los gráficos no se animan y el mapa no vuela; los títulos del pie son encabezados de segundo nivel. Al quitar la última etiqueta de un combo, el foco vuelve a su caja de búsqueda sin abrir la lista.
- **Estilos:** las maquetas por ancho rigen solo en pantalla, la impresión devuelve cada panel a su celda y la barra de estado queda alineada con el contenido en pantallas anchas.
- La prueba de redacción (sin emojis ni guiones largos) vigila también `test/`, `tools/`, `css/` y `.github/`, además de `index.html`, los `.md` de la raíz, `src/` y `docs/`.

### Corregido
- **Porcentaje bien redondeado:** el medio se aleja del cero, sin el error de la coma flotante (28,75 se muestra 28,8 %).
- **Botón «Pronto»:** se ve como antes, con el color de su red y el borde punteado, y al pasar el mouse se oscurece como las demás redes; antes se volvía casi transparente.
- **El oráculo salta las filas vacías** que Google deja en el xlsx publicado.
- El servidor local responde 403 a una ruta fuera del repositorio y 400 a una URL mal codificada, sin caerse.

### Documentación
- Toda la documentación al día con la versión: rutas nuevas, diagramas Mermaid del subconjunto de GitLab, manual de usuario con los filtros facetados y el pie nuevo, y manual de operación con la protección de la hoja, los avisos y la cadencia.
- Corregida la frase «las filas en rojo no se publican»: el lector no lee la columna Estado. Rechaza lo que sus reglas no aceptan y publica, sin ciudad ni provincia, una fila nacional sin ciudad.

## [2.8.0] - 2026-10-12

### Cambiado
- **Barra de estado responsive:** en pantallas medianas (de 860 a 1279 px, incluido el modo escritorio del celular, de unos 980 px) se ordena en dos filas: chip y botones arriba, los cuatro datos en cuatro columnas debajo. Por debajo de 860 px va en dos columnas.
- **Pie:** las tarjetas de las dos personas muestran su foto, con las iniciales como respaldo si la foto no carga.
- **Documentación corregida:** tema (claro por defecto; la elección de oscuro se recuerda), árbol de estructura, scripts y dependencias de Python, procedencia (los combos listan solo los orígenes con visitantes), rangos de discapacidad (se agrega 16 o más), derechos y licencias. Se usa «dashboard» de forma uniforme.

### Añadido
- Línea de derechos en el pie: autor y año, propiedad de los datos (GAD Municipal de San Cristóbal de Patate y establecimientos) y autorización de las fotos.
- Fotos de las personas del proyecto en `assets/personas/`, incluidas en la publicación.
- Prueba que impide emojis y guiones largos en el código y en la documentación.
- Manual de usuario (`docs/manual-usuario.md`).

## [2.7.0] - 2026-10-12

### Cambiado
- **Encabezado:** línea institucional «GAD Municipal de San Cristóbal de Patate», título y lugar. La barra de estado muestra cuatro datos, cada uno con su explicación: **Última publicación**, **Periodo con datos**, **Establecimientos con datos** y **Registros mensuales**. La hora de la consulta del navegador ya no se muestra, porque se confundía con la publicación.
- **Chip de frescura:** «Datos al día · publicados hace X», «Datos con retraso» y «Publicación detenida».
- **Pie:** tres columnas («Acerca del dashboard», «Privacidad y seguridad», «Fuentes y licencias»), agradecimientos al GAD y a la Lic. Vanessa Lesano, y dos tarjetas con el rol escrito arriba: «Contacto del municipio» y «Diseño y desarrollo». Los íconos de redes salen de un único sprite SVG.
- **El flujo ya no puede apagarse por inactividad:** GitHub desactiva un flujo entero tras 60 días sin commits (y con él también el disparo de cron-job.org). En cada publicación, `destrabar` lo vuelve a habilitar por la API, lo que reinicia ese plazo (evento `flujo_mantenido`).
- `destrabar` mide la antigüedad desde que la ejecución arrancó (`run_started_at`) y fuerza la cancelación si sigue viva pasado el doble del límite.
- **Refuerzo de la publicación:** el `schedule` de GitHub pasa a `15,45 * * * *`, cada 30 minutos desfasado de cron-job.org (:00 y :30); si uno falla, el otro publica en 15 minutos o menos.

### Añadido
- Redes de la Lic. Vanessa Lesano (Facebook y TikTok) en `CONTACTO_MUNICIPIO`. Una red sin dirección (LinkedIn) se muestra como botón «Pronto» y abre un aviso con los enlaces disponibles (`aviso.js`): se cierra con el botón, con Esc o solo, y acepta únicamente enlaces `https://`.
- **Periodo con datos** en la barra de estado («dic 2024 a sep 2026»), y cada dato con su explicación visible debajo.
- El aviso no se cierra solo mientras el puntero o el foco están sobre él, y al cerrarlo con la cruz o con Esc el foco vuelve al botón que lo abrió. El nombre accesible del botón «Pronto» contiene su texto visible.
- Documentación: casos de uso (`docs/casos-de-uso.md`), decisión 009 (publicación con doble disparador) y README, manual de operación, parámetros y observabilidad al día.

## [2.6.0] - 2026-10-12

### Cambiado
- **Barra de estado en unidades de la hoja:** «Registros» mostraba filas internas (una por casilla de edad y género con visitantes). Ahora dice **Registros mensuales** (filas de la hoja: mes, origen y motivo de un establecimiento) y **Establecimientos con datos** («17 de 39»).
- Franja «DATOS DE PRUEBA» apagada: la hoja ya trae los datos reales del municipio.
- Contacto del municipio en el pie con el mismo formato que el del autor, lado a lado. Sus enlaces (sitio web, Facebook y correo) se configuran en `CONTACTO_MUNICIPIO`; mientras estén vacíos, el bloque dice «Enlaces disponibles muy pronto».

## [2.5.0] - 2026-10-12

### Cambiado
- **Cadencia de publicación cada 30 minutos:** cron-job.org dispara la publicación cada media hora y el `schedule` de GitHub queda como respaldo cada hora (minuto 15). El navegador consulta cada 10 minutos y el chip de frescura pasa a «al día» hasta 45 minutos y «retrasado» hasta 100.
- Pruebas de coherencia de la configuración (`config.test.mjs`): la consulta del navegador, los umbrales y el respaldo de GitHub tienen que encajar con la cadencia.

### Corregido
- **Publicación detenida desde el 06/10:** un despliegue de Pages quedó en «waiting» y retuvo el grupo de concurrencia `pages`, así que todas las ejecuciones siguientes se cancelaron. Ahora la concurrencia vive solo en el job `desplegar` y un job `destrabar` (`tools/destrabar-publicacion.mjs`) cancela al inicio de cada publicación toda ejecución del flujo con más de 25 minutos en `waiting` o `in_progress`; si la limpieza falla, la publicación sigue igual.

### Añadido
- Contacto del municipio en el pie: Lic. Vanessa Lesano, contacto y apoyo del GAD Municipal de Patate.

## [2.4.1] - 2026-10-02

### Corregido
- **Lista de los combos en modo claro:** las opciones se veían en blanco sobre blanco (heredaban el texto del panel de filtros); ahora usan el color de texto del tema.

### Cambiado
- **Tema:** el sitio abre siempre en modo claro y ya no sigue el modo oscuro del sistema; la elección del botón de la luna se recuerda en el dispositivo.
- **Barra de estado:** pasa de una frase larga a una tarjeta con cuatro datos rotulados (actualizado, publicado, establecimientos, registros) y la nota de actualización automática.
- **Pie de página:** tres columnas separadas con listas (seguridad y fuentes), bloque del autor y una línea legal; en celular se apila con divisores.
- **Pantallas medianas (860 a 1279 px):** tres columnas con los pies alineados y el panel de discapacidad bajo los filtros.

## [2.4.0] - 2026-10-02

### Añadido
- **Enlace compartible:** los filtros viajan en la dirección de la página y el botón «Copiar enlace» la copia. El enlace se valida al abrirlo (`src/domain/enlace.js`).
- **Reintentos en la descarga de la hoja:** ante un corte de red, un 429 o un 5xx de Google el constructor reintenta hasta 3 veces con espera creciente y lo registra en el log.
- Vista previa al compartir la dirección (Open Graph y Twitter), enlace canónico, enlace para saltar al contenido, anuncio de los cambios de la frase de participación e
  impresión sin controles.

### Cambiado
- Tope propio para el xlsx completo de la hoja (50 MB) y tiempo máximo de 120 s: con más de cien pestañas y fórmulas pesa más que el `datos.json` publicado.
- Diseño compacto: paneles más bajos, nacionales y extranjeros en la columna izquierda y los pies de las dos columnas a la misma altura.

## [2.3.1] - 2026-10-02

### Corregido
- **Alineación del dashboard:** las cabeceras de los paneles miden lo mismo aunque el título ocupe dos líneas; la barra de filtros activos pasó a una fila
  propia sobre las dos columnas, así que la columna izquierda y los paneles empiezan a la misma altura; la barra de los motivos ya no pisa la cifra
  ni el porcentaje; el panel de discapacidad ocupa el ancho completo cuando los paneles van en dos columnas.
- **Diseño compacto como en la maqueta:** los paneles son más bajos (la página baja de unos 1550 a unos 1300 px a 1440 de ancho), «Nacionales» y «Extranjeros» pasan a la columna izquierda bajo el total, y los pies de las dos columnas quedan a la misma altura.
- **Filtros compactos:** el panel de filtros mide lo que necesita (controles de 36 px y espaciado parejo) en lugar de estirarse hasta igualar la altura de los paneles, y en pantallas altas acompaña al desplazamiento.
- **Filtros a la izquierda:** lo elegido en cada filtro se ve también como etiquetas removibles debajo de su combo, y el panel de filtros se queda a la
  izquierda hasta los 860 px (antes se convertía en un botón desde los 1100 px). Entre 860 y 1279 px los paneles van en dos columnas.

## [2.3.0] - 2026-10-01

### Añadido
- **Filtros de varias opciones** en establecimiento, procedencia (país, ciudad y provincia), motivo, edad y género, con etiquetas removibles
  y «Quitar todos». Año y mes siguen siendo de una sola opción. ADR 008.
- **Formato mensual de captura:** una fila por mes, origen y motivo, con mujeres y hombres por rango de edad y personas con discapacidad. La hoja
  calcula los totales y marca en rojo lo que no cuadra. El formato anterior sigue valiendo. ADR 007.
- **Panel «Personas con discapacidad»** y leyenda «Total mujeres» / «Total hombres» con totales y porcentajes en el gráfico de edad.
- **Catálogos completos:** los cantones del Ecuador con su provincia y coordenadas, y los países reconocidos (`tools/catalogos/`).
- Generador del libro de captura (`tools/excel/generar-excel.py`) y oráculo del formato mensual.
- El log de la publicación incluye los registros de discapacidad y el tamaño del paquete.

### Cambiado
- **Rangos de edad:** 0-30, 31-45, 46-60 y 61+ (antes 0-17, 18-25, 26-35, 36-45, 46-59 y 60+).
- La edad y el género suben a la primera fila de paneles y la discapacidad ocupa la segunda, como en la maqueta del municipio.
- `datos.json` lleva una clave opcional `discapacidad`; los paquetes anteriores siguen siendo válidos.
- Los filtros viven en `src/domain/filtros.js`.

### Corregido
- El pie atribuye los cantones (CC BY 3.0 IGO) y los países (ODbL) además de los límites provinciales (CC0).

## [2.2.0] - 2026-09-30

### Añadido
- **Avisos del catálogo:** el lector avisa de ciudades repetidas (se conserva la primera), ciudades con coordenadas fuera de Ecuador
  (se omiten) y ciudades cuya provincia no está en la lista. Aparecen en el aviso de «filas con problemas».
- `PUBLICACION_MINUTOS` en `config.js`: la cifra de publicación sale de un solo lugar.
- Pruebas del repositorio: barrido de azules, descarga de `datos.json` y hora formateada.
- `ci.yml` para validar cambios y `dependabot.yml` para mantener al día las acciones de GitHub.
- ADR 006.

### Cambiado
- La publicación corre las pruebas solo cuando hay un `push`; las ejecuciones periódicas solo construyen y despliegan. Tiempo límite de 10
  minutos por trabajo y `schedule` propio como respaldo cada 15 minutos.
- Los motivos del catálogo con y sin tilde ya no se duplican en el combo.
- La ayuda del chip habla de los minutos de publicación y no del refresco del navegador.
- Hoja de cálculo: `_Catalogos` en cuatro bloques, con latitud y longitud de provincias, desplegables hasta la fila 1000 y protección contra
  repetidos; la primera pestaña pasa a ser `_Inicio`.

### Corregido
- Se recreó el despliegue de Pages: el sitio había dejado de actualizarse a las 01:14 UTC del 30/09 aunque las ejecuciones figuraban como
  exitosas.

## [2.1.1] - 2026-09-29

### Cambiado
- **El combo de años y el de motivos salen de la hoja:** unen los que tienen visitantes con los de `_Catalogos`. Un año
  nuevo aparece al agregarlo al catálogo, aunque aún no tenga datos; elegirlo muestra «Sin visitantes».
- `datos.json` lleva `catalogo.anios` y `catalogo.motivos`. Los campos son aditivos: un paquete anterior sigue siendo
  válido y da listas vacías.
- El intervalo de actualización que muestran el aviso y la ayuda del chip sale de la configuración y ya no está escrito
  a mano en los textos.

## [2.1.0] - 2026-09-29

### Añadido
- **Botón de modo claro y oscuro** de dos estados. El tema se aplica antes del primer pintado y se recuerda en el
  dispositivo (`localStorage`).
- **Chip de frescura** de la publicación («al día», «retrasada» o «detenida») y texto de estado con dos horas
  distintas: «Actualizado el...» (este navegador) y «Datos publicados el...» (la publicación de Actions).
- **Observabilidad básica** en la construcción de datos: una línea de log JSON por ejecución y un resumen en Actions.
  Ver [docs/observabilidad.md](docs/observabilidad.md).
- **Pestañas del mapa** (Provincias, Ciudades y Países) que cambian burbujas, «Top» y encuadre, y siguen al filtro
  País / Ciudad.
- **Panel de participación:** la dona muestra el total al centro y absorbe las tarjetas de nacionales y extranjeros,
  con una frase que se redacta según el periodo filtrado.
- **Motivos de visita** con ícono, barra de verdes graduados, cifra y porcentaje. La lista no se reduce al motivo
  elegido, para poder pasar de uno a otro.
- Botón de TikTok en el pie, con el mismo formato que LinkedIn y Facebook.
- `npm run servir`: servidor local sin caché.
- ADR 005 y `docs/observabilidad.md`.

### Cambiado
- **Paleta solo de verde y amarillo**, con las únicas excepciones de la bandera de Ecuador y los botones de marca.
- Barras de panel verdes, filtros en un bloque verde y pie en tres columnas.
- Gráficos, mapa y tooltips leen los colores del tema; cambiar de tema no reencuadra el mapa.
- Porcentajes con un solo formato (una decimal y coma) en toda la interfaz.
- Atribución de OpenStreetMap con enlace a su política de copyright.
- Pasos numerados y mapa del flujo en `main.js`; un solo formato de comentarios en el código.
- Node 22 como versión mínima.

### Corregido
- La evolución mensual sin año de referencia ya no muestra «null» ni «-1» en la leyenda.
- Si un suscriptor de la fachada lanza un error, ya no se muestra «formato inesperado» con datos válidos.
- La dona, su información emergente y la variación usan el mismo formato de porcentaje.

### Eliminado
- El rótulo «En vivo», que afirmaba algo que no se verificaba.
- El campo `periodo`, que se calculaba y nadie leía.

## [2.0.0] - 2026-09-29

### Cambiado
- **Rediseño visual institucional moderno:**
  - tarjetas limpias, con títulos acompañados de ícono y subtítulo;
  - indicador «En vivo»;
  - cabecera más compacta.
- **Celular y tableta:** los filtros pasan a un panel que sube desde abajo, abierto por un botón flotante
  «Filtros (n)». El botón «Actualizar» queda como ícono.
- **Selector de establecimiento único:** se elimina el duplicado de la barra de filtros.

### Añadido
- Variación del total contra el mismo período del año anterior (`variacionInteranual`), conciliada con el
  oráculo.
- Chips de filtros activos, que se quitan con un toque.
- Cifras animadas. Respetan «reducir movimiento» y llegan exactas aunque la pestaña esté en segundo plano.
- Modo oscuro automático, que sigue el tema del dispositivo.
- La guía `CONTRIBUTING.md` reemplaza a `AGENTS.md`.
- Capturas de escritorio (claro y oscuro) y de celular. En total hay 64 pruebas.

## [1.2.0] - 2026-09-29

### Cambiado
- Código organizado en **capas semihexagonales**:
  - carpetas `domain`, `infrastructure` y `application` de `src` (fachada, container y presentacionales), más
    `shared` (la 2.9.0 las reorganiza, ver ADR 010).
  - `main.js` como raíz de composición.
- `app.js` dividido en fachada, container y presentacionales. La fachada guarda el estado y la política de
  actualización, sin DOM.
- SheetJS pasa a `tools/vendor/`, porque solo lo usa el constructor de datos.
- Cabeceras JSDoc unificadas (`@file`, `@description`, `@author`).

### Añadido
- Guardián de arquitectura (`test/arquitectura.test.mjs`) y 8 pruebas de la fachada. En total, 61 pruebas.
- Documentación de portafolio:
  - README en español e inglés;
  - `LICENSE`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md` y `CONTRIBUTING.md`;
  - guías de arquitectura, configuración, operación y seguridad;
  - decisiones de diseño (ADR) y capturas.
- `.gitattributes` y `.editorconfig`.

## [1.1.0] - 2026-09-29

### Añadido
- Pie de página con información en columnas (GAD, seguridad, fuentes) y tarjeta de autor con LinkedIn y
  Facebook.

## [1.0.0] - 2026-09-29

### Añadido
- **Dashboard:**
  - datos de la Google Sheet compartida, con una pestaña por establecimiento;
  - indicadores, cuatro gráficos y mapa OpenStreetMap con provincias, burbujas y zoom por procedencia;
  - filtros con combo buscable y filtrado cruzado;
  - actualización al entrar, con botón y automática cada 5 minutos.
- **Publicación:** con GitHub Actions y GitHub Pages. La URL de la hoja va en el secreto `SHEET_URL`.
- **Seguridad:** CSP, SRI, anti-XSS, descarga acotada y validación del contrato de datos.
- **Pruebas:** conciliación con un oráculo independiente, normalización, contrato de datos y seguridad.
