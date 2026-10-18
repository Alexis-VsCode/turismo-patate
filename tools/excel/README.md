# Generador del libro de captura

`generar-excel.py` crea el libro .xlsx donde los establecimientos de Patate registran sus visitantes por mes.

## Qué genera

- `_Inicio`: guía de uso. El dashboard no la lee.
- `_Catalogos`: listas de los desplegables (años, meses, motivos, países, ciudades, provincias). No está protegida: se agrega al final de cada lista.
- `Plantilla`: modelo vacío. Se duplica, no se llena.
- Una pestaña por establecimiento, con datos ficticios. Los datos reales viven solo en la hoja de Google; el repositorio no guarda ninguno.

Cada pestaña de captura tiene 600 filas con las mismas reglas:

- Desplegables: año, mes, país, ciudad y motivo.
- Enteros de 0 en adelante en las ocho columnas de mujeres y hombres por rango de edad.
- Personas con discapacidad: entero que no supera el total de la fila.
- Columnas grises con fórmula (Provincia, Total mujeres, Total hombres, Total visitantes, Nacionales, Extranjeros, Estado).
- La fila se pinta de rojo cuando Estado no es OK. Estado es una ayuda para quien llena la hoja: el dashboard no lee esa columna y aplica sus
  propias reglas (ver el [ciclo de una fila](../../docs/operacion.md#ciclo-de-una-fila)).

## Uso

```
python tools/excel/generar-excel.py --salida RUTA.xlsx                       # completo, 100 establecimientos
python tools/excel/generar-excel.py --modo fixture --salida RUTA.xlsx        # libro pequeño para pruebas
```

Requiere `xlsxwriter`. La prueba (requiere además `openpyxl`): `python test/excel/plantilla.test.py`.

## Qué protege

Cada pestaña de captura y la `Plantilla` salen con la hoja protegida y sin contraseña. Solo las celdas de entrada están desbloqueadas; encabezados y columnas grises quedan bloqueados. Se permite seleccionar celdas, ordenar, filtrar y cambiar el ancho de columnas.

Es protección contra errores, no contra mala fe: una contraseña en un código público no protegería nada, y cualquiera con permiso de edición puede quitar la protección.

## Agregar un establecimiento

1. Clic derecho sobre la pestaña `Plantilla` y Duplicar.
2. Renombre la copia con el nombre del local (es el que aparece en el dashboard).
3. Llene una fila por mes, origen y motivo.

En el archivo .xlsx, la copia hereda desplegables, validaciones, fórmulas, formato condicional y protección. En Google Sheets la protección no se
copia: la pone el activador de `proteger-hoja.gs` (ver abajo).

## Google Sheets

En Google Sheets la protección se maneja con `proteger-hoja.gs` (Apps Script, en esta misma carpeta), porque Google no conserva la protección del .xlsx y, al duplicar una pestaña, la copia hereda desplegables, fórmulas y formato, pero **no** la protección (comprobado en la hoja viva el 17/10/2026).

- `protegerColumnasGrises` deja cada pestaña de captura bloqueada salvo las celdas blancas de entrada. Las pestañas que empiezan con `_` no se tocan. Se puede ejecutar varias veces: salta las ya protegidas.
- `alAgregarPestana`, con un activador «Al producirse un cambio», protege sola cada pestaña nueva en cuanto se agrega (comprobado duplicando `Plantillas`).
- Solo el propietario de la hoja edita lo bloqueado. Las instrucciones de instalación están en la cabecera del script.
- Si alguien escribe a mano en las columnas Nacionales o Extranjeros y contradice el País, el lector del dashboard sigue usando el País y deja un
  aviso con la pestaña y la fila. La protección evita el error; el aviso lo detecta si llega a pasar.
