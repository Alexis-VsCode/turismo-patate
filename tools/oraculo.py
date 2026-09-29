"""Oráculo de conciliación: calcula con openpyxl, sin compartir código con el JS,
los valores que el dashboard debe mostrar en cada escenario de test/fixtures/escenarios.json.

Uso: python tools/oraculo.py test/fixtures/piloto-publicado.xlsx
Escribe test/fixtures/esperado.json.

Autor: Kevin Alexis Barrera Llerena 2026
"""
import json
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]
RANGOS = ["0-17", "18-25", "26-35", "36-45", "46-59", "60+"]


def sin_tildes(texto):
    return "".join(c for c in unicodedata.normalize("NFD", str(texto)) if unicodedata.category(c) != "Mn").strip().lower()


def rango(edad):
    for limite, nombre in [(18, "0-17"), (26, "18-25"), (36, "26-35"), (46, "36-45"), (60, "46-59")]:
        if edad < limite:
            return nombre
    return "60+"


def leer(ruta):
    libro = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    filas = []
    for nombre in libro.sheetnames:
        if nombre.startswith("_") or "plantilla" in sin_tildes(nombre):
            continue
        hoja = libro[nombre]
        iterador = hoja.iter_rows(values_only=True)
        encabezado = [sin_tildes(v or "") for v in next(iterador)]
        idx = {c: encabezado.index(c) for c in ["ano", "mes", "pais", "provincia", "ciudad", "cantidad", "motivo de visita", "edad", "genero"]}
        for r in iterador:
            if r is None or all(v is None or str(v).strip() == "" for v in r):
                continue
            nacional = sin_tildes(r[idx["pais"]]) == "ecuador"
            filas.append({
                "establecimiento": " ".join(nombre.split()),
                "anio": int(r[idx["ano"]]), "mes": MESES.index(sin_tildes(r[idx["mes"]])),
                "pais": str(r[idx["pais"]]).strip(), "nacional": nacional,
                "ciudad": str(r[idx["ciudad"]] or "").strip() if nacional else "",
                "provincia": str(r[idx["provincia"]] or "").strip() if nacional else "",
                "cantidad": int(r[idx["cantidad"]]), "motivo": str(r[idx["motivo de visita"]]).strip(),
                "rango": rango(int(r[idx["edad"]])), "genero": str(r[idx["genero"]]).strip(),
            })
    return filas


def cumple(f, filtros, ignorar=()):
    def activo(k):
        return k not in ignorar and filtros.get(k) not in (None, "")
    p = filtros.get("procedencia") or ""
    if activo("procedencia"):
        if p == "NAC" and not f["nacional"]: return False
        if p == "EXT" and f["nacional"]: return False
        if p.startswith("C:") and not (f["nacional"] and f["ciudad"] == p[2:]): return False
        if p.startswith("PR:") and not (f["nacional"] and f["provincia"] == p[3:]): return False
        if p.startswith("P:") and f["pais"] != p[2:]: return False
    return ((not activo("establecimiento") or f["establecimiento"] == filtros["establecimiento"]) and
            (not activo("anio") or f["anio"] == filtros["anio"]) and
            (not activo("mes") or f["mes"] == filtros["mes"]) and
            (not activo("motivo") or f["motivo"] == filtros["motivo"]) and
            (not activo("rangoEdad") or f["rango"] == filtros["rangoEdad"]) and
            (not activo("genero") or f["genero"] == filtros["genero"]))


def ordenado(sumas):
    return [{"nombre": k, "valor": v} for k, v in sorted(sumas.items(), key=lambda kv: (-kv[1], kv[0]))]


def suma_por(filas, clave):
    s = defaultdict(int)
    for f in filas:
        if clave(f):
            s[clave(f)] += f["cantidad"]
    return s


def escenario(filas, filtros):
    sel = [f for f in filas if cumple(f, filtros)]
    total = sum(f["cantidad"] for f in sel)
    nac = sum(f["cantidad"] for f in sel if f["nacional"])
    base_evo = [f for f in filas if cumple(f, filtros, ignorar=("anio", "mes"))]
    anio = filtros.get("anio") or max((f["anio"] for f in base_evo), default=None)
    actual, anterior = [0] * 12, [0] * 12
    for f in base_evo:
        if f["anio"] == anio: actual[f["mes"]] += f["cantidad"]
        if f["anio"] == (anio or 0) - 1: anterior[f["mes"]] += f["cantidad"]
    ultimo = max((f["mes"] for f in base_evo if f["anio"] == anio), default=-1)
    generos = ["Masculino", "Femenino"]
    eg = suma_por(sel, lambda f: f"{f['rango']}|{f['genero']}")
    return {
        "kpis": {"total": total, "nacionales": nac, "extranjeros": total - nac},
        "evolucion": {"anio": anio, "actual": [v if i <= ultimo else None for i, v in enumerate(actual)], "anterior": anterior},
        "porMotivo": ordenado(suma_por(sel, lambda f: f["motivo"])),
        "porCiudad": ordenado(suma_por([f for f in sel if f["nacional"]], lambda f: f["ciudad"])),
        "porProvincia": ordenado(suma_por([f for f in sel if f["nacional"]], lambda f: f["provincia"])),
        "porPais": ordenado(suma_por([f for f in sel if not f["nacional"]], lambda f: f["pais"])),
        "edadGenero": [{"genero": g, "valores": [eg.get(f"{r}|{g}", 0) for r in RANGOS]} for g in generos],
    }


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else str(RAIZ / "test/fixtures/piloto-publicado.xlsx")
    filas = leer(ruta)
    escenarios = json.loads((RAIZ / "test/fixtures/escenarios.json").read_text(encoding="utf-8"))
    salida = {e["nombre"]: escenario(filas, e["filtros"]) for e in escenarios}
    (RAIZ / "test/fixtures/esperado.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"filas={len(filas)} escenarios={len(salida)} " + " ".join(f"{k}:{v['kpis']['total']}" for k, v in salida.items()))


if __name__ == "__main__":
    main()
