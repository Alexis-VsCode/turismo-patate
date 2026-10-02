/**
 * @file textos.es.js
 * @description Compartido. Textos visibles que arma el código. Los textos fijos de la página viven en
 *   index.html; todo lo dinámico sale de aquí para mantener un solo lugar de redacción.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { numero, porcentaje } from './formato.js';

/** «cada minuto» o «cada N minutos», para que ningún texto repita a mano la cifra de config.js. */
const cadaMinutos = (n) => (n === 1 ? 'cada minuto' : `cada ${n} minutos`);

/** Orden de lectura del gráfico de edad: primero las mujeres, luego los hombres, luego cualquier otro género. */
export const ORDEN_GENEROS = Object.freeze(['Femenino', 'Masculino']);
const ETIQUETAS_GENERO = Object.freeze({ Femenino: 'Total mujeres', Masculino: 'Total hombres' });

export const TEXTOS = Object.freeze({
  todos: 'Todos',
  todosEstablecimientos: 'Todos los establecimientos',
  sinCoincidencias: 'Sin coincidencias',
  procedenciaNacionales: 'Ecuador (todas las ciudades)',
  procedenciaExtranjeros: 'Extranjeros (todos los países)',
  grupoAtajos: 'Atajos',
  grupoProvincias: 'Provincias',
  grupoCiudades: 'Ciudades de Ecuador',
  grupoPaises: 'Países',
  provinciaPrefijo: 'Provincia: ',
  nacionales: 'Nacionales',
  extranjeros: 'Extranjeros',
  visitantes: 'visitantes',
  frescura: {
    alDia: 'Publicación al día',
    retrasado: 'Publicación retrasada',
    vencido: 'Publicación detenida',
    desconocido: 'Sin verificar',
  },
  frescuraAyuda: (minutos) => `Actualizar vuelve a descargar lo ya publicado. Los datos de la hoja se publican solos ${cadaMinutos(minutos)}: si la última publicación es antigua, la publicación automática se detuvo.`,
  frescuraDetalle: (tiempo) => `Última ${tiempo}`,
  cargando: 'Actualizando datos…',
  actualizar: 'Actualizar',
  estado: (minutos, consulta, publicado, establecimientos, registros) =>
    `Se actualiza automáticamente ${cadaMinutos(minutos)} · Actualizado el ${consulta} · Datos publicados el ${publicado} · ${establecimientos} establecimientos · ${registros} registros`,
  sinDatosAun: (minutos) => `Se actualiza automáticamente ${cadaMinutos(minutos)} · Cargando datos por primera vez…`,
  errorDescarga: (hora) => (hora
    ? `No se pudo actualizar. Se muestran los datos de las ${hora}.`
    : 'No se pudieron cargar los datos. Revise su conexión y pulse «Actualizar».'),
  errores: {
    TIEMPO_AGOTADO: 'Los datos tardaron demasiado en responder.',
    DEMASIADO_GRANDE: 'Los datos publicados superan el tamaño permitido.',
    HTTP: 'El servidor de datos no respondió correctamente.',
    RED: 'Sin conexión con el servidor de datos.',
    FORMATO: 'Los datos publicados no tienen el formato esperado.',
  },
  problemas: (n) => `${n} ${n === 1 ? 'fila' : 'filas'} con problemas`,
  avisosPestanas: (n) => `${n} ${n === 1 ? 'aviso' : 'avisos'} de pestañas`,
  filaDe: (pestana, fila) => `${pestana} · fila ${fila}`,
  mostrandoPrimeros: (n, total) => `Se muestran los primeros ${n} de ${total}.`,
  sinDatos: 'Sin datos para los filtros elegidos',
  tendencia: (anio) => (anio === null ? 'Tendencia' : `Tendencia ${anio}`),
  anioAnterior: 'Año anterior',
  anioActual: 'Año actual',
  sinDatosCorto: 'Sin datos',
  temaAOscuro: 'Cambiar a modo oscuro',
  temaAClaro: 'Cambiar a modo claro',
  chipEdad: (rango) => `Edad ${rango}`,
  /** Nombre con que el gráfico de edad muestra cada género del catálogo; los demás conservan el suyo. */
  etiquetaGenero: (genero) => ETIQUETAS_GENERO[genero] || genero,
  quitarFiltro: (texto) => `Quitar filtro ${texto}`,
  quitarTodos: 'Quitar todos',
  /** Leyenda del gráfico de edad: el nombre del género con su total y su porcentaje. */
  leyendaGenero: (nombre, total, suma) => `${nombre} ${numero(total)} (${porcentaje(suma ? total / suma : null)})`,
  personasConDiscapacidad: (n) => `${numero(n)} ${n === 1 ? 'persona' : 'personas'}`,
  discapacidadDeVisitantes: (pct) => `${pct} de los visitantes`,
  rangoDiscapacidad: (rango) => (rango.endsWith('+') ? `${rango.slice(0, -1)} o más personas` : `${rango.replace('-', ' a ')} personas`),
  opcionesElegidas: (n) => `${n} elegidas`,
  filtrosConteo: (n) => (n ? `Filtros (${n})` : 'Filtros'),
  variacion: (pct, anio) => `${pct} vs ${anio}`,
  sinComparacion: 'Sin datos del año anterior',
  periodo: (anio, mes) => {
    if (anio !== null && mes) return `en ${mes.toLowerCase()} de ${anio}`;
    if (anio !== null) return `durante el ${anio}`;
    if (mes) return `en ${mes.toLowerCase()} de todos los años`;
    return 'en todo el período';
  },
  resumenParticipacion: (k, periodo) => {
    if (!k.total) return 'Sin visitantes para los filtros elegidos.';
    if (k.pctExtranjeros === 0) return `Todos los visitantes son nacionales ${periodo}.`;
    if (k.pctNacionales === 0) return `Todos los visitantes son extranjeros ${periodo}.`;
    return `Los visitantes nacionales representan el ${porcentaje(k.pctNacionales)} del total y los extranjeros el ${porcentaje(k.pctExtranjeros)} ${periodo}.`;
  },
  centroDona: (anio) => (anio === null ? 'Visitantes' : `Visitantes ${anio}`),
  notaMapa: (anio) => `Tamaño del círculo proporcional al total de visitantes (${anio === null ? 'todos los años' : anio}).`,
  topVista: { provincias: 'Top provincias', ciudades: 'Top ciudades', paises: 'Top países' },
  subtituloEvolucion: (anio, anterior) => (anio === null ? 'Sin datos' : `${anio} vs ${anterior} · por mes`),
});

export const MESES_CORTOS = Object.freeze(['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']);
