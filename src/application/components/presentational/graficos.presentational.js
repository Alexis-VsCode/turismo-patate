/**
 * @file graficos.presentational.js
 * @description Presentacional. Opciones de ECharts por panel, construidas solo a partir de los resultados de
 *   estadisticas.js. Los tooltips usan renderMode 'richText' (se dibujan en canvas), de modo que
 *   ningún texto de la hoja se interpreta como HTML.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { MESES_CORTOS, ORDEN_GENEROS, TEXTOS } from '../../../shared/textos.es.js';
import { numero, porcentaje } from '../../../shared/formato.js';

/** Tooltip común: en canvas (richText) y con los colores del tema, también en modo oscuro. */
const tooltipBase = (colores) => ({
  renderMode: 'richText', confine: true,
  backgroundColor: colores.superficie, borderColor: colores.borde, textStyle: { color: colores.texto },
});

/** Columnas del año de referencia y del anterior, con la línea de tendencia del año actual. */
export function opcionesEvolucion(evo, colores, mesResaltado) {
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
    tooltip: { ...tooltipBase(colores), trigger: 'axis', valueFormatter: (v) => (v === null || v === undefined ? '—' : numero(v)) },
    xAxis: { type: 'category', data: MESES_CORTOS, axisLabel: { color: colores.texto, interval: 0, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: colores.rejilla } } },
    yAxis: { type: 'value', axisLabel: { color: colores.texto, formatter: (v) => numero(v) }, splitLine: { lineStyle: { color: colores.rejilla } } },
    series: [
      { name: evo.anioAnterior === null ? TEXTOS.anioAnterior : String(evo.anioAnterior), type: 'bar', barGap: '8%', itemStyle: { color: colores.verde }, data: conResalte(evo.anterior, colores.verde) },
      { name: evo.anio === null ? TEXTOS.anioActual : String(evo.anio), type: 'bar', itemStyle: { color: colores.amarillo }, data: conResalte(evo.actual, colores.amarillo, 1), label: etiqueta },
      {
        name: TEXTOS.tendencia(evo.anio), type: 'line', data: evo.actual, smooth: true, symbolSize: 5, z: 1,
        lineStyle: { width: 2, color: colores.tendencia }, itemStyle: { color: colores.tendencia }, connectNulls: false,
      },
    ],
  };
}

/** Dona nacionales vs extranjeros con el total y el periodo al centro; las tarjetas del panel hacen de leyenda. */
export function opcionesDona(k, colores, centro) {
  return {
    animationDuration: 400,
    title: {
      text: numero(k.total), subtext: centro, left: 'center', top: 'center', itemGap: 2,
      textStyle: { color: colores.texto, fontSize: 24, fontWeight: 800 }, subtextStyle: { color: colores.texto, fontSize: 12 },
    },
    tooltip: { ...tooltipBase(colores), trigger: 'item', formatter: (p) => `${p.name}: ${numero(p.value)} (${porcentaje(p.percent / 100)})` },
    series: [{
      type: 'pie', radius: ['58%', '88%'], center: ['50%', '50%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: colores.superficie, borderWidth: 2 },
      label: { position: 'inside', color: colores.textoSobreColor, fontSize: 13, fontWeight: 'bold', formatter: (p) => (p.percent >= 4 ? porcentaje(p.percent / 100) : '') },
      data: [
        { name: TEXTOS.nacionales, value: k.nacionales, itemStyle: { color: colores.verde } },
        { name: TEXTOS.extranjeros, value: k.extranjeros, itemStyle: { color: colores.amarillo } },
      ],
    }],
  };
}

/** Posición de un género en la lectura del gráfico: los desconocidos van al final, en su orden original. */
const lugarDeGenero = (genero) => {
  const lugar = ORDEN_GENEROS.indexOf(genero);
  return lugar < 0 ? ORDEN_GENEROS.length : lugar;
};

/** Barras agrupadas por rango de edad, una serie por género: «Total mujeres» primero y «Total hombres» después. */
export function opcionesEdadGenero(eg, colores, rangoSeleccionado) {
  // Paso 1: las mujeres se leen primero; el orden de los demás géneros se conserva
  const series = [...eg.series].sort((a, b) => lugarDeGenero(a.genero) - lugarDeGenero(b.genero));
  // Paso 2: verde y amarillo para los dos géneros del catálogo; si la hoja suma más, siguen dos tonos verdes.
  // Los tonos claros (posiciones impares) llevan contorno para distinguirse sobre fondo claro
  const paleta = [colores.verde, colores.amarillo, colores.verdeTexto, colores.lima];
  const estilo = (i) => ({ color: paleta[i % paleta.length], borderColor: colores.oliva, borderWidth: i % 2 === 1 ? 1 : 0 });
  return {
    animationDuration: 400,
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    legend: { top: 4, itemWidth: 12, itemHeight: 12, textStyle: { color: colores.texto, fontSize: 12 } },
    tooltip: { ...tooltipBase(colores), trigger: 'axis', valueFormatter: (v) => numero(v) },
    xAxis: { type: 'category', data: eg.rangos, axisLabel: { color: colores.texto }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: colores.texto, formatter: (v) => numero(v) }, splitLine: { lineStyle: { color: colores.rejilla } } },
    series: series.map((s, i) => ({
      name: TEXTOS.etiquetaGenero(s.genero), type: 'bar', barGap: '6%', itemStyle: estilo(i),
      data: s.valores.map((v, j) => ({ value: v, itemStyle: { ...estilo(i), opacity: !rangoSeleccionado || eg.rangos[j] === rangoSeleccionado ? 1 : 0.35 } })),
    })),
  };
}
