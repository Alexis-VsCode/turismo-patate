#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generador de catalogos de ciudades de Ecuador, paises y provincias.

Que hace
    1. Lee la foto del catalogo actual (base-actual-2026-10-01.json), sin red.
    2. Descarga los limites de cantones (geoBoundaries ADM2) y calcula, para cada
       canton, un PUNTO REPRESENTATIVO DENTRO DEL POLIGONO (python puro: ray casting
       con huecos y malla; se elige el punto interior cercano al centroide que
       ademas se aleja del borde). Nunca se usa un centroide sin comprobar.
    3. Asigna la provincia por contencion del punto en los poligonos ADM1 de
       assets/ecu-provincias.geojson (si cae fuera, usa el poligono mas cercano y
       lo reporta).
    4. Normaliza el nombre del canton a su forma comun en espanol y lo contrasta con
       GeoNames (solo contraste: nunca sobrescribe).
    5. Une con el catalogo actual SIN quitar ni renombrar nada: solo se agrega lo
       que falta. Las unidades que no son cantones se excluyen con motivo.
    6. Toma los paises de mledoze/countries: los miembros de la ONU mas los
       territorios que ya estaban en el catalogo actual; un pais actual que no
       aparezca alli se conserva igual.
    7. Escribe ciudades-ecuador.csv, paises.csv y provincias.csv (UTF-8 con BOM,
       coma, orden alfabetico espanol) y verifica los invariantes.

Uso
    python tools/catalogos/generar-catalogos.py                 # genera todo
    python tools/catalogos/generar-catalogos.py --crear-foto    # (re)crea la foto base desde la hoja
    Solo biblioteca estandar; las descargas grandes se guardan en tools/catalogos/_cache/
    (la foto base solo se crea con --crear-foto y ese modo requiere openpyxl).

Autor: Kevin Alexis Barrera Llerena 2026
"""
import argparse
import csv
import io
import json
import math
import re
import sys
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
CACHE = AQUI / "_cache"
FOTO = AQUI / "base-actual-2026-10-01.json"
PROVINCIAS_GEOJSON = RAIZ / "assets" / "ecu-provincias.geojson"

URL_HOJA = ("https://docs.google.com/spreadsheets/d/1n_zCs2SVH5wchDu6IbUQ2Yeb4rhRNtBkIRrtI2w8wQY/"
            "export?format=xlsx")
URL_ADM2_API = "https://www.geoboundaries.org/api/current/gbOpen/ECU/ADM2/"
URL_PAISES = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
URL_GEONAMES = "https://download.geonames.org/export/dump/EC.zip"
UA = {"User-Agent": "Mozilla/5.0"}

LAT_MIN, LAT_MAX, LON_MIN, LON_MAX = -5.1, 1.5, -92.0, -75.0

# --------------------------------------------------------------------------------------
# Tablas de nombres (solo nombres; las coordenadas jamas se escriben a mano)
# --------------------------------------------------------------------------------------

# Unidades de geoBoundaries ADM2 que NO son cantones (zonas no delimitadas).
NO_CANTONES = {
    "Las Golondrinas": "zona no delimitada (no es canton)",
    "El Piedrero": "zona no delimitada (no es canton)",
}

# Nombre ADM2 (sin tildes y con abreviaturas) -> forma comun en espanol.
NOMBRE_COMUN = {
    "Alausi": "Alausí", "Biblian": "Biblián", "Camilo Ponce Enriquez": "Camilo Ponce Enríquez",
    "Centinela del Condor": "Centinela del Cóndor",
    "Crnel. Marcelino Maridueña": "Coronel Marcelino Maridueña",
    "Gnral. Antonio Elizalde": "General Antonio Elizalde",
    "Duran": "Durán", "Echeandia": "Echeandía", "Espindola": "Espíndola", "Giron": "Girón",
    "Gonzanama": "Gonzanamá", "Junin": "Junín", "La Mana": "La Maná", "Limon Indanza": "Limón Indanza",
    "Macara": "Macará", "Marcabeli": "Marcabelí", "Mejia": "Mejía", "Montufar": "Montúfar",
    "Nabon": "Nabón", "Pajan": "Paján", "Pucara": "Pucará", "Puerto Lopez": "Puerto López",
    "Pujili": "Pujilí", "Quininde": "Quinindé", "Samborondon": "Samborondón",
    "San Cristobal": "San Cristóbal", "Santa Lucia": "Santa Lucía", "Saquisili": "Saquisilí",
    "Simon Bolivar": "Simón Bolívar", "Sucua": "Sucúa", "Sucumbios": "Sucumbíos",
    "Tulcan": "Tulcán", "Cumanda": "Cumandá", "Jaramijo": "Jaramijó", "Bolivar": "Bolívar",
    "Empalme": "El Empalme",
    "San Miguel de Los Bancos": "San Miguel de los Bancos",
    # Nombre oficial largo -> nombre comun del canton
    "San Miguel de Urcuqui": "Urcuquí", "San Pedro de Pelileo": "Pelileo",
    "San Jacinto de Yaguachi": "Yaguachi", "Santiago de Pillaro": "Píllaro",
    "San Pedro de Huaca": "Huaca",
}

# Ciudad ya presente en el catalogo actual -> canton que representa (cabecera con otro nombre).
# Se verifica por provincia; si no coincide se avisa.
CABECERA_DE = {
    "Atuntaqui": "Antonio Ante", "Puyo": "Pastaza", "Francisco de Orellana (Coca)": "Orellana",
    "Macas": "Morona", "Sangolquí": "Rumiñahui", "Machachi": "Mejía",
    "Santiago de Méndez": "Santiago", "Cariamanga": "Calvas", "Baeza": "Quijos",
    "Puerto Baquerizo Moreno": "San Cristóbal", "Puerto Ayora": "Santa Cruz",
    "Puerto Villamil": "Isabela", "San Gabriel": "Montúfar", "El Ángel": "Espejo",
    "Tabacundo": "Pedro Moncayo", "Bahía de Caráquez": "Sucre", "Zumba": "Chinchipe",
}

# Alias de paises actuales (nombre del catalogo -> nombre en mledoze) cuando difieren.
ALIAS_PAIS = {}


# --------------------------------------------------------------------------------------
# Utilidades de texto
# --------------------------------------------------------------------------------------
def sin_tildes(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def clave(s):
    """claveNormalizada: minusculas, sin acentos, espacios simples."""
    return re.sub(r"\s+", " ", sin_tildes(str(s)).lower()).strip()


def clave_orden(s):
    """Regla de comparacion espanola: la enie va despues de la n."""
    t = unicodedata.normalize("NFC", str(s)).lower().replace("ñ", "n{")
    return sin_tildes(t)


def sin_espacios(s):
    return clave(s).replace(" ", "").replace("-", "")


# --------------------------------------------------------------------------------------
# Descargas con cache
# --------------------------------------------------------------------------------------
def descargar(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def con_cache(nombre, url):
    CACHE.mkdir(exist_ok=True)
    f = CACHE / nombre
    if not f.exists():
        print("  descargando", url)
        f.write_bytes(descargar(url))
    return f.read_bytes()


# --------------------------------------------------------------------------------------
# Foto base (hoja en linea)
# --------------------------------------------------------------------------------------
def crear_foto():
    import openpyxl  # solo para este modo
    datos = descargar(URL_HOJA)
    ws = openpyxl.load_workbook(io.BytesIO(datos), data_only=True)["_Catalogos"]
    filas = list(ws.iter_rows(values_only=True))
    enc = list(filas[0])

    def bloque(cols):
        idx = [enc.index(c) for c in cols]
        salida = []
        for f in filas[1:]:
            if f[idx[0]] in (None, ""):
                continue
            salida.append({c: (f[i] if not isinstance(f[i], str) else f[i].strip()) for c, i in zip(cols, idx)})
        return salida

    foto = {
        "fuente": "Hoja _Catalogos de " + URL_HOJA.split("/export")[0],
        "fecha": "2026-10-01",
        "paises": bloque(["País", "Pais_Lat", "Pais_Lon"]),
        "ciudades": bloque(["Ciudad", "Ciudad_Provincia", "Ciudad_Lat", "Ciudad_Lon"]),
        "provincias": bloque(["Provincia", "Provincia_Lat", "Provincia_Lon"]),
    }
    FOTO.write_text(json.dumps(foto, ensure_ascii=False, indent=1), encoding="utf-8")
    print("Foto base escrita:", FOTO, {k: len(v) for k, v in foto.items() if isinstance(v, list)})


# --------------------------------------------------------------------------------------
# Geometria en python puro (x = longitud, y = latitud)
# --------------------------------------------------------------------------------------
def a_partes(geom):
    """Devuelve lista de poligonos; cada poligono = [anillo_exterior, hueco, ...]."""
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    raise ValueError(geom["type"])


def area_anillo(r):
    s = 0.0
    for i in range(len(r) - 1):
        s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    return s / 2.0


def area_poligono(p):
    return abs(area_anillo(p[0])) - sum(abs(area_anillo(h)) for h in p[1:])


def centroide_anillo(r):
    a = area_anillo(r)
    if abs(a) < 1e-14:
        n = len(r)
        return sum(p[0] for p in r) / n, sum(p[1] for p in r) / n
    cx = cy = 0.0
    for i in range(len(r) - 1):
        f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
        cx += (r[i][0] + r[i + 1][0]) * f
        cy += (r[i][1] + r[i + 1][1]) * f
    return cx / (6 * a), cy / (6 * a)


def en_anillo(x, y, r):
    dentro = False
    n = len(r)
    j = n - 1
    for i in range(n):
        xi, yi = r[i][0], r[i][1]
        xj, yj = r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            dentro = not dentro
        j = i
    return dentro


def en_poligono(x, y, p):
    if not en_anillo(x, y, p[0]):
        return False
    return not any(en_anillo(x, y, h) for h in p[1:])


def dist_segmento(x, y, a, b):
    ax, ay, bx, by = a[0], a[1], b[0], b[1]
    dx, dy = bx - ax, by - ay
    d2 = dx * dx + dy * dy
    t = 0.0 if d2 == 0 else max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / d2))
    px, py = ax + t * dx, ay + t * dy
    return math.hypot(x - px, y - py)


def dist_borde(x, y, p):
    m = float("inf")
    for r in p:
        for i in range(len(r) - 1):
            d = dist_segmento(x, y, r[i], r[i + 1])
            if d < m:
                m = d
    return m


def decimar(r, maximo=700):
    if len(r) <= maximo:
        return r
    paso = math.ceil(len(r) / maximo)
    s = r[::paso]
    if s[-1] != s[0]:
        s = s + [s[0]]
    return s


def punto_interior(geom):
    """Punto dentro del poligono (parte mas grande), cercano al centroide y alejado del borde.

    Devuelve (lon, lat, metodo). Lanza ValueError si no encuentra ninguno (no se inventa).
    """
    partes = a_partes(geom)
    p = max(partes, key=area_poligono)
    cx, cy = centroide_anillo(p[0])
    simple = [decimar(r) for r in p]
    xs = [q[0] for q in p[0]]
    ys = [q[1] for q in p[0]]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)

    for n in (30, 60, 120, 240):
        cands = []
        for i in range(n):
            x = x0 + (i + 0.5) * (x1 - x0) / n
            for j in range(n):
                y = y0 + (j + 0.5) * (y1 - y0) / n
                if en_poligono(x, y, simple):
                    cands.append((x, y))
        if not cands:
            continue
        # el centroide exacto tambien es candidato si cae dentro
        if en_poligono(cx, cy, simple):
            cands.append((cx, cy))
        con_margen = [(dist_borde(x, y, simple), x, y) for x, y in cands]
        mx = max(m for m, _, _ in con_margen)
        buenos = [(math.hypot(x - cx, y - cy), x, y) for m, x, y in con_margen if m >= 0.5 * mx]
        buenos.sort()
        for _, x, y in buenos[:25]:
            if en_poligono(x, y, p):  # verificacion con la geometria completa
                met = "centroide" if (x, y) == (cx, cy) else "malla"
                return x, y, met
    raise ValueError("no se hallo punto interior")


# --------------------------------------------------------------------------------------
# GeoNames (solo contraste)
# --------------------------------------------------------------------------------------
def cargar_geonames():
    z = zipfile.ZipFile(io.BytesIO(con_cache("EC.zip", URL_GEONAMES)))
    ppla2, amplio, ppla2_filas = {}, set(), []
    for linea in z.read("EC.txt").decode("utf-8").splitlines():
        c = linea.split("\t")
        if len(c) < 11:
            continue
        for n in [c[1], c[2]] + c[3].split(","):
            if n:
                amplio.add(clave(n))
                amplio.add(sin_espacios(n))
        if c[7] == "PPLA2":
            fila = (c[1], float(c[4]), float(c[5]), c[10])
            ppla2.setdefault(clave(c[1]), []).append(fila)
            ppla2_filas.append(fila)
    return ppla2, amplio, ppla2_filas


# --------------------------------------------------------------------------------------
# Ciudades
# --------------------------------------------------------------------------------------
def construir_ciudades(foto, informe):
    prov_names = {clave(p["Provincia"]): p["Provincia"] for p in foto["provincias"]}

    # Provincias ADM1 (nombres del geojson -> nombre del catalogo)
    gj = json.loads(PROVINCIAS_GEOJSON.read_text(encoding="utf-8"))
    adm1 = []
    for f in gj["features"]:
        nom = f["properties"]["nombre"]
        nombre_cat = prov_names.get(clave(nom))
        if not nombre_cat:
            informe["advertencias"].append("ADM1 sin equivalente en catalogo: " + nom)
            continue
        adm1.append((nombre_cat, a_partes(f["geometry"])))

    def provincia_de(x, y):
        for nombre, partes in adm1:
            if any(en_poligono(x, y, p) for p in partes):
                return nombre, False
        mejor, md = None, 1e9
        for nombre, partes in adm1:
            d = min(dist_borde(x, y, p) for p in partes)
            if d < md:
                mejor, md = nombre, d
        return mejor, True

    adm2 = json.loads(_adm2_bytes().decode("utf-8"))
    informe["adm2_total"] = len(adm2["features"])

    ppla2, amplio, ppla2_filas = cargar_geonames()
    # Codigo admin1 de GeoNames -> provincia (derivado del propio catalogo actual)
    cod_prov = {}
    for c in foto["ciudades"]:
        for g in ppla2.get(clave(c["Ciudad"]), []):
            cod_prov.setdefault(g[3], {}).setdefault(c["Ciudad_Provincia"], 0)
            cod_prov[g[3]][c["Ciudad_Provincia"]] += 1
    cod_prov = {k: max(v, key=v.get) for k, v in cod_prov.items()}

    actuales = foto["ciudades"]
    clave_actual = {clave(c["Ciudad"]): c for c in actuales}
    cabecera_clave = {}  # clave del canton -> ciudad actual que lo representa
    for ciudad, canton in CABECERA_DE.items():
        if clave(ciudad) in clave_actual:
            cabecera_clave[clave(canton)] = clave_actual[clave(ciudad)]

    cantones = []
    for f in adm2["features"]:
        bruto = f["properties"]["shapeName"].strip()
        if bruto in NO_CANTONES:
            informe["excluidas"].append((bruto, NO_CANTONES[bruto]))
            continue
        nombre = NOMBRE_COMUN.get(bruto, bruto)
        x, y, met = punto_interior(f["geometry"])
        prov, fuera = provincia_de(x, y)
        if fuera:
            informe["punto_fuera_provincia"].append((nombre, round(y, 4), round(x, 4), prov))
        cantones.append({"bruto": bruto, "nombre": nombre, "lat": round(y, 4), "lon": round(x, 4),
                         "prov": prov, "metodo": met})

    # Contraste con GeoNames (sin sobrescribir)
    for c in cantones:
        k = clave(c["nombre"])
        if k in ppla2:
            c["gn"] = "PPLA2"
        elif k in amplio or sin_espacios(c["nombre"]) in amplio:
            c["gn"] = "otro"
        else:
            c["gn"] = "sin"
            informe["sin_coincidencia_geonames"].append(c["nombre"])
        # provincia por codigo admin1 de GeoNames (solo si el nombre no es homonimo)
        g = ppla2.get(k, [])
        if len(g) == 1 and g[0][3] in cod_prov and cod_prov[g[0][3]] != c["prov"]:
            informe["prov_distinta_geonames"].append((c["nombre"], c["prov"], cod_prov[g[0][3]]))
        if len(g) == 1:
            d = math.hypot(g[0][1] - c["lat"], g[0][2] - c["lon"])
            if d > 0.5:
                informe["lejos_geonames"].append((c["nombre"], round(d, 2)))

    # Homonimos entre cantones y con nombres de provincia
    conteo = {}
    for c in cantones:
        conteo[clave(c["nombre"])] = conteo.get(clave(c["nombre"]), 0) + 1

    filas = [dict(Ciudad=c["Ciudad"], Ciudad_Provincia=c["Ciudad_Provincia"], Ciudad_Lat=c["Ciudad_Lat"],
                  Ciudad_Lon=c["Ciudad_Lon"], Origen="actual") for c in actuales]
    usadas = {clave(c["Ciudad"]) for c in actuales}
    for c in cantones:
        k = clave(c["nombre"])
        previo = clave_actual.get(k) or cabecera_clave.get(k)
        if previo:
            informe["cubiertos"].append((c["nombre"], previo["Ciudad"], c["prov"], previo["Ciudad_Provincia"]))
            if clave(previo["Ciudad_Provincia"]) != clave(c["prov"]):
                informe["dudosos"].append("%s: canton en %s pero la ciudad existente '%s' esta en %s"
                                          % (c["nombre"], c["prov"], previo["Ciudad"], previo["Ciudad_Provincia"]))
            continue
        nombre = c["nombre"]
        if conteo[k] > 1:
            nombre = "%s (%s)" % (nombre, c["prov"])
            informe["homonimos"].append((c["nombre"], nombre))
        elif k in prov_names:
            nombre = "%s (%s)" % (nombre, "cantón" if clave(prov_names[k]) == clave(c["prov"]) else c["prov"])
            informe["homonimos"].append((c["nombre"], nombre))
        elif k in clave_actual:  # no ocurre (cubierto arriba), por seguridad
            nombre = "%s (%s)" % (nombre, c["prov"])
        if clave(nombre) in usadas:
            raise SystemExit("Duplicado inesperado: " + nombre)
        usadas.add(clave(nombre))
        filas.append(dict(Ciudad=nombre, Ciudad_Provincia=c["prov"], Ciudad_Lat=c["lat"], Ciudad_Lon=c["lon"],
                          Origen="geoBoundaries ADM2"))
    informe["cantones_validos"] = len(cantones)
    informe["metodo_punto"] = {m: sum(1 for c in cantones if c["metodo"] == m) for m in ("centroide", "malla")}
    return filas


def _adm2_bytes():
    meta = json.loads(con_cache("adm2-meta.json", URL_ADM2_API).decode("utf-8"))
    return con_cache("adm2.geojson", meta["gjDownloadURL"])


# --------------------------------------------------------------------------------------
# Paises
# --------------------------------------------------------------------------------------
def construir_paises(foto, informe):
    datos = json.loads(con_cache("countries.json", URL_PAISES).decode("utf-8"))

    def claves(c):
        s = {clave(c["translations"]["spa"]["common"]), clave(c["translations"]["spa"]["official"]),
             clave(c["name"]["common"])}
        return s

    por_clave = {}
    for c in datos:
        for k in claves(c):
            por_clave.setdefault(k, c)
    actuales = foto["paises"]
    filas = [dict(**{"País": p["País"]}, Pais_Lat=p["Pais_Lat"], Pais_Lon=p["Pais_Lon"], Origen="actual") for p in actuales]
    cubiertos = set()
    for p in actuales:
        k = clave(ALIAS_PAIS.get(p["País"], p["País"]))
        c = por_clave.get(k)
        if c:
            cubiertos.add(c["cca2"])
        else:
            informe["paises_actuales_sin_mledoze"].append(p["País"])
    nuevos = 0
    for c in datos:
        if not c.get("unMember") or c["cca2"] in cubiertos:
            continue
        nombre = c["translations"]["spa"]["common"]
        if not c.get("latlng") or len(c["latlng"]) < 2:
            informe["advertencias"].append("pais sin latlng: " + nombre)
            continue
        if clave(nombre) in {clave(f["País"]) for f in filas}:
            informe["advertencias"].append("pais ya presente por nombre: " + nombre)
            continue
        filas.append(dict(**{"País": nombre}, Pais_Lat=c["latlng"][0], Pais_Lon=c["latlng"][1], Origen="mledoze/countries"))
        nuevos += 1
    informe["paises_nuevos"] = nuevos
    informe["miembros_onu"] = sum(1 for c in datos if c.get("unMember"))
    informe["_cubiertos_onu"] = len([1 for c in datos if c.get("unMember") and c["cca2"] in cubiertos])
    return filas


# --------------------------------------------------------------------------------------
# Salida y verificacion
# --------------------------------------------------------------------------------------
def escribir_csv(ruta, columnas, filas, campo_orden):
    filas = sorted(filas, key=lambda f: clave_orden(f[campo_orden]))
    with open(ruta, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=",", lineterminator="\n")
        w.writerow(columnas)
        for f in filas:
            w.writerow([f[c] for c in columnas])
    return filas


def verificar(foto, ciudades, paises, provincias, informe):
    errores = []
    # 1) Ninguna fila actual cambio
    def igual(a, b):
        return str(a) == str(b)
    for c in foto["ciudades"]:
        m = [f for f in ciudades if f["Ciudad"] == c["Ciudad"]]
        if len(m) != 1 or not (igual(m[0]["Ciudad_Lat"], c["Ciudad_Lat"]) and igual(m[0]["Ciudad_Lon"], c["Ciudad_Lon"])
                               and m[0]["Ciudad_Provincia"] == c["Ciudad_Provincia"] and m[0]["Origen"] == "actual"):
            errores.append("ciudad actual alterada: " + c["Ciudad"])
    for p in foto["paises"]:
        m = [f for f in paises if f["País"] == p["País"]]
        if len(m) != 1 or not (igual(m[0]["Pais_Lat"], p["Pais_Lat"]) and igual(m[0]["Pais_Lon"], p["Pais_Lon"])):
            errores.append("pais actual alterado: " + p["País"])
    for p in foto["provincias"]:
        m = [f for f in provincias if f["Provincia"] == p["Provincia"]]
        if len(m) != 1 or not (igual(m[0]["Provincia_Lat"], p["Provincia_Lat"])
                               and igual(m[0]["Provincia_Lon"], p["Provincia_Lon"])):
            errores.append("provincia alterada: " + p["Provincia"])
    # 2) Limites y duplicados
    for f in ciudades:
        if not (LAT_MIN <= float(f["Ciudad_Lat"]) <= LAT_MAX and LON_MIN <= float(f["Ciudad_Lon"]) <= LON_MAX):
            errores.append("fuera de limites: %s" % f["Ciudad"])
    for nombre, filas, campo in (("ciudades", ciudades, "Ciudad"), ("paises", paises, "País")):
        vistos = {}
        for f in filas:
            k = clave(f[campo])
            if k in vistos:
                errores.append("duplicado en %s: %s / %s" % (nombre, vistos[k], f[campo]))
            vistos[k] = f[campo]
    prov_validas = {p["Provincia"] for p in provincias}
    for f in ciudades:
        if f["Ciudad_Provincia"] not in prov_validas:
            errores.append("provincia desconocida: %s -> %s" % (f["Ciudad"], f["Ciudad_Provincia"]))
    return errores


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--crear-foto", action="store_true", help="(re)crea la foto base desde la hoja en linea")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    if args.crear_foto:
        crear_foto()
        return 0
    if not FOTO.exists():
        raise SystemExit("Falta %s; ejecute con --crear-foto" % FOTO)
    foto = json.loads(FOTO.read_text(encoding="utf-8"))

    informe = {k: [] for k in ("advertencias", "excluidas", "punto_fuera_provincia", "sin_coincidencia_geonames",
                               "prov_distinta_geonames", "lejos_geonames", "cubiertos", "dudosos", "homonimos",
                               "paises_actuales_sin_mledoze")}
    ciudades = construir_ciudades(foto, informe)
    paises = construir_paises(foto, informe)
    provincias = [dict(Provincia=p["Provincia"], Provincia_Lat=p["Provincia_Lat"], Provincia_Lon=p["Provincia_Lon"])
                  for p in foto["provincias"]]

    errores = verificar(foto, ciudades, paises, provincias, informe)
    ciudades = escribir_csv(AQUI / "ciudades-ecuador.csv",
                            ["Ciudad", "Ciudad_Provincia", "Ciudad_Lat", "Ciudad_Lon", "Origen"], ciudades, "Ciudad")
    paises = escribir_csv(AQUI / "paises.csv", ["País", "Pais_Lat", "Pais_Lon", "Origen"], paises, "País")
    provincias = escribir_csv(AQUI / "provincias.csv", ["Provincia", "Provincia_Lat", "Provincia_Lon"],
                              provincias, "Provincia")

    print("=== RESUMEN ===")
    print("ADM2 total en la fuente:", informe["adm2_total"], "| excluidas:", informe["excluidas"])
    print("Cantones validos:", informe["cantones_validos"], "| metodo del punto:", informe["metodo_punto"])
    print("Ciudades finales:", len(ciudades), "(actuales %d + nuevas %d)" % (
        len(foto["ciudades"]), len(ciudades) - len(foto["ciudades"])))
    print("Cantones cubiertos por ciudad actual:", len(informe["cubiertos"]))
    print("Paises finales:", len(paises), "| nuevos:", informe["paises_nuevos"],
          "| miembros ONU en fuente:", informe["miembros_onu"], "| ONU cubiertos por actuales:",
          informe["_cubiertos_onu"])
    print("Provincias:", len(provincias))
    for k in ("punto_fuera_provincia", "homonimos", "dudosos", "sin_coincidencia_geonames",
              "prov_distinta_geonames", "lejos_geonames", "paises_actuales_sin_mledoze", "advertencias"):
        print("--", k, len(informe[k]))
        for v in informe[k]:
            print("   ", v)
    print("-- cubiertos (canton, ciudad actual, prov canton, prov ciudad)")
    for v in informe["cubiertos"]:
        print("   ", v)
    print("=== VERIFICACION ===")
    if errores:
        for e in errores:
            print("ERROR:", e)
        return 1
    print("OK: filas actuales intactas, sin duplicados, dentro de limites.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
