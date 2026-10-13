/**
 * @file contacto.presentational.js
 * @description Presentacional. Bloque del contacto del municipio en el pie: nombre y hasta tres enlaces (sitio web,
 *   Facebook y correo). Solo se muestran las direcciones válidas y seguras de la configuración; sin ninguna, el bloque
 *   avisa que los enlaces llegan pronto. Todo texto se escribe con textContent.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';

/** Regla de cada tipo de enlace, en el orden en que se muestran. */
const TIPOS = [
  { tipo: 'sitio', valida: (v) => /^https:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v), href: (v) => v },
  { tipo: 'facebook', valida: (v) => /^https:\/\/(www\.|m\.)?facebook\.com\/\S+$/i.test(v), href: (v) => v },
  { tipo: 'correo', valida: (v) => /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(v), href: (v) => `mailto:${v}` },
];

/**
 * Enlaces que se pueden mostrar.
 * @param {{ sitio?: string, facebook?: string, correo?: string }} enlaces direcciones de la configuración
 * @returns {Array<{ tipo: 'sitio'|'facebook'|'correo', href: string }>} solo los válidos, en orden fijo
 */
export function prepararEnlacesContacto(enlaces) {
  return TIPOS
    .filter(({ tipo, valida }) => typeof enlaces[tipo] === 'string' && valida(enlaces[tipo].trim()))
    .map(({ tipo, href }) => ({ tipo, href: href(enlaces[tipo].trim()) }));
}

/**
 * Pinta el nombre y los enlaces del contacto.
 * @param {{ nombre: HTMLElement, redes: HTMLElement }} elementos nodos del bloque
 * @param {{ nombre: string, enlaces: object }} contacto contacto de la configuración
 */
export function pintarContacto(elementos, contacto) {
  elementos.nombre.textContent = contacto.nombre;
  const enlaces = prepararEnlacesContacto(contacto.enlaces);
  if (!enlaces.length) {
    const aviso = document.createElement('span');
    aviso.className = 'contacto-pronto';
    aviso.textContent = TEXTOS.contactoSinEnlaces;
    elementos.redes.replaceChildren(aviso);
    return;
  }
  elementos.redes.replaceChildren(...enlaces.map(({ tipo, href }) => {
    const enlace = document.createElement('a');
    enlace.className = `red red-municipio red-${tipo}`;
    enlace.href = href;
    if (tipo !== 'correo') {
      enlace.target = '_blank';
      enlace.rel = 'noopener noreferrer';
    }
    enlace.setAttribute('aria-label', TEXTOS.contactoAria(TEXTOS.contactoEnlace[tipo], contacto.nombre));
    enlace.textContent = TEXTOS.contactoEnlace[tipo];
    return enlace;
  }));
}
