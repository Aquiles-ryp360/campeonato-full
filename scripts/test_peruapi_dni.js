#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

loadEnvFile(".env");
loadEnvFile(".env.local");

const dni = process.argv[2] ?? "";
const apiKey = process.env.PERUAPI_API_KEY?.trim() || process.env.API_Key_PERUAPI?.trim();
const baseUrl = process.env.PERUAPI_BASE_URL?.trim() || "https://peruapi.com";
const timeoutMs = positiveNumber(process.env.PERUAPI_TIMEOUT_MS, 8000);

main().catch(() => {
  console.error("El servicio de consulta DNI no respondió.");
  process.exitCode = 1;
});

async function main() {
  const dniError = validateDni(dni);
  if (dniError) {
    console.error(dniError);
    process.exitCode = 2;
    return;
  }

  if (!apiKey) {
    console.error("PERUAPI_API_KEY no configurado.");
    process.exitCode = 2;
    return;
  }

  const url = new URL(`/api/dni/${encodeURIComponent(dni)}`, baseUrl);
  if (url.protocol !== "https:" || url.hostname !== "peruapi.com") {
    console.error("PERUAPI_BASE_URL inválida.");
    process.exitCode = 2;
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
        "User-Agent": "campeonato-full/1.0 identity-lookup-test"
      }
    });

    if (response.status === 401 || response.status === 403) {
      console.error("API Key inválida o sin permisos.");
      process.exitCode = 1;
      return;
    }

    if (response.status === 429) {
      console.error("Límite de consultas alcanzado.");
      process.exitCode = 1;
      return;
    }

    if (response.status === 404) {
      console.error("No se encontraron datos para el DNI consultado.");
      process.exitCode = 1;
      return;
    }

    const payload = await response.json().catch(() => null);
    const normalized = normalizePayload(payload, dni);
    if (!normalized.fullName) {
      console.error("No se encontraron datos para el DNI consultado.");
      process.exitCode = 1;
      return;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          source: "peruapi",
          data: normalized,
          message: "Datos encontrados. Verifica que correspondan al participante."
        },
        null,
        2
      )
    );
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePayload(payload, dniValue) {
  const root = isRecord(payload) ? payload : {};
  const data = [root.data, root.result, root.persona, root].find(isRecord) ?? {};
  const nombres =
    stringField(data, "nombres") ??
    stringField(data, "nombres_completos") ??
    stringField(data, "names");
  const apellidoPaterno =
    stringField(data, "apellido_paterno") ??
    stringField(data, "apellidoPaterno") ??
    stringField(data, "ape_paterno") ??
    stringField(data, "first_surname");
  const apellidoMaterno =
    stringField(data, "apellido_materno") ??
    stringField(data, "apellidoMaterno") ??
    stringField(data, "ape_materno") ??
    stringField(data, "second_surname");
  const fullName =
    stringField(data, "nombre_completo") ??
    stringField(data, "nombreCompleto") ??
    stringField(data, "full_name") ??
    [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ").trim();

  return {
    dniMasked: maskDni(dniValue),
    nombres: nombres ?? null,
    apellidoPaterno: apellidoPaterno ?? null,
    apellidoMaterno: apellidoMaterno ?? null,
    fullName: fullName || null
  };
}

function loadEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function validateDni(value) {
  if (!/^\d{8}$/.test(value)) return "El DNI debe tener exactamente 8 dígitos.";
  return null;
}

function maskDni(value) {
  return `${"*".repeat(Math.max(value.length - 2, 0))}${value.slice(-2)}`;
}

function stringField(source, field) {
  const value = source[field];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
