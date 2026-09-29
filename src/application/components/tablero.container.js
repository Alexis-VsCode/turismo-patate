/**
 * Orquestación del dashboard: descarga, estado de filtros, pintado de paneles y
 * ciclo de actualización (al entrar, con el botón, al cambiar de establecimiento con
 * reuso de 60 s, y automático cada 5 minutos con la pestaña visible).
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
import { CONFIG } from '../../infrastructure/config.js';
import { TEXTOS } from '../../shared/textos.es.js';
import { numero } from '../../shared/formato.js';
import { descargarAcotado, ErrorDescarga } from '../../infrastructure/seguridad.js';
import { desempaquetar } from '../../infrastructure/contrato-datos.js';
import { MESES, RANGOS_EDAD } from '../../domain/visitante.js';
import { claveNormalizada } from '../../domain/catalogo.js';
import {
  filtrar, filtrosVacios, kpis, anioDeReferencia, evolucionMensual, porMotivo,
  porCiudad, porProvincia, porPais, edadGenero, opcionesDeFiltros,
} from '../../domain/estadisticas.js';
import { llenarSelect } from './compartidos/select-seguro.js';
import { crearComboBuscable } from './compartidos/combo-buscable.js';
import { opcionesEvolucion, opcionesDona, opcionesMotivo, opcionesEdadGenero } from './presentational/graficos.presentational.js';
import { crearMapa } from './presentational/mapa.presentational.js';

const $ = (id) => document.getElementById(id);
const MAX_PROBLEMAS_VISIBLES = 50;

const estado = {
  datos: null,
  filtros: filtrosVacios(),
  ultimaDescarga: 0,
  horaDatos: '',
  cargando: false,
};

function colores() {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  return {
    verde: v('--verde'), verdeFuerte: v('--verde-fuerte'), verdeClaro: v('--verde-claro'), lima: v('--lima'),
    amarillo: v('--amarillo'), naranja: v('--naranja'), magenta: v('--magenta'), oliva: v('--oliva'),
  };
}

const COLORES = colores();
const graficos = {
  evolucion: echarts.init($('g-evolucion')),
  dona: echarts.init($('g-dona')),
  motivo: echarts.init($('g-motivo')),
  edad: echarts.init($('g-edad')),
};
let mapa = null;

// Paso 1: controles de filtro
const comboEstablecimiento = crearComboBuscable($('combo-establecimiento'), {
  textoTodos: TEXTOS.todosEstablecimientos,
  sinCoincidencias: TEXTOS.sinCoincidencias,
  alCambiar: (valor) => {
    estado.filtros.establecimiento = valor;
    $('f-establecimiento').value = valor;
    pintar();
    cargar(false);
  },
});

function alCambiarFiltro(campo, convertir = (v) => v) {
  return (e) => {
    estado.filtros[campo] = e.target.value === '' ? (campo === 'anio' || campo === 'mes' ? null : '') : convertir(e.target.value);
    pintar();
  };
}
$('f-anio').addEventListener('change', alCambiarFiltro('anio', Number));
$('f-mes').addEventListener('change', alCambiarFiltro('mes', Number));
$('f-procedencia').addEventListener('change', alCambiarFiltro('procedencia'));
$('f-motivo').addEventListener('change', alCambiarFiltro('motivo'));
$('f-edad').addEventListener('change', alCambiarFiltro('rangoEdad'));
$('f-genero').addEventListener('change', alCambiarFiltro('genero'));
$('f-establecimiento').addEventListener('change', (e) => {
  estado.filtros.establecimiento = e.target.value;
  comboEstablecimiento.fijarValor(e.target.value);
  pintar();
  cargar(false);
});
$('btn-limpiar').addEventListener('click', () => {
  estado.filtros = filtrosVacios();
  comboEstablecimiento.fijarValor('');
  poblarFiltros();
  pintar();
});
$('btn-actualizar').addEventListener('click', () => cargar(true));

// Paso 2: filtrado cruzado desde los gráficos
graficos.motivo.on('click', (p) => elegir('motivo', estado.filtros.motivo === p.name ? '' : p.name));
graficos.edad.on('click', (p) => elegir('rangoEdad', estado.filtros.rangoEdad === p.name ? '' : p.name));
graficos.dona.on('click', (p) => elegir('procedencia', p.name === TEXTOS.extranjeros ? 'EXT' : 'NAC'));
graficos.evolucion.on('click', (p) => {
  if (p.seriesType !== 'bar') return;
  estado.filtros.anio = Number(p.seriesName);
  estado.filtros.mes = estado.filtros.mes === p.dataIndex ? null : p.dataIndex;
  poblarFiltros();
  pintar();
});

function elegir(campo, valor) {
  estado.filtros[campo] = valor;
  poblarFiltros();
  pintar();
}

function poblarFiltros() {
  if (!estado.datos) return;
  const f = estado.filtros;
  const op = opcionesDeFiltros(estado.datos.filas);
  const todos = { valor: '', texto: TEXTOS.todos };
  llenarSelect($('f-anio'), [todos, ...op.anios.map((a) => ({ valor: String(a), texto: String(a) }))], f.anio === null ? '' : String(f.anio));
  llenarSelect($('f-mes'), [todos, ...MESES.map((m, i) => ({ valor: String(i), texto: m }))], f.mes === null ? '' : String(f.mes));
  const provincias = [...new Set(estado.datos.filas.filter((x) => x.nacional && x.provincia).map((x) => x.provincia))].sort((a, b) => a.localeCompare(b, 'es'));
  const procedencias = [
    { valor: '', texto: TEXTOS.procedenciaTodos },
    { valor: 'NAC', texto: TEXTOS.procedenciaNacionales },
    ...op.ciudades.map((c) => ({ valor: `C:${c}`, texto: c, grupo: TEXTOS.grupoCiudades })),
    ...provincias.map((p) => ({ valor: `PR:${p}`, texto: TEXTOS.provinciaPrefijo + p, grupo: TEXTOS.grupoCiudades })),
    { valor: 'EXT', texto: TEXTOS.procedenciaExtranjeros },
    ...op.paises.map((p) => ({ valor: `P:${p}`, texto: p, grupo: TEXTOS.grupoPaises })),
  ];
  llenarSelect($('f-procedencia'), procedencias, f.procedencia);
  llenarSelect($('f-motivo'), [todos, ...op.motivos.map((m) => ({ valor: m, texto: m }))], f.motivo);
  llenarSelect($('f-edad'), [todos, ...RANGOS_EDAD.map((r) => ({ valor: r, texto: r }))], f.rangoEdad);
  llenarSelect($('f-genero'), [todos, ...estado.datos.catalogo.generos.map((g) => ({ valor: g, texto: g }))], f.genero);
  llenarSelect($('f-establecimiento'), [{ valor: '', texto: TEXTOS.todosEstablecimientos }, ...estado.datos.establecimientos.map((e) => ({ valor: e, texto: e }))], f.establecimiento);
  comboEstablecimiento.fijarOpciones(estado.datos.establecimientos);
  comboEstablecimiento.fijarValor(f.establecimiento);
}

// Paso 3: pintado de tarjetas y paneles
function porcentaje(valor) {
  return valor === null ? '—' : `${(valor * 100).toFixed(1).replace('.', ',')}%`;
}

function pintar() {
  if (!estado.datos) return;
  const f = estado.filtros;
  const filas = estado.datos.filas;
  const sel = filtrar(filas, f);
  const k = kpis(sel);
  $('k-total').textContent = numero(k.total);
  $('k-nacionales').textContent = porcentaje(k.pctNacionales);
  $('k-extranjeros').textContent = porcentaje(k.pctExtranjeros);

  const baseEvolucion = filtrar(filas, f, ['anio', 'mes']);
  const anio = anioDeReferencia(baseEvolucion, f.anio);
  graficos.evolucion.setOption(opcionesEvolucion(evolucionMensual(baseEvolucion, anio), COLORES, f.mes), true);
  graficos.dona.setOption(opcionesDona(k, COLORES), true);
  graficos.motivo.setOption(opcionesMotivo(porMotivo(sel), COLORES, f.motivo), true);
  graficos.edad.setOption(opcionesEdadGenero(edadGenero(sel, estado.datos.catalogo.generos), COLORES, f.rangoEdad), true);
  $('sin-datos').hidden = k.total > 0;

  if (mapa) {
    mapa.actualizar({
      procedencia: f.procedencia, ciudades: porCiudad(sel), paises: porPais(sel),
      provincias: porProvincia(sel), catalogo: estado.datos.catalogo,
    });
  }
}

function pintarProblemas() {
  const { rechazos, avisos } = estado.datos;
  const caja = $('problemas');
  const lista = $('problemas-lista');
  while (lista.firstChild) lista.removeChild(lista.firstChild);
  caja.hidden = !rechazos.length && !avisos.length;
  const partes = [];
  if (rechazos.length) partes.push(TEXTOS.problemas(rechazos.length));
  if (avisos.length) partes.push(TEXTOS.avisosPestanas(avisos.length));
  $('problemas-resumen').textContent = partes.join(' · ');
  const agregar = (ubicacion, mensaje) => {
    const item = document.createElement('li');
    const donde = document.createElement('strong');
    donde.textContent = ubicacion;
    item.append(donde, document.createTextNode(` — ${mensaje}`));
    lista.appendChild(item);
  };
  avisos.forEach((a) => agregar(a.pestana || '—', a.mensaje));
  rechazos.slice(0, MAX_PROBLEMAS_VISIBLES).forEach((r) => agregar(TEXTOS.filaDe(r.pestana, r.fila), r.motivo));
  if (rechazos.length > MAX_PROBLEMAS_VISIBLES) {
    const item = document.createElement('li');
    item.textContent = TEXTOS.mostrandoPrimeros(MAX_PROBLEMAS_VISIBLES, rechazos.length);
    lista.appendChild(item);
  }
}

// Paso 4: descarga con reuso y manejo de errores sin vaciar el dashboard
async function cargar(forzar) {
  if (estado.cargando) return;
  if (!forzar && estado.datos && Date.now() - estado.ultimaDescarga < CONFIG.REUSO_MINIMO_MS) return;
  estado.cargando = true;
  document.body.classList.add('cargando');
  $('btn-actualizar').disabled = true;
  $('btn-actualizar-texto').textContent = TEXTOS.cargando;
  try {
    const url = `${CONFIG.URL_DATOS}?t=${Date.now()}`;
    const buffer = await descargarAcotado(url, { timeoutMs: CONFIG.TIMEOUT_MS, maxBytes: CONFIG.MAX_BYTES });
    estado.datos = desempaquetar(JSON.parse(new TextDecoder().decode(buffer)), claveNormalizada);
    estado.ultimaDescarga = Date.now();
    const ahora = estado.datos.generadoEn ? new Date(estado.datos.generadoEn) : new Date();
    estado.horaDatos = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    $('estado-texto').textContent = TEXTOS.estado(
      `${ahora.toLocaleDateString('es-EC')} ${estado.horaDatos}`,
      numero(estado.datos.establecimientos.length), numero(estado.datos.filas.length),
    );
    $('error').hidden = true;
    poblarFiltros();
    pintarProblemas();
    pintar();
  } catch (e) {
    const detalle = e instanceof ErrorDescarga ? TEXTOS.errores[e.codigo] || '' : TEXTOS.errores.FORMATO;
    $('error').textContent = `${TEXTOS.errorDescarga(estado.horaDatos)} ${detalle}`.trim();
    $('error').hidden = false;
  } finally {
    estado.cargando = false;
    document.body.classList.remove('cargando');
    $('btn-actualizar').disabled = false;
    $('btn-actualizar-texto').textContent = TEXTOS.actualizar;
  }
}

// Paso 5: actualización automática solo con la pestaña visible
function tocaActualizar() {
  return document.visibilityState === 'visible' && Date.now() - estado.ultimaDescarga >= CONFIG.INTERVALO_AUTO_MS;
}
setInterval(() => { if (tocaActualizar()) cargar(true); }, 30 * 1000);
document.addEventListener('visibilitychange', () => { if (tocaActualizar()) cargar(true); });

// Paso 6: arranque; el mapa se crea cuando llega el GeoJSON local, sin bloquear los datos
new ResizeObserver(() => {
  Object.values(graficos).forEach((g) => g.resize());
  if (mapa) mapa.redimensionar();
}).observe($('tablero'));
$('franja-prueba').hidden = !CONFIG.DATOS_DE_PRUEBA;
$('estado-texto').textContent = TEXTOS.sinDatosAun;
fetch('assets/ecu-provincias.geojson', { credentials: 'omit' })
  .then((r) => r.json())
  .then((geojson) => {
    mapa = crearMapa($('g-mapa'), geojson, COLORES, CONFIG.PROVINCIA_RESALTADA, (procedencia) => elegir('procedencia', estado.filtros.procedencia === procedencia ? '' : procedencia));
    pintar();
  })
  .catch(() => { $('g-mapa').textContent = TEXTOS.sinDatos; });
cargar(true);
