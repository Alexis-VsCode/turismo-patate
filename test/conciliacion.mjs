/**
 * @file conciliacion.mjs
 * @description Utilidad de pruebas. Una sola conciliación de un escenario contra el oráculo independiente
 *   (tools/oraculo.py), la misma para el formato anterior y el mensual, leídos directo o después del paquete:
 *   kpis, evolución por mes, variación interanual, motivos, ciudades, provincias, países, edad y género y, cuando
 *   el formato la trae, discapacidad. Así ningún formato queda menos vigilado que otro.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './helpers.mjs';
import {
  kpis, anioDeReferencia, evolucionMensual, porMotivo, porCiudad, porProvincia, porPais, edadGenero, variacionInteranual,
} from '../src/domain/estadisticas.js';
import { filtrar, filtrosVacios } from '../src/domain/filtros.js';
import { resumenDiscapacidad } from '../src/domain/discapacidad.js';

/**
 * Lee un JSON de la carpeta del proyecto.
 * @param {string} ruta ruta relativa a la raíz, p. ej. 'test/fixtures/esperado.json'
 * @returns {any} contenido ya convertido a objeto
 */
export const leerJson = (ruta) => JSON.parse(readFileSync(join(RAIZ, ruta), 'utf8'));

/** Escenarios de filtros que concilian todas las pruebas: [{ nombre, filtros }]. */
export const ESCENARIOS = leerJson('test/fixtures/escenarios.json');

/**
 * Compara todo lo que el dashboard calcula para un escenario con lo que dice el oráculo; falla en el primer bloque
 * que no coincide y lo nombra.
 * @param {{ filas: object[], discapacidad: object[] }} datos resultado de leerLibro() o de desempaquetar()
 * @param {object} parciales filtros del escenario; lo que falta queda como en filtrosVacios()
 * @param {object} esperado entrada del oráculo para ese escenario
 * @param {{ conDiscapacidad?: boolean }} [opciones] con `conDiscapacidad` también concilia el panel de discapacidad
 */
export function conciliarEscenario(datos, parciales, esperado, { conDiscapacidad = false } = {}) {
  const filtros = { ...filtrosVacios(), ...parciales };
  const sel = filtrar(datos.filas, filtros);
  // Paso 1: cifras principales; con visitantes, los dos porcentajes suman el total
  const k = kpis(sel);
  assert.deepEqual({ total: k.total, nacionales: k.nacionales, extranjeros: k.extranjeros }, esperado.kpis, 'kpis');
  if (k.total) assert.ok(Math.abs(k.pctNacionales + k.pctExtranjeros - 1) < 1e-9, 'los porcentajes suman 1');

  // Paso 2: la evolución ignora año y mes elegidos, salvo para decidir el año de referencia
  const baseEvo = filtrar(datos.filas, filtros, ['anio', 'mes']);
  const evo = evolucionMensual(baseEvo, anioDeReferencia(baseEvo, filtros.anio));
  assert.equal(evo.anio, esperado.evolucion.anio, 'año de la evolución');
  assert.deepEqual(evo.actual, esperado.evolucion.actual, 'evolución del año');
  assert.deepEqual(evo.anterior, esperado.evolucion.anterior, 'evolución del año anterior');

  // Paso 3: la variación sale de los mismos totales que el oráculo y con su misma fórmula
  const v = variacionInteranual(datos.filas, filtros);
  const e = esperado.variacion;
  assert.deepEqual({ anio: v.anio, actual: v.actual, anterior: v.anterior }, e, 'variación interanual');
  assert.equal(v.variacion, e.anterior ? (e.actual - e.anterior) / e.anterior : null, 'fórmula de la variación');

  // Paso 4: repartos de los gráficos y del mapa
  assert.deepEqual(porMotivo(sel), esperado.porMotivo, 'porMotivo');
  assert.deepEqual(porCiudad(sel), esperado.porCiudad, 'porCiudad');
  assert.deepEqual(porProvincia(sel), esperado.porProvincia, 'porProvincia');
  assert.deepEqual(porPais(sel), esperado.porPais, 'porPais');
  assert.deepEqual(edadGenero(sel, ['Masculino', 'Femenino']).series, esperado.edadGenero, 'edadGenero');
  if (!conDiscapacidad) return;

  // Paso 5: la discapacidad no se cruza con edad ni género, y su porcentaje es sobre los visitantes de la misma selección
  assert.ok(esperado.discapacidad, 'el oráculo de este formato no trae discapacidad');
  const sinPerfil = ['rangoEdad', 'genero'];
  const visitantes = kpis(filtrar(datos.filas, filtros, sinPerfil)).total;
  const d = resumenDiscapacidad(filtrar(datos.discapacidad, filtros, sinPerfil), visitantes);
  assert.equal(d.personas, esperado.discapacidad.personas, 'personas con discapacidad');
  assert.equal(d.registros, esperado.discapacidad.registros, 'registros de discapacidad');
  assert.equal(d.pctVisitantes, esperado.discapacidad.pctVisitantes, 'discapacidad sobre visitantes');
  for (const [rango, registros] of Object.entries(esperado.discapacidad.rangos)) {
    assert.equal(d.rangos.find((r) => r.rango === rango)?.registros ?? 0, registros, `rango de discapacidad ${rango}`);
  }
}
