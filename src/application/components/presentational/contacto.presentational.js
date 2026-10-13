/**
 * @file contacto.presentational.js
 * @description Presentacional. Bloque del contacto del municipio en el pie: nombre y sus redes (Facebook, TikTok y
 *   LinkedIn). Una red con dirección válida es un enlace; una sin dirección es un botón «pronto» que abre un aviso.
 *   Todo texto se escribe con textContent y los íconos salen del sprite del HTML.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../../shared/textos.es.js';

/** Regla de cada red, en el orden en que se muestran. Solo https:// y sin parámetros: nada de rastreo ni esquemas raros. */
const TIPOS = [
  { tipo: 'facebook', valida: (v) => /^https:\/\/(www\.|m\.)?facebook\.com\/[^\s?#]+$/i.test(v) },
  { tipo: 'tiktok', valida: (v) => /^https:\/\/(www\.)?tiktok\.com\/@[\w.]+\/?$/i.test(v) },
  { tipo: 'linkedin', valida: (v) => /^https:\/\/(www\.|[a-z]{2}\.)?linkedin\.com\/in\/[\w%-]+\/?$/i.test(v) },
];

/**
 * Enlaces del contacto.
 * @param {{ facebook?: string, tiktok?: string, linkedin?: string }} enlaces direcciones de la configuración
 * @returns {Array<{ tipo: 'facebook'|'tiktok'|'linkedin', href: string|null }>} en orden fijo; `href` null si la red
 *   todavía no tiene dirección (próximamente). Una dirección inválida no se muestra.
 */
export function prepararEnlacesContacto(enlaces) {
  const resultado = [];
  for (const { tipo, valida } of TIPOS) {
    const valor = typeof enlaces[tipo] === 'string' ? enlaces[tipo].trim() : '';
    if (!valor) resultado.push({ tipo, href: null });
    else if (valida(valor)) resultado.push({ tipo, href: valor });
  }
  return resultado;
}

/** Ícono de una red tomado del sprite del HTML (`<symbol id="ico-…">`), sin escribir marcado. */
function icono(tipo) {
  const ESPACIO = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ESPACIO, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS(ESPACIO, 'use');
  uso.setAttribute('href', `#ico-${tipo}`);
  svg.appendChild(uso);
  return svg;
}

/**
 * Pinta el nombre y los botones del contacto.
 * @param {{ nombre: HTMLElement, redes: HTMLElement }} elementos nodos del bloque
 * @param {{ nombre: string, referencia: string, enlaces: object }} contacto contacto de la configuración
 * @param {(tipo: string, boton: HTMLElement) => void} alProximamente se llama al pulsar una red que todavía no tiene
 *   dirección, con el botón pulsado para devolverle el foco al cerrar el aviso
 */
export function pintarContacto(elementos, contacto, alProximamente) {
  elementos.nombre.textContent = contacto.nombre;
  elementos.redes.replaceChildren(...prepararEnlacesContacto(contacto.enlaces).map(({ tipo, href }) => {
    const red = TEXTOS.contactoEnlace[tipo];
    const nodo = document.createElement(href ? 'a' : 'button');
    nodo.className = `red red-${tipo}`;
    if (href) {
      nodo.href = href;
      nodo.target = '_blank';
      nodo.rel = 'noopener noreferrer';
      nodo.setAttribute('aria-label', TEXTOS.contactoAria(red, contacto.referencia));
    } else {
      nodo.type = 'button';
      nodo.classList.add('red-pronto');
      nodo.setAttribute('aria-label', TEXTOS.contactoPronto(red, contacto.referencia));
      nodo.addEventListener('click', () => alProximamente(tipo, nodo));
    }
    const texto = document.createElement('span');
    texto.textContent = red;
    nodo.append(icono(tipo), texto);
    if (!href) {
      const marca = document.createElement('small');
      marca.className = 'red-marca';
      marca.textContent = TEXTOS.pronto;
      nodo.appendChild(marca);
    }
    return nodo;
  }));
}
