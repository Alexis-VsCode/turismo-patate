/**
 * @file contrato-datos.js
 * @description Infraestructura. Formato compacto de `datos/datos.json`: lo escribe el constructor (GitHub
 *   Actions) a partir de la hoja, y lo lee el navegador. Las filas van como índices a diccionarios
 *   para que el archivo sea liviano. El navegador valida todo al desempaquetar, porque es su única
 *   entrada.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { rangoDeEdad } from '../domain/visitante.js';
import { limpiarTexto, esClaveSegura } from '../domain/texto.js';

export const VERSION_PAQUETE = 1;
const DICCIONARIOS = ['establecimientos', 'paises', 'provincias', 'ciudades', 'motivos', 'generos'];

/**
 * Convierte el resultado de leerLibro() en el objeto serializable de datos.json.
 * @param {object} datos resultado de leerLibro()
 * @param {string} generadoEn instante de la construcción, en ISO 8601
 * @param {string} paisLocal país que define a un visitante como nacional
 * @returns {object} paquete con diccionarios, filas como números, discapacidad, catálogo del mapa, rechazos y avisos
 */
export function empaquetar(datos, generadoEn, paisLocal) {
  const dic = Object.fromEntries(DICCIONARIOS.map((d) => [d, new Map()]));
  const indice = (nombre, valor) => {
    const mapa = dic[nombre];
    if (!mapa.has(valor)) mapa.set(valor, mapa.size);
    return mapa.get(valor);
  };
  // Paso 1: los establecimientos van en orden, incluso los que no tienen filas
  datos.establecimientos.forEach((e) => indice('establecimientos', e));
  indice('ciudades', '');
  indice('provincias', '');
  // Paso 2: cada fila son 10 números en orden fijo (establecimiento, año, mes, país, provincia, ciudad, cantidad,
  // motivo, edad, género); los textos van como índice al diccionario y desempaquetar() lee el mismo orden
  const filas = datos.filas.map((f) => [
    indice('establecimientos', f.establecimiento), f.anio, f.mes, indice('paises', f.pais),
    indice('provincias', f.provincia), indice('ciudades', f.ciudad), f.cantidad,
    indice('motivos', f.motivo), f.edad, indice('generos', f.genero),
  ]);
  // Paso 3: la discapacidad va aparte, en filas de 8 números (establecimiento, año, mes, país, provincia, ciudad,
  // motivo, personas), porque no se cruza con la edad ni con el género; una clave opcional no rompe a los lectores anteriores
  const discapacidad = (datos.discapacidad || []).map((d) => [
    indice('establecimientos', d.establecimiento), d.anio, d.mes, indice('paises', d.pais),
    indice('provincias', d.provincia), indice('ciudades', d.ciudad), indice('motivos', d.motivo), d.personas,
  ]);
  // Paso 4: catálogo mínimo que necesita el mapa
  const c = datos.catalogo;
  return {
    version: VERSION_PAQUETE,
    generadoEn,
    paisLocal,
    diccionarios: Object.fromEntries(DICCIONARIOS.map((d) => [d, [...dic[d].keys()]])),
    filas,
    discapacidad,
    catalogo: {
      anios: c.anios,
      motivos: c.motivos,
      provincias: c.provincias,
      generos: c.generos,
      ciudades: [...c.ciudades.values()].map((x) => [x.nombre, x.provincia, x.lat, x.lon]),
      paises: [...c.coordPaises.values()].map((x) => [x.nombre, x.lat, x.lon]),
      completo: c.completo,
    },
    rechazos: datos.rechazos,
    avisos: datos.avisos,
  };
}

const esTexto = (v) => typeof v === 'string';
const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Reconstruye { filas, discapacidad, rechazos, avisos, establecimientos, catalogo, generadoEn } a partir de datos.json.
 * Lanza Error si la estructura no es la esperada; nunca devuelve datos a medias.
 * @param {object} json contenido de datos.json ya convertido a objeto
 * @param {(texto: string) => string} claveNormalizada comparación sin tildes ni mayúsculas
 * @returns {object} datos con la misma forma que devuelve leerLibro(), más generadoEn
 * @throws {Error} si la versión, un diccionario, una fila o un índice no cumplen el contrato
 */
export function desempaquetar(json, claveNormalizada) {
  if (!json || json.version !== VERSION_PAQUETE || !Array.isArray(json.filas)) throw new Error('Paquete de datos no válido');
  // Paso 1: diccionarios de texto limpio
  const dic = {};
  for (const d of DICCIONARIOS) {
    const lista = json.diccionarios && json.diccionarios[d];
    if (!Array.isArray(lista) || !lista.every(esTexto)) throw new Error(`Diccionario no válido: ${d}`);
    dic[d] = lista.map(limpiarTexto);
  }
  const paisLocal = claveNormalizada(json.paisLocal || '');
  const nacionalPorPais = dic.paises.map((p) => claveNormalizada(p) === paisLocal);
  const valor = (d, i) => {
    if (!Number.isInteger(i) || i < 0 || i >= dic[d].length) throw new Error(`Índice fuera de rango en ${d}`);
    return dic[d][i];
  };
  // Paso 2: filas con validación de tipos e índices
  const filas = [];
  for (const r of json.filas) {
    if (!Array.isArray(r) || r.length !== 10 || !r.every(esNumero)) throw new Error('Fila no válida');
    const [e, anio, mes, pais, prov, ciudad, cantidad, motivo, edad, genero] = r;
    if (mes < 0 || mes > 11 || cantidad < 1 || edad < 0 || edad > 110) throw new Error('Valor fuera de rango');
    const establecimiento = valor('establecimientos', e);
    if (!esClaveSegura(establecimiento)) continue;
    filas.push({
      establecimiento, anio, mes, pais: valor('paises', pais),
      provincia: valor('provincias', prov), ciudad: valor('ciudades', ciudad), cantidad,
      motivo: valor('motivos', motivo), edad, rangoEdad: rangoDeEdad(edad), genero: valor('generos', genero),
      nacional: nacionalPorPais[pais],
    });
  }
  // Paso 3: discapacidad; la clave es opcional y su ausencia equivale a ninguna
  const bruto = json.discapacidad === undefined ? [] : json.discapacidad;
  if (!Array.isArray(bruto)) throw new Error('Discapacidad no válida');
  const discapacidad = [];
  for (const r of bruto) {
    if (!Array.isArray(r) || r.length !== 8 || !r.every(esNumero)) throw new Error('Fila de discapacidad no válida');
    const [e, anio, mes, pais, prov, ciudad, motivo, personas] = r;
    if (mes < 0 || mes > 11 || !Number.isInteger(personas) || personas < 1) throw new Error('Valor fuera de rango');
    const establecimiento = valor('establecimientos', e);
    if (!esClaveSegura(establecimiento)) continue;
    discapacidad.push({
      establecimiento, anio, mes, pais: valor('paises', pais), provincia: valor('provincias', prov),
      ciudad: valor('ciudades', ciudad), motivo: valor('motivos', motivo), personas, nacional: nacionalPorPais[pais],
    });
  }
  // Paso 4: catálogo del mapa
  const cat = json.catalogo || {};
  const textos = (lista) => (Array.isArray(lista) ? lista.filter(esTexto).map(limpiarTexto) : []);
  const ciudades = new Map();
  for (const x of cat.ciudades || []) {
    if (Array.isArray(x) && esTexto(x[0]) && esNumero(x[2]) && esNumero(x[3])) {
      ciudades.set(claveNormalizada(x[0]), { nombre: limpiarTexto(x[0]), provincia: limpiarTexto(x[1]), lat: x[2], lon: x[3] });
    }
  }
  const coordPaises = new Map();
  for (const x of cat.paises || []) {
    if (Array.isArray(x) && esTexto(x[0]) && esNumero(x[1]) && esNumero(x[2])) {
      coordPaises.set(claveNormalizada(x[0]), { nombre: limpiarTexto(x[0]), lat: x[1], lon: x[2] });
    }
  }
  // Paso 5: años y motivos del catálogo; un paquete anterior que no los trae da listas vacías
  const anios = [...new Set((Array.isArray(cat.anios) ? cat.anios : []).filter((a) => Number.isInteger(a) && a >= 2000 && a <= 2100))]
    .sort((a, b) => b - a);
  // Paso 6: rechazos y avisos se limpian como texto; el resultado tiene la forma de leerLibro() más generadoEn
  const limpiarAviso = (a) => ({
    pestana: limpiarTexto(a && a.pestana), fila: esNumero(a && a.fila) ? a.fila : undefined, motivo: limpiarTexto(a && a.motivo), mensaje: limpiarTexto(a && a.mensaje),
  });
  return {
    generadoEn: esTexto(json.generadoEn) ? json.generadoEn : '',
    filas,
    discapacidad,
    establecimientos: dic.establecimientos.filter(esClaveSegura),
    catalogo: {
      completo: Boolean(cat.completo), anios, provincias: textos(cat.provincias), generos: textos(cat.generos),
      paises: [...coordPaises.values()].map((p) => p.nombre), motivos: textos(cat.motivos), ciudades, coordPaises,
    },
    rechazos: (Array.isArray(json.rechazos) ? json.rechazos : []).map(limpiarAviso),
    avisos: (Array.isArray(json.avisos) ? json.avisos : []).map(limpiarAviso),
  };
}
