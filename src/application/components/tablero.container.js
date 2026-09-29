/**
 * @file tablero.container.js
 * @description Container. Conecta la página con la fachada: traduce eventos del DOM y de los gráficos
 *   en acciones de la fachada y pinta la vista que ella entrega mediante los presentacionales.
 *   No calcula ni descarga los datos por su cuenta: solo lee el GeoJSON local del mapa.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../shared/textos.es.js';
import { numero, fechaHora } from '../../shared/formato.js';
import { llenarSelect } from './compartidos/select-seguro.js';
import { crearComboBuscable } from './compartidos/combo-buscable.js';
import { opcionesEvolucion, opcionesDona, opcionesMotivo, opcionesEdadGenero } from './presentational/graficos.presentational.js';
import { crearMapa } from './presentational/mapa.presentational.js';
import { pintarKpis } from './presentational/kpis.presentational.js';
import { pintarFrescura } from './presentational/frescura.presentational.js';
import { pintarProblemas } from './presentational/problemas.presentational.js';
import { pintarChips } from './presentational/chips.presentational.js';
import { crearPanelFiltros } from './compartidos/panel-filtros.js';
import { crearSelectorTema } from './compartidos/selector-tema.js';

/** Intervalo con que se revisa si toca la actualización automática. */
const REVISION_AUTOMATICA_MS = 30 * 1000;

/** Colores del tema leídos de los tokens CSS, para que gráficos y mapa usen la misma paleta. */
function coloresDelTema() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  return {
    verde: v('--verde'), verdeTexto: v('--verde-texto'), lima: v('--lima'), amarillo: v('--amarillo'),
    oliva: v('--oliva'), bosque: v('--bosque'), tendencia: v('--tendencia'),
    texto: v('--texto'), rejilla: v('--rejilla'), superficie: v('--superficie'), borde: v('--borde'),
    textoSobreColor: v('--texto-sobre-color'),
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
    rangoEdad: $('f-edad'), genero: $('f-genero'),
  };
  for (const [campo, select] of Object.entries(selects)) {
    select.addEventListener('change', (e) => {
      const valor = e.target.value;
      facade.fijarFiltro(campo, (campo === 'anio' || campo === 'mes') && valor !== '' ? Number(valor) : valor);
    });
  }
  $('btn-limpiar').addEventListener('click', () => facade.limpiarFiltros());
  $('btn-actualizar').addEventListener('click', () => facade.cargar(true));
  const panelFiltros = crearPanelFiltros({
    boton: $('btn-filtros'), dialogo: $('dialogo-filtros'), cuerpo: $('dialogo-filtros-cuerpo'),
    bloque: $('bloque-filtros'), lugarOriginal: $('lugar-filtros'), cerrar: $('btn-cerrar-filtros'),
  });

  // Paso 2: filtrado cruzado desde los gráficos
  graficos.motivo.on('click', (p) => facade.alternarFiltro('motivo', p.name));
  graficos.edad.on('click', (p) => facade.alternarFiltro('rangoEdad', p.name));
  graficos.dona.on('click', (p) => facade.fijarFiltro('procedencia', p.name === TEXTOS.extranjeros ? 'EXT' : 'NAC'));
  graficos.evolucion.on('click', (p) => {
    if (p.seriesType === 'bar') facade.elegirMes(Number(p.seriesName), p.dataIndex);
  });

  // Paso 3: funciones de pintado, siempre a partir de la vista que entrega la fachada
  function pintarFiltros() {
    const op = facade.opciones();
    if (!op) return;
    const f = facade.estado.filtros;
    const valor = (campo) => (f[campo] === null ? '' : String(f[campo]));
    for (const [campo, select] of Object.entries(selects)) llenarSelect(select, op[campo], valor(campo));
    combo.fijarOpciones(op.establecimientos);
    combo.fijarValor(f.establecimiento);
    const chips = facade.chipsActivos();
    pintarChips($('chips'), chips, (campo) => {
      facade.fijarFiltro(campo, '');
      if (campo === 'establecimiento') facade.cargar(false);
    });
    panelFiltros.fijarConteo(TEXTOS.filtrosConteo(chips.length));
  }

  function pintarGraficos(v) {
    graficos.evolucion.setOption(opcionesEvolucion(v.evolucion, colores, v.filtros.mes), true);
    graficos.dona.setOption(opcionesDona(v.kpis, colores), true);
    graficos.motivo.setOption(opcionesMotivo(v.motivos, colores, v.filtros.motivo), true);
    graficos.edad.setOption(opcionesEdadGenero(v.edadGenero, colores, v.filtros.rangoEdad), true);
  }

  function pintarPaneles() {
    const v = facade.vista();
    if (!v) return;
    pintarKpis({ total: $('k-total'), nacionales: $('k-nacionales'), extranjeros: $('k-extranjeros'), variacion: $('k-variacion') }, v.kpis, v.variacion);
    $('sub-evolucion').textContent = TEXTOS.subtituloEvolucion(v.evolucion.anio, v.evolucion.anioAnterior);
    pintarGraficos(v);
    $('sin-datos').hidden = v.kpis.total > 0;
    if (mapa) mapa.actualizar(v.mapa);
  }

  /** «Actualizado» es la última descarga; «publicados» es el build de Actions, que solo cambia con datos nuevos. */
  function pintarEstado() {
    const { datos, ultimaDescarga } = facade.estado;
    horaDatos = fechaHora(ultimaDescarga).slice(11, 16);
    $('estado-texto').textContent = TEXTOS.estado(
      fechaHora(ultimaDescarga), fechaHora(datos.generadoEn),
      numero(datos.establecimientos.length), numero(datos.filas.length),
    );
  }

  /** Pinta el chip de frescura con lo que calcula la fachada; se repite con el reloj, no solo con datos nuevos. */
  function pintarSalud() {
    pintarFrescura({ chip: $('chip-frescura'), etiqueta: $('frescura-etiqueta'), detalle: $('frescura-detalle') }, facade.frescura());
  }

  // Paso 4: cada evento de la fachada decide qué zonas se repintan
  facade.suscribir((evento) => {
    if (evento === 'datos') {
      $('error').hidden = true;
      pintarEstado();
      pintarSalud();
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

  // Paso 5: al cambiar de tema los gráficos releen los colores de los tokens y se repintan sin recalcular
  crearSelectorTema($('btn-tema'), () => {
    Object.assign(colores, coloresDelTema());
    const v = facade.vista();
    if (v) pintarGraficos(v);
    if (mapa) mapa.repintar();
  });

  // Paso 6: actualización automática y ajuste de tamaño de gráficos y mapa
  const revisar = () => {
    pintarSalud();
    if (facade.tocaActualizar()) facade.cargar(true);
  };
  setInterval(revisar, REVISION_AUTOMATICA_MS);
  document.addEventListener('visibilitychange', revisar);
  const observador = new ResizeObserver(() => {
    Object.values(graficos).forEach((g) => g.resize());
    if (mapa) mapa.redimensionar();
  });
  observador.observe($('tablero'));
  document.querySelectorAll('.grafico').forEach((zona) => observador.observe(zona));

  // Paso 7: arranque; el mapa se crea cuando llega el GeoJSON local, sin bloquear los datos
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
