/**
 * @file graficos.presentational.js
 * @description Presentacional. Opciones de ECharts por panel, construidas solo a partir de los resultados de
 *   agregaciones.js. Los tooltips usan renderMode 'richText' (se dibujan en canvas), de modo que
 *   ningún texto de la hoja se interpreta como HTML.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { MESES_CORTOS, TEXTOS } from '../../../shared/textos.es.js';
import { numero, porcentaje } from '../../../shared/formato.js';

const tooltipBase = { renderMode: 'richText', confine: true };

/** Columnas del año de referencia y del anterior, con la línea de tendencia del año actual. */
export function opcionesEvolucion(evo, colores, mesResaltado) {
  const etiqueta = { show: true, position: 'top', fontSize: 10, distance: 3, color: colores.texto, formatter: (p) => (p.value ? numero(p.value) : '') };
  const conResalte = (valores, color) => valores.map((v, i) => ({
    value: v, itemStyle: { color, opacity: mesResaltado === null || mesResaltado === i ? 1 : 0.35 },
  }));
  return {
    animationDuration: 400,
    grid: { left: 8, right: 12, top: 36, bottom: 8, containLabel: true },
    legend: { top: 4, left: 8, itemWidth: 12, itemHeight: 12, textStyle: { color: colores.texto, fontSize: 12 } },
    tooltip: { ...tooltipBase, trigger: 'axis', valueFormatter: (v) => (v === null || v === undefined ? '—' : numero(v)) },
    xAxis: { type: 'category', data: MESES_CORTOS, axisLabel: { color: colores.texto, interval: 0, fontSize: 11 }, axisTick: { show: false }, axisLine: { lineStyle: { color: colores.rejilla } } },
    yAxis: { type: 'value', axisLabel: { color: colores.texto, formatter: (v) => numero(v) }, splitLine: { lineStyle: { color: colores.rejilla } } },
    series: [
      { name: evo.anioAnterior === null ? TEXTOS.anioAnterior : String(evo.anioAnterior), type: 'bar', barGap: '8%', itemStyle: { color: colores.verde }, data: conResalte(evo.anterior, colores.verde) },
      { name: evo.anio === null ? TEXTOS.anioActual : String(evo.anio), type: 'bar', itemStyle: { color: colores.lima }, data: conResalte(evo.actual, colores.lima), label: etiqueta },
      {
        name: TEXTOS.tendencia(evo.anio), type: 'line', data: evo.actual, smooth: true, symbolSize: 5, z: 1,
        lineStyle: { width: 2, color: colores.oliva }, itemStyle: { color: colores.oliva }, connectNulls: false,
      },
    ],
  };
}

/** Dona nacionales vs extranjeros con porcentaje en la etiqueta. */
export function opcionesDona(k, colores) {
  return {
    animationDuration: 400,
    tooltip: { ...tooltipBase, trigger: 'item', formatter: (p) => `${p.name}: ${numero(p.value)} (${porcentaje(p.percent / 100)})` },
    legend: { bottom: 4, left: 'center', itemWidth: 12, itemHeight: 12, itemGap: 18, textStyle: { color: colores.texto, fontSize: 13 } },
    series: [{
      type: 'pie', radius: ['50%', '76%'], center: ['50%', '45%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: colores.superficie, borderWidth: 2 },
      label: { position: 'inside', color: '#10250a', fontSize: 13, fontWeight: 'bold', formatter: (p) => (p.percent >= 4 ? porcentaje(p.percent / 100) : '') },
      data: [
        { name: TEXTOS.nacionales, value: k.nacionales, itemStyle: { color: colores.verde } },
        { name: TEXTOS.extranjeros, value: k.extranjeros, itemStyle: { color: colores.amarillo } },
      ],
    }],
  };
}

/** Barras horizontales por motivo, de mayor a menor (el mayor arriba). */
export function opcionesMotivo(lista, colores, seleccionado) {
  const invertida = [...lista].reverse();
  return {
    animationDuration: 400,
    grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
    tooltip: { ...tooltipBase, trigger: 'item', formatter: (p) => `${p.name}: ${numero(p.value)}` },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: invertida.map((m) => m.nombre), axisLabel: { color: colores.texto, fontSize: 12 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{
      type: 'bar', barMaxWidth: 34,
      data: invertida.map((m, i) => ({
        value: m.valor,
        itemStyle: { color: i % 2 ? colores.lima : colores.verdeClaro, borderRadius: [0, 4, 4, 0], opacity: !seleccionado || seleccionado === m.nombre ? 1 : 0.35 },
      })),
      label: { show: true, position: 'right', color: colores.texto, fontSize: 12, formatter: (p) => numero(p.value) },
    }],
  };
}

/** Barras agrupadas por rango de edad, una serie por género. */
export function opcionesEdadGenero(eg, colores, rangoSeleccionado) {
  const paleta = [colores.verde, colores.amarillo, colores.naranja, colores.magenta];
  return {
    animationDuration: 400,
    grid: { left: 8, right: 8, top: 36, bottom: 8, containLabel: true },
    legend: { top: 4, itemWidth: 12, itemHeight: 12, textStyle: { color: colores.texto, fontSize: 12 } },
    tooltip: { ...tooltipBase, trigger: 'axis', valueFormatter: (v) => numero(v) },
    xAxis: { type: 'category', data: eg.rangos, axisLabel: { color: colores.texto }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: colores.texto, formatter: (v) => numero(v) }, splitLine: { lineStyle: { color: colores.rejilla } } },
    series: eg.series.map((s, i) => ({
      name: s.genero, type: 'bar', barGap: '6%', itemStyle: { color: paleta[i % paleta.length] },
      data: s.valores.map((v, j) => ({ value: v, itemStyle: { color: paleta[i % paleta.length], opacity: !rangoSeleccionado || eg.rangos[j] === rangoSeleccionado ? 1 : 0.35 } })),
    })),
  };
}
