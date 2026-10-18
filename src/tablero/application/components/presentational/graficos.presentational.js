/**
 * @file graficos.presentational.js
 * @description Presentacional. Opciones de ECharts por panel, construidas solo a partir de los resultados de
 *   estadisticas.js. Los tooltips usan renderMode 'richText' (se dibujan en canvas), de modo que
 *   ningún texto de la hoja se interpreta como HTML.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { valoresDeFiltro } from '../../../../domain/filtros.js';
import { GENERO_MUJERES, GENERO_HOMBRES } from '../../../../domain/catalogo.js';
import { MESES_CORTOS, TEXTOS } from '../../../shared/textos.es.js';
import { numero, porcentaje, SIN_DATO } from '../../../shared/formato.js';

/** Orden de lectura del gráfico de edad: primero las mujeres, luego los hombres, luego cualquier otro género. */
const ORDEN_GENEROS = Object.freeze([GENERO_MUJERES, GENERO_HOMBRES]);
const ETIQUETAS_GENERO = Object.freeze({ [GENERO_MUJERES]: TEXTOS.totalMujeres, [GENERO_HOMBRES]: TEXTOS.totalHombres });

/**
 * Apaga la animación de un gráfico cuando se pidió reducir el movimiento; si no, devuelve las mismas opciones.
 * @param {object} opciones opciones de ECharts ya armadas
 * @param {boolean} animar false si el sistema pide reducir el movimiento
 * @returns {object} las mismas opciones, o una copia con `animation: false`
 */
export function conMovimiento(opciones, animar) {
  return animar ? opciones : { ...opciones, animation: false };
}

/**
 * Columnas del año de referencia y del anterior, con la línea de tendencia del año actual.
 * @param {{ anio: number|null, anioAnterior: number|null, actual: Array<number|null>, anterior: Array<number|null> }} evolucion
 *   doce meses de cada año, calculados por el dominio
 * @param {object} colores colores del tema
 * @param {number|null} mesResaltado índice del mes elegido (0 a 11) o null si no hay ninguno
 * @returns {object} opciones de ECharts del gráfico de evolución
 */
export function opcionesEvolucion(evolucion, colores, mesResaltado) {
  const etiqueta = { show: true, position: 'top', fontSize: 10, distance: 3, color: colores.texto, formatter: (p) => (p.value ? numero(p.value) : '') };
  // Paso 1: el mes elegido se resalta atenuando el resto; el amarillo lleva contorno para verse sobre fondo claro
  const conResalte = (valores, color, contorno = 0) => valores.map((v, i) => ({
    value: v,
    itemStyle: { color, borderColor: colores.oliva, borderWidth: contorno, opacity: mesResaltado === null || mesResaltado === i ? 1 : 0.35 },
  }));
  return {
    animationDuration: 400,
    grid: { left: 8, right: 12, top: 36, bottom: 8, containLabel: true },
    legend: { top: 4, left: 8, itemWidth: 12, itemHeight: 12, textStyle: { color: colores.texto, fontSize: 12 } },
    tooltip: { ...tooltipBase(colores), trigger: 'axis', valueFormatter: (v) => (v === null || v === undefined ? SIN_DATO : numero(v)) },
    xAxis: { type: 'category', data: MESES_CORTOS, axisLabel: { color: colores.texto, interval: 0, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: colores.rejilla } } },
    yAxis: { type: 'value', axisLabel: { color: colores.texto, formatter: (v) => numero(v) }, splitLine: { lineStyle: { color: colores.rejilla } } },
    series: [
      { name: evolucion.anioAnterior === null ? TEXTOS.anioAnterior : String(evolucion.anioAnterior), type: 'bar', barGap: '8%', itemStyle: { color: colores.verde }, data: conResalte(evolucion.anterior, colores.verde) },
      { name: evolucion.anio === null ? TEXTOS.anioActual : String(evolucion.anio), type: 'bar', itemStyle: { color: colores.amarillo }, data: conResalte(evolucion.actual, colores.amarillo, 1), label: etiqueta },
      {
        name: TEXTOS.tendencia(evolucion.anio), type: 'line', data: evolucion.actual, smooth: true, symbolSize: 5, z: 1,
        lineStyle: { width: 2, color: colores.tendencia }, itemStyle: { color: colores.tendencia }, connectNulls: false,
      },
    ],
  };
}

/**
 * Dona nacionales vs extranjeros con el total y el periodo al centro; las tarjetas del panel hacen de leyenda.
 * @param {{ total: number, nacionales: number, extranjeros: number }} kpis indicadores de la selección
 * @param {object} colores colores del tema
 * @param {string} centro texto del periodo bajo el total
 * @returns {object} opciones de ECharts de la dona
 */
export function opcionesDona(kpis, colores, centro) {
  return {
    animationDuration: 400,
    title: {
      text: numero(kpis.total), subtext: centro, left: 'center', top: 'center', itemGap: 2,
      textStyle: { color: colores.texto, fontSize: 24, fontWeight: 800 }, subtextStyle: { color: colores.texto, fontSize: 12 },
    },
    tooltip: { ...tooltipBase(colores), trigger: 'item', formatter: (p) => `${p.name}: ${numero(p.value)} (${porcentaje(p.percent / 100)})` },
    series: [{
      type: 'pie', radius: ['58%', '88%'], center: ['50%', '50%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: colores.superficie, borderWidth: 2 },
      label: { position: 'inside', color: colores.textoSobreColor, fontSize: 13, fontWeight: 'bold', formatter: (p) => (p.percent >= 4 ? porcentaje(p.percent / 100) : '') },
      data: [
        { name: TEXTOS.nacionales, value: kpis.nacionales, itemStyle: { color: colores.verde } },
        { name: TEXTOS.extranjeros, value: kpis.extranjeros, itemStyle: { color: colores.amarillo } },
      ],
    }],
  };
}

/**
 * Barras agrupadas por rango de edad, una serie por género: «Total mujeres» primero y «Total hombres» después.
 * @param {{ series: Array<{ genero: string, valores: number[] }> }} edadGenero visitantes por rango y género
 * @param {object} colores colores del tema
 * @param {string[]} rangosElegidos rangos de edad del filtro, que se resaltan
 * @returns {object} opciones de ECharts del gráfico de edad y género
 */
export function opcionesEdadGenero(edadGenero, colores, rangosElegidos) {
  const elegidos = valoresDeFiltro(rangosElegidos);
  const total = (s) => s.valores.reduce((suma, v) => suma + v, 0);
  // Paso 1: las mujeres se leen primero y el orden de los demás géneros se conserva. Mujeres y hombres siempre se
  // muestran; otro género solo si tiene visitantes, para no dejar una entrada vacía en la leyenda
  const series = edadGenero.series.filter((s) => ORDEN_GENEROS.includes(s.genero) || total(s) > 0)
    .sort((a, b) => lugarDeGenero(a.genero) - lugarDeGenero(b.genero));
  // Paso 2: la leyenda dice cuántos visitantes hay de cada género y qué parte del total son
  const totales = new Map(series.map((s) => [etiquetaGenero(s.genero), total(s)]));
  const suma = [...totales.values()].reduce((a, b) => a + b, 0);
  // Paso 3: verde y amarillo para los dos géneros del catálogo; si la hoja suma más, siguen dos tonos verdes.
  // Los tonos claros (posiciones impares) llevan contorno para distinguirse sobre fondo claro
  const paleta = [colores.verde, colores.amarillo, colores.verdeTexto, colores.lima];
  const estilo = (i) => ({ color: paleta[i % paleta.length], borderColor: colores.oliva, borderWidth: i % 2 === 1 ? 1 : 0 });
  return {
    animationDuration: 400,
    grid: { left: 8, right: 8, top: 62, bottom: 8, containLabel: true },
    legend: {
      top: 4, itemWidth: 12, itemHeight: 12, textStyle: { color: colores.texto, fontSize: 12 },
      formatter: (nombre) => TEXTOS.leyendaGenero(nombre, totales.get(nombre) || 0, suma),
    },
    tooltip: { ...tooltipBase(colores), trigger: 'axis', valueFormatter: (v) => numero(v) },
    xAxis: { type: 'category', data: edadGenero.rangos, axisLabel: { color: colores.texto }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: colores.texto, formatter: (v) => numero(v) }, splitLine: { lineStyle: { color: colores.rejilla } } },
    series: series.map((s, i) => ({
      name: etiquetaGenero(s.genero), type: 'bar', barGap: '6%', itemStyle: estilo(i),
      data: s.valores.map((v, j) => ({ value: v, itemStyle: { ...estilo(i), opacity: !elegidos.length || elegidos.includes(edadGenero.rangos[j]) ? 1 : 0.35 } })),
    })),
  };
}

/** Nombre con que el gráfico de edad muestra cada género del catálogo; los demás conservan el suyo. */
const etiquetaGenero = (genero) => ETIQUETAS_GENERO[genero] || genero;

/** Tooltip común: en canvas (richText) y con los colores del tema, también en modo oscuro. */
const tooltipBase = (colores) => ({
  renderMode: 'richText', confine: true,
  backgroundColor: colores.superficie, borderColor: colores.borde, textStyle: { color: colores.texto },
});

/** Posición de un género en la lectura del gráfico: los desconocidos van al final, en su orden original. */
const lugarDeGenero = (genero) => {
  const lugar = ORDEN_GENEROS.indexOf(genero);
  return lugar < 0 ? ORDEN_GENEROS.length : lugar;
};
