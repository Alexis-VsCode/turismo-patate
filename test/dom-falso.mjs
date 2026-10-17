/**
 * @file dom-falso.mjs
 * @description Utilidad de pruebas. Documento mínimo en memoria para probar en Node los componentes que pintan con
 *   `createElement` y `textContent`: hijos, atributos, clases, `hidden`, `dataset`, oyentes, nodos de texto y el
 *   valor de un `<select>`. Asignar `innerHTML` lanza un error, así una prueba falla si un componente lo usa.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Elemento mínimo: hijos, atributos, clase, textContent, oyentes y las propiedades que leen los componentes. */
export class Nodo {
  constructor(etiqueta) {
    this.tagName = etiqueta.toUpperCase();
    this.children = [];
    this.atributos = new Map();
    this.oyentes = new Map();
    this.className = '';
    this.texto = '';
    this.escriturasDeTexto = 0;
    this.hidden = false;
    this.dataset = {};
    this.title = '';
    this.label = '';
    this.valor = '';
    this.seleccionada = false;
  }
  get textContent() {
    return this.texto + this.children.map((h) => h.textContent).join('');
  }
  set textContent(valor) {
    this.children = [];
    this.texto = String(valor);
    this.escriturasDeTexto += 1;
  }
  set innerHTML(_) {
    throw new Error('innerHTML no está permitido');
  }
  get firstChild() { return this.children[0] ?? null; }
  get type() { return this.getAttribute('type'); }
  set type(v) { this.setAttribute('type', v); }
  get href() { return this.getAttribute('href'); }
  set href(v) { this.setAttribute('href', v); }
  get target() { return this.getAttribute('target'); }
  set target(v) { this.setAttribute('target', v); }
  get rel() { return this.getAttribute('rel'); }
  set rel(v) { this.setAttribute('rel', v); }
  /** Igual que el navegador: el `<select>` vale lo que su opción elegida, y elegir un valor ausente lo deja vacío. */
  get value() {
    if (this.tagName !== 'SELECT') return this.valor;
    return this.opciones().find((o) => o.seleccionada)?.value ?? '';
  }
  set value(v) {
    if (this.tagName !== 'SELECT') {
      this.valor = String(v);
      return;
    }
    let elegida = false;
    for (const o of this.opciones()) {
      o.seleccionada = !elegida && o.value === String(v);
      elegida ||= o.seleccionada;
    }
  }
  get classList() {
    const clases = () => this.className.split(' ').filter(Boolean);
    return {
      add: (...nuevas) => { this.className = [...new Set([...clases(), ...nuevas])].join(' '); },
      remove: (...quitar) => { this.className = clases().filter((c) => !quitar.includes(c)).join(' '); },
      contains: (clase) => clases().includes(clase),
    };
  }
  setAttribute(n, v) { this.atributos.set(n, String(v)); }
  getAttribute(n) { return this.atributos.has(n) ? this.atributos.get(n) : null; }
  append(...nodos) { for (const n of nodos) this.appendChild(n); }
  appendChild(n) { this.children.push(n); return n; }
  removeChild(n) {
    const i = this.children.indexOf(n);
    if (i < 0) throw new Error('el nodo no es hijo de este elemento');
    this.children.splice(i, 1);
    return n;
  }
  replaceChildren(...nodos) { this.children = []; this.texto = ''; this.append(...nodos); }
  addEventListener(tipo, fn) { (this.oyentes.get(tipo) ?? this.oyentes.set(tipo, new Set()).get(tipo)).add(fn); }
  removeEventListener(tipo, fn) { this.oyentes.get(tipo)?.delete(fn); }
  /** Llama a los oyentes del evento y devuelve lo que devolvió cada uno, para esperar a los asíncronos. */
  emitir(tipo, evento = {}) { return [...(this.oyentes.get(tipo) ?? [])].map((fn) => fn({ type: tipo, ...evento })); }
  cuantosOyentes(tipo) { return this.oyentes.get(tipo)?.size ?? 0; }
  /** Todos los descendientes con esa clase, en orden de documento. */
  buscar(clase) {
    const hallados = [];
    for (const h of this.children) {
      if (h.className.split(' ').includes(clase)) hallados.push(h);
      hallados.push(...h.buscar(clase));
    }
    return hallados;
  }
  /** Todas las opciones descendientes, en orden de documento. */
  opciones() {
    return this.children.flatMap((h) => (h.tagName === 'OPTION' ? [h] : h.opciones()));
  }
}

/** Documento: fábrica de elementos y de nodos de texto, con su `<html>` raíz. */
export class DocumentoFalso extends Nodo {
  constructor() {
    super('#document');
    this.documentElement = new Nodo('html');
  }
  createElement(etiqueta) { return new Nodo(etiqueta); }
  createTextNode(texto) {
    const nodo = new Nodo('#text');
    nodo.texto = String(texto);
    return nodo;
  }
}

/**
 * Pone un documento falso nuevo como `document` global.
 * @returns {() => void} función que deja el `document` que había antes
 */
export function instalarDocumentoFalso() {
  const anterior = globalThis.document;
  globalThis.document = new DocumentoFalso();
  return () => { globalThis.document = anterior; };
}
