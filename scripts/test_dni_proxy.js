#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

loadEnvFile(".env");
loadEnvFile(".env.local");

const dni = process.argv[2] ?? "";
const endpoint = process.env.DNI_LOOKUP_TEST_URL?.trim() || "http://localhost:3000/api/identity/dni";
const timeoutMs = positiveNumber(process.env.DNI_LOOKUP_TEST_TIMEOUT_MS, 10_000);

main().catch(() => {
  console.error("Servicio DNI no disponible");
  process.exitCode = 1;
});

async function main() {
  const dniError = validateDni(dni);
  if (dniError) {
    console.error(dniError);
    process.exitCode = 2;
    return;
  }

  const url = new URL(endpoint);
  if (!["http:", "https:"].includes(url.protocol)) {
    console.error("DNI_LOOKUP_TEST_URL inválida.");
    process.exitCode = 2;
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ dni, consentAccepted: true })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      console.error(`${response.status}: ${payload?.message ?? "Consulta DNI fallida"}`);
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify(maskDniInPayload(payload), null, 2));
  } finally {
    clearTimeout(timeout);
  }
}

function maskDniInPayload(payload) {
  const data = isRecord(payload.data) ? { ...payload.data } : undefined;
  if (data?.dni) data.dni = maskDni(String(data.dni));
  return { ...payload, ...(data ? { data } : {}) };
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

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
