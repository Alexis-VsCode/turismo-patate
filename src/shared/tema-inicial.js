/**
 * @file tema-inicial.js
 * @description Compartido. Script clásico (sin import ni export) que se carga síncrono en el `<head>` para aplicar
 *   el tema antes del primer pintado y evitar el parpadeo. Repite la regla de `resolverTema` en `tema.js`
 *   porque un script clásico no puede importar módulos; una prueba comprueba que ambas coinciden.
 * @author Kevin Alexis Barrera Llerena 2026
 */
(function () {
  // Paso 1: elección guardada; el almacenamiento puede lanzar (modo privado, iframe de terceros)
  var guardado = null;
  try {
    guardado = window.localStorage.getItem('tema-patate');
  } catch (e) {
    guardado = null;
  }
  // Paso 2: solo la elección explícita del visitante por el oscuro lo saca del claro, que es el tema por defecto
  // Paso 3: el atributo lo leen los tokens de css/tema.css
  var tema = guardado === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', tema);
})();
