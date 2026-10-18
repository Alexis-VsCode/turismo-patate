# ADR 010: Publicación hexagonal y tablero semihexagonal

**Estado:** Aceptada, **Fecha:** 2026-10-17, **Autor:** Ing. Kevin Alexis Barrera Llerena

Amplía la [ADR 004](004-capas-semihexagonales.md), que queda como antecedente.

## Contexto

La ADR 004 ordenó el código del navegador en dominio, infraestructura, aplicación y shared. Pero en su carpeta de infraestructura convivían dos
cosas que corren en lugares distintos: lo que usa el navegador (configuración, descarga de `datos.json`) y lo que solo corre en GitHub
Actions (lectura del Excel con SheetJS). El constructor `tools/construir-datos.mjs` hacía todo el trabajo de la publicación en un solo
archivo: leer el secreto, descargar, leer el libro, empaquetar y escribir. Eso tenía tres efectos:

- La publicación no se podía probar sin disco ni red: el orden de los pasos y la regla «si algo falla, no se escribe» vivían mezclados
  con los detalles técnicos.
- Nada impedía que el navegador importara por error un módulo de Node, ni que la publicación dependiera de la interfaz.
- El contrato de `datos.json`, que es justo lo que comparten los dos lados, estaba dentro de la infraestructura de uno de ellos.

## Decisión

El código de `src/` se separa en dos lados que nunca se importan entre sí y dos piezas que comparten:

| Carpeta | Qué es | Puede importar |
|---|---|---|
| `src/domain/` | Reglas puras del negocio | Solo dominio |
| `src/contrato/` | Formato de `datos.json` (`contrato-datos.js`) y descarga acotada (`descarga-acotada.js`) | Dominio y contrato |
| `src/publicacion/` | Lado que corre en GitHub Actions, en forma hexagonal | Dominio, contrato y su propio lado |
| `src/tablero/` | Lado del navegador, en forma semihexagonal | Dominio, contrato y su propio lado |

**Publicación hexagonal.**

- `aplicacion/construir-datos.js` es el único caso de uso: pide el libro a la fuente, lo lee, exige un mínimo de establecimientos,
  lo empaqueta con el contrato y lo entrega al destino. Si algo falla lanza el error antes de escribir.
- `puertos.js` declara los tres puertos (`FuenteHoja`, `LectorLibro` y `DestinoPublicacion`) como `@typedef` de JSDoc, sin código.
- `adaptadores/` los implementa: `hoja-google.js` (descarga con reintentos), `lector-xlsx.js` (SheetJS) y `destino-archivo.js`
  (escritura atómica). Son los únicos módulos de `src/` que cargan `node:*`.
- `config-publicacion.js` guarda los límites y nombres de la publicación.
- `tools/construir-datos.mjs` queda como punto de entrada delgado: lee argumentos y entorno, arma los adaptadores, llama al caso de
  uso y registra el resultado.

**Tablero semihexagonal.** Igual que en la ADR 004, ahora bajo `src/tablero/`: `application/` (fachada, container, presentacionales y
compartidos), `infrastructure/` (configuración y repositorio de datos), `shared/` (textos, formato y tema) y `main.js` como raíz de
composición.

**Vigilancia.** `test/arquitectura.test.mjs` clasifica cada archivo en su capa y su lado y falla si un import rompe la tabla de capas,
si la publicación y el tablero se cruzan, si `puertos.js` tiene código, si el punto de entrada importa algo fuera de
`src/publicacion/` o si aparece un ciclo. `test/orden-de-modulos.test.mjs` vigila el orden interno de cada módulo.

## Consecuencias

- El caso de uso se prueba en memoria, con objetos que cumplen los puertos (`test/publicacion/construir-datos.test.mjs`): se comprueba
  que escribe una sola vez, que no escribe si falla la fuente o si no hay establecimientos y que solo devuelve cuentas.
- El sitio publicado no lleva el lado de la publicación: el flujo copia `src/` y borra `sitio/src/publicacion`.
- El contrato es uno solo y lo leen los dos lados, así que un cambio de formato se nota en las pruebas de ambos.
- Hay más archivos y más carpetas. Cada uno tiene una sola responsabilidad y su lugar lo decide una regla que se prueba.
- Las carpetas `application`, `infrastructure` y `shared` de la raíz de `src`, y su `main.js`, pasan a `src/tablero/`. El antiguo lector
  del libro pasa a `src/publicacion/adaptadores/lector-xlsx.js`. La descarga acotada vive en `src/contrato/descarga-acotada.js` y sus reintentos, que son política de la publicación, en
  `src/publicacion/adaptadores/hoja-google.js`.

## Alternativas descartadas

- **Puertos como clases o interfaces con herencia.** JavaScript no tiene interfaces y una clase base vacía solo agrega código que
  hay que mantener. Un `@typedef` documenta la forma y cualquier objeto que la cumpla sirve, incluido uno en memoria en las pruebas.
- **Un contenedor de inyección de dependencias.** Para tres puertos y un caso de uso, el punto de entrada los arma a mano en pocas
  líneas (`main` de `tools/construir-datos.mjs`). Un inyector sería sobreingeniería sin un caso real que lo exija.
- **Dejar el constructor como estaba y solo mover archivos.** Ordenaba las carpetas, pero la regla «si algo falla, no se escribe»
  seguía sin poder probarse sin disco ni red.
- **Hexagonal completa también en el navegador.** El tablero no tiene más de un adaptador por puerto ni casos de uso que repetir; la
  fachada con dependencias inyectadas ya permite probarlo en Node.
