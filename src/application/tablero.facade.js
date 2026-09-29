/**
 * @file tablero.facade.js
 * @description Aplicación. Fachada del tablero: guarda el estado (datos y filtros), aplica la política
 *   de actualización (reuso de 60 s y automática cada 5 minutos solo con la pestaña visible) y entrega
 *   a la interfaz la vista ya calculada. No toca el DOM: se prueba completa en Node.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../shared/textos.es.js';
import { MESES, RANGOS_EDAD } from '../domain/visitante.js';
import {
  filtrar, filtrosVacios, kpis, anioDeReferencia, evolucionMensual, porMotivo,
  porCiudad, porProvincia, porPais, edadGenero, opcionesDeFiltros, variacionInteranual,
} from '../domain/estadisticas.js';

/** Texto legible de un valor de procedencia ('NAC', 'EXT', 'C:…', 'P:…', 'PR:…'). */
function textoProcedencia(valor) {
  if (valor === 'NAC') return TEXTOS.nacionales;
  if (valor === 'EXT') return TEXTOS.extranjeros;
  const separador = valor.indexOf(':');
  const tipo = valor.slice(0, separador);
  const nombre = valor.slice(separador + 1);
  return tipo === 'PR' ? TEXTOS.provinciaPrefijo + nombre : nombre;
}

/** Reporte por defecto: el error sale de la pila actual y llega al manejador global, sin frenar a los demás. */
const relanzarAparte = (error) => queueMicrotask(() => { throw error; });

/** Filtros cuyo valor vacío es null (numéricos) en lugar de cadena vacía. */
const FILTROS_NUMERICOS = new Set(['anio', 'mes']);

/**
 * Crea la fachada del tablero.
 * @param {{
 *   obtener: () => Promise<object>,
 *   config: { REUSO_MINIMO_MS: number, INTERVALO_AUTO_MS: number },
 *   reloj?: () => number,
 *   esVisible?: () => boolean,
 *   reportarError?: (error: Error) => void,
 * }} dependencias fuente de datos, configuración, reloj, visibilidad de la página y reporte de errores de
 *   suscriptores (todos inyectables en pruebas)
 */
export function crearTableroFacade({ obtener, config, reloj = Date.now, esVisible = () => true, reportarError = relanzarAparte }) {
  const estado = { datos: null, filtros: filtrosVacios(), ultimaDescarga: 0, cargando: false, error: null };
  const oyentes = new Set();
  /** Entrega el evento a cada suscriptor por separado: si uno falla, los demás lo reciben y la carga sigue válida. */
  const avisar = (evento) => {
    for (const fn of oyentes) {
      try {
        fn(evento);
      } catch (error) {
        reportarError(error);
      }
    }
  };

  /** Registra una función que recibe 'datos', 'filtros', 'cargando' o 'error'. Devuelve la función para anularla. */
  function suscribir(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }

  /** Fija un filtro; un valor vacío se normaliza a '' o null según el tipo de filtro. */
  function fijarFiltro(campo, valor) {
    const vacio = valor === '' || valor === null || valor === undefined;
    estado.filtros[campo] = vacio ? (FILTROS_NUMERICOS.has(campo) ? null : '') : valor;
    avisar('filtros');
  }

  /** Aplica el filtro o lo quita si ya tenía ese mismo valor (clic repetido en un gráfico). */
  function alternarFiltro(campo, valor) {
    fijarFiltro(campo, estado.filtros[campo] === valor ? '' : valor);
  }

  /** Clic en una columna de la evolución: fija el año de la serie y alterna el mes. */
  function elegirMes(anio, mes) {
    estado.filtros.anio = anio;
    estado.filtros.mes = estado.filtros.mes === mes ? null : mes;
    avisar('filtros');
  }

  function limpiarFiltros() {
    estado.filtros = filtrosVacios();
    avisar('filtros');
  }

  /**
   * Descarga los datos respetando la política de actualización.
   * @param {boolean} forzar true ignora el reuso de 60 s (entrada, botón y automático)
   * @returns {Promise<'cargado'|'reusado'|'ocupado'|'error'>}
   */
  async function cargar(forzar) {
    // Paso 1: una descarga a la vez y reuso si la última es reciente
    if (estado.cargando) return 'ocupado';
    if (!forzar && estado.datos && reloj() - estado.ultimaDescarga < config.REUSO_MINIMO_MS) return 'reusado';
    estado.cargando = true;
    avisar('cargando');
    try {
      // Paso 2: los datos nuevos reemplazan a los anteriores solo si llegaron completos y válidos
      estado.datos = await obtener();
      estado.ultimaDescarga = reloj();
      estado.error = null;
      avisar('datos');
      return 'cargado';
    } catch (e) {
      // Paso 3: ante un error se conservan los últimos datos buenos
      estado.error = e;
      avisar('error');
      return 'error';
    } finally {
      estado.cargando = false;
      avisar('cargando');
    }
  }

  /** Indica si corresponde la actualización automática: pestaña visible y 5 minutos desde la última descarga. */
  function tocaActualizar() {
    return esVisible() && reloj() - estado.ultimaDescarga >= config.INTERVALO_AUTO_MS;
  }

  /** Opciones de todos los combos, con el valor actual de cada filtro. */
  function opciones() {
    if (!estado.datos) return null;
    const { filas, establecimientos, catalogo } = estado.datos;
    const op = opcionesDeFiltros(filas);
    const todos = { valor: '', texto: TEXTOS.todos };
    const provincias = [...new Set(filas.filter((x) => x.nacional && x.provincia).map((x) => x.provincia))]
      .sort((a, b) => a.localeCompare(b, 'es'));
    return {
      anio: [todos, ...op.anios.map((a) => ({ valor: String(a), texto: String(a) }))],
      mes: [todos, ...MESES.map((m, i) => ({ valor: String(i), texto: m }))],
      procedencia: [
        { valor: '', texto: TEXTOS.procedenciaTodos },
        { valor: 'NAC', texto: TEXTOS.procedenciaNacionales },
        ...op.ciudades.map((c) => ({ valor: `C:${c}`, texto: c, grupo: TEXTOS.grupoCiudades })),
        ...provincias.map((p) => ({ valor: `PR:${p}`, texto: TEXTOS.provinciaPrefijo + p, grupo: TEXTOS.grupoCiudades })),
        { valor: 'EXT', texto: TEXTOS.procedenciaExtranjeros },
        ...op.paises.map((p) => ({ valor: `P:${p}`, texto: p, grupo: TEXTOS.grupoPaises })),
      ],
      motivo: [todos, ...op.motivos.map((m) => ({ valor: m, texto: m }))],
      rangoEdad: [todos, ...RANGOS_EDAD.map((r) => ({ valor: r, texto: r }))],
      genero: [todos, ...catalogo.generos.map((g) => ({ valor: g, texto: g }))],
      establecimiento: [{ valor: '', texto: TEXTOS.todosEstablecimientos }, ...establecimientos.map((e) => ({ valor: e, texto: e }))],
      establecimientos,
    };
  }

  /** Todo lo que la interfaz pinta, calculado con las funciones puras del dominio. */
  function vista() {
    if (!estado.datos) return null;
    const f = estado.filtros;
    const { filas, catalogo } = estado.datos;
    const sel = filtrar(filas, f);
    // Paso 1: la evolución ignora año y mes para mostrar los 12 meses del año de referencia
    const baseEvolucion = filtrar(filas, f, ['anio', 'mes']);
    return {
      kpis: kpis(sel),
      variacion: variacionInteranual(filas, f),
      evolucion: evolucionMensual(baseEvolucion, anioDeReferencia(baseEvolucion, f.anio)),
      motivos: porMotivo(sel),
      edadGenero: edadGenero(sel, catalogo.generos),
      mapa: { procedencia: f.procedencia, ciudades: porCiudad(sel), paises: porPais(sel), provincias: porProvincia(sel), catalogo },
      filtros: { ...f },
    };
  }

  /**
   * Filtros aplicados como etiquetas legibles, en el orden en que se muestran como chips.
   * @returns {Array<{ campo: string, texto: string }>}
   */
  function chipsActivos() {
    const f = estado.filtros;
    const chips = [];
    if (f.establecimiento) chips.push({ campo: 'establecimiento', texto: f.establecimiento });
    if (f.anio !== null) chips.push({ campo: 'anio', texto: String(f.anio) });
    if (f.mes !== null) chips.push({ campo: 'mes', texto: MESES[f.mes] });
    if (f.procedencia) chips.push({ campo: 'procedencia', texto: textoProcedencia(f.procedencia) });
    if (f.motivo) chips.push({ campo: 'motivo', texto: f.motivo });
    if (f.rangoEdad) chips.push({ campo: 'rangoEdad', texto: TEXTOS.chipEdad(f.rangoEdad) });
    if (f.genero) chips.push({ campo: 'genero', texto: f.genero });
    return chips;
  }

  return {
    chipsActivos,
    suscribir, fijarFiltro, alternarFiltro, elegirMes, limpiarFiltros, cargar, tocaActualizar, opciones, vista,
    get estado() { return { ...estado, filtros: { ...estado.filtros } }; },
  };
}
