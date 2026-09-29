/**
 * @file tablero.container.js
 * @description Container. Conecta la página con la fachada: traduce eventos del DOM y de los gráficos
 *   en acciones de la fachada y pinta la vista que ella entrega mediante los presentacionales.
 *   No calcula ni descarga nada por su cuenta.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../shared/textos.es.js';
import { numero } from '../../shared/formato.js';
import { llenarSelect } from './compartidos/select-seguro.js';
import { crearComboBuscable } from './compartidos/combo-buscable.js';
import { opcionesEvolucion, opcionesDona, opcionesMotivo, opcionesEdadGenero } from './presentational/graficos.presentational.js';
import { crearMapa } from './presentational/mapa.presentational.js';
import { pintarKpis } from './presentational/kpis.presentational.js';
import { pintarProblemas } from './presentational/problemas.presentational.js';

/** Intervalo con que se revisa si toca la actualización automática. */
const REVISION_AUTOMATICA_MS = 30 * 1000;

/** Colores del tema leídos de los tokens CSS, para que gráficos y mapa usen la misma paleta. */
function coloresDelTema() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  return {
    verde: v('--verde'), verdeFuerte: v('--verde-fuerte'), verdeClaro: v('--verde-claro'), lima: v('--lima'),
    amarillo: v('--amarillo'), naranja: v('--naranja'), magenta: v('--magenta'), oliva: v('--oliva'),
  };
}

/**
 * Monta el tablero sobre la página.
 * @param {ReturnType<import('../tablero.facade.js').crearTableroFacade>} facade
 * @param {{ DATOS_DE_PRUEBA: boolean, PROVINCIA_RESALTADA: string }} config
 */
export function montarTablero(facade, config) {
  const $ = (id) => document.getElementById(id);
  const colores = coloresDelTema();
  const graficos = {
    evolucion: echarts.init($('g-evolucion')),
    dona: echarts.init($('g-dona')),
    motivo: echarts.init($('g-motivo')),
    edad: echarts.init($('g-edad')),
  };
  let mapa = null;
  let horaDatos = '';

  // Paso 1: combos y botones → acciones de la fachada
  const combo = crearComboBuscable($('combo-establecimiento'), {
    textoTodos: TEXTOS.todosEstablecimientos,
    sinCoincidencias: TEXTOS.sinCoincidencias,
    alCambiar: (valor) => {
      facade.fijarFiltro('establecimiento', valor);
      facade.cargar(false);
    },
  });
  const selects = {
    anio: $('f-anio'), mes: $('f-mes'), procedencia: $('f-procedencia'), motivo: $('f-motivo'),
    rangoEdad: $('f-edad'), genero: $('f-genero'), establecimiento: $('f-establecimiento'),
  };
  for (const [campo, select] of Object.entries(selects)) {
    select.addEventListener('change', (e) => {
      const valor = e.target.value;
      facade.fijarFiltro(campo, (campo === 'anio' || campo === 'mes') && valor !== '' ? Number(valor) : valor);
      if (campo === 'establecimiento') facade.cargar(false);
    });
  }
  $('btn-limpiar').addEventListener('click', () => facade.limpiarFiltros());
  $('btn-actualizar').addEventListener('click', () => facade.cargar(true));

  // Paso 2: filtrado cruzado desde los gráficos
  graficos.motivo.on('click', (p) => facade.alternarFiltro('motivo', p.name));
  graficos.edad.on('click', (p) => facade.alternarFiltro('rangoEdad', p.name));
  graficos.dona.on('click', (p) => facade.fijarFiltro('procedencia', p.name === TEXTOS.extranjeros ? 'EXT' : 'NAC'));
  graficos.evolucion.on('click', (p) => {
    if (p.seriesType === 'bar') facade.elegirMes(Number(p.seriesName), p.dataIndex);
  });

  // Paso 3: pintado a partir de la vista de la fachada
  function pintarFiltros() {
    const op = facade.opciones();
    if (!op) return;
    const f = facade.estado.filtros;
    const valor = (campo) => (f[campo] === null ? '' : String(f[campo]));
    for (const [campo, select] of Object.entries(selects)) llenarSelect(select, op[campo], valor(campo));
    combo.fijarOpciones(op.establecimientos);
    combo.fijarValor(f.establecimiento);
  }

  function pintarPaneles() {
    const v = facade.vista();
    if (!v) return;
    pintarKpis({ total: $('k-total'), nacionales: $('k-nacionales'), extranjeros: $('k-extranjeros') }, v.kpis);
    graficos.evolucion.setOption(opcionesEvolucion(v.evolucion, colores, v.filtros.mes), true);
    graficos.dona.setOption(opcionesDona(v.kpis, colores), true);
    graficos.motivo.setOption(opcionesMotivo(v.motivos, colores, v.filtros.motivo), true);
    graficos.edad.setOption(opcionesEdadGenero(v.edadGenero, colores, v.filtros.rangoEdad), true);
    $('sin-datos').hidden = v.kpis.total > 0;
    if (mapa) mapa.actualizar(v.mapa);
  }

  function pintarEstado() {
    const { datos } = facade.estado;
    const fecha = datos.generadoEn ? new Date(datos.generadoEn) : new Date();
    horaDatos = fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    $('estado-texto').textContent = TEXTOS.estado(
      `${fecha.toLocaleDateString('es-EC')} ${horaDatos}`,
      numero(datos.establecimientos.length), numero(datos.filas.length),
    );
  }

  facade.suscribir((evento) => {
    if (evento === 'datos') {
      $('error').hidden = true;
      pintarEstado();
      pintarFiltros();
      pintarProblemas({ caja: $('problemas'), resumen: $('problemas-resumen'), lista: $('problemas-lista') }, facade.estado.datos);
      pintarPaneles();
    } else if (evento === 'filtros') {
      pintarFiltros();
      pintarPaneles();
    } else if (evento === 'cargando') {
      const { cargando } = facade.estado;
      document.body.classList.toggle('cargando', cargando);
      $('btn-actualizar').disabled = cargando;
      $('btn-actualizar-texto').textContent = cargando ? TEXTOS.cargando : TEXTOS.actualizar;
    } else if (evento === 'error') {
      const { error } = facade.estado;
      const detalle = (error && TEXTOS.errores[error.codigo]) || TEXTOS.errores.FORMATO;
      $('error').textContent = `${TEXTOS.errorDescarga(horaDatos)} ${detalle}`.trim();
      $('error').hidden = false;
    }
  });

  // Paso 4: actualización automática y ajuste de tamaño de gráficos y mapa
  setInterval(() => { if (facade.tocaActualizar()) facade.cargar(true); }, REVISION_AUTOMATICA_MS);
  document.addEventListener('visibilitychange', () => { if (facade.tocaActualizar()) facade.cargar(true); });
  new ResizeObserver(() => {
    Object.values(graficos).forEach((g) => g.resize());
    if (mapa) mapa.redimensionar();
  }).observe($('tablero'));

  // Paso 5: arranque; el mapa se crea cuando llega el GeoJSON local, sin bloquear los datos
  $('franja-prueba').hidden = !config.DATOS_DE_PRUEBA;
  $('estado-texto').textContent = TEXTOS.sinDatosAun;
  fetch('assets/ecu-provincias.geojson', { credentials: 'omit' })
    .then((r) => r.json())
    .then((geojson) => {
      mapa = crearMapa($('g-mapa'), geojson, colores, config.PROVINCIA_RESALTADA, (p) => facade.alternarFiltro('procedencia', p));
      pintarPaneles();
    })
    .catch(() => { $('g-mapa').textContent = TEXTOS.sinDatos; });
  facade.cargar(true);
}
