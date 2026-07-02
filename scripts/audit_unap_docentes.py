#!/usr/bin/env python3
"""Auditoría controlada de Plana Docente UNA Puno.

Uso:
  python scripts/audit_unap_docentes.py --term-id UUID --search PEREZ
  python scripts/audit_unap_docentes.py --term-id UUID --dni <DNI_8_DIGITOS>

El script hace una sola consulta por ejecución, limita length a 5 y enmascara DNI.
"""

from __future__ import annotations

import argparse
import json
import ssl
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_URL = "https://sictransparencia.unap.edu.pe"
ENDPOINT = "/plana-docente/docente/lista"
USER_AGENT = "campeonato-full-audit/1.0"


def build_params(term_id: str, query: str, length: int) -> dict[str, str]:
    params = {
        "draw": "1",
        "start": "0",
        "length": str(min(max(length, 1), 5)),
        "search": query,
        "termId": term_id,
        "order[0][column]": "0",
        "order[0][dir]": "asc",
    }
    columns = ["name", "dni", "condition", "dedication", ""]
    for index, column in enumerate(columns):
        params[f"columns[{index}][data]"] = column
        params[f"columns[{index}][searchable]"] = "true"
        params[f"columns[{index}][orderable]"] = "false"
        params[f"columns[{index}][search][value]"] = ""
        params[f"columns[{index}][search][regex]"] = "false"
    return params


def mask_dni(value: object) -> str:
    dni = str(value or "")
    if len(dni) <= 2:
        return "*" * len(dni)
    return f"{'*' * (len(dni) - 2)}{dni[-2:]}"


def sanitize_row(row: dict[str, object]) -> dict[str, object]:
    return {
        key: mask_dni(value) if key.lower() == "dni" else value
        for key, value in row.items()
    }


def fetch(term_id: str, query: str, length: int, verify_tls: bool) -> tuple[int, str | None, dict[str, object]]:
    url = f"{BASE_URL}{ENDPOINT}?{urlencode(build_params(term_id, query, length))}"
    request = Request(
        url,
        headers={
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{BASE_URL}/plana-docente",
            "User-Agent": USER_AGENT,
        },
    )
    context = None if verify_tls else ssl._create_unverified_context()
    with urlopen(request, context=context, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))
        return response.status, response.headers.get("content-type"), payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Consulta segura y sanitizada de Plana Docente UNA.")
    parser.add_argument("--term-id", required=True, help="termId público del periodo académico.")
    parser.add_argument("--search", help="Texto de búsqueda por nombre/apellido, mínimo 3 caracteres.")
    parser.add_argument("--dni", help="DNI exacto de 8 dígitos para probar búsqueda pública.")
    parser.add_argument("--length", type=int, default=5, help="Cantidad máxima de filas. Máximo real: 5.")
    parser.add_argument("--output", help="Ruta para guardar JSON sanitizado.")
    parser.add_argument(
        "--verify-tls",
        action="store_true",
        help="Verificar certificado TLS. En auditoría puede fallar por cadena incompleta del portal.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.dni and args.search:
        print("Usa solo --dni o --search por ejecución.", file=sys.stderr)
        return 2
    if args.dni:
        if not args.dni.isdigit() or len(args.dni) != 8:
            print("--dni debe tener exactamente 8 dígitos.", file=sys.stderr)
            return 2
        query = args.dni
        query_type = "dni"
    else:
        query = (args.search or "").strip()
        query_type = "search"
        if query and len(query) < 3:
            print("--search debe tener al menos 3 caracteres.", file=sys.stderr)
            return 2

    status, content_type, payload = fetch(args.term_id, query, args.length, args.verify_tls)
    sanitized = {
        "source": "sictransparencia_unap_plana_docente",
        "endpoint": ENDPOINT,
        "auditedAt": datetime.now(timezone.utc).isoformat(),
        "queryType": query_type,
        "query": mask_dni(query) if query_type == "dni" else query,
        "termId": args.term_id,
        "httpStatus": status,
        "contentType": content_type,
        "recordsTotal": payload.get("recordsTotal"),
        "recordsFiltered": payload.get("recordsFiltered"),
        "data": [sanitize_row(row) for row in payload.get("data", [])],
        "note": "DNI enmascarado; no guardar ni publicar respuestas crudas con DNI completo.",
    }
    output = json.dumps(sanitized, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
