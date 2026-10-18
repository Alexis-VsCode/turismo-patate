/**
 * Protege cada pestaña de captura: toda la hoja queda bloqueada salvo las celdas blancas de entrada
 * (filas 2 en adelante de las columnas que no son calculadas). Solo el propietario edita lo bloqueado.
 * Se puede ejecutar varias veces: salta las pestañas ya protegidas y limpia las protecciones viejas.
 *
 * Instalación (una sola vez, con la cuenta propietaria de la hoja):
 *   1. Extensiones > Apps Script, pegar este archivo y guardar.
 *   2. Ejecutar protegerColumnasGrises y aceptar el permiso de Google.
 *   3. Activadores > Añadir activador: función alAgregarPestana, fuente «De una hoja de cálculo»,
 *      evento «Al producirse un cambio». Desde entonces, cada pestaña nueva se protege sola.
 *
 * @author Kevin Alexis Barrera Llerena 2026
 */
function protegerColumnasGrises() {
  var GRISES = ['provincia', 'total mujeres', 'total hombres', 'total visitantes', 'nacionales', 'extranjeros', 'estado'];
  var libro = SpreadsheetApp.getActive();
  var propietario = Session.getEffectiveUser();
  var informe = [];
  var inicio = Date.now();
  libro.getSheets().forEach(function (hoja) {
    if (Date.now() - inicio > 300000) return;
    var nombre = hoja.getName();
    if (nombre.charAt(0) === '_') return;
    var ultima = hoja.getLastColumn();
    if (ultima < 1) return;
    hoja.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
      if (p.getDescription().indexOf('Dashboard:') === 0) p.remove();
    });
    var ya = hoja.getProtections(SpreadsheetApp.ProtectionType.SHEET).some(function (p) {
      return p.getDescription().indexOf('Dashboard:') === 0;
    });
    if (ya) { informe.push(nombre + ': ya protegida'); return; }
    var titulos = hoja.getRange(1, 1, 1, ultima).getValues()[0].map(function (t) {
      return String(t).replace(/\s+/g, ' ').trim().toLowerCase();
    });
    var libres = [];
    titulos.forEach(function (t, i) {
      if (t && GRISES.indexOf(t) < 0) libres.push(hoja.getRange(2, i + 1, hoja.getMaxRows() - 1, 1));
    });
    var p = hoja.protect().setDescription('Dashboard: solo se escriben las celdas blancas');
    p.setUnprotectedRanges(libres);
    p.removeEditors(p.getEditors());
    p.addEditor(propietario);
    if (p.canDomainEdit()) p.setDomainEdit(false);
    informe.push(nombre + ': protegida, ' + libres.length + ' columnas de entrada libres');
  });
  Logger.log(informe.length + ' pestañas revisadas\n' + informe.join('\n'));
}

/** Activador Al cambiar: protege cada pestaña nueva en cuanto se agrega. */
function alAgregarPestana(e) { if (e && e.changeType === 'INSERT_GRID') protegerColumnasGrises(); }
