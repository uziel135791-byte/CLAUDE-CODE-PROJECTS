"""Las carpetas convertidas en un mapa que se puede buscar.

Cada archivo es una nota (un punto del mapa). Cada [[enlace]] es una línea.
No abre archivos por su cuenta: todo lo lee a través de data.py (solo lectura).
Uso directo para ver qué encontró:  python3 agent/vault.py
"""
import math
import os
import re
import unicodedata
import zipfile
import zlib
from collections import Counter, defaultdict
from io import BytesIO

import data

ENLACE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]")

VACIAS = set("""
a al algo algun alguna alguno ante antes aqui asi aun bien cada como con contra cual cuales
cuando cuanto de del desde donde dos el ella ellas ellos en entre era es esa ese eso esta este
esto estos estas fue ha hay hasta hoy la las le les lo los mas me mi mis mucho muy nada ni no
nos nuestra nuestro o otra otro para pero poco por porque que quien se sea segun ser si sin
sobre son su sus tambien tan te tengo tiene tu tus un una uno unos unas y ya yo
dame dime decir digo dice quiero puedes podes favor cual cuál sabes hay tenemos tengo
the of and to in for on with is are what
hola buenas buenos dias tardes noches gracias tal oye mira bueno vale ok okay jarvis
escuchas opinas piensas crees por favor entonces ahi eso esto pues
""".split())


def normalizar(texto):
    t = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def palabras(texto):
    return [w for w in re.findall(r"[a-z0-9]+", normalizar(texto)) if w not in VACIAS and len(w) > 1]


# ---------------------------------------------------------------------------
# Extracción de texto (solo librería estándar)
# ---------------------------------------------------------------------------
def texto_pdf(crudo):
    """Texto de un PDF sencillo. Devuelve '' si no hay texto legible (escaneado, fuentes CID…)."""
    trozos = []
    for m in re.finditer(rb"<<(.*?)>>\s*stream\r?\n", crudo, re.S):
        dic = m.group(1)
        if b"/Image" in dic or b"/ObjStm" in dic or b"/XRef" in dic or b"/FontFile" in dic:
            continue
        inicio = m.end()
        fin = crudo.find(b"endstream", inicio)
        if fin < 0:
            continue
        flujo = crudo[inicio:fin]
        if b"/FlateDecode" in dic:
            try:
                flujo = zlib.decompressobj().decompress(flujo)
            except zlib.error:
                continue
        elif b"/Filter" in dic:
            continue
        for bloque in re.findall(rb"BT(.*?)ET", flujo, re.S):
            linea = []
            for s in re.finditer(rb"\((?:\\.|[^\\)])*\)|T\*|Td|TD|'|\"", bloque):
                tok = s.group(0)
                if tok.startswith(b"("):
                    linea.append(_literal_pdf(tok[1:-1]))
                elif linea:
                    trozos.append("".join(linea))
                    linea = []
            if linea:
                trozos.append("".join(linea))
    texto = "\n".join(t for t in trozos if t.strip())
    letras = sum(c.isalpha() for c in texto)
    return texto if letras >= 20 else ""


def _literal_pdf(b):
    salida = bytearray()
    i = 0
    escapes = {ord("n"): 10, ord("r"): 13, ord("t"): 9, ord("b"): 8, ord("f"): 12}
    while i < len(b):
        c = b[i]
        if c == 0x5C and i + 1 < len(b):           # barra invertida
            n = b[i + 1]
            if n in escapes:
                salida.append(escapes[n]); i += 2
            elif 0x30 <= n <= 0x37:
                oct_ = re.match(rb"[0-7]{1,3}", b[i + 1:i + 4]).group(0)
                salida.append(int(oct_, 8) & 0xFF); i += 1 + len(oct_)
            else:
                salida.append(n); i += 2
        else:
            salida.append(c); i += 1
    return salida.decode("latin-1")


def texto_docx(crudo):
    with zipfile.ZipFile(BytesIO(crudo)) as z:
        xml = z.read("word/document.xml").decode("utf-8", "replace")
    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"<w:tab/>", "\t", xml)
    partes = re.findall(r"<w:t[^>]*>([^<]*)</w:t>|(\n)", xml)
    return _desescapar_xml("".join(a or b for a, b in partes))


def texto_xlsx(crudo):
    with zipfile.ZipFile(BytesIO(crudo)) as z:
        compartidas = []
        if "xl/sharedStrings.xml" in z.namelist():
            sx = z.read("xl/sharedStrings.xml").decode("utf-8", "replace")
            for si in re.findall(r"<si>(.*?)</si>", sx, re.S):
                compartidas.append(_desescapar_xml("".join(re.findall(r"<t[^>]*>([^<]*)</t>", si))))
        filas = []
        hojas = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
        for hoja in hojas:
            sx = z.read(hoja).decode("utf-8", "replace")
            for fila in re.findall(r"<row[^>]*>(.*?)</row>", sx, re.S):
                celdas = []
                for attrs, cuerpo in re.findall(r"<c([^>]*)>(.*?)</c>", fila, re.S):
                    v = re.search(r"<v>([^<]*)</v>", cuerpo)
                    t = re.search(r'\bt="(\w+)"', attrs)
                    if t and t.group(1) == "s" and v:
                        idx = int(v.group(1))
                        celdas.append(compartidas[idx] if idx < len(compartidas) else "")
                    elif t and t.group(1) == "inlineStr":
                        celdas.append(_desescapar_xml("".join(re.findall(r"<t[^>]*>([^<]*)</t>", cuerpo))))
                    elif v:
                        celdas.append(v.group(1))
                if any(c.strip() for c in celdas):
                    filas.append(" | ".join(celdas))
    return "\n".join(filas)


def _desescapar_xml(t):
    return (t.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
            .replace("&apos;", "'").replace("&amp;", "&"))


# ---------------------------------------------------------------------------
# Tipos de nota
# ---------------------------------------------------------------------------
PISTAS_TIPO = [
    ("cotizacion", ["cotizacion", "cotizaciones", "propuesta", "quote", "quotation", "oferta"]),
    ("orden", ["orden de compra", "ordenes", "oc-", "purchase order", "po "]),
    ("informe", ["informe", "reporte", "diagnostico", "report", "servicio"]),
    ("manual", ["manual", "ficha", "datasheet", "guia", "catalogo"]),
    ("proveedor", ["proveedor", "supplier", "vendor"]),
    ("cliente", ["cliente", "clientes", "customer"]),
    ("proyecto", ["proyecto", "retrofit", "project"]),
    ("diario", ["diario"]),
]


def adivinar_tipo(ruta_rel, ext):
    t = normalizar(ruta_rel)
    for tipo, pistas in PISTAS_TIPO:
        if any(p in t for p in pistas):
            return tipo
    return "manual" if ext == ".pdf" else "nota"


def frontmatter(texto):
    campos = {}
    if texto.startswith("---\n"):
        fin = texto.find("\n---", 4)
        if fin > 0:
            for l in texto[4:fin].splitlines():
                if ":" in l:
                    k, v = l.split(":", 1)
                    campos[k.strip().lower()] = v.strip()
            texto = texto[fin + 4:].lstrip("\n")
    return campos, texto


# ---------------------------------------------------------------------------
# El mapa
# ---------------------------------------------------------------------------
class Vault:
    def __init__(self):
        self.notas = []            # dicts: id, titulo, tipo, ruta, rel, ext, texto, enlaces
        self.por_clave = {}
        self.enlaces = []          # pares (i, j) sin repetir
        self.grado = []
        self.saltados = []         # (ruta, motivo)
        self.sin_resolver = 0
        self.indice = defaultdict(Counter)
        self.df = Counter()
        self.cargar()

    def cargar(self):
        archivos, self.saltados = data.listar_archivos()
        for raiz, ruta, ext, tam in archivos:
            rel = os.path.relpath(ruta, raiz)
            try:
                crudo = data.leer_archivo(ruta)
                if ext == ".pdf":
                    texto = texto_pdf(crudo)
                    if not texto:
                        self.saltados.append((ruta, "PDF sin texto (escaneado o con fuentes no legibles)"))
                        continue
                elif ext == ".docx":
                    texto = texto_docx(crudo)
                elif ext == ".xlsx":
                    texto = texto_xlsx(crudo)
                else:
                    texto = crudo.decode("utf-8", "replace")
            except PermissionError:
                raise
            except Exception as e:
                self.saltados.append((ruta, f"no se pudo leer ({type(e).__name__})"))
                continue
            campos, cuerpo = frontmatter(texto)
            stem = os.path.splitext(os.path.basename(ruta))[0]
            h1 = re.search(r"^# (.+)$", cuerpo, re.M)
            nota = dict(id=len(self.notas), stem=stem, titulo=(h1.group(1).strip() if h1 else stem),
                        tipo=campos.get("tipo") or adivinar_tipo(rel, ext), ruta=ruta, rel=rel,
                        ext=ext, texto=cuerpo, campos=campos,
                        destinos=[m.group(1).strip() for m in ENLACE.finditer(cuerpo)])
            self.notas.append(nota)
            for clave in (normalizar(stem), normalizar(nota["titulo"])):
                self.por_clave.setdefault(clave, nota["id"])

        vistos = set()
        for n in self.notas:
            for destino in n["destinos"]:
                j = self.resolver(destino)
                if j is None:
                    self.sin_resolver += 1
                    continue
                par = (min(n["id"], j), max(n["id"], j))
                if par[0] != par[1] and par not in vistos:
                    vistos.add(par)
                    self.enlaces.append(par)
        self.grado = [0] * len(self.notas)
        for a, b in self.enlaces:
            self.grado[a] += 1
            self.grado[b] += 1

        for n in self.notas:
            tf = Counter(palabras(n["texto"]))
            for w in palabras(n["titulo"] + " " + n["stem"]):
                tf[w] += 4                       # el título pesa más
            for w, c in tf.items():
                self.indice[w][n["id"]] = c
                self.df[w] += 1

    def resolver(self, destino):
        return self.por_clave.get(normalizar(destino.strip()))

    # ------------------------------------------------------------------ buscar
    def buscar(self, pregunta, limite=5):
        """[(puntaje, nota, fragmento)] ordenados. Vacío si nada coincide."""
        consulta = palabras(pregunta)
        if not consulta:
            return []
        total = max(len(self.notas), 1)
        puntajes = Counter()
        for w in set(consulta):
            if w not in self.indice:
                continue
            idf = math.log(1 + total / self.df[w])
            for i, c in self.indice[w].items():
                puntajes[i] += idf * (1 + math.log(c))
        salida = []
        for i, p in puntajes.most_common(limite):
            n = self.notas[i]
            salida.append((round(p, 2), n, self.fragmento(n, consulta)))
        return salida

    def fragmento(self, nota, consulta, largo=320):
        for linea in nota["texto"].splitlines():
            if linea.startswith("#") or linea.startswith(">") or not linea.strip():
                continue
            if any(w in normalizar(linea) for w in consulta):
                return linea.strip()[:largo]
        return re.sub(r"\s+", " ", nota["texto"])[:largo]

    # ------------------------------------------------------------------ para la interfaz
    def grafo(self):
        return {
            "nodos": [{"id": n["id"], "titulo": n["titulo"], "tipo": n["tipo"], "grado": self.grado[n["id"]]}
                      for n in self.notas],
            "enlaces": self.enlaces,
            "tipos": dict(Counter(n["tipo"] for n in self.notas)),
        }

    def nota(self, i):
        n = self.notas[i]
        vecinos = sorted({b if a == i else a for a, b in self.enlaces if i in (a, b)},
                         key=lambda j: -self.grado[j])
        enlaces = {}
        for destino in n["destinos"]:
            j = self.resolver(destino)
            if j is not None:
                enlaces[destino] = j
        return {"id": i, "titulo": n["titulo"], "tipo": n["tipo"], "archivo": n["rel"],
                "texto": n["texto"], "enlaces": enlaces,
                "vecinos": [{"id": j, "titulo": self.notas[j]["titulo"]} for j in vecinos[:30]]}

    def mas_conectadas(self, k=10):
        orden = sorted(range(len(self.notas)), key=lambda i: (-self.grado[i], self.notas[i]["titulo"]))
        return [{"id": i, "titulo": self.notas[i]["titulo"], "tipo": self.notas[i]["tipo"],
                 "grado": self.grado[i]} for i in orden[:k]]

    def informe(self):
        return {
            "modo": data.modo(),
            "carpetas": data.carpetas(),
            "notas": len(self.notas),
            "enlaces": len(self.enlaces),
            "por_extension": dict(Counter(n["ext"] for n in self.notas)),
            "por_tipo": dict(Counter(n["tipo"] for n in self.notas).most_common()),
            "saltados": [{"archivo": r, "motivo": m} for r, m in self.saltados],
            "enlaces_sin_nota": self.sin_resolver,
            "mas_conectadas": self.mas_conectadas(10),
        }


if __name__ == "__main__":
    v = Vault()
    inf = v.informe()
    print(f"Modo: {inf['modo']}  ·  carpetas: {', '.join(inf['carpetas']) or '(ninguna configurada)'}")
    print(f"Notas: {inf['notas']}  ·  enlaces: {inf['enlaces']}  ·  enlaces a notas que no existen: {inf['enlaces_sin_nota']}")
    print("Por extensión:", ", ".join(f"{k} {c}" for k, c in sorted(inf["por_extension"].items())))
    print("Por tipo:     ", ", ".join(f"{k} {c}" for k, c in inf["por_tipo"].items()))
    print("Saltados:")
    for s in inf["saltados"] or [{"archivo": "(ninguno)", "motivo": ""}]:
        print(f"  - {os.path.basename(s['archivo'])}: {s['motivo']}")
    print("Las 10 más conectadas:")
    for i, n in enumerate(inf["mas_conectadas"], 1):
        print(f"  {i:2}. {n['titulo']}  ({n['tipo']}, {n['grado']} conexiones)")
