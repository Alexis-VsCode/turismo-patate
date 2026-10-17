/**
 * @file tablero.container.js
 * @description Container. Conecta la página con la fachada: traduce eventos del DOM y de los gráficos
 *   en acciones de la fachada y pinta la vista que ella entrega mediante los presentacionales y los compartidos.
 *   No calcula ni descarga: los datos los pide la fachada y los límites del mapa llegan por una función inyectada.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../../shared/textos.es.js';
import { numero, fechaHora, hora } from '../../shared/formato.js';
import { llenarSelect } from './compartidos/select-seguro.js';
import { crearComboMultiple } from './compartidos/combo-multiple.js';
import { opcionesEvolucion, opcionesDona, opcionesEdadGenero } from './presentational/graficos.presentational.js';
import { crearMapa } from './compartidos/mapa.js';
import { pintarKpis } from './presentational/kpis.presentational.js';
import { pintarEstadoDatos } from './presentational/estado.presentational.js';
import { pintarMotivos } from './presentational/motivos.presentational.js';
import { pintarDiscapacidad } from './presentational/discapacidad.presentational.js';
import { pintarFrescura } from './presentational/frescura.presentational.js';
import { pintarProblemas } from './presentational/problemas.presentational.js';
import { pintarChips } from './presentational/chips.presentational.js';
import { pintarContacto, pintarAutoridad, prepararEnlacesContacto } from './presentational/contacto.presentational.js';
import { mostrarAviso } from './compartidos/aviso.js';
import { crearPanelFiltros } from './compartidos/panel-filtros.js';
import { crearSelectorTema } from './compartidos/selector-tema.js';

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
 * Monta el dashboard sobre la página.
 * @param {ReturnType<import('../tablero.facade.js').crearTableroFacade>} facade fachada ya armada por main.js
 * @param {{ DATOS_DE_PRUEBA: boolean, PROVINCIA_RESALTADA: string, REVISION_AUTOMATICA_MS: number, URL_TESELAS: string,
 *   CONTACTO_MUNICIPIO: { nombre: string, referencia: string, enlaces: object },
 *   AUTORIDAD_MUNICIPIO: { nombre: string, cargo: string, periodo: string, enlace: string } }} config configuración
 * @param {{ obtenerLimites: () => Promise<object> }} dependencias descarga de los límites provinciales del mapa
 */
export function montarTablero(facade, config, { obtenerLimites }) {
  const $ = (id) => document.getElementById(id);
  const colores = coloresDelTema();
  const graficos = {
    evolucion: echarts.init($('g-evolucion')),
    dona: echarts.init($('g-dona')),
    edad: echarts.init($('g-edad')),
  };
  let mapa = null;
  let horaDatos = '';

  // Paso 1: combos y botones → acciones de la fachada
  const textosCombo = (todos) => ({
    todos, elegidas: TEXTOS.opcionesElegidas, sinCoincidencias: TEXTOS.sinCoincidencias, quitar: TEXTOS.quitarOpcion, masElegidas: TEXTOS.masElegidas,
  });
  const combos = {
    establecimiento: crearComboMultiple($('combo-establecimiento'), {
      textos: textosCombo(TEXTOS.todosEstablecimientos),
      alCambiar: (lista) => facade.fijarFiltro('establecimiento', lista),
    }),
  };
  for (const [campo, id] of [['procedencia', 'combo-procedencia'], ['motivo', 'combo-motivo'], ['rangoEdad', 'combo-edad'], ['genero', 'combo-genero']]) {
    combos[campo] = crearComboMultiple($(id), { textos: textosCombo(TEXTOS.todos), alCambiar: (lista) => facade.fijarFiltro(campo, lista) });
  }
  const selects = { anio: $('f-anio'), mes: $('f-mes') };
  for (const [campo, select] of Object.entries(selects)) {
    select.addEventListener('change', (e) => {
      const valor = e.target.value;
      facade.fijarFiltro(campo, valor !== '' ? Number(valor) : null);
    });
  }
  $('btn-limpiar').addEventListener('click', () => facade.limpiarFiltros());
  const segmentos = document.querySelectorAll('.segmento');
  segmentos.forEach((boton) => boton.addEventListener('click', () => facade.fijarVistaMapa(boton.dataset.vista)));
  $('btn-actualizar').addEventListener('click', () => facade.cargar(true));
  const panelFiltros = crearPanelFiltros({
    boton: $('btn-filtros'), dialogo: $('dialogo-filtros'), cuerpo: $('dialogo-filtros-cuerpo'),
    bloque: $('bloque-filtros'), lugarOriginal: $('lugar-filtros'), cerrar: $('btn-cerrar-filtros'),
  });

  // Paso 2: filtrado cruzado desde los gráficos
  graficos.edad.on('click', (p) => facade.alternarFiltro('rangoEdad', p.name));
  graficos.dona.on('click', (p) => facade.alternarFiltro('procedencia', p.name === TEXTOS.extranjeros ? 'EXT' : 'NAC'));
  graficos.evolucion.on('click', (p) => {
    if (p.seriesType === 'bar') facade.elegirMes(Number(p.seriesName), p.dataIndex);
  });

  // Paso 3: el enlace de la página reproduce los filtros; copiarlo no necesita permisos especiales
  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch (error) {
      return false;
    }
  }
  /** Deja en la barra de direcciones el estado de los filtros, sin agregar pasos al historial. */
  function reflejarEnlace() {
    const texto = facade.enlace();
    window.history.replaceState(null, '', texto ? `#${texto}` : window.location.pathname + window.location.search);
  }
  window.addEventListener('hashchange', () => facade.aplicarEnlace(window.location.hash));

  // Paso 4: funciones de pintado, siempre a partir de la vista que entrega la fachada
  function pintarFiltros() {
    const op = facade.opciones();
    if (!op) return;
    const f = facade.estado.filtros;
    const valor = (campo) => (f[campo] === null ? '' : String(f[campo]));
    for (const [campo, select] of Object.entries(selects)) llenarSelect(select, op[campo], valor(campo));
    for (const [campo, combo] of Object.entries(combos)) {
      combo.fijarOpciones(op[campo]);
      combo.fijarValores(f[campo]);
    }
    const chips = facade.chipsActivos();
    pintarChips($('chips'), chips, (campo, valorQuitado) => facade.quitarFiltro(campo, valorQuitado), () => facade.limpiarFiltros(), copiarEnlace);
    panelFiltros.fijarConteo(TEXTOS.filtrosConteo(chips.length));
  }

  function pintarGraficos(v) {
    graficos.evolucion.setOption(opcionesEvolucion(v.evolucion, colores, v.filtros.mes), true);
    graficos.dona.setOption(opcionesDona(v.kpis, colores, v.textos.centro), true);
    graficos.edad.setOption(opcionesEdadGenero(v.edadGenero, colores, v.filtros.rangoEdad), true);
  }

  function pintarPaneles() {
    const v = facade.vista();
    if (!v) return;
    pintarKpis({
      total: $('k-total'), variacion: $('k-variacion'),
      nacionales: $('k-nacionales'), nacionalesPct: $('k-nacionales-pct'),
      extranjeros: $('k-extranjeros'), extranjerosPct: $('k-extranjeros-pct'),
      resumen: $('resumen-participacion'),
    }, v.kpis, v.variacion, TEXTOS.resumenParticipacion(v.kpis, v.textos.periodo));
    pintarMotivos($('lista-motivos'), v.motivos, v.filtros.motivo, (motivo) => facade.alternarFiltro('motivo', motivo));
    pintarDiscapacidad({ total: $('k-disc-personas'), pct: $('k-disc-pct'), lista: $('lista-discapacidad') }, v.discapacidad);
    $('sub-evolucion').textContent = TEXTOS.subtituloEvolucion(v.evolucion.anio, v.evolucion.anioAnterior);
    pintarGraficos(v);
    $('sin-datos').hidden = v.kpis.total > 0;
    pintarMapa(v);
  }

  /** Marca la pestaña activa y redibuja el mapa, su lista «Top» y la nota de escala. */
  function pintarMapa(v) {
    segmentos.forEach((boton) => boton.setAttribute('aria-pressed', String(boton.dataset.vista === v.mapa.vista)));
    $('nota-mapa').textContent = v.textos.notaMapa;
    if (mapa) mapa.actualizar(v.mapa);
  }

  /**
   * Barra de estado con la publicación del build de Actions, que solo cambia con datos nuevos. `horaDatos` guarda la
   * hora de la última descarga, que el aviso de error nombra si una actualización falla.
   */
  function pintarEstado() {
    const { datos, ultimaDescarga } = facade.estado;
    horaDatos = hora(ultimaDescarga);
    const carga = facade.carga();
    pintarEstadoDatos($('estado-texto'), TEXTOS.estadoDatos(
      fechaHora(datos.generadoEn), facade.publicacionMinutos(), carga.periodo,
      numero(carga.conDatos), numero(carga.establecimientos), numero(carga.registros),
    ));
  }

  /** Aviso de una red del contacto que todavía no tiene dirección, con las redes que sí están para no dejar a nadie sin salida. */
  function avisarProximamente(tipo, boton) {
    const { referencia, enlaces } = config.CONTACTO_MUNICIPIO;
    const t = TEXTOS.avisoPronto;
    const disponibles = prepararEnlacesContacto(enlaces)
      .filter((e) => e.href)
      .map((e) => ({ texto: t.enlace(TEXTOS.contactoEnlace[e.tipo], referencia), href: e.href }));
    const autor = $('autor-facebook');
    if (autor) disponibles.push({ texto: t.enlaceAutor(TEXTOS.contactoEnlace.facebook), href: autor.href });
    mostrarAviso($('aviso'), {
      titulo: t.titulo(TEXTOS.contactoEnlace[tipo], referencia), mensaje: t.mensaje, enlaces: disponibles,
    }, { textoCerrar: t.cerrar, devolverFoco: boton });
  }

  /** Pinta el chip de frescura con lo que calcula la fachada; se repite con el reloj, no solo con datos nuevos. */
  function pintarSalud() {
    pintarFrescura({ chip: $('chip-frescura'), etiqueta: $('frescura-etiqueta'), detalle: $('frescura-detalle') }, facade.frescura());
  }

  // Paso 5: cada evento de la fachada decide qué zonas se repintan; un enlace compartido se aplica una sola vez, con
  // los primeros datos, porque antes no hay contra qué filtrar
  let enlaceInicialAplicado = false;
  function alLlegarDatos() {
    if (!enlaceInicialAplicado) {
      enlaceInicialAplicado = true;
      if (window.location.hash.length > 1) facade.aplicarEnlace(window.location.hash);
    }
    $('error').hidden = true;
    pintarEstado();
    pintarSalud();
    pintarFiltros();
    pintarProblemas({ caja: $('problemas'), resumen: $('problemas-resumen'), lista: $('problemas-lista') }, facade.estado.datos);
    pintarPaneles();
  }
  function alCambiarFiltros() {
    reflejarEnlace();
    pintarFiltros();
    pintarPaneles();
  }
  function alCambiarVistaMapa() {
    const v = facade.vista();
    if (v) pintarMapa(v);
  }
  function alCambiarCarga() {
    const { cargando } = facade.estado;
    document.body.classList.toggle('cargando', cargando);
    $('btn-actualizar').disabled = cargando;
    $('btn-actualizar-texto').textContent = cargando ? TEXTOS.cargando : TEXTOS.actualizar;
  }
  function alFallarDescarga() {
    const { error } = facade.estado;
    const detalle = (error && TEXTOS.errores[error.codigo]) || TEXTOS.errores.FORMATO;
    $('error').textContent = `${TEXTOS.errorDescarga(horaDatos)} ${detalle}`.trim();
    $('error').hidden = false;
  }
  const alEvento = new Map([
    ['datos', alLlegarDatos], ['filtros', alCambiarFiltros], ['vistaMapa', alCambiarVistaMapa],
    ['cargando', alCambiarCarga], ['error', alFallarDescarga],
  ]);
  facade.suscribir((evento) => alEvento.get(evento)?.());

  // Paso 6: al cambiar de tema los gráficos y el mapa releen los colores de los tokens y se repintan sin recalcular
  crearSelectorTema($('btn-tema'), () => {
    Object.assign(colores, coloresDelTema());
    const v = facade.vista();
    if (v) pintarGraficos(v);
    if (v && mapa) mapa.repintar(v.mapa);
  });

  // Paso 7: actualización automática y ajuste de tamaño de gráficos y mapa
  const revisar = () => {
    pintarSalud();
    if (facade.tocaActualizar()) facade.cargar(true);
  };
  setInterval(revisar, config.REVISION_AUTOMATICA_MS);
  document.addEventListener('visibilitychange', revisar);
  const observador = new ResizeObserver(() => {
    Object.values(graficos).forEach((g) => g.resize());
    if (mapa) mapa.redimensionar();
  });
  observador.observe($('tablero'));
  document.querySelectorAll('.grafico').forEach((zona) => observador.observe(zona));

  // Paso 8: arranque; el mapa se crea cuando llegan sus límites provinciales, sin bloquear los datos
  $('franja-prueba').hidden = !config.DATOS_DE_PRUEBA;
  pintarAutoridad({
    nombre: $('autoridad-nombre'), cargo: $('autoridad-cargo'), gracias: $('autoridad-gracias'),
    enlace: $('autoridad-enlace'), foto: $('autoridad-foto'), fotoContacto: $('contacto-foto'),
  }, config.AUTORIDAD_MUNICIPIO, config.CONTACTO_MUNICIPIO);
  pintarContacto({ nombre: $('contacto-nombre'), redes: $('contacto-redes') }, config.CONTACTO_MUNICIPIO, avisarProximamente);
  $('estado-texto').textContent = TEXTOS.sinDatosAun(facade.publicacionMinutos());
  $('chip-frescura').title = TEXTOS.frescuraAyuda(facade.publicacionMinutos());
  obtenerLimites()
    .then((geojson) => {
      mapa = crearMapa($('g-mapa'), geojson, colores, config.PROVINCIA_RESALTADA, (p) => facade.alternarFiltro('procedencia', p), config.URL_TESELAS);
      pintarPaneles();
    })
    .catch(() => { $('g-mapa').textContent = TEXTOS.sinDatos; });
  facade.cargar(true);
}
