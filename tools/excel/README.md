# Generador del libro de captura

`generar-excel.py` crea el libro .xlsx donde los establecimientos de Patate registran sus visitantes por mes.

## Qué genera

- `_Inicio`: guía de uso. El tablero no la lee.
- `_Catalogos`: listas de los desplegables (años, meses, motivos, países, ciudades, provincias). No está protegida: se agrega al final de cada lista.
- `Plantilla`: modelo vacío. Se duplica, no se llena.
- Una pestaña por establecimiento, con datos de ejemplo.

Cada pestaña de captura tiene 600 filas con las mismas reglas:

- Desplegables: año, mes, país, ciudad y motivo.
- Enteros de 0 en adelante en las ocho columnas de mujeres y hombres por rango de edad.
- Personas con discapacidad: entero que no supera el total de la fila.
- Columnas grises con fórmula (Provincia, Total mujeres, Total hombres, Total visitantes, Nacionales, Extranjeros, Estado).
- La fila se pinta de rojo cuando Estado no es OK.

## Uso

```
python tools/excel/generar-excel.py --salida RUTA.xlsx                       # completo, 100 establecimientos
python tools/excel/generar-excel.py --modo fixture --salida RUTA.xlsx        # libro pequeño para pruebas
python tools/excel/generar-excel.py --salida RUTA.xlsx --sin-hojas-peggy     # sin las cinco hojas de Peggy
```

Requiere `xlsxwriter`. La prueba (requiere además `openpyxl`): `python test/excel/plantilla.test.py`.

## Qué protege

Cada pestaña de captura y la `Plantilla` salen con la hoja protegida y sin contraseña. Solo las celdas de entrada están desbloqueadas; encabezados y columnas grises quedan bloqueados. Se permite seleccionar celdas, ordenar, filtrar y cambiar el ancho de columnas.

Es protección contra errores, no contra mala fe: una contraseña en un código público no protegería nada, y cualquiera con permiso de edición puede quitar la protección.

## Agregar un establecimiento

1. Clic derecho sobre la pestaña `Plantilla` y Duplicar.
2. Renombre la copia con el nombre del local (es el que aparece en el tablero).
3. Llene una fila por mes, origen y motivo.

La copia hereda desplegables, validaciones, fórmulas, formato condicional y protección.

## Google Sheets

Al importar o abrir el .xlsx en Google Sheets, verifique la protección: Datos > Proteger hojas y rangos. Google convierte la protección de hoja a su propio modelo y puede no conservarla, o conservarla sin excepciones para las celdas de entrada. Si falta, proteja cada hoja y marque como excepción las columnas de entrada (A, B, C, E, F, G a N y O), o proteja solo las columnas grises (D y P a U) y el encabezado. Repita la revisión en la `Plantilla` antes de duplicarla.
