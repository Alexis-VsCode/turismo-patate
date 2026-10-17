/**
 * @file contacto.presentational.js
 * @description Presentacional. Personas del pie: la franja de la autoridad del cantón (nombre, cargo, agradecimiento y
 *   enlace al sitio del GAD) y el bloque del contacto del municipio con sus redes (Facebook, TikTok y LinkedIn). Una red
 *   con dirección válida es un enlace; una sin dirección es un botón «pronto» que abre un aviso. Todo texto se escribe
 *   con textContent y los íconos salen del sprite del HTML.
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
 * Dirección web segura para un enlace del pie.
 * @param {string} valor dirección de la configuración
 * @returns {string|null} la misma dirección si es https:// a un dominio, o null
 */
export function enlaceSeguro(valor) {
  const v = typeof valor === 'string' ? valor.trim() : '';
  return /^https:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v) ? v : null;
}

/**
 * Pinta la franja de la autoridad: nombre, cargo, agradecimiento, texto alternativo de las fotos y enlace al GAD.
 * @param {{ nombre: HTMLElement, cargo: HTMLElement, gracias: HTMLElement, enlace: HTMLAnchorElement, foto: HTMLImageElement, fotoContacto: HTMLImageElement }} elementos nodos del pie
 * @param {{ nombre: string, cargo: string, periodo: string, enlace: string }} autoridad autoridad de la configuración
 * @param {{ nombre: string, referencia: string }} contacto contacto del municipio de la configuración
 */
export function pintarAutoridad(elementos, autoridad, contacto) {
  elementos.nombre.textContent = autoridad.nombre;
  elementos.cargo.textContent = TEXTOS.autoridadCargo(autoridad);
  elementos.gracias.textContent = TEXTOS.agradecimiento(autoridad, contacto);
  elementos.foto.alt = TEXTOS.autoridadFoto(autoridad);
  elementos.fotoContacto.alt = TEXTOS.contactoFoto(contacto);
  const href = enlaceSeguro(autoridad.enlace);
  elementos.enlace.hidden = !href;
  if (href) elementos.enlace.href = href;
}

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
