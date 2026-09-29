/**
 * Mapa de origen de visitantes con Leaflet sobre teselas de OpenStreetMap:
 * provincias de Ecuador (GeoJSON local) coloreadas por visitantes nacionales, burbujas por
 * ciudad o por país y encuadre automático según el filtro País / Ciudad.
 * Todo contenido de la hoja se inserta como nodo de texto, nunca como HTML.
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
import { claveNormalizada } from '../../../domain/catalogo.js';
import { numero } from '../../../shared/formato.js';
import { TEXTOS } from '../../../shared/textos.es.js';

const ECUADOR_CONTINENTAL = [[-5.02, -81.1], [1.45, -75.2]];
const VISTA_MUNDO = { centro: [18, -45], zoom: 2 };
const ZOOM_CIUDAD = 10;
const ZOOM_PAIS = 5;
const RADIO_MIN = 6;
const RADIO_MAX = 24;

function nodoTooltip(titulo, valor) {
  const caja = document.createElement('div');
  const fuerte = document.createElement('strong');
  fuerte.textContent = titulo;
  caja.appendChild(fuerte);
  caja.appendChild(document.createElement('br'));
  caja.appendChild(document.createTextNode(`${numero(valor)} ${TEXTOS.visitantes}`));
  return caja;
}

/** Radio de burbuja proporcional al área (raíz cuadrada), acotado entre RADIO_MIN y RADIO_MAX. */
export function radioDeBurbuja(valor, maximo) {
  if (!maximo || valor <= 0) return RADIO_MIN;
  return RADIO_MIN + Math.sqrt(valor / maximo) * (RADIO_MAX - RADIO_MIN);
}

/**
 * Crea el mapa. `alElegir(procedencia)` se llama al pulsar una burbuja o una provincia.
 * Devuelve { actualizar(datosMapa) } donde datosMapa = { procedencia, ciudades, paises, provincias, catalogo }.
 */
export function crearMapa(contenedor, geojsonProvincias, colores, provinciaResaltada, alElegir) {
  const L = globalThis.L;
  const mapa = L.map(contenedor, { center: [-1.6, -78.4], zoom: 6, zoomSnap: 0.25, worldCopyJump: true, scrollWheelZoom: false, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, referrerPolicy: 'strict-origin-when-cross-origin', crossOrigin: false,
    attribution: '© OpenStreetMap',
  }).addTo(mapa);
  mapa.attributionControl.addAttribution('Límites: geoBoundaries (CC0)');
  let primeraVez = true;

  // Paso 1: capa de provincias con índice por nombre normalizado
  const capasProvincia = new Map();
  let valoresProvincia = new Map();
  let maxProvincia = 0;
  let provinciaElegida = '';
  const resaltada = claveNormalizada(provinciaResaltada);
  const estiloProvincia = (feature) => {
    const clave = claveNormalizada(feature.properties.nombre);
    const valor = valoresProvincia.get(clave) || 0;
    const intensidad = maxProvincia ? 0.12 + 0.5 * Math.sqrt(valor / maxProvincia) : 0.08;
    const elegida = clave === provinciaElegida;
    return {
      color: elegida || clave === resaltada ? colores.naranja : colores.verde,
      weight: elegida ? 3 : clave === resaltada ? 2.5 : 1,
      fillColor: elegida ? colores.naranja : colores.verde,
      fillOpacity: elegida ? 0.45 : intensidad,
    };
  };
  const capaProvincias = L.geoJSON(geojsonProvincias, {
    style: estiloProvincia,
    onEachFeature: (feature, capa) => {
      capasProvincia.set(claveNormalizada(feature.properties.nombre), capa);
      capa.on('click', () => alElegir(`PR:${feature.properties.nombreCatalogo || feature.properties.nombre}`));
    },
  }).addTo(mapa);
  const capaBurbujas = L.layerGroup().addTo(mapa);

  // Paso 2: lista compacta de países, como control del mapa
  const ControlPaises = L.Control.extend({
    onAdd() {
      const caja = L.DomUtil.create('div', 'mapa-top-paises');
      L.DomEvent.disableClickPropagation(caja);
      return caja;
    },
  });
  const controlPaises = new ControlPaises({ position: 'topright' });
  controlPaises.addTo(mapa);

  function pintarTopPaises(paises, visible) {
    const caja = controlPaises.getContainer();
    while (caja.firstChild) caja.removeChild(caja.firstChild);
    caja.hidden = !visible || !paises.length;
    if (caja.hidden) return;
    const titulo = document.createElement('div');
    titulo.className = 'mapa-top-titulo';
    titulo.textContent = TEXTOS.topPaises;
    caja.appendChild(titulo);
    for (const p of paises.slice(0, 5)) {
      const fila = document.createElement('button');
      fila.type = 'button';
      fila.className = 'mapa-top-fila';
      const nombre = document.createElement('span');
      nombre.textContent = p.nombre;
      const valor = document.createElement('span');
      valor.textContent = numero(p.valor);
      fila.append(nombre, valor);
      fila.addEventListener('click', () => alElegir(`P:${p.nombre}`));
      caja.appendChild(fila);
    }
  }

  function burbuja(lat, lon, nombre, valor, maximo, color, procedencia) {
    const marca = L.circleMarker([lat, lon], {
      radius: radioDeBurbuja(valor, maximo), color: '#ffffff', weight: 1.5, fillColor: color, fillOpacity: 0.78,
    });
    marca.bindTooltip(nodoTooltip(nombre, valor), { direction: 'top', offset: [0, -4] });
    marca.on('click', () => alElegir(procedencia));
    marca.addTo(capaBurbujas);
    return marca;
  }

  function actualizar({ procedencia, ciudades, paises, provincias, catalogo }) {
    // Paso 3: coropletas con el total nacional por provincia
    valoresProvincia = new Map(provincias.map((p) => [claveNormalizada(p.nombre), p.valor]));
    maxProvincia = provincias.reduce((m, p) => Math.max(m, p.valor), 0);
    provinciaElegida = '';
    if (procedencia.startsWith('PR:')) provinciaElegida = claveNormalizada(procedencia.slice(3));
    if (procedencia.startsWith('C:')) {
      const ciudad = catalogo.ciudades.get(claveNormalizada(procedencia.slice(2)));
      if (ciudad) provinciaElegida = claveNormalizada(ciudad.provincia);
    }
    for (const [clave, capa] of capasProvincia) {
      const nombreCatalogo = catalogo.provincias.find((p) => claveNormalizada(p) === clave);
      if (nombreCatalogo) capa.feature.properties.nombreCatalogo = nombreCatalogo;
    }
    capaProvincias.setStyle(estiloProvincia);

    // Paso 4: burbujas de ciudades (modo nacional) o de países (modo extranjero)
    capaBurbujas.clearLayers();
    const modoExtranjero = procedencia === 'EXT' || procedencia.startsWith('P:');
    const puntos = [];
    if (modoExtranjero) {
      const maximo = paises.reduce((m, p) => Math.max(m, p.valor), 0);
      for (const p of paises) {
        const c = catalogo.coordPaises.get(claveNormalizada(p.nombre));
        if (c) puntos.push(burbuja(c.lat, c.lon, p.nombre, p.valor, maximo, colores.naranja, `P:${p.nombre}`).getLatLng());
      }
    } else {
      const maximo = ciudades.reduce((m, c) => Math.max(m, c.valor), 0);
      for (const c of ciudades) {
        const k = catalogo.ciudades.get(claveNormalizada(c.nombre));
        if (k) puntos.push(burbuja(k.lat, k.lon, c.nombre, c.valor, maximo, colores.verdeFuerte, `C:${c.nombre}`).getLatLng());
      }
    }
    pintarTopPaises(paises, !modoExtranjero && procedencia === '');

    // Paso 5: encuadre según la procedencia elegida; la primera vez sin animación y con el tamaño real
    mapa.invalidateSize();
    const opciones = { duration: primeraVez ? 0 : 0.6, animate: !primeraVez };
    primeraVez = false;
    if (procedencia.startsWith('C:')) {
      const c = catalogo.ciudades.get(claveNormalizada(procedencia.slice(2)));
      if (c) return mapa.flyTo([c.lat, c.lon], ZOOM_CIUDAD, opciones);
    }
    if (procedencia.startsWith('PR:')) {
      const capa = capasProvincia.get(claveNormalizada(procedencia.slice(3)));
      if (capa) return mapa.flyToBounds(capa.getBounds(), { ...opciones, padding: [12, 12] });
    }
    if (procedencia.startsWith('P:')) {
      const c = catalogo.coordPaises.get(claveNormalizada(procedencia.slice(2)));
      if (c) return mapa.flyTo([c.lat, c.lon], ZOOM_PAIS, opciones);
    }
    if (modoExtranjero) {
      if (puntos.length) return mapa.flyToBounds(L.latLngBounds(puntos), { ...opciones, padding: [24, 24], maxZoom: 4 });
      return mapa.flyTo(VISTA_MUNDO.centro, VISTA_MUNDO.zoom, opciones);
    }
    return mapa.flyToBounds(ECUADOR_CONTINENTAL, opciones);
  }

  return { actualizar, redimensionar: () => mapa.invalidateSize() };
}
