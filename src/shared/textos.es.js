/**
 * Textos visibles que arma el código. Los textos fijos de la página viven en index.html;
 * todo lo dinámico sale de aquí para mantener un solo lugar de redacción.
 *
 * Autor: Kevin Alexis Barrera Llerena 2026
 */
export const TEXTOS = Object.freeze({
  todos: 'Todos',
  todosEstablecimientos: 'Todos los establecimientos',
  buscarEstablecimiento: 'Escriba para buscar…',
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
  estado: (fecha, establecimientos, registros) =>
    `Se actualiza automáticamente cada 5 minutos · Datos al ${fecha} · ${establecimientos} establecimientos · ${registros} registros`,
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
  anioMes: (anio, mes) => `${anio} / ${mes}`,
  tendencia: (anio) => `Tendencia ${anio}`,
});

export const MESES_CORTOS = Object.freeze(['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']);
