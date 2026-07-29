#!/usr/bin/env python3
"""
Genera la PLACA BASE de exposicion.foto con la API de Reve.

La placa base es el punto cero de la app: la foto sobre la que se simulan
exposición, desenfoque de fondo, arrastre de movimiento y ruido. Por eso debe
ser fotométricamente NEUTRA y estar enfocada de punta a punta — cualquier
efecto ya horneado (grano, bokeh, viñeta, virado) pelea contra la simulación.

Deliberadamente independiente de estudio-reve/generar.py: aquel lleva cocido el
ADN visual del estudio (flash duro, grano, paleta 70/25/5), que aquí estorba.
Solo se reutiliza la clave de API, leída desde estudio-reve/.env.

Uso:
    python3 generar_placa.py            # 2 variantes
    python3 generar_placa.py -n 4
"""
import argparse, base64, datetime, json, os, sys, urllib.request, urllib.error

DIR   = os.path.dirname(os.path.abspath(__file__))
OUT   = os.path.join(DIR, "img", "escenas")
LOG   = os.path.join(DIR, "img", "escenas", "LOG_PLACAS.md")
CACHE = os.path.join(DIR, ".endpoint_cache")
ENV_ESTUDIO = os.path.join(DIR, "..", "estudio-reve", ".env")

BASE = "https://api.reve.com"
CREATE_PATHS = ["/v1/image/create", "/v1/images/create", "/v1/create", "/v1/generate"]

# ---------------------------------------------------------------------------
# El prompt. Tres bloques: qué se ve, cómo está fotografiado, qué NO debe traer.
# El bloque negativo es el que más pesa: el modelo por defecto quiere hacer
# retratos con fondo desenfocado, que es exactamente lo que aquí lo arruina.
# ---------------------------------------------------------------------------
PROMPT = (
    "A documentary-style vertical photograph of a woman standing on a wide city sidewalk on an "
    "overcast day. She stands in the near foreground, facing the camera, three-quarter body framing "
    "from mid-thigh up, weight on one leg, hands relaxed at her sides, calm neutral expression. "
    "Dark hair pulled back tightly into a low bun, no loose strands, clean unbroken silhouette "
    "against the background. She wears a plain mid-grey wool coat over a simple white shirt — no "
    "logos, no patterns, no jewelry. "

    "She is standing roughly eight meters in front of the background, and the background is fully "
    "visible and COMPLETELY IN SHARP FOCUS: a weathered red brick wall with visible mortar lines and "
    "individual bricks clearly resolved, climbing ivy with separate distinguishable leaves, a green "
    "painted wooden door with peeling paint and visible grain, two bicycles leaning against the wall "
    "with every spoke of their wheels crisply separated, a cast-iron drainpipe, and a stone step. "
    "Every one of these background elements is rendered with crisp, legible, fine detail — brick "
    "edges, leaf veins, wood grain, and bicycle spokes are all individually distinguishable. "

    "Shot on a 50mm lens at f/11 with deep depth of field: the woman AND the entire background are "
    "equally and completely sharp from front to back. Everything in the frame is in focus. "

    "Lighting is flat, soft, even overcast daylight from a fully clouded sky — no direct sun, no "
    "visible light source, no cast shadows, no highlights on the skin, no dark shadow areas. The "
    "exposure is perfectly neutral and balanced: midtones sit in the middle, nothing is blown out to "
    "white, nothing is crushed to black, full detail retained in every part of the frame. Colors are "
    "natural, accurate and unstylized. Clean, noiseless, high-resolution digital capture. Realistic "
    "natural skin texture with visible pores and fine imperfections, true human proportions, natural "
    "hand and finger anatomy. "

    "Absolutely NO shallow depth of field, NO bokeh, NO background blur, NO defocused areas anywhere "
    "in the image, NO subject separation through blur. NO film grain, NO noise, NO vignette, NO "
    "color grading or color cast, NO teal-and-orange look, NO high contrast, NO crushed blacks, NO "
    "blown highlights, NO harsh or directional light, NO flash, NO lens flare, NO HDR look, NO "
    "motion blur. NO readable text, signage, lettering, numbers, logos or watermarks anywhere in the "
    "frame. NO glossy stock-photo aesthetic, NO airbrushed or plastic skin, NO doll-like face."
)


def api_key():
    for envfile in (os.path.join(DIR, ".env"), ENV_ESTUDIO):
        if os.path.exists(envfile):
            for line in open(envfile):
                line = line.strip()
                if line.startswith("REVE_API_KEY="):
                    return line.split("=", 1)[1].strip()
    key = os.environ.get("REVE_API_KEY")
    if not key:
        sys.exit("ERROR: no encontré REVE_API_KEY en .env, en estudio-reve/.env ni en el entorno.")
    return key


def call(path, payload, key):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "Accept": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read(), \
                   r.headers.get("X-Reve-Request-Id", "")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), e.read(), \
               e.headers.get("X-Reve-Request-Id", "")
    except Exception as e:
        return 0, "", str(e).encode(), ""


def descubrir_endpoint(paths, payload, key):
    if os.path.exists(CACHE):
        cached = open(CACHE).read().strip()
        if cached in paths:
            paths = [cached] + [p for p in paths if p != cached]
    for p in paths:
        status, ct, body, rid = call(p, payload, key)
        if status == 404:
            print(f"  {p} -> 404, probando siguiente...")
            continue
        return p, status, ct, body, rid
    sys.exit("ERROR: ningún endpoint respondió distinto de 404. Revisar api.reve.com/console.")


def extraer_imagen(ct, body):
    if ct.startswith("image/"):
        return body
    try:
        data = json.loads(body)
    except Exception:
        return None

    def buscar(d):
        if isinstance(d, dict):
            for k, v in d.items():
                if isinstance(v, str):
                    if k in ("image", "b64_json", "image_base64") or (len(v) > 1000 and not v.startswith("http")):
                        try:
                            return base64.b64decode(v)
                        except Exception:
                            pass
                    if v.startswith("http") and any(t in k for t in ("url", "image")):
                        with urllib.request.urlopen(v, timeout=120) as r:
                            return r.read()
                r = buscar(v)
                if r:
                    return r
        if isinstance(d, list):
            for x in d:
                r = buscar(x)
                if r:
                    return r
        return None

    return buscar(data)


def log(linea):
    nuevo = not os.path.exists(LOG)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a") as f:
        if nuevo:
            f.write("# LOG DE PLACAS BASE — exposicion.foto\n\n"
                    "Imágenes generadas con la API de Reve para servir de placa base de la "
                    "previsualización. Uso declarado: generativo.\n\n"
                    "| fecha | archivo | request-id | estado |\n|---|---|---|---|\n")
        f.write(linea + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", type=int, default=2, help="variantes (default 2)")
    args = ap.parse_args()

    key = api_key()
    os.makedirs(OUT, exist_ok=True)
    fecha = datetime.date.today().strftime("%Y%m%d")
    print(f"Placa base exposicion.foto · {args.n} variantes · prompt {len(PROMPT)} chars")
    if len(PROMPT) > 2560:
        sys.exit(f"ERROR: prompt de {len(PROMPT)} chars, el límite duro de la API es 2560.")

    payload = {"prompt": PROMPT, "aspect_ratio": "3:4"}

    ok = 0
    for i in range(1, args.n + 1):
        print(f"[{i}/{args.n}] generando...")
        path, status, ct, body, rid = descubrir_endpoint(CREATE_PATHS, payload, key)
        if status == 200:
            img = extraer_imagen(ct, body)
            if img:
                nombre = f"{fecha}_placa-base_v{i}.png"
                open(os.path.join(OUT, nombre), "wb").write(img)
                open(CACHE, "w").write(path)
                log(f"| {fecha} | {nombre} | {rid} | ok |")
                print(f"  ✔ guardada: img/escenas/{nombre} (request {rid})")
                ok += 1
            else:
                print(f"  ✖ 200 pero sin imagen reconocible. Body: {body[:400]}")
                log(f"| {fecha} | - | {rid} | 200 sin imagen |")
        else:
            print(f"  ✖ HTTP {status} en {path} (request {rid})\n"
                  f"  Respuesta: {body[:500].decode(errors='replace')}")
            log(f"| {fecha} | - | {rid} | error {status} |")
            if status in (401, 403):
                sys.exit("  Clave inválida o sin permisos: revisar .env / consola Reve.")
            if status == 402:
                sys.exit("  Sin créditos: comprar en api.reve.com/console.")

    print(f"\nListo: {ok}/{args.n} placas en img/escenas/.")


if __name__ == "__main__":
    main()
