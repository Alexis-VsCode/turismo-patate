/**
 * @file tablero.facade.js
 * @description Aplicación. Fachada del tablero: guarda el estado (datos y filtros), aplica la política
 *   de actualización (reuso de 60 s y automática, según la configuración, solo con la pestaña visible) y entrega
 *   a la interfaz la vista ya calculada. No toca el DOM: se prueba completa en Node.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { TEXTOS } from '../shared/textos.es.js';
import { MESES, RANGOS_EDAD } from '../domain/visitante.js';
import {
  kpis, anioDeReferencia, evolucionMensual, porMotivo,
  porCiudad, porProvincia, porPais, edadGenero, opcionesDeFiltros, variacionInteranual,
} from '../domain/estadisticas.js';
import {
  filtrar, filtrosVacios, CLAVES_MULTIPLES, valoresDeFiltro, alternarValor, quitarValor, copiarFiltros,
} from '../domain/filtros.js';
import { estadoFrescura } from '../domain/frescura.js';

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

/** Pestañas del mapa de origen. */
const VISTAS_MAPA = new Set(['provincias', 'ciudades', 'paises']);

/** Pestaña que corresponde a un filtro de procedencia concreto; null si el filtro no fuerza ninguna. */
function vistaDeProcedencia(procedencia) {
  if (procedencia === 'EXT' || procedencia.startsWith('P:')) return 'paises';
  if (procedencia.startsWith('C:')) return 'ciudades';
  if (procedencia.startsWith('PR:')) return 'provincias';
  return null;
}

/** Filtros que guardan una lista de opciones. */
const ES_MULTIPLE = new Set(CLAVES_MULTIPLES);

/** Última opción de procedencia elegida, que es la que el mapa resalta; vacía si no hay ninguna. */
const ultimaProcedencia = (filtros) => valoresDeFiltro(filtros.procedencia).at(-1) ?? '';

/**
 * Crea la fachada del tablero.
 * @param {{
 *   obtener: () => Promise<object>,
 *   config: { REUSO_MINIMO_MS: number, INTERVALO_AUTO_MS: number, UMBRALES_FRESCURA: { alDiaMin: number, retrasadoMin: number } },
 *   reloj?: () => number,
 *   esVisible?: () => boolean,
 *   reportarError?: (error: Error) => void,
 * }} dependencias fuente de datos, configuración, reloj, visibilidad de la página y reporte de errores de
 *   suscriptores (todos inyectables en pruebas)
 */
export function crearTableroFacade({ obtener, config, reloj = Date.now, esVisible = () => true, reportarError = relanzarAparte }) {
  const estado = { datos: null, filtros: filtrosVacios(), vistaMapa: 'provincias', ultimaDescarga: 0, cargando: false, error: null };
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

  /** Registra una función que recibe 'datos', 'filtros', 'vistaMapa', 'cargando' o 'error'. Devuelve la función para anularla. */
  function suscribir(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }

  /**
   * Reemplaza un filtro. Los de varias opciones aceptan una lista, un valor suelto o un vacío; año y mes, un valor
   * o un vacío (que los deja en null).
   */
  function fijarFiltro(campo, valor) {
    if (ES_MULTIPLE.has(campo)) {
      estado.filtros[campo] = valoresDeFiltro(valor);
    } else {
      const vacio = valor === '' || valor === null || valor === undefined;
      estado.filtros[campo] = vacio ? null : valor;
    }
    // Paso 1: elegir un origen concreto lleva el mapa a la pestaña que lo muestra; «todos» y «nacionales» no la cambian
    if (campo === 'procedencia') estado.vistaMapa = vistaDeProcedencia(ultimaProcedencia(estado.filtros)) ?? estado.vistaMapa;
    avisar('filtros');
  }

  /** Cambia la pestaña del mapa (provincias, ciudades o países). Ignora modos desconocidos y repeticiones. */
  function fijarVistaMapa(modo) {
    if (!VISTAS_MAPA.has(modo) || modo === estado.vistaMapa) return;
    estado.vistaMapa = modo;
    avisar('vistaMapa');
  }

  /** Agrega la opción a un filtro de varias opciones o la quita si ya estaba (clic repetido en un gráfico). */
  function alternarFiltro(campo, valor) {
    if (!ES_MULTIPLE.has(campo)) {
      fijarFiltro(campo, estado.filtros[campo] === valor ? null : valor);
      return;
    }
    const antes = estado.filtros[campo];
    estado.filtros[campo] = alternarValor(antes, valor);
    // Paso 1: el mapa va a la pestaña de la opción recién agregada; quitar una opción no lo mueve
    if (campo === 'procedencia' && estado.filtros[campo].length > antes.length) {
      estado.vistaMapa = vistaDeProcedencia(valor) ?? estado.vistaMapa;
    }
    avisar('filtros');
  }

  /** Quita una opción de un filtro de varias opciones; en año y mes, vacía el filtro. */
  function quitarFiltro(campo, valor) {
    estado.filtros[campo] = ES_MULTIPLE.has(campo) ? quitarValor(estado.filtros[campo], valor) : null;
    avisar('filtros');
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
      // Paso 4: pase lo que pase se libera el bloqueo y se avisa que terminó, para rehabilitar el botón
      estado.cargando = false;
      avisar('cargando');
    }
  }

  /** Indica si corresponde la actualización automática: pestaña visible y 5 minutos desde la última descarga. */
  function tocaActualizar() {
    return esVisible() && reloj() - estado.ultimaDescarga >= config.INTERVALO_AUTO_MS;
  }

  /** Cada cuántos minutos se actualiza el tablero, tomado de la configuración para que ningún texto repita la cifra. */
  function intervaloMinutos() {
    return Math.round(config.INTERVALO_AUTO_MS / 60000);
  }

  /** Cada cuántos minutos se vuelve a publicar el sitio, tomado de la configuración. */
  function publicacionMinutos() {
    return config.PUBLICACION_MINUTOS;
  }

  /** Frescura de la publicación de los datos según el reloj actual; «desconocido» mientras no haya datos. */
  function frescura() {
    return estadoFrescura(estado.datos && estado.datos.generadoEn, reloj(), config.UMBRALES_FRESCURA);
  }

  /** Opciones de todos los combos, con el valor actual de cada filtro. */
  function opciones() {
    if (!estado.datos) return null;
    const { filas, establecimientos, catalogo } = estado.datos;
    // Paso 1: las opciones salen de la hoja: de los visitantes y, en años y motivos, también del catálogo
    const op = opcionesDeFiltros(filas, catalogo);
    const todos = { valor: '', texto: TEXTOS.todos };
    const opcion = (valor, texto, grupo) => (grupo ? { valor, texto, grupo } : { valor, texto });
    // Paso 2: las provincias solo cuentan si hay visitantes nacionales, porque el filtro las aplica a ellos
    const provincias = [...new Set(filas.filter((x) => x.nacional && x.provincia).map((x) => x.provincia))]
      .sort((a, b) => a.localeCompare(b, 'es'));
    return {
      anio: [todos, ...op.anios.map((a) => ({ valor: String(a), texto: String(a) }))],
      mes: [todos, ...MESES.map((m, i) => ({ valor: String(i), texto: m }))],
      // Los filtros de varias opciones no ofrecen «Todos»: una lista vacía ya significa todos
      procedencia: [
        opcion('NAC', TEXTOS.procedenciaNacionales, TEXTOS.grupoAtajos),
        opcion('EXT', TEXTOS.procedenciaExtranjeros, TEXTOS.grupoAtajos),
        ...provincias.map((p) => opcion(`PR:${p}`, p, TEXTOS.grupoProvincias)),
        ...op.ciudades.map((c) => opcion(`C:${c}`, c, TEXTOS.grupoCiudades)),
        ...op.paises.map((p) => opcion(`P:${p}`, p, TEXTOS.grupoPaises)),
      ],
      motivo: op.motivos.map((m) => opcion(m, m)),
      rangoEdad: RANGOS_EDAD.map((r) => opcion(r, r)),
      genero: catalogo.generos.map((g) => opcion(g, g)),
      establecimiento: establecimientos.map((e) => opcion(e, e)),
    };
  }

  /** Todo lo que la interfaz pinta, calculado con las funciones puras del dominio. */
  function vista() {
    if (!estado.datos) return null;
    const f = estado.filtros;
    const { filas, catalogo } = estado.datos;
    // Paso 1: la selección con todos los filtros alimenta KPI, motivos, edad y mapa
    const sel = filtrar(filas, f);
    // Paso 2: la evolución ignora año y mes para mostrar los 12 meses del año de referencia
    const baseEvolucion = filtrar(filas, f, ['anio', 'mes']);
    // Paso 3: la lista de motivos ignora su propio filtro para que el visitante pueda pasar de un motivo a otro
    const baseMotivos = filtrar(filas, f, ['motivo']);
    // Paso 4: cada zona de la interfaz recibe su agregación ya calculada por el dominio
    return {
      kpis: kpis(sel),
      variacion: variacionInteranual(filas, f),
      evolucion: evolucionMensual(baseEvolucion, anioDeReferencia(baseEvolucion, f.anio)),
      motivos: porMotivo(baseMotivos),
      edadGenero: edadGenero(sel, catalogo.generos),
      mapa: { vista: estado.vistaMapa, procedencia: ultimaProcedencia(f), ciudades: porCiudad(sel), paises: porPais(sel), provincias: porProvincia(sel), catalogo },
      textos: {
        periodo: TEXTOS.periodo(f.anio, f.mes === null ? null : MESES[f.mes]),
        centro: TEXTOS.centroDona(f.anio),
        notaMapa: TEXTOS.notaMapa(f.anio),
      },
      filtros: copiarFiltros(f),
    };
  }

  /**
   * Filtros aplicados como etiquetas legibles, en el orden en que se muestran como chips.
   * Año y mes vacíos son `null` (enero es `0`), por eso se comparan con `null` y no por veracidad.
   * @returns {Array<{ campo: string, texto: string }>}
   */
  function chipsActivos() {
    const f = estado.filtros;
    const chips = [];
    const agregar = (campo, valor, texto) => chips.push({ campo, valor, texto });
    f.establecimiento.forEach((e) => agregar('establecimiento', e, e));
    if (f.anio !== null) agregar('anio', f.anio, String(f.anio));
    if (f.mes !== null) agregar('mes', f.mes, MESES[f.mes]);
    f.procedencia.forEach((p) => agregar('procedencia', p, textoProcedencia(p)));
    f.motivo.forEach((m) => agregar('motivo', m, m));
    f.rangoEdad.forEach((r) => agregar('rangoEdad', r, TEXTOS.chipEdad(r)));
    f.genero.forEach((g) => agregar('genero', g, g));
    return chips;
  }

  return {
    chipsActivos,
    suscribir, fijarFiltro, alternarFiltro, quitarFiltro, elegirMes, limpiarFiltros, fijarVistaMapa, cargar, tocaActualizar, intervaloMinutos, publicacionMinutos, frescura, opciones, vista,
    get estado() { return { ...estado, filtros: copiarFiltros(estado.filtros) }; },
  };
}
