"""EL ÚNICO ARCHIVO QUE TOCA LOS DATOS REALES DE JAIRO.

- Todo se abre en modo lectura ("rb"). Este archivo no escribe nada, nunca.
- JARVIS_DEMO se lee aquí y en ningún otro sitio. Por defecto: demo (1).
- El resto del programa pide archivos, correo, calendario y "hoy" a través de estas funciones.
"""
import json
import os
from datetime import date, datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# CARPETAS AUTORIZADAS (solo lectura) · PENDIENTE DE COMPLETAR POR JAIRO
# Ejemplos en macOS:
#   "~/Library/CloudStorage/OneDrive-Personal/Cotizaciones",
#   "~/Documents/Clientes",
# Se lee todo lo que haya dentro, recursivamente.
# ---------------------------------------------------------------------------
RUTAS_REALES = [
]

ZONA_HORARIA = "America/Costa_Rica"
EXTENSIONES = {".md", ".txt", ".pdf", ".docx", ".xlsx"}
MAX_BYTES = 2 * 1024 * 1024          # salta archivos de más de 2 MB
CARPETAS_SALTADAS = {"node_modules", ".git", ".obsidian", ".Trash", "__pycache__"}

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_DEMO = os.path.join(RAIZ, "data", "demo")
DIR_REAL = os.path.join(RAIZ, "data", "real")

MODO_DEMO = os.environ.get("JARVIS_DEMO", "1").strip() != "0"


def modo():
    return "demo" if MODO_DEMO else "real"


def carpetas():
    """Las raíces que JARVIS puede leer en el modo actual."""
    if MODO_DEMO:
        return [os.path.join(DIR_DEMO, "archivos")]
    return [os.path.realpath(os.path.expanduser(r)) for r in RUTAS_REALES]


def hoy():
    """En demo, la fecha fija guardada en los datos. En real, hoy en Costa Rica."""
    if MODO_DEMO:
        try:
            with open(os.path.join(DIR_DEMO, "meta.json"), "rb") as f:
                return date.fromisoformat(json.load(f)["hoy"])
        except (OSError, KeyError, ValueError):
            return date(2026, 11, 18)
    return ahora().date()


def ahora():
    if MODO_DEMO:
        return datetime.combine(hoy(), datetime.min.time()) + timedelta(hours=8)
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo(ZONA_HORARIA)).replace(tzinfo=None)
    except Exception:
        # Costa Rica no tiene horario de verano: UTC-6 fijo
        return datetime.now(timezone(timedelta(hours=-6))).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Archivos
# ---------------------------------------------------------------------------
def listar_archivos():
    """Recorre las carpetas autorizadas (sin seguir enlaces simbólicos).

    Devuelve (archivos, saltados): archivos = [(raiz, ruta, extension, tamaño)],
    saltados = [(ruta, motivo)].
    """
    archivos, saltados = [], []
    for raiz in carpetas():
        if not os.path.isdir(raiz):
            saltados.append((raiz, "la carpeta no existe o no se puede leer"))
            continue
        for actual, dirs, nombres in os.walk(raiz, followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in CARPETAS_SALTADAS and not d.startswith("."))
            for nombre in sorted(nombres):
                if nombre.startswith(".") or nombre.startswith("~$"):
                    continue
                ruta = os.path.join(actual, nombre)
                ext = os.path.splitext(nombre)[1].lower()
                if ext not in EXTENSIONES or os.path.islink(ruta):
                    continue
                try:
                    tam = os.path.getsize(ruta)
                except OSError:
                    saltados.append((ruta, "no se pudo leer"))
                    continue
                if tam > MAX_BYTES:
                    saltados.append((ruta, "más de 2 MB"))
                    continue
                archivos.append((raiz, ruta, ext, tam))
    return archivos, saltados


def leer_archivo(ruta):
    """Lee un archivo autorizado. Solo lectura. Rechaza rutas fuera de las carpetas."""
    real = os.path.realpath(ruta)
    if not any(real == r or real.startswith(r.rstrip(os.sep) + os.sep)
               for r in (os.path.realpath(c) for c in carpetas())):
        raise PermissionError(f"Fuera de las carpetas autorizadas: {ruta}")
    with open(real, "rb") as f:
        return f.read(MAX_BYTES + 1)


# ---------------------------------------------------------------------------
# Correo y calendario (archivos exportados)
# ---------------------------------------------------------------------------
def _dir_correo_calendario():
    return DIR_DEMO if MODO_DEMO else DIR_REAL


def cargar_correo():
    """Lista de correos o None si no está conectado (no hay inbox.json)."""
    ruta = os.path.join(_dir_correo_calendario(), "inbox.json")
    if not os.path.isfile(ruta):
        return None
    try:
        with open(ruta, "rb") as f:
            datos = json.loads(f.read().decode("utf-8-sig"))
    except (OSError, ValueError):
        return None
    if isinstance(datos, dict):
        datos = datos.get("mensajes") or datos.get("messages") or []
    return [_normalizar_correo(m) for m in datos if isinstance(m, dict)]


def _normalizar_correo(m):
    """Acepta nuestros campos en español o los de una exportación en inglés."""
    de = m.get("de") or m.get("from") or ""
    if isinstance(de, dict):
        nombre = de.get("name", "")
        de = de.get("address") or de.get("email") or ""
    else:
        nombre = m.get("nombre") or ""
    return {
        "id": str(m.get("id", "")),
        "de": de,
        "nombre": nombre or de,
        "asunto": m.get("asunto") or m.get("subject") or "(sin asunto)",
        "fecha": m.get("fecha") or m.get("date") or m.get("receivedDateTime") or "",
        "leido": bool(m.get("leido", m.get("isRead", m.get("read", True)))),
        "cuerpo": (m.get("cuerpo") or m.get("body") or m.get("bodyPreview") or m.get("snippet") or "")[:2000],
    }


def cargar_calendario():
    """Lista de eventos o None si no está conectado (no hay calendar.json ni .ics)."""
    base = _dir_correo_calendario()
    ruta_json = os.path.join(base, "calendar.json")
    if os.path.isfile(ruta_json):
        try:
            with open(ruta_json, "rb") as f:
                datos = json.loads(f.read().decode("utf-8-sig"))
            return [e for e in datos if isinstance(e, dict)]
        except (OSError, ValueError):
            return None
    try:
        ics = sorted(n for n in os.listdir(base) if n.lower().endswith(".ics"))
    except OSError:
        ics = []
    if not ics:
        return None
    eventos = []
    for n in ics:
        with open(os.path.join(base, n), "rb") as f:
            eventos += _leer_ics(f.read().decode("utf-8", "replace"))
    return eventos


def _leer_ics(texto):
    # Une las líneas plegadas (RFC 5545: las que empiezan con espacio continúan la anterior)
    lineas = texto.replace("\r\n", "\n").replace("\n ", "").replace("\n\t", "").split("\n")
    eventos, ev = [], None
    for l in lineas:
        if l == "BEGIN:VEVENT":
            ev = {}
        elif l == "END:VEVENT" and ev is not None:
            if ev.get("inicio"):
                eventos.append({"titulo": ev.get("titulo", "(sin título)"), "inicio": ev["inicio"],
                                "fin": ev.get("fin", ev["inicio"]), "lugar": ev.get("lugar", ""),
                                "notas": ev.get("notas", "")[:500]})
            ev = None
        elif ev is not None and ":" in l:
            clave, valor = l.split(":", 1)
            nombre = clave.split(";")[0]
            valor = valor.replace("\\n", " ").replace("\\,", ",").replace("\\;", ";")
            if nombre == "SUMMARY":
                ev["titulo"] = valor
            elif nombre == "LOCATION":
                ev["lugar"] = valor
            elif nombre == "DESCRIPTION":
                ev["notas"] = valor
            elif nombre in ("DTSTART", "DTEND"):
                ev["inicio" if nombre == "DTSTART" else "fin"] = _fecha_ics(valor)
    return eventos


def _fecha_ics(v):
    try:
        if v.endswith("Z"):
            dt = datetime.strptime(v, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone(timedelta(hours=-6))).replace(tzinfo=None).isoformat(timespec="minutes")
        if "T" in v:
            return datetime.strptime(v[:15], "%Y%m%dT%H%M%S").isoformat(timespec="minutes")
        return datetime.strptime(v[:8], "%Y%m%d").isoformat(timespec="minutes")
    except ValueError:
        return ""


# ---------------------------------------------------------------------------
# Perfil privado (nombres reales de clientes, cifras reales). Solo en modo real.
# ---------------------------------------------------------------------------
def perfil_privado():
    if MODO_DEMO:
        return ""
    ruta = os.path.join(RAIZ, "perfil_privado.md")
    try:
        with open(ruta, "rb") as f:
            return f.read().decode("utf-8", "replace")
    except OSError:
        return ""
