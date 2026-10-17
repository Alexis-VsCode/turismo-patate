/**
 * @file estado.presentational.js
 * @description Presentacional. Barra de estado de los datos: última publicación, periodo con datos, establecimientos
 *   con datos y registros mensuales, cada uno con su rótulo, su valor y una explicación al lado. No guarda estado ni
 *   calcula: recibe los datos ya redactados por textos.es.js. Todo texto se escribe con textContent.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/**
 * Reemplaza el contenido de la barra por un `span.estado-dato` por dato: `small` con el rótulo, `strong` con el
 * valor y `span.estado-detalle` con la explicación.
 * @param {HTMLElement} contenedor barra de estado
 * @param {Array<{ rotulo: string, valor: string, detalle: string }>} items datos ya redactados (ver TEXTOS.estadoDatos)
 * @returns {void} solo escribe en el DOM
 */
export function pintarEstadoDatos(contenedor, items) {
  contenedor.replaceChildren(...items.map(({ rotulo, valor, detalle }) => {
    const item = document.createElement('span');
    item.className = 'estado-dato';
    const nodoRotulo = document.createElement('small');
    nodoRotulo.textContent = rotulo;
    const nodoValor = document.createElement('strong');
    nodoValor.textContent = valor;
    const nodoDetalle = document.createElement('span');
    nodoDetalle.className = 'estado-detalle';
    nodoDetalle.textContent = detalle;
    item.append(nodoRotulo, nodoValor, nodoDetalle);
    return item;
  }));
}
