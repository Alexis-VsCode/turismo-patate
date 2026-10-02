/**
 * @file panel-filtros.js
 * @description Componente compartido. En pantallas angostas muestra los filtros en un panel que sube
 *   desde abajo (<dialog> nativo, accesible con teclado y lector de pantalla). Mueve el mismo bloque de
 *   filtros entre la barra lateral y el panel, así no se duplican controles ni identificadores.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/**
 * @param {{ boton: HTMLButtonElement, dialogo: HTMLDialogElement, cuerpo: HTMLElement,
 *           bloque: HTMLElement, lugarOriginal: HTMLElement, cerrar: HTMLButtonElement }} elementos
 * @returns {{ fijarConteo: (texto: string) => void, cerrar: () => void }}
 */
export function crearPanelFiltros({ boton, dialogo, cuerpo, bloque, lugarOriginal, cerrar }) {
  const volver = () => {
    if (bloque.parentElement !== lugarOriginal) lugarOriginal.appendChild(bloque);
  };

  // Paso 1: al abrir, el bloque de filtros pasa al panel; al cerrar, vuelve a su lugar
  boton.addEventListener('click', () => {
    cuerpo.appendChild(bloque);
    dialogo.showModal();
  });
  const cerrarPanel = () => {
    if (dialogo.open) dialogo.close();
    volver();
  };
  dialogo.addEventListener('close', volver);
  dialogo.addEventListener('cancel', volver);
  cerrar.addEventListener('click', cerrarPanel);

  // Paso 2: tocar el fondo oscuro también cierra
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) cerrarPanel();
  });

  // Paso 3: si la pantalla se agranda con el panel abierto, se cierra y el bloque vuelve
  const ancho = window.matchMedia('(min-width: 860px)');
  ancho.addEventListener('change', (e) => {
    if (e.matches) cerrarPanel();
  });

  return {
    fijarConteo(texto) { boton.querySelector('.boton-filtros-texto').textContent = texto; },
    cerrar: cerrarPanel,
  };
}
