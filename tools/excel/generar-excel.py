"""Genera el libro de captura del tablero en el formato mensual.

Cada pestaña de establecimiento tiene una fila por mes, origen y motivo: el establecimiento escribe mujeres y
hombres por rango de edad (8 números) y las personas con discapacidad; la hoja calcula los totales y marca en rojo
lo que no cuadra. Los catálogos salen de tools/catalogos/ (cantones y países completos). Con --modo fixture arma un
libro pequeño para las pruebas.

Uso:
    python tools/excel/generar-excel.py --salida RUTA.xlsx                      # libro completo, 100 establecimientos
    python tools/excel/generar-excel.py --modo fixture --salida test/fixtures/piloto-mensual.xlsx

Autor: Kevin Alexis Barrera Llerena 2026
"""
import argparse
import csv
import json
import random
import unicodedata
from pathlib import Path

import xlsxwriter

RAIZ = Path(__file__).resolve().parent.parent.parent
CATALOGOS = RAIZ / "tools" / "catalogos"
FILAS_FORMULA = 600          # filas con fórmulas y controles en cada pestaña
FILA_FINAL_LISTAS = 1000     # las listas del catálogo aceptan agregados hasta esta fila
MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
         "Septiembre", "Octubre", "Noviembre", "Diciembre"]
RANGOS = ["0-30", "31-45", "46-60", "61+"]
ENCABEZADOS = (["Año", "Mes", "País", "Provincia", "Ciudad", "Motivo de visita"]
               + [f"Mujeres {r}" for r in RANGOS] + [f"Hombres {r}" for r in RANGOS]
               + ["Personas con discapacidad", "Total mujeres", "Total hombres", "Total visitantes",
                  "Nacionales", "Extranjeros", "Estado"])
ENCABEZADOS_ANTERIOR = ["Año", "Mes", "País", "Provincia", "Ciudad", "Cantidad", "Motivo de visita", "Edad", "Género"]
MOTIVOS = ["Turismo", "Gastronomía", "Descanso", "Visita familiar", "Evento", "Negocios", "Ocio"]
GENEROS = ["Masculino", "Femenino", "Otro"]
ANIOS = [2025, 2026, 2027]
PESO_MOTIVO = {"Turismo": 34, "Gastronomía": 21, "Descanso": 19, "Visita familiar": 12, "Evento": 8, "Negocios": 5, "Ocio": 1}
CIUDADES_FRECUENTES = {"Ambato": 8, "Quito": 8, "Riobamba": 5, "Baños": 5, "Latacunga": 5, "Guayaquil": 5, "Cuenca": 3,
                       "Pelileo": 4, "Salcedo": 2, "Puyo": 2, "Ibarra": 2, "Loja": 2, "Manta": 2, "Machala": 1, "Tena": 1}
PAISES_FRECUENTES = {"Colombia": 10, "Perú": 6, "Estados Unidos": 8, "España": 6, "Alemania": 4, "Argentina": 4,
                     "Francia": 3, "Reino Unido": 3, "Chile": 3, "México": 3, "Canadá": 2, "Brasil": 2, "Italia": 2}
PESO_RANGO = [0.30, 0.35, 0.25, 0.10]
# Temporadas del turismo en la sierra: carnaval, vacaciones de agosto y fin de año; 2026 crece un poco contra 2025
ESTACIONALIDAD = {"Enero": 1.05, "Febrero": 1.25, "Marzo": 0.9, "Abril": 0.95, "Mayo": 0.85, "Junio": 0.95, "Julio": 1.2,
                  "Agosto": 1.4, "Septiembre": 1.0, "Octubre": 0.9, "Noviembre": 1.0, "Diciembre": 1.3}
CRECIMIENTO = {2025: 1.0, 2026: 1.08, 2027: 1.15}
# Lo mínimo para operar en una hoja protegida: seleccionar, ordenar, filtrar y ajustar el ancho de columnas
PERMISOS_HOJA = {"select_locked_cells": True, "select_unlocked_cells": True, "sort": True, "autofilter": True, "format_columns": True}
MES_FINAL = (2026, 9)        # los datos de ejemplo van de enero de 2025 a este mes, en los dos modos


def sin_tildes(texto):
    return "".join(c for c in unicodedata.normalize("NFD", str(texto)) if unicodedata.category(c) != "Mn").strip().lower()


def leer_csv(nombre):
    with open(CATALOGOS / nombre, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def cargar_catalogos():
    ciudades = leer_csv("ciudades-ecuador.csv")
    paises = leer_csv("paises.csv")
    provincias = leer_csv("provincias.csv")
    return ciudades, paises, provincias


# ---------------------------------------------------------------- datos de ejemplo
def elegir_ponderado(rng, pesos):
    nombres = list(pesos)
    return rng.choices(nombres, weights=[pesos[n] for n in nombres])[0]


def generar_filas(rng, escala, meses, ciudades, paises, filas_por_mes):
    """Filas de un establecimiento: (anio, mes, pais, ciudad, motivo, [8 conteos], discapacidad)."""
    ciudades_peso = {c: p for c, p in CIUDADES_FRECUENTES.items() if c in ciudades}
    paises_peso = {c: p for c, p in PAISES_FRECUENTES.items() if c in paises}
    filas = []
    for anio, mes in meses:
        factor = ESTACIONALIDAD[mes] * CRECIMIENTO[anio]
        vistos = set()
        cuantas = max(2, round(rng.gauss(filas_por_mes, 1.5)))
        for _ in range(cuantas):
            if rng.random() < 0.62:
                pais, ciudad = "Ecuador", (elegir_ponderado(rng, ciudades_peso) if rng.random() < 0.85 else rng.choice(sorted(ciudades)))
            else:
                pais, ciudad = (elegir_ponderado(rng, paises_peso) if rng.random() < 0.85 else rng.choice(sorted(paises))), ""
            motivo = elegir_ponderado(rng, PESO_MOTIVO)
            if (pais, ciudad, motivo) in vistos:
                continue
            vistos.add((pais, ciudad, motivo))
            total = max(1, int(rng.gauss(14 * escala * factor, 6 * escala)))
            conteos = [0] * 8
            for _ in range(total):
                sexo = 0 if rng.random() < 0.51 else 4
                conteos[sexo + rng.choices(range(4), weights=PESO_RANGO)[0]] += 1
            discapacidad = None
            if rng.random() < 0.11:
                discapacidad = min(total, rng.choice([1, 1, 1, 2, 2, 3, 4, 5, 6, 8, 11]))
            filas.append((anio, mes, pais, ciudad, motivo, conteos, discapacidad))
    return filas


# ---------------------------------------------------------------- libro
class Formatos:
    def __init__(self, libro):
        base = {"font_name": "Calibri", "font_size": 11, "valign": "vcenter"}
        encabezado = {**base, "bold": True, "font_color": "#FFFFFF", "align": "center", "text_wrap": True, "border": 1, "border_color": "#FFFFFF"}
        self.verde = libro.add_format({**encabezado, "bg_color": "#1A7A32"})
        self.verde_oscuro = libro.add_format({**encabezado, "bg_color": "#14532B"})
        self.mujeres = libro.add_format({**encabezado, "bg_color": "#2F8F46"})
        self.hombres = libro.add_format({**encabezado, "bg_color": "#8A6D00"})
        self.gris_enc = libro.add_format({**encabezado, "bg_color": "#6B7A6B"})
        self.lima = libro.add_format({**encabezado, "bg_color": "#6B8F2A"})
        # Celdas de entrada: desbloqueadas, para que la protección de la hoja solo deje escribir aquí
        self.dato = libro.add_format({**base, "border": 1, "border_color": "#D5DDD0", "locked": False})
        self.numero = libro.add_format({**base, "border": 1, "border_color": "#D5DDD0", "num_format": "0", "align": "center", "locked": False})
        self.calculado = libro.add_format({**base, "border": 1, "border_color": "#D5DDD0", "bg_color": "#EEF0EC", "font_color": "#4A5A4A", "align": "center"})
        self.calculado_texto = libro.add_format({**base, "border": 1, "border_color": "#D5DDD0", "bg_color": "#EEF0EC", "font_color": "#4A5A4A"})
        self.rojo = libro.add_format({"bg_color": "#FBD5D0", "font_color": "#8A1C10"})
        self.titulo = libro.add_format({**base, "bold": True, "font_size": 20, "font_color": "#FFFFFF", "bg_color": "#14532B"})
        self.subtitulo = libro.add_format({**base, "font_size": 12, "font_color": "#FFFFFF", "bg_color": "#1A7A32"})
        self.seccion = libro.add_format({**base, "bold": True, "font_size": 13, "font_color": "#14532B", "bottom": 2, "bottom_color": "#1A7A32"})
        self.texto = libro.add_format({**base, "text_wrap": True, "valign": "top"})
        self.negrita = libro.add_format({**base, "bold": True, "text_wrap": True, "valign": "top"})
        self.celda_tabla = libro.add_format({**base, "text_wrap": True, "valign": "top", "border": 1, "border_color": "#D5DDD0"})
        self.encabezado_tabla = libro.add_format({**encabezado, "bg_color": "#1A7A32", "align": "left"})


def formulas_fila(f):
    """Fórmulas de la fila `f` (base 1) de una pestaña de establecimiento, en el orden D, P..U."""
    return {
        "D": f'=IF(E{f}="","",IFERROR(VLOOKUP(E{f},\'_Catalogos\'!$J$2:$K${FILA_FINAL_LISTAS},2,FALSE),""))',
        "P": f'=IF(COUNT(G{f}:O{f})=0,"",SUM(G{f}:J{f}))',
        "Q": f'=IF(COUNT(G{f}:O{f})=0,"",SUM(K{f}:N{f}))',
        "R": f'=IF(P{f}="","",P{f}+Q{f})',
        "S": f'=IF(R{f}="","",IF(C{f}="Ecuador",R{f},0))',
        "T": f'=IF(R{f}="","",R{f}-S{f})',
        "U": (f'=IF(R{f}="","",IF(O{f}>R{f},"Revisar: discapacidad "&O{f}&" mayor que el total "&R{f},'
              f'IF(OR(A{f}="",B{f}="",C{f}="",F{f}=""),"Falta año, mes, país o motivo",'
              f'IF(AND(C{f}="Ecuador",E{f}=""),"Falta la ciudad","OK"))))'),
    }


def hoja_establecimiento(libro, fmt, nombre, filas, provincia_de, vacia=False):
    hoja = libro.add_worksheet(nombre)
    hoja.freeze_panes(1, 0)
    hoja.set_row(0, 34)
    estilos = [fmt.verde] * 6 + [fmt.mujeres] * 4 + [fmt.hombres] * 4 + [fmt.verde, fmt.gris_enc, fmt.gris_enc, fmt.gris_enc, fmt.gris_enc, fmt.gris_enc, fmt.gris_enc]
    for c, (texto, estilo) in enumerate(zip(ENCABEZADOS, estilos)):
        hoja.write(0, c, texto, estilo)
    hoja.set_column("A:A", 7)
    hoja.set_column("B:B", 12)
    hoja.set_column("C:C", 16)
    hoja.set_column("D:D", 14)
    hoja.set_column("E:E", 18)
    hoja.set_column("F:F", 16)
    hoja.set_column("G:N", 9)
    hoja.set_column("O:O", 14)
    hoja.set_column("P:T", 11)
    hoja.set_column("U:U", 38)
    for i in range(FILAS_FORMULA - 1):
        r = i + 2                      # fila de la hoja (base 1)
        fila = filas[i] if (not vacia and i < len(filas)) else None
        valores = {}
        if fila:
            anio, mes, pais, ciudad, motivo, conteos, disc = fila
            mujeres, hombres = sum(conteos[:4]), sum(conteos[4:])
            total = mujeres + hombres
            nac = total if pais == "Ecuador" else 0
            estado = "OK" if (disc or 0) <= total else f"Revisar: discapacidad {disc} mayor que el total {total}"
            hoja.write(i + 1, 0, anio, fmt.numero)
            hoja.write(i + 1, 1, mes, fmt.dato)
            hoja.write(i + 1, 2, pais, fmt.dato)
            hoja.write(i + 1, 4, ciudad, fmt.dato)
            hoja.write(i + 1, 5, motivo, fmt.dato)
            for k, n in enumerate(conteos):
                hoja.write(i + 1, 6 + k, n if n else None, fmt.numero)
            hoja.write(i + 1, 14, disc, fmt.numero)
            valores = {"D": provincia_de.get(ciudad, "") if pais == "Ecuador" else "", "P": mujeres, "Q": hombres,
                       "R": total, "S": nac, "T": total - nac, "U": estado}
        else:
            for c in (0, 1, 2, 4, 5):
                hoja.write_blank(i + 1, c, None, fmt.dato)
            for c in range(6, 15):
                hoja.write_blank(i + 1, c, None, fmt.numero)
        for col, formula in formulas_fila(r).items():
            estilo = fmt.calculado_texto if col in ("D", "U") else fmt.calculado
            hoja.write_formula(f"{col}{r}", formula, estilo, valores.get(col, ""))
    ultima = FILAS_FORMULA
    lista = lambda col, hasta: f"='_Catalogos'!${col}$2:${col}${hasta}"
    hoja.data_validation(f"A2:A{ultima}", {"validate": "list", "source": lista("A", FILA_FINAL_LISTAS), "error_title": "Año", "error_message": "Elija un año de la lista."})
    hoja.data_validation(f"B2:B{ultima}", {"validate": "list", "source": lista("B", 13), "error_title": "Mes", "error_message": "Elija un mes de la lista."})
    hoja.data_validation(f"C2:C{ultima}", {"validate": "list", "source": lista("F", FILA_FINAL_LISTAS), "error_title": "País", "error_message": "Elija un país de la lista."})
    hoja.data_validation(f"E2:E{ultima}", {"validate": "list", "source": lista("J", FILA_FINAL_LISTAS), "error_title": "Ciudad", "error_message": "Elija una ciudad de la lista. Para extranjeros, deje la ciudad vacía."})
    hoja.data_validation(f"F2:F{ultima}", {"validate": "list", "source": lista("C", FILA_FINAL_LISTAS), "error_title": "Motivo", "error_message": "Elija un motivo de la lista."})
    hoja.data_validation(f"G2:N{ultima}", {"validate": "integer", "criteria": "between", "minimum": 0, "maximum": 100000,
                                           "error_title": "Número no válido", "error_message": "Escriba un número entero de 0 en adelante. Deje vacío si no hubo."})
    hoja.data_validation(f"O2:O{ultima}", {"validate": "custom", "value": "=AND(ISNUMBER(O2),O2>=0,O2=INT(O2),O2<=SUM(G2:N2))",
                                           "error_title": "Personas con discapacidad",
                                           "error_message": "Escriba un número entero que no supere el total de visitantes de la fila. Llene primero las columnas de mujeres y hombres."})
    hoja.conditional_format(f"A2:U{ultima}", {"type": "formula", "criteria": '=AND($U2<>"",$U2<>"OK")', "format": fmt.rojo})
    # Protección contra errores, no contra mala fe: sin contraseña (en un repositorio público no protegería nada).
    # Quedan bloqueados encabezados y columnas grises; solo se escriben las celdas de entrada.
    hoja.protect("", PERMISOS_HOJA)
    return hoja


def hoja_anterior(libro, fmt, nombre, rng, provincia_de):
    """Pestaña de ejemplo en el formato anterior: una fila por grupo de visitantes con edad y género."""
    hoja = libro.add_worksheet(nombre)
    hoja.freeze_panes(1, 0)
    for c, texto in enumerate(ENCABEZADOS_ANTERIOR):
        hoja.write(0, c, texto, fmt.verde)
    hoja.set_column("A:I", 15)
    for i in range(24):
        anio, mes = 2026, MESES[i % 9]
        nacional = rng.random() < 0.6
        ciudad = rng.choice(["Ambato", "Quito", "Riobamba", "Baños"]) if nacional else ""
        pais = "Ecuador" if nacional else rng.choice(["Colombia", "Perú", "España", "Estados Unidos"])
        fila = [anio, mes, pais, provincia_de.get(ciudad, ""), ciudad, rng.randint(1, 6), rng.choice(["Turismo", "Gastronomía", "Descanso"]),
                rng.randint(12, 70), rng.choice(["Masculino", "Femenino"])]
        for c, v in enumerate(fila):
            hoja.write(i + 1, c, v if v != "" else None, fmt.dato)
    return hoja


def hoja_catalogos(libro, fmt, ciudades, paises, provincias):
    hoja = libro.add_worksheet("_Catalogos")
    hoja.freeze_panes(1, 0)
    bloques = [
        (0, ["Año", "Mes", "Motivo", "Género"], fmt.verde_oscuro),
        (5, ["País", "Pais_Lat", "Pais_Lon"], fmt.verde),
        (9, ["Ciudad", "Ciudad_Provincia", "Ciudad_Lat", "Ciudad_Lon"], fmt.lima),
        (14, ["Provincia", "Provincia_Lat", "Provincia_Lon"], fmt.hombres),
    ]
    for inicio, titulos, estilo in bloques:
        for k, t in enumerate(titulos):
            hoja.write(0, inicio + k, t, estilo)
    for i, a in enumerate(ANIOS):
        hoja.write(i + 1, 0, a)
    for i, m in enumerate(MESES):
        hoja.write(i + 1, 1, m)
    for i, m in enumerate(MOTIVOS):
        hoja.write(i + 1, 2, m)
    for i, g in enumerate(GENEROS):
        hoja.write(i + 1, 3, g)
    for i, p in enumerate(paises):
        hoja.write(i + 1, 5, p["País"])
        hoja.write_number(i + 1, 6, float(p["Pais_Lat"]))
        hoja.write_number(i + 1, 7, float(p["Pais_Lon"]))
    for i, c in enumerate(ciudades):
        hoja.write(i + 1, 9, c["Ciudad"])
        hoja.write(i + 1, 10, c["Ciudad_Provincia"])
        hoja.write_number(i + 1, 11, float(c["Ciudad_Lat"]))
        hoja.write_number(i + 1, 12, float(c["Ciudad_Lon"]))
    for i, p in enumerate(provincias):
        hoja.write(i + 1, 14, p["Provincia"])
        hoja.write_number(i + 1, 15, float(p["Provincia_Lat"]))
        hoja.write_number(i + 1, 16, float(p["Provincia_Lon"]))
    hoja.set_column("A:A", 8)
    hoja.set_column("B:C", 16)
    hoja.set_column("D:D", 12)
    hoja.set_column("E:E", 3)
    hoja.set_column("F:F", 26)
    hoja.set_column("G:H", 11)
    hoja.set_column("I:I", 3)
    hoja.set_column("J:J", 28)
    hoja.set_column("K:K", 24)
    hoja.set_column("L:M", 11)
    hoja.set_column("N:N", 3)
    hoja.set_column("O:O", 26)
    hoja.set_column("P:Q", 13)
    for col in "ACDFJO":
        hoja.data_validation(f"{col}2:{col}{FILA_FINAL_LISTAS}", {
            "validate": "custom", "value": f"=COUNTIF(${col}$2:${col}${FILA_FINAL_LISTAS},{col}2)=1",
            "error_title": "Repetido", "error_message": "Ese nombre ya existe en la lista."})
        hoja.conditional_format(f"{col}2:{col}{FILA_FINAL_LISTAS}", {
            "type": "formula", "criteria": f'=AND({col}2<>"",COUNTIF(${col}$2:${col}${FILA_FINAL_LISTAS},{col}2)>1)', "format": fmt.rojo})
    hoja.data_validation(f"K2:K{FILA_FINAL_LISTAS}", {"validate": "list", "source": f"=$O$2:$O${FILA_FINAL_LISTAS}", "error_message": "Elija una provincia de la lista."})
    for col, lo, hi in (("G", -90, 90), ("L", -90, 90), ("P", -90, 90), ("H", -180, 180), ("M", -180, 180), ("Q", -180, 180)):
        hoja.data_validation(f"{col}2:{col}{FILA_FINAL_LISTAS}", {"validate": "decimal", "criteria": "between", "minimum": lo, "maximum": hi,
                                                                 "error_message": f"Escriba un número entre {lo} y {hi}."})
    return hoja


def escribir_inicio(hoja, fmt, resumen):
    hoja.hide_gridlines(2)
    hoja.set_column("A:A", 3)
    hoja.set_column("B:B", 34)
    hoja.set_column("C:C", 70)
    hoja.set_column("D:D", 22)
    hoja.set_row(0, 34)
    hoja.merge_range("B1:D1", "Registro de visitantes, cantón Patate", fmt.titulo)
    hoja.merge_range("B2:D2", "Cada establecimiento anota aquí sus visitantes por mes. El tablero se actualiza solo, cada pocos minutos.", fmt.subtitulo)
    fila = 3
    hoja.merge_range(fila, 1, fila, 3, "Cómo agregar un establecimiento", fmt.seccion)
    pasos = [
        ("1. Duplique la pestaña Plantilla", "Clic derecho sobre la pestaña Plantilla y elija Duplicar."),
        ("2. Renombre la copia", "Use el nombre del local. Ese nombre es el que aparece en el tablero."),
        ("3. Llene una fila por mes, origen y motivo", "Escriba el año, el mes, el país, la ciudad (solo si es Ecuador) y el motivo. Luego escriba cuántas mujeres y cuántos hombres hubo en cada rango de edad."),
        ("4. Espere unos minutos", "El establecimiento aparece solo en el tablero."),
    ]
    for t, d in pasos:
        fila += 1
        hoja.write(fila, 1, t, fmt.celda_tabla)
        hoja.merge_range(fila, 2, fila, 3, d, fmt.celda_tabla)
        hoja.set_row(fila, 32)
    fila += 2
    hoja.merge_range(fila, 1, fila, 3, "Qué escribe usted y qué calcula la hoja", fmt.seccion)
    cols = [
        ("Año, Mes, País, Ciudad, Motivo", "Con la lista desplegable. Para extranjeros deje la ciudad vacía."),
        ("Mujeres y Hombres por rango de edad", "Ocho números enteros: 0-30, 31-45, 46-60 y 61 o más años. Si no hubo, déjelo vacío o escriba 0."),
        ("Personas con discapacidad", "Cuántas de esas personas tenían alguna discapacidad. No puede superar el total de visitantes de la fila."),
        ("Columnas grises", "Provincia, Total mujeres, Total hombres, Total visitantes, Nacionales, Extranjeros y Estado las calcula la hoja: no se escriben."),
        ("Estado", "Dice OK cuando la fila está bien. Si no, la fila se pinta de rojo y explica qué corregir. El tablero deja fuera la fila a la que le falta año, mes, país o motivo, o cuya discapacidad supera el total, y la muestra en su panel de problemas."),
    ]
    for t, d in cols:
        fila += 1
        hoja.write(fila, 1, t, fmt.celda_tabla)
        hoja.merge_range(fila, 2, fila, 3, d, fmt.celda_tabla)
        hoja.set_row(fila, 32)
    fila += 2
    hoja.merge_range(fila, 1, fila, 3, "Qué es cada pestaña", fmt.seccion)
    fila += 1
    for c, t in enumerate(["Pestaña", "Para qué sirve", "¿Se edita?"]):
        hoja.write(fila, 1 + c, t, fmt.encabezado_tabla)
    pestanas = [
        ("_Inicio", "Esta guía. El tablero no la lee.", "No"),
        ("_Catalogos", "Las opciones de los desplegables, en cuatro bloques: Listas, Países, Ciudades y Provincias. Agregue al final de cada bloque. Para ordenar, seleccione el bloque completo (Datos > Ordenar rango).", "Solo al final de cada lista"),
        ("Plantilla", "Modelo vacío con los desplegables y las fórmulas. Se duplica, no se llena.", "No"),
        ("Las demás", "Un establecimiento cada una.", "Sí, cada local la suya"),
    ]
    for t, d, e in pestanas:
        fila += 1
        hoja.write(fila, 1, t, fmt.celda_tabla)
        hoja.write(fila, 2, d, fmt.celda_tabla)
        hoja.write(fila, 3, e, fmt.celda_tabla)
        hoja.set_row(fila, 46 if t == "_Catalogos" else 20)
    fila += 2
    hoja.merge_range(fila, 1, fila, 3, "Reglas", fmt.seccion)
    reglas = [
        "No cambie ni mueva los encabezados de las columnas.",
        "Use siempre los desplegables. Extranjeros: deje vacía la ciudad.",
        "No escriba datos personales: ni nombres, ni cédulas, ni teléfonos. La discapacidad se publica solo como cifra agregada.",
        "Las columnas grises y los encabezados vienen bloqueados (hoja protegida sin contraseña, contra errores). Si al importar a Google Sheets la protección no se conserva, vuelva a aplicarla: Datos > Proteger hojas y rangos.",
        "Las pestañas que todavía usan el formato anterior (Cantidad, Edad y Género) siguen funcionando. No mezcle los dos formatos en una misma pestaña.",
    ]
    for t in reglas:
        fila += 1
        hoja.merge_range(fila, 1, fila, 3, "• " + t, fmt.texto)
        hoja.set_row(fila, 32)
    if resumen:
        fila += 2
        hoja.merge_range(fila, 1, fila, 3, "Datos de ejemplo", fmt.seccion)
        for t in resumen:
            fila += 1
            hoja.merge_range(fila, 1, fila, 3, "• " + t, fmt.texto)
            hoja.set_row(fila, 32)
    return hoja


def construir(salida, modo, semilla):
    rng = random.Random(semilla)
    ciudades, paises, provincias = cargar_catalogos()
    provincia_de = {c["Ciudad"]: c["Ciudad_Provincia"] for c in ciudades}
    nombres_ciudad = set(provincia_de)
    nombres_pais = {p["País"] for p in paises}
    base = json.loads((RAIZ / "tools" / "excel" / "establecimientos-base.json").read_text(encoding="utf-8"))["establecimientos"]
    if modo == "fixture":
        base, filas_por_mes = base[:14], 3
    else:
        filas_por_mes = 8
    meses = [(a, MESES[m]) for a in (2025, 2026) for m in range(12) if (a, m + 1) <= MES_FINAL]
    promedio = sum(b["visitantes"] for b in base) / len(base)

    libro = xlsxwriter.Workbook(str(salida), {"strings_to_numbers": False})
    fmt = Formatos(libro)
    resumen = []
    # El orden de pestañas importa: _Inicio, _Catalogos, Plantilla y luego los establecimientos
    inicio = libro.add_worksheet("_Inicio")     # se escribe al final, cuando ya se conocen las cifras de los datos de ejemplo
    hoja_catalogos(libro, fmt, ciudades, paises, provincias)
    hoja_establecimiento(libro, fmt, "Plantilla", [], provincia_de, vacia=True)
    total_filas, usados = 0, set()
    for b in base:
        nombre = b["nombre"]
        usados.add(sin_tildes(nombre))
        escala = max(0.5, min(2.5, b["visitantes"] / promedio))
        filas = generar_filas(rng, escala, meses, nombres_ciudad, nombres_pais, filas_por_mes)
        total_filas += len(filas)
        hoja_establecimiento(libro, fmt, nombre, filas, provincia_de)
    if modo != "fixture":
        hoja_anterior(libro, fmt, "Ejemplo (formato anterior)", rng, provincia_de)
        resumen.insert(0, "«Ejemplo (formato anterior)» muestra una pestaña con Cantidad, Edad y Género, que sigue funcionando.")
        resumen.insert(1, "Los establecimientos tienen datos ficticios de enero de 2025 a septiembre de 2026.")
    escribir_inicio(inicio, fmt, resumen)
    libro.close()
    return {"establecimientos": len(usados), "filas": total_filas, "resumen": resumen}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--salida", required=True)
    ap.add_argument("--modo", choices=["completo", "fixture"], default="completo")
    ap.add_argument("--semilla", type=int, default=20261001)
    a = ap.parse_args()
    informe = construir(Path(a.salida), a.modo, a.semilla)
    print(json.dumps(informe, ensure_ascii=False))


if __name__ == "__main__":
    main()
