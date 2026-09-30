# Guía de contribución

Estas son las reglas con las que mantengo el proyecto. Si una regla choca con el código, **manda el código**: se
corrige la regla en el mismo cambio. El código es de uso reservado (ver [LICENSE](LICENSE)); las propuestas de
mejora son bienvenidas por issue antes de abrir un pull request.

## 1. Lectura inicial, en este orden

1. [`README.md`](README.md)
2. [`docs/README.md`](docs/README.md)
3. [`docs/arquitectura.md`](docs/arquitectura.md)
4. Esta guía
5. `git status --short`: nunca se asume un árbol limpio

## 2. Fuentes de verdad

**Código y pruebas > documentación de `docs/` > este archivo > conocimiento externo.** Ninguna cifra (versiones,
número de pruebas, CVE) se escribe sin medirla en el momento.

## 3. Arquitectura: la regla de dependencias no se rompe

| Capa | Carpeta | Puede importar |
|---|---|---|
| Dominio | `src/domain/` | solo dominio |
| Infraestructura | `src/infrastructure/` | dominio, infraestructura |
| Shared | `src/shared/` | solo shared |
| Fachada | `src/application/*.facade.js` | dominio, shared |
| Presentacional | `src/application/components/presentational/` | dominio, shared |
| Compartidos | `src/application/components/compartidos/` | dominio, shared |
| Container | `src/application/components/*.container.js` | shared, presentacionales, compartidos |
| Raíz de composición | `src/main.js` | todas |

- **Sin paquetes npm en `src/`.** Las librerías de terceros entran por `<script>` con SRI.
- **La fachada no toca el DOM ni la red:** recibe sus dependencias inyectadas.
- **Los presentacionales no guardan estado.**
- **Una sola fuente de configuración:** [`src/infrastructure/config.js`](src/infrastructure/config.js).
- **Todo texto visible sale de [`src/shared/textos.es.js`](src/shared/textos.es.js), y ningún texto repite una cifra de
  `config.js`** (por ejemplo, el intervalo de actualización): la recibe como parámetro desde la fachada.
- **Las columnas del catálogo se identifican por su encabezado**, no por su posición: se pueden reordenar en la hoja sin tocar el código.
- **Una opción de combo aparece si tiene visitantes o está en la lista corta del catálogo** (años y motivos). Lo que
  la hoja pueda decir, lo dice la hoja: no se agregan listas fijas al código, salvo meses y rangos de edad.
- **Un presentacional no importa a otro presentacional:** lo que comparten dos, sube a `shared` o se junta en un
  solo archivo.
- **`src/shared/tema-inicial.js` es un script clásico**, sin `import` ni `export`, porque se ejecuta en el `<head>`
  antes del primer pintado. Repite la regla de `src/shared/tema.js` y una prueba comprueba que ambos dan lo mismo.
- **Excepciones a «todo texto visible sale de `textos.es.js`»:** los textos fijos de `index.html` y los motivos de
  rechazo de fila de `visitante.js` y `lector-libro.js`, que describen una entrada y no la interfaz.
- `test/arquitectura.test.mjs` hace cumplir esta tabla. Si falla, se corrige el import; no se relaja la regla.

## 4. Seguridad: reglas que no se negocian

- **Todo dato de la hoja es entrada no confiable.** Se escribe con `textContent` o `createElement`. Quedan
  prohibidos `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` y `new Function`, y una prueba lo vigila.
- **La URL de la hoja vive solo en el secreto `SHEET_URL`.** Nunca en el código, en commits, en issues ni en
  `datos.json`.
- **Cambiar la versión de una librería** exige:
  - revisar sus CVE;
  - recalcular el `integrity`;
  - actualizar la tabla de [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) y [`docs/seguridad.md`](docs/seguridad.md).
- **Cambios en la CSP:** si se agrega un origen, se agrega solo ese, sin comodines amplios.

## 5. Estilo de código

- **Cabecera de archivo:**
  ```js
  /**
   * @file nombre.js
   * @description Capa. Qué hace y qué no hace.
   * @author Kevin Alexis Barrera Llerena 2026
   */
  ```
- **Funciones exportadas que cruzan capas:** JSDoc con `@param` y `@returns`. Los ayudantes privados y las
  opciones declarativas de los gráficos quedan exentos.
- **Comentarios internos:** solo `// Paso N: …`, que explican el porqué. La historia de un cambio va al
  commit, nunca al código.
- **Nombres del negocio en español**, funciones cortas, sin código muerto ni `console.log`.
- **Sin emojis** en código ni en documentación.

## 6. Git

- `git add` **por ruta explícita**. Nunca `git add -A`, `git add .` ni `git commit -a`.
- **Asunto del commit:** `tipo(ámbito): descripción`, con `tipo` ∈ `feat`, `fix`, `refactor`, `test`, `docs`,
  `chore`.
- **No mezclar un refactor estructural con un cambio funcional** en el mismo commit.
- **Sin firmas automáticas de herramientas** en commits ni en archivos: el historial refleja el trabajo del autor.
- **Una mutación hecha para probar que una prueba falla se restaura y se comprueba** con
  `git diff --quiet -- <ruta>`, no confiando en la palabra de quien la hizo.

## 7. Definición de terminado

1. `npm test` en verde, con un número de pruebas igual o mayor al anterior.
2. **Si cambió un cálculo:** oráculo regenerado (`npm run oraculo`) y conciliación en verde.
3. **Verificación en el navegador:**
   - consola sin errores ni violaciones de CSP;
   - celular sin scroll horizontal;
   - servido con `npm run servir` (sin caché) y con datos recién generados por `npm run datos`; si no, el chip de
     frescura marcará «detenida».
4. Documentación de `docs/` y `CHANGELOG.md` actualizadas en el mismo cambio.
5. `git status --short` limpio.
6. Tras el push, la ejecución de GitHub Actions termina en éxito y el sitio publicado funciona.
