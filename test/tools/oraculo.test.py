"""Prueba del oráculo de conciliación: una fila vacía o recortada de la hoja se salta, igual que en el lector JS.

Google Sheets publica el xlsx sin la dimensión de cada pestaña, así openpyxl en modo de solo lectura entrega las
filas vacías como listas vacías y las cortas recortadas. El libro de la prueba se arma con datos ficticios en un
directorio temporal y se le quita la dimensión para reproducir ese caso.

Uso:
    python test/tools/oraculo.test.py

Autor: Kevin Alexis Barrera Llerena 2026
"""
import importlib.util
import re
import tempfile
import unittest
import zipfile
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent.parent
ENC_MENSUAL = ["Año", "Mes", "País", "Provincia", "Ciudad", "Motivo de visita",
               "Mujeres 0-30", "Mujeres 31-45", "Mujeres 46-60", "Mujeres 61+",
               "Hombres 0-30", "Hombres 31-45", "Hombres 46-60", "Hombres 61+", "Personas con discapacidad"]
ENC_ANTERIOR = ["Año", "Mes", "País", "Provincia", "Ciudad", "Cantidad", "Motivo de visita", "Edad", "Género"]


def cargar_oraculo():
    """Módulo tools/oraculo.py cargado por ruta, porque tools/ no es un paquete."""
    spec = importlib.util.spec_from_file_location("oraculo", RAIZ / "tools" / "oraculo.py")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def libro_sin_dimension(ruta, pestanas):
    """Escribe un libro con las pestañas dadas y le quita la etiqueta de dimensión, como lo publica Google."""
    libro = openpyxl.Workbook()
    libro.remove(libro.active)
    for nombre, filas in pestanas.items():
        hoja = libro.create_sheet(nombre)
        for fila in filas:
            hoja.append(fila)
    crudo = ruta.with_suffix(".crudo.xlsx")
    libro.save(crudo)
    with zipfile.ZipFile(crudo) as origen, zipfile.ZipFile(ruta, "w") as destino:
        for item in origen.infolist():
            datos = origen.read(item.filename)
            if item.filename.startswith("xl/worksheets/"):
                datos = re.sub(rb"<dimension[^>]*/>", b"", datos)
            destino.writestr(item, datos)


class OraculoFilasVacias(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ruta = Path(self.tmp.name) / "libro.xlsx"
        self.oraculo = cargar_oraculo()

    def tearDown(self):
        self.tmp.cleanup()

    def test_salta_la_fila_vacia_del_formato_mensual_sin_caerse(self):
        libro_sin_dimension(self.ruta, {"Hostal Ficticio": [
            ENC_MENSUAL,
            [2026, "Marzo", "Ecuador", None, "Ambato", "Turismo", 1, 0, 0, 0, 0, 0, 0, 0, 0],
            [],
            [2026, "Abril", "Colombia", None, None, "Turismo", 2],
        ]})
        filas, discapacidad = self.oraculo.leer(str(self.ruta))
        self.assertEqual([(f["mes"], f["cantidad"]) for f in filas], [(2, 1), (3, 2)])
        self.assertEqual(discapacidad, [])

    def test_salta_la_fila_vacia_del_formato_anterior_sin_caerse(self):
        libro_sin_dimension(self.ruta, {"Hostal Antiguo": [
            ENC_ANTERIOR,
            [2026, "Marzo", "Ecuador", None, "Ambato", 3, "Turismo", 30, "Femenino"],
            [],
            [2026, "Abril", "Perú", None, None, 2, "Turismo", 40, "Masculino"],
        ]})
        filas, _ = self.oraculo.leer(str(self.ruta))
        self.assertEqual([(f["pais"], f["cantidad"]) for f in filas], [("Ecuador", 3), ("Perú", 2)])


if __name__ == "__main__":
    unittest.main()
