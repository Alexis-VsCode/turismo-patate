/**
 * @file select-seguro.js
 * @description Componente compartido. Llena un <select> con opciones y grupos creando nodos,
 *   nunca interpretando marcado: los textos pueden venir de la hoja.
 * @author Kevin Alexis Barrera Llerena 2026
 */

/**
 * Reemplaza las opciones de un <select>. `opciones` = [{ valor, texto, grupo? }].
 * Conserva el valor actual si sigue existiendo; si no, vuelve a la primera opción.
 */
export function llenarSelect(select, opciones, valorActual) {
  // Paso 1: vaciar nodo por nodo, sin reinterpretar marcado
  while (select.firstChild) select.removeChild(select.firstChild);
  // Paso 2: agrupar respetando el orden recibido
  const grupos = new Map();
  for (const o of opciones) {
    const opcion = document.createElement('option');
    opcion.value = o.valor;
    opcion.textContent = o.texto;
    if (!o.grupo) {
      select.appendChild(opcion);
      continue;
    }
    if (!grupos.has(o.grupo)) {
      const grupo = document.createElement('optgroup');
      grupo.label = o.grupo;
      grupos.set(o.grupo, grupo);
      select.appendChild(grupo);
    }
    grupos.get(o.grupo).appendChild(opcion);
  }
  // Paso 3: restaurar la selección
  const existe = opciones.some((o) => o.valor === valorActual);
  select.value = existe ? valorActual : (opciones[0] ? opciones[0].valor : '');
}
