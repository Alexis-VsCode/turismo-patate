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

## 5. SDD y TDD, siempre combinados

1. **Spec con criterio observable.** Antes de programar se escribe qué debe pasar y cómo se demuestra: una prueba con
   nombre o una medición en el navegador. Es proporcional al riesgo: una línea para un ajuste menor, una tabla para un
   cambio que cruza capas.
2. **Prueba roja primero.** Se escribe la prueba y se corre para ver que falla por la razón correcta.
3. **Código.** Lo mínimo que la pone en verde.
4. **Verde.** `npm test` completo, no solo la prueba nueva.
5. **Mutación de prueba restaurada y comprobada.** Para demostrar que una prueba falla de verdad se rompe el código a
   propósito (se invierte una condición, se cambia un valor) y se vuelve a lo anterior. La restauración se comprueba
   con el hash, no con la palabra de quien la hizo:

   ```
   git hash-object --no-filters <ruta>     # antes de mutar
   git hash-object --no-filters <ruta>     # después de restaurar: debe ser idéntico
   ```

   `git diff` y `git status` no bastan, porque comparan después de convertir los saltos de línea.

## 6. Estilo de código y de texto

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
- **Comentarios internos:** solo `// Paso N: ...`, que explican el porqué. La historia de un cambio va al
  commit, nunca al código.
- **Nombres del negocio en español**, funciones cortas, sin código muerto ni `console.log`.
- **Textos visibles en [`src/shared/textos.es.js`](src/shared/textos.es.js)**, nunca sueltos en el código.
- **Sin emojis ni guiones largos** (raya y semirraya, U+2014 y U+2013) en código ni en documentación: se usan comas, dos puntos, paréntesis o
  la palabra «a» en los rangos.
- **Se dice «dashboard»**, no «tablero», para nombrar el producto.

## 7. Git

- `git add` **por ruta explícita**. Nunca `git add -A`, `git add .` ni `git commit -a`.
- **Asunto del commit:** `tipo(ámbito): descripción`, con `tipo` entre `feat`, `fix`, `docs`, `refactor`, `test`,
  `chore` y `ci`. No lleva SID, porque no es un repositorio institucional.
- **No mezclar un refactor estructural con un cambio funcional** en el mismo commit.
- **Sin firmas automáticas de herramientas** en commits ni en archivos: el historial refleja el trabajo del autor.
- **`main` está protegida** contra borrado y force-push. El autor publica directo a `main`; quien colabore con
  acuerdo previo lo hace por la vía que el autor indique.

## 8. Definición de terminado

1. `npm test` en verde, con un número de pruebas igual o mayor al anterior.
2. **Si cambió un cálculo:** oráculo regenerado (`npm run oraculo`) y conciliación en verde.
3. **Verificación en el navegador:**
   - consola sin errores ni violaciones de CSP;
   - celular sin scroll horizontal;
   - servido con `npm run servir` (sin caché) y con datos recién generados por `npm run datos`; si no, el chip de
     frescura marcará «detenida».
4. Documentación de `docs/` y `CHANGELOG.md` actualizadas en el mismo cambio, sin emojis ni guiones largos.
5. `git status --short` limpio.
6. Tras el push, la ejecución de GitHub Actions termina en éxito y el sitio publicado funciona.
