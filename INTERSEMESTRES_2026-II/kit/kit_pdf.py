import sys, json, os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Table, TableStyle

REPO, PLAN, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
pdfmetrics.registerFont(TTFont("LatoB", f"{REPO}/assets/fonts/Lato-Bold.ttf"))
pdfmetrics.registerFont(TTFont("LatoK", f"{REPO}/assets/fonts/Lato-Black.ttf"))
LOGO = f"{REPO}/public/epime-09/logo-carrera.png"
AZUL, AMAR, GRIS, GRIS2, TXT = HexColor("#28398f"), HexColor("#f4e84a"), HexColor("#eef0f7"), HexColor("#9aa1c2"), HexColor("#1b1f33")
W, H = A4
M = 36
plan = json.load(open(PLAN))
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Kit de impresion - Intersemestres 2026-II")
page_no = [0]

INFO = {
    "futsal": dict(nombre="FUTSAL", cupo=18, canchas="2 canchas", partido="2 tiempos de 10 min, sin descanso",
                   cols=["PJ", "PG", "PE", "PP", "GF", "GC", "DG", "Pts"], pen=True),
    "voley": dict(nombre="VÓLEY MIXTO", cupo=12, canchas="1 losa", partido="1 set a 20 (final: mejor de 3, 20-20-10)",
                  cols=["PJ", "PG", "PP", "PF", "PC", "DIF", "Pts"], pen=False),
}


def header(title, sub):
    page_no[0] += 1
    c.setFillColor(AZUL); c.rect(0, H - 62, W, 62, fill=1, stroke=0)
    c.setFillColor(AMAR); c.rect(0, H - 67, W, 5, fill=1, stroke=0)
    if os.path.exists(LOGO):
        c.drawImage(LOGO, M, H - 56, 46, 46, mask="auto", preserveAspectRatio=True)
    c.setFillColor(white); c.setFont("LatoK", 16); c.drawString(M + 56, H - 32, title)
    c.setFillColor(AMAR); c.setFont("LatoB", 9.5); c.drawString(M + 56, H - 48, sub)
    c.setFillColor(GRIS2); c.setFont("Helvetica", 7.5)
    c.drawString(M, 18, "Gran Campeonato Intersemestres 2026-II · EPIME · Complejo Deportivo Pereyra · jueves 29 de octubre")
    c.drawRightString(W - M, 18, f"Pág. {page_no[0]}")


def section(x, y, txt):
    c.setFillColor(AZUL); c.setFont("LatoK", 12); c.drawString(x, y, txt)
    c.setFillColor(AMAR); c.rect(x, y - 5, 34, 3, fill=1, stroke=0)


def table(data, x, y_top, widths, extra=(), font=8.5, row_h=None, head=True):
    t = Table(data, colWidths=widths, rowHeights=row_h)
    st = [("FONTNAME", (0, 0), (-1, -1), "Helvetica"), ("FONTSIZE", (0, 0), (-1, -1), font),
          ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#55597a")),
          ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]
    if head:
        st += [("BACKGROUND", (0, 0), (-1, 0), AZUL), ("TEXTCOLOR", (0, 0), (-1, 0), white),
               ("FONTNAME", (0, 0), (-1, 0), "LatoB"), ("ALIGN", (0, 0), (-1, 0), "CENTER")]
    t.setStyle(TableStyle(st + list(extra)))
    _, h = t.wrap(0, 0); t.drawOn(c, x, y_top - h)
    return h


def score_boxes(x, y, small=False):
    s = 13 if small else 16
    c.setStrokeColor(TXT); c.setLineWidth(0.8)
    c.rect(x, y, s, s); c.rect(x + s + 9, y, s, s)
    c.setFont("LatoK", 9); c.setFillColor(TXT); c.drawCentredString(x + s + 4.5, y + 4, "-")


# ================================================================ portada
header("KIT DE IMPRESIÓN - INTERSEMESTRES 2026-II", "Hojas para llenar a mano después del sorteo · Futsal y Vóley Mixto")
y = H - 110
section(M, y, "Contenido")
items = [
    ("Futsal (18 equipos, 2 canchas)", ["Hoja de sorteo: 5 grupos (4-4-4-3-3)", "Tablas por grupo + partidos con orden y cancha",
                                         "Fase final: preliminar, cuartos, semis, 3er lugar y final", "18 fichas de jugadores (una por equipo)"]),
    ("Vóley Mixto (12 equipos, 1 losa)", ["Hoja de sorteo: 4 grupos de 3", "Tablas por grupo + partidos con orden de juego",
                                          "Fase final: cuartos, semis y final", "12 fichas de jugadores (una por equipo)"]),
]
yy = y - 26
for tit, lst in items:
    c.setFillColor(AZUL); c.setFont("LatoB", 11); c.drawString(M, yy, tit); yy -= 16
    c.setFillColor(TXT); c.setFont("Helvetica", 10)
    for it in lst:
        c.drawString(M + 14, yy, "•  " + it); yy -= 14
    yy -= 8
section(M, yy - 6, "Cómo usarlo")
steps = [
    "1. En el sorteo, escribir el nombre de cada equipo en su casilla (A1, A2, ...).",
    "   Las mismas posiciones se usan en las tablas y en los partidos: \"A1 vs A4\" = equipo de la casilla A1 contra A4.",
    "2. Durante el campeonato, anotar cada resultado en la planilla del grupo y actualizar la tabla.",
    "3. Al cerrar los grupos, escribir el 1.° y 2.° de cada grupo en la fase final (los cruces ya están definidos).",
    "4. Cada delegado llena y firma la ficha de su equipo y la entrega con las fichas de matrícula 2026-II.",
    "",
    "Si el sorteo se hace en el sistema (Admin > Fixture > Sortear grupos), las mismas hojas se imprimen",
    "ya llenas con los nombres desde \"Imprimir tablas por grupo\" e \"Imprimir fichas de todos los equipos\".",
    "N.° = orden de juego del día. La hora de cada partido la maneja solo la organización (mesa de control).",
]
yy -= 26
c.setFont("Helvetica", 9.5); c.setFillColor(TXT)
for s_ in steps:
    c.drawString(M, yy, s_); yy -= 14
c.showPage()


def discipline(key):
    info, p = INFO[key], plan[key]
    groups = p["groups"]
    matches = p["matches"]

    # ---------------------------------------------- hoja de sorteo
    header(f"{info['nombre']} - HOJA DE SORTEO", f"{info['cupo']} equipos · {len(groups)} grupos · {info['canchas']}")
    y = H - 100
    colw = (W - 2 * M - 20) / 2
    for i, g in enumerate(groups):
        x = M + (i % 2) * (colw + 20)
        yt = y - (i // 2) * 150
        data = [[f"GRUPO {g['letter']}", ""]] + [[f"{g['letter']}{k + 1}", ""] for k in range(g["size"])]
        table(data, x, yt, [40, colw - 40], font=11, row_h=[22] + [28] * g["size"],
              extra=[("SPAN", (0, 0), (-1, 0)), ("FONTNAME", (0, 1), (0, -1), "LatoK"), ("ALIGN", (0, 1), (0, -1), "CENTER"),
                     ("BACKGROUND", (0, 1), (0, -1), GRIS)])
    c.setFont("Helvetica-Oblique", 8.5); c.setFillColor(TXT)
    c.drawString(M, 40, "Escribir el nombre del equipo sorteado en cada casilla. Clasifican el 1.° y 2.° de cada grupo.")
    c.showPage()

    # ---------------------------------------------- tablas por grupo (2 por pagina)
    for start in range(0, len(groups), 2):
        header(f"{info['nombre']} - TABLAS POR GRUPO", f"{info['partido']} · Llenar a mano")
        y = H - 92
        for g in groups[start:start + 2]:
            L = g["letter"]
            section(M, y, f"Grupo {L}")
            cols = info["cols"]
            name_w = W - 2 * M - 30 - 26 * len(cols) - 30
            data = [["#", "Equipo"] + cols + ["Pos."]] + [[f"{L}{k + 1}", ""] + [""] * len(cols) + [""] for k in range(g["size"])]
            h = table(data, M, y - 12, [30, name_w] + [26] * len(cols) + [30], font=9, row_h=[18] + [24] * g["size"],
                      extra=[("FONTNAME", (0, 1), (0, -1), "LatoK"), ("ALIGN", (0, 1), (0, -1), "CENTER")])
            yy = y - 12 - h - 16
            c.setFont("LatoB", 8); c.setFillColor(GRIS2)
            c.drawString(M, yy, "N.°"); c.drawString(M + 40, yy, "CANCHA"); c.drawString(M + 100, yy, "FECHA")
            c.drawRightString(M + 290, yy, "LOCAL"); c.drawString(M + 360, yy, "VISITANTE")
            if info["pen"]:
                c.drawString(W - M - 48, yy, "PENALES")
            yy -= 6
            for m in [m for m in matches if m["group"] == L]:
                yy -= 24
                c.setFont("LatoK", 9.5); c.setFillColor(TXT); c.drawString(M, yy + 4, str(m["order"]))
                c.setFont("Helvetica", 8.5); c.drawString(M + 40, yy + 4, m["court"]); c.drawString(M + 112, yy + 4, str(m["fecha"]))
                c.setFont("LatoB", 9.5); c.drawRightString(M + 290, yy + 4, m["home"])
                c.setStrokeColor(GRIS2); c.setLineWidth(0.5); c.line(M + 130, yy + 2, M + 272, yy + 2)
                score_boxes(M + 298, yy)
                c.setFont("LatoB", 9.5); c.drawString(M + 345, yy + 4, m["away"])
                c.line(M + 365, yy + 2, W - M - 60 if info["pen"] else W - M, yy + 2)
                if info["pen"]:
                    score_boxes(W - M - 48, yy + 1, small=True)
            y = yy - 34
        c.showPage()

    # ---------------------------------------------- fase final
    ko = [m for m in matches if m["stage"] != "group_stage"]
    header(f"{info['nombre']} - FASE FINAL", "Escribir el equipo clasificado debajo de cada casilla")
    y = H - 100
    section(M, y, "Cruces y orden de juego")
    yy = y - 20
    for m in ko:
        yy -= 40
        c.setFillColor(AMAR if m["stage"] == "final" else GRIS); c.roundRect(M, yy - 6, W - 2 * M, 36, 4, fill=1, stroke=0)
        c.setFillColor(AZUL); c.setFont("LatoK", 12); c.drawString(M + 8, yy + 8, m["label"])
        c.setFillColor(TXT); c.setFont("LatoB", 9); c.drawString(M + 40, yy + 14, f"N.° {m['order']}"); c.setFont("Helvetica", 8); c.drawString(M + 40, yy + 3, m["court"])
        c.setFont("Helvetica", 7.5); c.setFillColor(HexColor("#4a5175"))
        c.drawString(M + 100, yy + 18, m["home"]); c.drawString(M + 330, yy + 18, m["away"])
        c.setStrokeColor(TXT); c.setLineWidth(0.6)
        c.line(M + 100, yy + 2, M + 260, yy + 2); c.line(M + 330, yy + 2, W - M - 10, yy + 2)
        score_boxes(M + 270, yy)
    c.setFont("Helvetica-Oblique", 8.5); c.setFillColor(TXT)
    nota = ("Empate en grupos, cuartos y semis: 3 penales y muerte súbita. Final: 5 penales." if info["pen"]
            else "Grupos, cuartos y semis a 1 set de 20 puntos (dif. 2, tope 22). Final al mejor de 3: 20-20-10.")
    c.drawString(M, 40, nota)
    c.showPage()

    # ---------------------------------------------- fichas de jugadores
    for n in range(1, info["cupo"] + 1):
        header(f"NÓMINA DE JUGADORES - {info['nombre']}", f"Ficha N.° {n:02d} de {info['cupo']} · Adjuntar ficha de matrícula 2026-II de cada jugador")
        y = H - 100
        fields = [("Disciplina", info["nombre"].title() if key == "futsal" else "Vóley Mixto"), ("Nombre del equipo", ""),
                  ("Semestre", ""), ("Delegado", ""), ("Sub delegado", ""), ("Celular del delegado", "")]
        colw = (W - 2 * M - 24) / 2
        for i, (lab, val) in enumerate(fields):
            x = M + (i % 2) * (colw + 24); yy = y - (i // 2) * 38
            c.setFont("LatoB", 8); c.setFillColor(GRIS2); c.drawString(x, yy, lab.upper())
            c.setFont("LatoB", 11); c.setFillColor(TXT); c.drawString(x, yy - 16, val)
            c.setStrokeColor(TXT); c.setLineWidth(0.6); c.line(x, yy - 20, x + colw, yy - 20)
        data = [["N.°", "Apellidos y nombres", "Código", "DNI", "Semestre", "Firma"]] + [[str(k), "", "", "", "", ""] for k in range(1, 11)]
        table(data, M, y - 130, [28, 177, 70, 70, 58, W - 2 * M - 403], font=10, row_h=[20] + [30] * 10,
              extra=[("ALIGN", (0, 1), (0, -1), "CENTER"), ("FONTNAME", (0, 1), (0, -1), "LatoB")])
        c.setFont("Helvetica", 8); c.setFillColor(TXT)
        notas = ["Máximo 10 jugadores. Solo pueden jugar por el semestre en el que están matriculados (mínimo 2 cursos).",
                 "Ningún jugador puede inscribirse en más de un equipo. Egresados: adjuntar documento que acredite haber sido estudiante."]
        if key == "voley":
            notas.append("En cancha se recomienda 4 varones y 2 damas; se puede invitar hasta 2 jugadoras que no sean de la E.P.I.M.E.")
        for i, t in enumerate(notas):
            c.drawString(M, 150 - i * 12, t)
        c.setStrokeColor(TXT); c.setLineWidth(0.7)
        for x in (M + 20, W / 2 + 30):
            c.line(x, 74, x + 200, 74)
        c.setFont("LatoB", 9)
        c.drawCentredString(M + 120, 62, "Firma del delegado"); c.drawCentredString(W / 2 + 130, 62, "Comisión organizadora")
        c.showPage()


discipline("futsal")
discipline("voley")
c.save()
print(OUT, page_no[0])
