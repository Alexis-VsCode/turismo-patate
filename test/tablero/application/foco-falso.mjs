/**
 * @file foco-falso.mjs
 * @description Utilidad de pruebas. Completa el documento falso de test/dom-falso.mjs con lo que necesitan las pruebas
 *   de foco del teclado: `document.activeElement`, `focus()`, `contains()`, `createElementNS`, `classList.toggle` y
 *   `style.setProperty`. `focus()` emite el evento focus, como en el navegador. El foco sale del documento cuando el nodo enfocado deja de estar colgado de él, igual que en
 *   el navegador, donde un botón destruido al repintar deja el foco en <body>.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { Nodo, instalarDocumentoFalso } from '../../dom-falso.mjs';

/**
 * Instala el documento falso con foco. El contenedor que se pase a `colgar` queda dentro del documento.
 * @returns {{ colgar: (nodo: Nodo) => Nodo, enfocado: () => Nodo|null, restaurar: () => void }}
 */
export function instalarFocoFalso() {
  const restaurarDocumento = instalarDocumentoFalso();
  const documento = globalThis.document;
  const originales = {
    classList: Object.getOwnPropertyDescriptor(Nodo.prototype, 'classList'),
  };
  let activo = null;
  Nodo.prototype.contains = function contains(otro) {
    return otro === this || this.children.some((h) => h.contains(otro));
  };
  Nodo.prototype.focus = function focus() {
    activo = this;
    this.emitir('focus');
  };
  Nodo.prototype.select = function select() {};
  Object.defineProperty(Nodo.prototype, 'style', {
    configurable: true,
    get() { return { setProperty: () => {} }; },
  });
  Object.defineProperty(Nodo.prototype, 'classList', {
    configurable: true,
    get() {
      const lista = originales.classList.get.call(this);
      lista.toggle = (clase, forzar) => (forzar ?? !lista.contains(clase) ? lista.add(clase) : lista.remove(clase));
      return lista;
    },
  });
  documento.createElementNS = (_, etiqueta) => new Nodo(etiqueta);
  Object.defineProperty(documento, 'activeElement', {
    configurable: true,
    get: () => (activo && documento.contains(activo) ? activo : null),
  });
  return {
    colgar: (nodo) => documento.appendChild(nodo),
    enfocado: () => documento.activeElement,
    restaurar() {
      delete Nodo.prototype.contains;
      delete Nodo.prototype.focus;
      delete Nodo.prototype.select;
      delete Nodo.prototype.style;
      Object.defineProperty(Nodo.prototype, 'classList', originales.classList);
      restaurarDocumento();
    },
  };
}
