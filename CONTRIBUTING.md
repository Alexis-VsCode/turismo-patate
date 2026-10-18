# Guía de contribución

Esta guía explica cómo se trabaja en el proyecto. Si una regla choca con el código, **manda el código**: la regla se
corrige en el mismo cambio.

**Uso reservado.** El repositorio es de uso reservado (ver [LICENSE](LICENSE)). Se aceptan reportes de problemas por
issue; las vulnerabilidades siguen [SECURITY.md](SECURITY.md) y no se reportan en público. Las contribuciones de código
requieren acuerdo previo con el autor: no abras un pull request sin haberlo hablado antes.

## 1. Lectura inicial, en este orden

1. [`README.md`](README.md)
2. [`docs/README.md`](docs/README.md)
3. [`docs/arquitectura.md`](docs/arquitectura.md)
4. Esta guía
5. `git status --short` y `git log --oneline -5`: el estado se mide, nunca se asume un árbol limpio

## 2. Fuentes de verdad

**Código y pruebas > documentación de `docs/` > este archivo > conocimiento externo.** Ninguna cifra (versiones,
número de pruebas, CVE) se escribe sin medirla en el momento, y junto a ella va el comando que la mide.

## 3. Estructura y regla de dependencias

```
src/
├── domain/          reglas puras, compartidas por los dos lados
├── contrato/        contrato de datos.json y descarga acotada, compartidos
├── publicacion/     lado de GitHub Actions, hexagonal
│   ├── aplicacion/      caso de uso construir-datos.js
│   ├── adaptadores/     hoja-google.js, lector-xlsx.js, destino-archivo.js
│   ├── puertos.js       puertos como typedef de JSDoc
│   └── config-publicacion.js
└── tablero/         lado del navegador, semihexagonal
    ├── application/     tablero.facade.js y components/ (container, presentational/, compartidos/)
    ├── infrastructure/  config.js y repositorio-datos.js
    ├── shared/          textos.es.js, formato.js, tema.js y tema-inicial.js
    └── main.js          raíz de composición
tools/construir-datos.mjs   punto de entrada delgado de la publicación
```

| Capa | Carpeta | Puede importar |
|---|---|---|
| Dominio | `src/domain/` | solo dominio |
| Contrato | `src/contrato/` | dominio, contrato |
| Publicación, caso de uso | `src/publicacion/aplicacion/` | dominio, contrato, puertos |
| Publicación, adaptadores | `src/publicacion/adaptadores/` | dominio, contrato, puertos, `config-publicacion.js` y `node:*` |
| Publicación, puertos y configuración | `src/publicacion/puertos.js`, `config-publicacion.js` | nada |
| Tablero, infraestructura | `src/tablero/infrastructure/` | dominio, contrato, infraestructura |
| Tablero, shared | `src/tablero/shared/` | solo shared |
| Tablero, fachada | `src/tablero/application/*.facade.js` | dominio, shared |
| Tablero, presentacionales | `src/tablero/application/components/presentational/` | dominio, shared |
| Tablero, compartidos | `src/tablero/application/components/compartidos/` | dominio, shared |
| Tablero, container | `src/tablero/application/components/*.container.js` | shared, presentacionales, compartidos |
| Tablero, raíz | `src/tablero/main.js` | todas las del tablero, dominio y contrato |

- **La publicación y el tablero nunca se importan entre sí.** Los dos usan dominio y contrato.
- **Solo los adaptadores de la publicación cargan `node:*`.** Sin paquetes npm en `src/`: las librerías del navegador entran por
  `<script>` con SRI y SheetJS se carga desde `tools/vendor/`.
- **Los puertos son `@typedef` de JSDoc**, sin clases ni inyectores. El punto de entrada arma los adaptadores a mano
  ([ADR 010](docs/decisiones/010-publicacion-hexagonal-y-tablero-semihexagonal.md)).
- **La fachada no toca el DOM ni la red:** recibe sus dependencias inyectadas y es dueña de la política (cuándo recargar, qué
  opciones ofrece cada combo).
- **Los presentacionales solo pintan y no guardan estado.** Un compartido guarda solo el estado propio del control: lo abierto y lo
  enfocado del combo, o el mapa y las capas que exige Leaflet en `mapa.js`.
- **Un presentacional no importa a otro presentacional:** lo que comparten dos, sube a `shared` o se junta en un solo archivo.
- **Una sola fuente de configuración por lado:** [`src/tablero/infrastructure/config.js`](src/tablero/infrastructure/config.js) para el
  navegador y [`src/publicacion/config-publicacion.js`](src/publicacion/config-publicacion.js) para la publicación. Los límites de
  validación (años, edad, cantidad por celda) viven una sola vez en [`src/domain/catalogo.js`](src/domain/catalogo.js).
- **Todo texto visible sale de [`src/tablero/shared/textos.es.js`](src/tablero/shared/textos.es.js), y ningún texto repite una cifra
  de la configuración** (por ejemplo, el intervalo de publicación): la recibe como parámetro. Los nombres de las personas salen de
  `config.js`, nunca del HTML.
- **Las columnas del catálogo se identifican por su encabezado**, no por su posición: se pueden reordenar en la hoja sin tocar el código.
- **Las opciones de los combos salen de los datos.** Lo que la hoja pueda decir, lo dice la hoja: no se agregan listas fijas al código,
  salvo meses, rangos de edad y los dos géneros base del formato mensual (`GENERO_MUJERES` y `GENERO_HOMBRES` en `catalogo.js`), que
  la hoja captura en columnas separadas.
- **`src/tablero/shared/tema-inicial.js` es un script clásico**, sin `import` ni `export`, porque se ejecuta en el `<head>` antes del
  primer pintado. Repite la regla de `tema.js` y una prueba comprueba que ambos dan lo mismo.
- **Excepciones a «todo texto visible sale de `textos.es.js`»:** los textos fijos de `index.html` y los motivos de rechazo y avisos de
  fila de `visitante.js` y `lector-xlsx.js`, que describen una entrada de la hoja y no la interfaz.
- `test/arquitectura.test.mjs` hace cumplir esta tabla. Si falla, se corrige el import; no se relaja la regla.

## 4. Seguridad: reglas que no se negocian

- **Todo dato de la hoja es entrada no confiable.** Se escribe con `textContent` o `createElement`. Quedan
  prohibidos `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` y `new Function`, y una prueba lo vigila.
- **La URL y el ID de la hoja viven solo en el secreto `SHEET_URL`.** Nunca en el código, en commits, en issues ni en
  `datos.json`. `test/tools/url-hoja.test.mjs` falla si algún archivo versionado escribe el ID de una hoja de Google.
- **Nada de datos reales en el repositorio:** los libros de `test/fixtures/` son ficticios.
- **Cambiar la versión de una librería** exige:
  - revisar sus CVE;
  - recalcular el `integrity`;
  - cambiar su URL exacta en la CSP de `index.html`;
  - actualizar la tabla de [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) y [`docs/seguridad.md`](docs/seguridad.md).
- **Cambios en la CSP:** si se agrega un recurso externo, se agrega su URL exacta, sin comodines ni el CDN entero
  (`test/tablero/csp.test.mjs` lo vigila).
- **Librerías nuevas, solo con acuerdo del autor.**

## 5. SDD y TDD, siempre combinados

1. **Spec con criterio observable.** Antes de programar se escribe qué debe pasar y cómo se demuestra: una prueba con
   nombre en español o una medición en el navegador. Es proporcional al riesgo: una línea para un ajuste menor, una tabla para
   un cambio que cruza capas.
2. **Prueba roja primero.** Se escribe la prueba y se corre para ver que falla por la razón correcta.
3. **Código.** Lo mínimo que la pone en verde.
4. **Verde.** `npm test` completo, no solo la prueba nueva. Las pruebas se comparan por nombre, no por conteo: un conteo no
   distingue un fallo nuevo de una prueba nueva que pasa.
5. **Mutación de control restaurada y comprobada.** Para demostrar que una prueba falla de verdad se rompe el código a
   propósito (se invierte una condición, se cambia un valor), se ve la prueba en rojo y se vuelve a lo anterior. La restauración
   se comprueba con el hash, no con la palabra de quien la hizo:

   ```
   git hash-object --no-filters <ruta>     # antes de mutar
   git hash-object --no-filters <ruta>     # después de restaurar: debe ser idéntico
   ```

   `git diff` y `git status` no bastan, porque comparan después de convertir los saltos de línea. Una mutación olvidada compila y
   puede pasar todos los demás gates.

## 6. Estilo de código y de texto

**Orden de cada módulo de `src/`**, vigilado por `test/orden-de-modulos.test.mjs`:

1. **Cabecera JSDoc**, con `@file` en la segunda línea:
   ```js
   /**
    * @file nombre.js
    * @description Capa. Qué hace y qué no hace.
    * @author Kevin Alexis Barrera Llerena 2026
    */
   ```
2. **Imports**, en este orden: `node:*`, dominio, contrato y después las capas propias. Ningún import aparece después del primer código.
3. **Constantes.**
4. **API pública**, con JSDoc completo (`@param` y `@returns`) en las funciones exportadas.
5. **Ayudantes privados.** En el nivel del módulo, la API pública va antes que los ayudantes.

Más reglas:

- **Rótulos de sección:** `// ===== RÓTULO =====`, solo en los módulos largos y con un texto de la lista cerrada: `ESTADO`,
  `CICLO DE VIDA / CARGA`, `ACCIONES DE UI`, `EVENTOS Y SUSCRIPCIONES`, `API PUBLICA` y `HELPERS PRIVADOS`.
- **Comentarios internos:** solo `// Paso N: ...`, que explican el porqué, en orden ascendente dentro de cada función, sin repetirse
  y sin dos pasos apilados sin código entre ellos. Lo que explica una constante o un ayudante va en un JSDoc `/** ... */`. La historia
  de un cambio va al commit, nunca al código.
- **Nombres del negocio en español**, funciones cortas, sin código muerto ni `console.log` en `src/`.
- **Textos visibles en [`src/tablero/shared/textos.es.js`](src/tablero/shared/textos.es.js)**, nunca sueltos en el código.
- **Sin emojis ni guiones largos** (raya y semirraya, U+2014 y U+2013) en código ni en documentación: se usan comas, dos puntos,
  paréntesis o la palabra «a» en los rangos. Lo vigila `test/redaccion.test.mjs` en `index.html`, los `.md` de la raíz, `src/`, `docs/`, `test/`, `tools/`, `css/` y `.github/`
  (sin `vendor/` ni cachés).
- **Diagramas Mermaid** solo del subconjunto que muestra GitLab 17 (Mermaid 10): `flowchart`, `sequenceDiagram` y `stateDiagram-v2`,
  sin paréntesis ni caracteres raros dentro de las etiquetas.
- **Se dice «dashboard»**, no «tablero», para nombrar el producto. `src/tablero/` es solo el nombre de una carpeta.

## 7. Git

- `git add` **por ruta explícita**. Nunca `git add -A`, `git add .` ni `git commit -a`.
- **Asunto del commit:** `tipo(ámbito): descripción`, con `tipo` entre `feat`, `fix`, `docs`, `refactor`, `test`,
  `chore` y `ci`. No lleva SID, porque no es un repositorio institucional.
- **No mezclar un refactor estructural con un cambio funcional** en el mismo commit.
- **Sin firmas automáticas de herramientas** en commits ni en archivos: el historial refleja el trabajo del autor.
- **`main` está protegida** contra borrado y force-push. El autor publica directo a `main`; quien colabore con
  acuerdo previo lo hace por la vía que el autor indique.

## 8. Definición de terminado

1. `npm test` en verde, comparado por nombre con la ejecución anterior.
2. **Si cambió un cálculo:** `npm run oraculo`, que regenera `test/fixtures/esperado.json` (formato anterior) y
   `test/fixtures/esperado-mensual.json` (formato mensual) y luego corre la conciliación de los dos. Requiere `openpyxl`.
3. **Si cambió el Excel o el oráculo:** `python test/excel/plantilla.test.py` y `python test/tools/oraculo.test.py`.
4. **Verificación en el navegador**, a 1440 y a 390 px de ancho:
   - consola sin errores ni violaciones de CSP;
   - celular sin scroll horizontal, medido en el DOM: ningún gate ve un desborde de CSS;
   - servido con `npm run servir` (sin caché) y con datos recién generados por `npm run datos`; si no, el chip de
     frescura marcará «detenida».
5. Documentación de `docs/` y `CHANGELOG.md` actualizadas en el mismo cambio, sin emojis ni guiones largos.
6. `git status --short` limpio.
7. Tras el push, la ejecución de GitHub Actions termina en éxito y el sitio publicado funciona.

Los pull requests pasan por [`ci.yml`](.github/workflows/ci.yml), que corre `npm test`, el constructor con el libro de prueba, las pruebas
de Python del Excel y del oráculo, y `npm run oraculo`.
