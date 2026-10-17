/**
 * @file mapa.js
 * @description Componente compartido. Mapa de origen de visitantes con Leaflet sobre teselas de OpenStreetMap:
 *   provincias de Ecuador (GeoJSON local) coloreadas por visitantes nacionales, burbujas por provincia,
 *   ciudad o país según la pestaña activa, lista «Top» del mismo nivel y encuadre automático según la
 *   pestaña y el filtro País / Ciudad. Guarda solo lo que exige Leaflet (el mapa y sus capas, los nombres del
 *   catálogo de cada provincia y si ya hubo un primer encuadre); qué pintar y adónde ir lo deciden funciones puras
 *   exportadas. Todo contenido de la hoja se inserta como nodo de texto, nunca como HTML.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { claveNormalizada } from '../../../../domain/catalogo.js';
import { leerProcedencia } from '../../../../domain/filtros.js';
import { numero } from '../../../shared/formato.js';
import { TEXTOS } from '../../../shared/textos.es.js';

const ECUADOR_CONTINENTAL = [[-5.02, -81.1], [1.45, -75.2]];
const VISTA_MUNDO = { centro: [18, -45], zoom: 2 };
const ZOOM_CIUDAD = 10;
const ZOOM_PAIS = 5;
const RADIO_MIN = 6;
const RADIO_MAX = 24;
/** Estado de las provincias antes de recibir los primeros datos: todas sin visitantes y ninguna elegida. */
const SIN_DATOS_PROVINCIAS = Object.freeze({ valores: new Map(), maximo: 0, elegida: '', nombresCatalogo: new Map() });

// ===== API PUBLICA =====

/**
 * Radio de burbuja proporcional al área (raíz cuadrada), acotado entre RADIO_MIN y RADIO_MAX.
 * @param {number} valor visitantes de la burbuja
 * @param {number} maximo visitantes de la burbuja mayor de la misma pestaña
 * @returns {number} radio en píxeles; RADIO_MIN sin visitantes o sin máximo
 */
export function radioDeBurbuja(valor, maximo) {
  if (!maximo || valor <= 0) return RADIO_MIN;
  return RADIO_MIN + Math.sqrt(valor / maximo) * (RADIO_MAX - RADIO_MIN);
}

/**
 * Provincia que el mapa resalta según la procedencia elegida: la provincia misma o la de la ciudad elegida.
 * @param {string} procedencia última opción de procedencia elegida ('' si no hay ninguna)
 * @param {{ ciudades: Map<string, { provincia: string }> }} catalogo catálogo con las ciudades y su provincia
 * @returns {string} clave normalizada de la provincia; '' si la procedencia no apunta a ninguna
 */
export function provinciaElegidaDe(procedencia, catalogo) {
  const { tipo, nombre } = leerProcedencia(procedencia);
  if (tipo === 'PR') return claveNormalizada(nombre);
  if (tipo === 'C') {
    const ciudad = catalogo.ciudades.get(claveNormalizada(nombre));
    if (ciudad) return claveNormalizada(ciudad.provincia);
  }
  return '';
}

/**
 * Con qué se colorea cada provincia en la pestaña activa.
 * @param {{ vista: string, procedencia: string, provincias: Array<{ nombre: string, valor: number }>,
 *   catalogo: { provincias: string[], ciudades: Map<string, object> } }} datosMapa datos del mapa de la fachada
 * @returns {{ valores: Map<string, number>, maximo: number, elegida: string, nombresCatalogo: Map<string, string> }}
 *   visitantes por clave de provincia (ninguno en la pestaña de países, donde quedan como contorno), el mayor de
 *   ellos, la provincia resaltada y el nombre que el catálogo da a cada clave (el primero si se repite)
 */
export function estadoProvincias({ vista, procedencia, provincias, catalogo }) {
  const nombresCatalogo = new Map();
  for (const nombre of catalogo.provincias) {
    const clave = claveNormalizada(nombre);
    if (!nombresCatalogo.has(clave)) nombresCatalogo.set(clave, nombre);
  }
  return {
    valores: new Map(vista === 'paises' ? [] : provincias.map((p) => [claveNormalizada(p.nombre), p.valor])),
    maximo: provincias.reduce((m, p) => Math.max(m, p.valor), 0),
    elegida: provinciaElegidaDe(procedencia, catalogo),
    nombresCatalogo,
  };
}

/**
 * Adónde va el encuadre: depende de la pestaña, y la procedencia elegida solo lo acerca si es del mismo nivel.
 * @param {{ vista: string, procedencia: string, catalogo: { ciudades: Map<string, object>, coordPaises: Map<string, object> } }} datosMapa
 *   datos del mapa de la fachada
 * @param {(clave: string) => boolean} tieneProvincia indica si el GeoJSON trae la provincia de esa clave
 * @param {boolean} hayPuntos si la pestaña pintó al menos una burbuja
 * @returns {{ destino: 'ciudad'|'pais', lat: number, lon: number } | { destino: 'provincia', clave: string }
 *   | { destino: 'puntos'|'mundo'|'ecuador' }} `ecuador` es el Ecuador continental
 */
export function elegirEncuadre({ vista, procedencia, catalogo }, tieneProvincia, hayPuntos) {
  const { tipo, nombre } = leerProcedencia(procedencia);
  if (vista === 'ciudades' && tipo === 'C') {
    const ciudad = catalogo.ciudades.get(claveNormalizada(nombre));
    if (ciudad) return { destino: 'ciudad', lat: ciudad.lat, lon: ciudad.lon };
  }
  if (vista === 'provincias' && tipo === 'PR') {
    const clave = claveNormalizada(nombre);
    if (tieneProvincia(clave)) return { destino: 'provincia', clave };
  }
  if (vista === 'paises') {
    if (tipo === 'P') {
      const pais = catalogo.coordPaises.get(claveNormalizada(nombre));
      if (pais) return { destino: 'pais', lat: pais.lat, lon: pais.lon };
    }
    return { destino: hayPuntos ? 'puntos' : 'mundo' };
  }
  return { destino: 'ecuador' };
}

/**
 * Crea el mapa. `alElegir(procedencia)` se llama al pulsar una burbuja, una provincia o una fila de la lista «Top».
 * @param {HTMLElement} contenedor elemento donde se dibuja el mapa
 * @param {object} geojsonProvincias límites provinciales, con el nombre en `properties.nombre`
 * @param {object} colores colores del tema; se leen en cada pintado, así un cambio de tema se ve al repintar
 * @param {string} provinciaResaltada provincia que siempre lleva borde marcado
 * @param {(procedencia: string) => void} alElegir recibe la procedencia pulsada ('PR:…', 'C:…' o 'P:…')
 * @param {string} urlTeselas plantilla de las teselas del fondo ({z}, {x} y {y})
 * @returns {{ actualizar: (datosMapa: object) => void, repintar: (datosMapa: object) => void, redimensionar: () => void }}
 *   `datosMapa` = { vista, procedencia, ciudades, paises, provincias, catalogo }, con vista 'provincias',
 *   'ciudades' o 'paises'
 */
export function crearMapa(contenedor, geojsonProvincias, colores, provinciaResaltada, alElegir, urlTeselas) {
  // ===== CICLO DE VIDA / CARGA =====
  const L = globalThis.L;
  // Paso 1: fondo y atribución; el prefijo propio reemplaza al de Leaflet, cuya bandera la hoja de estilos de la
  // librería fuerza con !important
  const mapa = L.map(contenedor, { center: [-1.6, -78.4], zoom: 6, zoomSnap: 0.25, worldCopyJump: true, scrollWheelZoom: false, attributionControl: true });
  L.tileLayer(urlTeselas, {
    maxZoom: 18, referrerPolicy: 'strict-origin-when-cross-origin', crossOrigin: false,
    attribution: TEXTOS.mapaAtribucion.osm,
  }).addTo(mapa);
  mapa.attributionControl.addAttribution(TEXTOS.mapaAtribucion.limites);
  mapa.attributionControl.setPrefix(TEXTOS.mapaAtribucion.prefijo);
  let primeraVez = true;

  // Paso 2: capa de provincias con índice por nombre normalizado; al pulsarla se elige con el nombre del catálogo
  const capasProvincia = new Map();
  const nombresCatalogo = new Map();
  const resaltada = claveNormalizada(provinciaResaltada);
  const estiloProvincia = ({ valores, maximo, elegida: provinciaElegida }) => (feature) => {
    const clave = claveNormalizada(feature.properties.nombre);
    const valor = valores.get(clave) || 0;
    const intensidad = maximo ? 0.12 + 0.5 * Math.sqrt(valor / maximo) : 0.08;
    const elegida = clave === provinciaElegida;
    return {
      color: elegida || clave === resaltada ? colores.bosque : colores.verdeTexto,
      weight: elegida ? 3 : clave === resaltada ? 2.5 : 1,
      fillColor: elegida ? colores.amarillo : colores.verde,
      fillOpacity: elegida ? 0.45 : intensidad,
    };
  };
  const capaProvincias = L.geoJSON(geojsonProvincias, {
    style: estiloProvincia(SIN_DATOS_PROVINCIAS),
    onEachFeature: (feature, capa) => {
      const clave = claveNormalizada(feature.properties.nombre);
      capasProvincia.set(clave, capa);
      capa.on('click', () => alElegir(`PR:${nombresCatalogo.get(clave) || feature.properties.nombre}`));
    },
  }).addTo(mapa);
  const capaBurbujas = L.layerGroup().addTo(mapa);

  // Paso 3: lista «Top» del modo activo, como control del mapa
  const ControlTop = L.Control.extend({
    onAdd() {
      const caja = L.DomUtil.create('div', 'mapa-top');
      L.DomEvent.disableClickPropagation(caja);
      return caja;
    },
  });
  const controlTop = new ControlTop({ position: 'topright' });
  controlTop.addTo(mapa);

  // ===== ACCIONES DE UI =====
  /** Muestra las cinco primeras filas de la lista; cada fila elige su procedencia al pulsarla. */
  function pintarTop(titulo, filas, prefijo) {
    const caja = controlTop.getContainer();
    caja.replaceChildren();
    caja.hidden = !filas.length;
    if (caja.hidden) return;
    const encabezado = document.createElement('div');
    encabezado.className = 'mapa-top-titulo';
    encabezado.textContent = titulo;
    caja.appendChild(encabezado);
    for (const f of filas.slice(0, 5)) {
      const fila = document.createElement('button');
      fila.type = 'button';
      fila.className = 'mapa-top-fila';
      const nombre = document.createElement('span');
      nombre.textContent = f.nombre;
      const valor = document.createElement('span');
      valor.textContent = numero(f.valor);
      fila.append(nombre, valor);
      fila.addEventListener('click', () => alElegir(`${prefijo}${f.nombre}`));
      caja.appendChild(fila);
    }
  }

  function burbuja(lat, lon, nombre, valor, maximo, relleno, borde, procedencia) {
    const marca = L.circleMarker([lat, lon], {
      radius: radioDeBurbuja(valor, maximo), color: borde, weight: 1.5, fillColor: relleno, fillOpacity: 0.78,
    });
    marca.bindTooltip(nodoTooltip(nombre, valor), { direction: 'top', offset: [0, -4] });
    marca.on('click', () => alElegir(procedencia));
    marca.addTo(capaBurbujas);
    return marca;
  }

  /** Estilo de provincias, burbujas y lista «Top» según la pestaña activa. No mueve el encuadre del mapa. */
  function pintarCapas(datosMapa) {
    const { vista, ciudades, paises, provincias, catalogo } = datosMapa;
    // Paso 1: las provincias solo se colorean con los nacionales; en la pestaña de países quedan como contorno
    const estado = estadoProvincias(datosMapa);
    for (const [clave, nombre] of estado.nombresCatalogo) if (nombre) nombresCatalogo.set(clave, nombre);
    capaProvincias.setStyle(estiloProvincia(estado));

    // Paso 2: burbujas del nivel de la pestaña: centro de cada provincia, ciudades o países
    capaBurbujas.clearLayers();
    const puntos = [];
    if (vista === 'paises') {
      const maximo = paises.reduce((m, p) => Math.max(m, p.valor), 0);
      for (const p of paises) {
        const coordenada = catalogo.coordPaises.get(claveNormalizada(p.nombre));
        if (coordenada) puntos.push(burbuja(coordenada.lat, coordenada.lon, p.nombre, p.valor, maximo, colores.amarillo, colores.bosque, `P:${p.nombre}`).getLatLng());
      }
    } else if (vista === 'ciudades') {
      const maximo = ciudades.reduce((m, c) => Math.max(m, c.valor), 0);
      for (const fila of ciudades) {
        const ciudadCatalogo = catalogo.ciudades.get(claveNormalizada(fila.nombre));
        if (ciudadCatalogo) puntos.push(burbuja(ciudadCatalogo.lat, ciudadCatalogo.lon, fila.nombre, fila.valor, maximo, colores.verdeTexto, colores.superficie, `C:${fila.nombre}`).getLatLng());
      }
    } else {
      for (const p of provincias) {
        const capa = capasProvincia.get(claveNormalizada(p.nombre));
        if (!capa || p.valor <= 0) continue;
        const centro = capa.getBounds().getCenter();
        puntos.push(burbuja(centro.lat, centro.lng, p.nombre, p.valor, estado.maximo, colores.verdeTexto, colores.superficie, `PR:${p.nombre}`).getLatLng());
      }
    }

    // Paso 3: la lista «Top» sigue la misma pestaña
    if (vista === 'paises') pintarTop(TEXTOS.topVista.paises, paises, 'P:');
    else if (vista === 'ciudades') pintarTop(TEXTOS.topVista.ciudades, ciudades, 'C:');
    else pintarTop(TEXTOS.topVista.provincias, provincias, 'PR:');
    return { puntos };
  }

  /** Aplica los datos del mapa: pinta las capas y encuadra según la pestaña y la procedencia elegida. */
  function actualizar(datosMapa) {
    // Paso 1: primero se pintan las capas, que no mueven el encuadre
    const { puntos } = pintarCapas(datosMapa);

    // Paso 2: el encuadre depende de la pestaña; el primero es instantáneo y los siguientes, animados
    mapa.invalidateSize();
    const opciones = { duration: primeraVez ? 0 : 0.6, animate: !primeraVez };
    primeraVez = false;
    const encuadre = elegirEncuadre(datosMapa, (clave) => capasProvincia.has(clave), puntos.length > 0);
    if (encuadre.destino === 'ciudad') return mapa.flyTo([encuadre.lat, encuadre.lon], ZOOM_CIUDAD, opciones);
    if (encuadre.destino === 'provincia') {
      return mapa.flyToBounds(capasProvincia.get(encuadre.clave).getBounds(), { ...opciones, padding: [12, 12] });
    }
    if (encuadre.destino === 'pais') return mapa.flyTo([encuadre.lat, encuadre.lon], ZOOM_PAIS, opciones);
    if (encuadre.destino === 'puntos') return mapa.flyToBounds(L.latLngBounds(puntos), { ...opciones, padding: [24, 24], maxZoom: 4 });
    if (encuadre.destino === 'mundo') return mapa.flyTo(VISTA_MUNDO.centro, VISTA_MUNDO.zoom, opciones);
    return mapa.flyToBounds(ECUADOR_CONTINENTAL, opciones);
  }

  /** Repinta con los colores vigentes tras un cambio de tema, conservando el encuadre que eligió el visitante. */
  function repintar(datosMapa) {
    pintarCapas(datosMapa);
  }

  // ===== API PUBLICA =====
  return { actualizar, repintar, redimensionar: () => mapa.invalidateSize() };
}

// ===== HELPERS PRIVADOS =====

/** Contenido del tooltip de una burbuja, armado con nodos de texto. */
function nodoTooltip(titulo, valor) {
  const caja = document.createElement('div');
  const fuerte = document.createElement('strong');
  fuerte.textContent = titulo;
  caja.appendChild(fuerte);
  caja.appendChild(document.createElement('br'));
  caja.appendChild(document.createTextNode(`${numero(valor)} ${TEXTOS.visitantes}`));
  return caja;
}
