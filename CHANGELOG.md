# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico.

## [2.3.1] - 2026-10-02

### Corregido
- **Alineación del tablero:** las cabeceras de los paneles miden lo mismo aunque el título ocupe dos líneas; la barra de filtros activos pasó a una fila
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
  distintas: «Actualizado el…» (este navegador) y «Datos publicados el…» (la publicación de Actions).
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
- Pasos numerados y mapa del flujo en `src/main.js`; un solo formato de comentarios en el código.
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
  - `src/domain`, `src/infrastructure` y `src/application` (fachada, container y presentacionales), más
    `shared`.
  - `src/main.js` como raíz de composición.
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
- **Tablero:**
  - datos de la Google Sheet compartida, con una pestaña por establecimiento;
  - indicadores, cuatro gráficos y mapa OpenStreetMap con provincias, burbujas y zoom por procedencia;
  - filtros con combo buscable y filtrado cruzado;
  - actualización al entrar, con botón y automática cada 5 minutos.
- **Publicación:** con GitHub Actions y GitHub Pages. La URL de la hoja va en el secreto `SHEET_URL`.
- **Seguridad:** CSP, SRI, anti-XSS, descarga acotada y validación del contrato de datos.
- **Pruebas:** conciliación con un oráculo independiente, normalización, contrato de datos y seguridad.
