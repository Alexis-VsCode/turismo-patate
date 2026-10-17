/**
 * @file aviso.js
 * @description Componente compartido. Aviso flotante (toast) que se pinta dentro de una región viva que el HTML ya
 *   trae con role="status" y aria-live="polite". Hay un solo aviso a la vez: uno nuevo reemplaza al anterior. Se
 *   cierra con su botón, con Escape o al cumplirse su duración, que se pausa mientras el puntero o el foco están sobre
 *   el aviso. Al cerrarlo a mano el foco vuelve a quien lo abrió. Todo texto se escribe con textContent y solo se
 *   aceptan enlaces https://.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';

/** Único esquema de enlace que el aviso acepta. */
const PREFIJO_SEGURO = 'https://';

/** Contenedores con un aviso vigente y la función que lo cierra. */
const vigentes = new WeakMap();

/**
 * Normaliza el contenido de un aviso. Enlaces aceptados: solo https:// ; el resto se descarta.
 * @param {{ titulo: string, mensaje: string, enlaces?: Array<{ texto: string, href: string }> }} aviso contenido
 * @returns {{ titulo: string, mensaje: string, enlaces: Array<{ texto: string, href: string }> }} los enlaces
 *   aceptados conservan su orden
 */
export function prepararAviso({ titulo, mensaje, enlaces = [] }) {
  return {
    titulo,
    mensaje,
    enlaces: enlaces
      .filter((e) => typeof e?.href === 'string' && e.href.startsWith(PREFIJO_SEGURO))
      .map(({ texto, href }) => ({ texto, href })),
  };
}

/**
 * Arma la caja del aviso: título y mensaje como texto plano, la lista de enlaces externos (en pestaña nueva y solo si
 * queda alguno aceptado) y el botón de cerrar.
 * @param {{ titulo: string, mensaje: string, enlaces: Array<{ texto: string, href: string }> }} aviso contenido ya
 *   preparado (ver prepararAviso)
 * @param {string} textoCerrar nombre accesible del botón de cerrar
 * @returns {{ caja: HTMLElement, boton: HTMLButtonElement }} la caja lista para pintar y su botón de cerrar
 */
function armarCaja({ titulo, mensaje, enlaces }, textoCerrar) {
  const caja = document.createElement('div');
  caja.className = 'aviso';
  const nodoTitulo = document.createElement('strong');
  nodoTitulo.className = 'aviso-titulo';
  nodoTitulo.textContent = titulo;
  const nodoMensaje = document.createElement('p');
  nodoMensaje.className = 'aviso-mensaje';
  nodoMensaje.textContent = mensaje;
  caja.append(nodoTitulo, nodoMensaje);
  if (enlaces.length) {
    const lista = document.createElement('ul');
    lista.className = 'aviso-enlaces';
    for (const { texto, href } of enlaces) {
      const item = document.createElement('li');
      const enlace = document.createElement('a');
      enlace.className = 'aviso-enlace';
      enlace.href = href;
      enlace.target = '_blank';
      enlace.rel = 'noopener noreferrer';
      enlace.textContent = texto;
      item.appendChild(enlace);
      lista.appendChild(item);
    }
    caja.appendChild(lista);
  }
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'aviso-cerrar';
  boton.setAttribute('aria-label', textoCerrar);
  boton.textContent = '×';
  caja.appendChild(boton);
  return { caja, boton };
}

/**
 * Muestra un aviso flotante (toast) dentro de `contenedor` (un elemento que el HTML ya trae con role="status"
 * aria-live="polite"). Uno a la vez: reemplaza el anterior. Estructura: div.aviso > [strong.aviso-titulo,
 * p.aviso-mensaje, ul.aviso-enlaces > li > a.aviso-enlace (target _blank, rel "noopener noreferrer"),
 * button.aviso-cerrar (type button, aria-label = textoCerrar, contenido '×')].
 * Se cierra con el botón, con Escape (keydown en document) y solo a los duracionMs. Al cerrar vacía el contenedor y
 * quita el listener.
 * @param {HTMLElement} contenedor región viva donde se pinta el aviso
 * @param {{ titulo: string, mensaje: string, enlaces?: Array<{ texto: string, href: string }> }} aviso contenido
 * @param {{ duracionMs?: number, textoCerrar?: string, devolverFoco?: { focus: () => void } }} [opciones] tiempo
 *   visible, nombre accesible del botón (por defecto el de textos.es.js) y elemento que recupera el foco al cerrar
 *   con el botón o con Escape
 * @returns {{ cerrar: () => void }}
 */
export function mostrarAviso(contenedor, aviso, { duracionMs = 10000, textoCerrar = TEXTOS.avisoPronto.cerrar, devolverFoco = null } = {}) {
  // Paso 1: el aviso anterior se cierra del todo, con su temporizador y su oyente
  vigentes.get(contenedor)?.();

  // Paso 2: la caja con su texto, sus enlaces aceptados y el botón de cerrar
  const { caja, boton } = armarCaja(prepararAviso(aviso), textoCerrar);

  // Paso 3: cierre único por botón, Escape o tiempo; uno ya reemplazado no toca al vigente
  let abierto = true;
  let temporizador = null;
  const contar = () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => cerrar(), duracionMs);
  };
  const pausar = () => clearTimeout(temporizador);
  const cerrarYVolver = () => {
    const eraVigente = abierto;
    cerrar();
    if (eraVigente && devolverFoco) devolverFoco.focus();
  };
  const alTeclear = (e) => {
    if (e.key === 'Escape') cerrarYVolver();
  };
  function cerrar() {
    if (!abierto) return;
    abierto = false;
    clearTimeout(temporizador);
    document.removeEventListener('keydown', alTeclear);
    if (vigentes.get(contenedor) === cerrar) {
      vigentes.delete(contenedor);
      contenedor.replaceChildren();
    }
  }
  boton.addEventListener('click', cerrarYVolver);
  document.addEventListener('keydown', alTeclear);
  // Paso 4: mientras alguien lo está usando no se cierra solo (WCAG 2.2.1)
  caja.addEventListener('mouseenter', pausar);
  caja.addEventListener('focusin', pausar);
  caja.addEventListener('mouseleave', contar);
  caja.addEventListener('focusout', contar);
  contar();

  vigentes.set(contenedor, cerrar);
  contenedor.replaceChildren(caja);
  return { cerrar };
}
