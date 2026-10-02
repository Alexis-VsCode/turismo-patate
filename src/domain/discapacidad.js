/**
 * @file discapacidad.js
 * @description Dominio. Personas con discapacidad: cada fila de la hoja trae cuántas personas con discapacidad hubo
 *   en ese mes, origen y motivo. El panel muestra el total, su porcentaje sobre los visitantes y cuántas filas
 *   caen en cada rango. Funciones puras; no se cruza con la edad ni con el género.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/** Rangos de personas con discapacidad por fila; el último es abierto. */
export const RANGOS_DISCAPACIDAD = Object.freeze(['1-5', '6-10', '11-15', '16+']);

/** Rango de una fila con `personas` personas con discapacidad (al menos una). */
export function rangoDeDiscapacidad(personas) {
  if (personas <= 5) return RANGOS_DISCAPACIDAD[0];
  if (personas <= 10) return RANGOS_DISCAPACIDAD[1];
  if (personas <= 15) return RANGOS_DISCAPACIDAD[2];
  return RANGOS_DISCAPACIDAD[3];
}

/**
 * Resumen del panel.
 * @param {Array<{ personas: number }>} registros filas de discapacidad ya filtradas
 * @param {number} totalVisitantes visitantes de la misma selección, sin filtrar por edad ni género
 * @returns {{ personas: number, registros: number, pctVisitantes: number|null,
 *   rangos: Array<{ rango: string, registros: number, pct: number|null }> }} `pct` es la parte de las filas con
 *   discapacidad que cae en ese rango; el rango 16+ solo se incluye si tiene filas
 */
export function resumenDiscapacidad(registros, totalVisitantes) {
  const personas = registros.reduce((suma, r) => suma + r.personas, 0);
  const porRango = new Map(RANGOS_DISCAPACIDAD.map((rango) => [rango, 0]));
  for (const r of registros) {
    const rango = rangoDeDiscapacidad(r.personas);
    porRango.set(rango, porRango.get(rango) + 1);
  }
  const visibles = RANGOS_DISCAPACIDAD.filter((rango, i) => i < RANGOS_DISCAPACIDAD.length - 1 || porRango.get(rango) > 0);
  return {
    personas,
    registros: registros.length,
    pctVisitantes: totalVisitantes ? personas / totalVisitantes : null,
    rangos: visibles.map((rango) => ({
      rango, registros: porRango.get(rango), pct: registros.length ? porRango.get(rango) / registros.length : null,
    })),
  };
}
