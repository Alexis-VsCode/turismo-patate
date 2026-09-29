/**
 * @file textos.es.js
 * @description Compartido. Textos visibles que arma el código. Los textos fijos de la página viven en
 *   index.html; todo lo dinámico sale de aquí para mantener un solo lugar de redacción.
 * @author Kevin Alexis Barrera Llerena 2026
 */
export const TEXTOS = Object.freeze({
  todos: 'Todos',
  todosEstablecimientos: 'Todos los establecimientos',
  sinCoincidencias: 'Sin coincidencias',
  procedenciaTodos: 'Todos',
  procedenciaNacionales: 'Ecuador (todas las ciudades)',
  procedenciaExtranjeros: 'Extranjeros (todos los países)',
  grupoCiudades: 'Ciudades de Ecuador',
  grupoPaises: 'Países',
  provinciaPrefijo: 'Provincia: ',
  nacionales: 'Nacionales',
  extranjeros: 'Extranjeros',
  visitantes: 'visitantes',
  cargando: 'Actualizando datos…',
  actualizar: 'Actualizar',
  estado: (consulta, publicado, establecimientos, registros) =>
    `Se actualiza automáticamente cada 5 minutos · Actualizado el ${consulta} · Datos publicados el ${publicado} · ${establecimientos} establecimientos · ${registros} registros`,
  sinDatosAun: 'Se actualiza automáticamente cada 5 minutos · Cargando datos por primera vez…',
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
  topPaises: 'Top países',
  sinDatos: 'Sin datos para los filtros elegidos',
  tendencia: (anio) => (anio === null ? 'Tendencia' : `Tendencia ${anio}`),
  anioAnterior: 'Año anterior',
  anioActual: 'Año actual',
  sinDatosCorto: 'Sin datos',
  temaAOscuro: 'Cambiar a modo oscuro',
  temaAClaro: 'Cambiar a modo claro',
  chipEdad: (rango) => `Edad ${rango}`,
  quitarFiltro: (texto) => `Quitar filtro ${texto}`,
  filtrosConteo: (n) => (n ? `Filtros (${n})` : 'Filtros'),
  variacion: (pct, anio) => `${pct} vs ${anio}`,
  sinComparacion: 'Sin datos del año anterior',
  subtituloEvolucion: (anio, anterior) => (anio === null ? 'Sin datos' : `${anio} vs ${anterior} · por mes`),
});

export const MESES_CORTOS = Object.freeze(['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']);
