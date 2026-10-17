/**
 * @file mapa.presentational.js
 * @description Presentacional. Mapa de origen de visitantes con Leaflet sobre teselas de OpenStreetMap:
 *   provincias de Ecuador (GeoJSON local) coloreadas por visitantes nacionales, burbujas por provincia,
 *   ciudad o país según la pestaña activa, lista «Top» del mismo nivel y encuadre automático según la
 *   pestaña y el filtro País / Ciudad. Todo contenido de la hoja se inserta como nodo de texto, nunca como HTML.
 * @author Kevin Alexis Barrera Llerena 2026
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
 * Devuelve { actualizar(datosMapa), repintar(), redimensionar() } donde datosMapa = { vista, procedencia, ciudades,
 * paises, provincias, catalogo } y vista es 'provincias', 'ciudades' o 'paises'.
 */
export function crearMapa(contenedor, geojsonProvincias, colores, provinciaResaltada, alElegir) {
  const L = globalThis.L;
  const mapa = L.map(contenedor, { center: [-1.6, -78.4], zoom: 6, zoomSnap: 0.25, worldCopyJump: true, scrollWheelZoom: false, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, referrerPolicy: 'strict-origin-when-cross-origin', crossOrigin: false,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mapa);
  mapa.attributionControl.addAttribution('Límites: geoBoundaries (CC0)');
  // El prefijo por defecto de Leaflet incluye una bandera que la hoja de estilos de la librería fuerza con !important
  mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" title="Librería de mapas interactivos">Leaflet</a>');
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
      color: elegida || clave === resaltada ? colores.bosque : colores.verdeTexto,
      weight: elegida ? 3 : clave === resaltada ? 2.5 : 1,
      fillColor: elegida ? colores.amarillo : colores.verde,
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

  // Paso 2: lista «Top» del modo activo, como control del mapa
  const ControlTop = L.Control.extend({
    onAdd() {
      const caja = L.DomUtil.create('div', 'mapa-top');
      L.DomEvent.disableClickPropagation(caja);
      return caja;
    },
  });
  const controlTop = new ControlTop({ position: 'topright' });
  controlTop.addTo(mapa);

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

  let ultimosDatos = null;

  /** Estilo de provincias, burbujas y lista «Top» según la pestaña activa. No mueve el encuadre del mapa. */
  function pintarCapas({ vista, procedencia, ciudades, paises, provincias, catalogo }) {
    // Paso 1: las provincias solo se colorean con los nacionales; en la pestaña de países quedan como contorno
    valoresProvincia = new Map(vista === 'paises' ? [] : provincias.map((p) => [claveNormalizada(p.nombre), p.valor]));
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

    // Paso 2: burbujas del nivel de la pestaña: centro de cada provincia, ciudades o países
    capaBurbujas.clearLayers();
    const puntos = [];
    if (vista === 'paises') {
      const maximo = paises.reduce((m, p) => Math.max(m, p.valor), 0);
      for (const p of paises) {
        const c = catalogo.coordPaises.get(claveNormalizada(p.nombre));
        if (c) puntos.push(burbuja(c.lat, c.lon, p.nombre, p.valor, maximo, colores.amarillo, colores.bosque, `P:${p.nombre}`).getLatLng());
      }
    } else if (vista === 'ciudades') {
      const maximo = ciudades.reduce((m, c) => Math.max(m, c.valor), 0);
      for (const c of ciudades) {
        const k = catalogo.ciudades.get(claveNormalizada(c.nombre));
        if (k) puntos.push(burbuja(k.lat, k.lon, c.nombre, c.valor, maximo, colores.verdeTexto, colores.superficie, `C:${c.nombre}`).getLatLng());
      }
    } else {
      for (const p of provincias) {
        const capa = capasProvincia.get(claveNormalizada(p.nombre));
        if (!capa || p.valor <= 0) continue;
        const centro = capa.getBounds().getCenter();
        puntos.push(burbuja(centro.lat, centro.lng, p.nombre, p.valor, maxProvincia, colores.verdeTexto, colores.superficie, `PR:${p.nombre}`).getLatLng());
      }
    }

    // Paso 3: la lista «Top» sigue la misma pestaña
    if (vista === 'paises') pintarTop(TEXTOS.topVista.paises, paises, 'P:');
    else if (vista === 'ciudades') pintarTop(TEXTOS.topVista.ciudades, ciudades, 'C:');
    else pintarTop(TEXTOS.topVista.provincias, provincias, 'PR:');
    return { puntos };
  }

  /** Aplica los datos del mapa: pinta las capas y encuadra según la pestaña y la procedencia elegida. */
  function actualizar(datos) {
    ultimosDatos = datos;
    const { vista, procedencia, catalogo } = datos;
    // Paso 1: primero se pintan las capas, que no mueven el encuadre
    const { puntos } = pintarCapas(datos);

    // Paso 2: el encuadre depende de la pestaña; la procedencia solo lo acerca si es del mismo nivel
    mapa.invalidateSize();
    const opciones = { duration: primeraVez ? 0 : 0.6, animate: !primeraVez };
    primeraVez = false;
    if (vista === 'ciudades' && procedencia.startsWith('C:')) {
      const c = catalogo.ciudades.get(claveNormalizada(procedencia.slice(2)));
      if (c) return mapa.flyTo([c.lat, c.lon], ZOOM_CIUDAD, opciones);
    }
    if (vista === 'provincias' && procedencia.startsWith('PR:')) {
      const capa = capasProvincia.get(claveNormalizada(procedencia.slice(3)));
      if (capa) return mapa.flyToBounds(capa.getBounds(), { ...opciones, padding: [12, 12] });
    }
    if (vista === 'paises') {
      if (procedencia.startsWith('P:')) {
        const c = catalogo.coordPaises.get(claveNormalizada(procedencia.slice(2)));
        if (c) return mapa.flyTo([c.lat, c.lon], ZOOM_PAIS, opciones);
      }
      if (puntos.length) return mapa.flyToBounds(L.latLngBounds(puntos), { ...opciones, padding: [24, 24], maxZoom: 4 });
      return mapa.flyTo(VISTA_MUNDO.centro, VISTA_MUNDO.zoom, opciones);
    }
    return mapa.flyToBounds(ECUADOR_CONTINENTAL, opciones);
  }

  /** Repinta con los colores vigentes tras un cambio de tema, conservando el encuadre que eligió el visitante. */
  function repintar() {
    if (ultimosDatos) pintarCapas(ultimosDatos);
  }

  return { actualizar, repintar, redimensionar: () => mapa.invalidateSize() };
}
