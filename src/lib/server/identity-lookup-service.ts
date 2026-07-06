import "server-only";

import { createHash } from "node:crypto";
import { request as httpsRequest } from "node:https";
import {
  normalizeTeacherQuery,
  normalizeDniProxyResponse,
  normalizeUnapStudentResponse,
  normalizeUnapTeacherListResponse,
  validateCodigoMatricula,
  validateDni,
  validateUnapTeacherQuery,
  validateUnapStudentLookupInput,
  type DniLookupResult,
  type IdentityLookupResult,
  type UnapStudentLookupParams,
  type UnapTeacherLookupParams,
  type UnapTeacherLookupResult
} from "@/lib/identity/identity-lookup";
import { unapCareers } from "@/data/unapCareers";
import {
  identityLookupCache,
  type IdentityLookupCache
} from "@/lib/server/identity-cache";

const unapAllowedHost = "tramites.unap.edu.pe";
const unapTeacherAllowedHost = "sictransparencia.unap.edu.pe";
const defaultTimeoutMs = 8000;
const defaultCacheTtlDays = 7;
const defaultDniCacheTtlDays = 30;
const defaultTeacherPeriod = "2026-I";
const defaultTeacherTermId = "08de416c-dede-444c-83dd-ff3ee6aedfdf";

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
type TeacherCacheValue = { value: UnapTeacherLookupResult; expiresAt: number };
type DniCacheValue = { value: DniLookupResult; expiresAt: number };

const teacherLookupCache = new Map<string, TeacherCacheValue>();
const dniLookupCache = new Map<string, DniCacheValue>();

export class IdentityLookupService {
  constructor(
    private readonly options: {
      fetcher?: Fetcher;
      cache?: IdentityLookupCache;
    } = {}
  ) {}

  async lookupUnapStudent(params: UnapStudentLookupParams): Promise<IdentityLookupResult> {
    const parsed = validateUnapStudentLookupInput(params);
    if (!parsed.ok) {
      return unapFailure({
        codigoMatricula: params.codigoMatricula,
        codigoCarrera: params.codigoCarrera,
        message: parsed.message
      });
    }

    if (!envEnabled("IDENTITY_LOOKUP_ENABLED", true) || !envEnabled("UNAP_LOOKUP_ENABLED", true)) {
      return unapFailure({
        codigoMatricula: parsed.value.codigoMatricula,
        codigoCarrera: parsed.value.codigoCarrera,
        escuela: parsed.value.escuelaNombre ?? null,
        message: "La consulta de identidad no está habilitada."
      });
    }

    const cacheKey = `unap_tramites:${parsed.value.codigoMatricula}:${parsed.value.codigoCarrera}`;
    const cache = this.options.cache ?? identityLookupCache;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.fetchUnapStudent(parsed.value);
    const finalResult = result.ok
      ? result
      : (await this.discoverUnapCareer(parsed.value, cache)) ?? result;

    if (finalResult.ok) {
      await cache.set(cacheKey, finalResult, cacheTtlMs());
    }

    return finalResult;
  }

  async lookupDni({ dni }: { dni: string }): Promise<DniLookupResult> {
    const normalizedDni = dni;
    const dniError = validateDni(normalizedDni);
    if (dniError) {
      return dniFailure(dniError);
    }

    if (!envEnabled("DNI_LOOKUP_ENABLED", true)) {
      return dniFailure("La consulta nacional de DNI no está habilitada.");
    }

    if (!dniProxyBaseUrl() || !dniProxySecret()) {
      return dniFailure("Consulta DNI no configurada", "peruapi", 500);
    }

    const cacheKey = `dni:${hashLookupKey(normalizedDni)}`;
    const cached = dniLookupCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) dniLookupCache.delete(cacheKey);

    const result = await this.fetchDniProxy(normalizedDni, cacheKey);
    if (result.ok) {
      dniLookupCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + dniCacheTtlMs()
      });
    }

    return result;
  }

  async lookupUnapTeachers(params: UnapTeacherLookupParams): Promise<UnapTeacherLookupResult> {
    const query = normalizeTeacherQuery(params.query);
    const queryError = validateUnapTeacherQuery(query);
    const periodo = params.periodo?.trim() || teacherLookupPeriod();
    const termId = params.termId?.trim() || teacherLookupTermId();

    if (queryError) {
      return teacherFailure({ query, periodo, termId, message: queryError });
    }

    if (!envEnabled("IDENTITY_LOOKUP_ENABLED", true) || !envEnabled("UNAP_TEACHER_LOOKUP_ENABLED", true)) {
      return teacherFailure({
        query,
        periodo,
        termId,
        message: "La consulta de docentes no está habilitada."
      });
    }

    if (!termId) {
      return teacherFailure({
        query,
        periodo,
        termId,
        message: "No hay periodo docente configurado para consultar."
      });
    }

    const cacheKey = `unap_docentes:${periodo}:${termId}:${query.toUpperCase()}`;
    const cached = teacherLookupCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) teacherLookupCache.delete(cacheKey);

    const result = await this.fetchUnapTeachers({
      query,
      periodo,
      termId,
      length: params.length
    });

    teacherLookupCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + cacheTtlMs()
    });

    return result;
  }

  private async discoverUnapCareer(
    params: UnapStudentLookupParams,
    cache: IdentityLookupCache
  ): Promise<IdentityLookupResult | null> {
    const cacheKey = `unap_tramites:any:${params.codigoMatricula}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const candidates = unapCareers.filter((career) => career.code !== params.codigoCarrera);
    const batchSize = 5;

    for (let index = 0; index < candidates.length; index += batchSize) {
      const batch = candidates.slice(index, index + batchSize);
      const results = await Promise.all(
        batch.map((career) =>
          this.fetchUnapStudent({
            codigoMatricula: params.codigoMatricula,
            codigoCarrera: career.code,
            escuelaNombre: career.name
          })
        )
      );
      const found = results.find((item) => item.ok);

      if (found) {
        const result = {
          ...found,
          message: "Datos encontrados. Verifica que correspondan al participante."
        };
        await cache.set(cacheKey, result, cacheTtlMs());
        await cache.set(
          `unap_tramites:${params.codigoMatricula}:${result.codigoCarrera}`,
          result,
          cacheTtlMs()
        );
        return result;
      }
    }

    return null;
  }

  private async fetchUnapStudent(params: UnapStudentLookupParams): Promise<IdentityLookupResult> {
    let response: Response;
    try {
      const url = buildUnapStudentUrl(params);
      response = await safeFetchUnap(url, {
        fetcher: this.options.fetcher ?? fetch,
        timeoutMs: lookupTimeoutMs()
      });
    } catch {
      return unapFailure({
        codigoMatricula: params.codigoMatricula,
        codigoCarrera: params.codigoCarrera,
        escuela: params.escuelaNombre ?? null,
        message: "El servicio de consulta no respondió. Puedes llenar los datos manualmente."
      });
    }

    const payload = await readJsonPayload(response);
    if (payload === malformedJson) {
      return unapFailure({
        codigoMatricula: params.codigoMatricula,
        codigoCarrera: params.codigoCarrera,
        escuela: params.escuelaNombre ?? null,
        message: "El servicio de consulta no respondió. Puedes llenar los datos manualmente."
      });
    }

    const result = normalizeUnapStudentResponse(payload, params);
    if (!result.ok && response.status >= 500) {
      return {
        ...result,
        message: "El servicio de consulta no respondió. Puedes llenar los datos manualmente."
      };
    }

    return result;
  }

  private async fetchUnapTeachers(params: UnapTeacherLookupParams): Promise<UnapTeacherLookupResult> {
    const query = normalizeTeacherQuery(params.query);
    const periodo = params.periodo?.trim() || teacherLookupPeriod();
    const termId = params.termId?.trim() || teacherLookupTermId();

    let response: { status: number; text: string };
    try {
      const url = buildUnapTeacherListUrl({ ...params, query, periodo, termId });
      response = await safeFetchUnapTeacher(url, {
        fetcher: this.options.fetcher,
        timeoutMs: lookupTimeoutMs()
      });
    } catch {
      return teacherFailure({
        query,
        periodo,
        termId,
        message: "El servicio de docentes no respondió. Puedes registrar manualmente."
      });
    }

    const payload = parseJsonText(response.text);
    if (payload === malformedJson) {
      return teacherFailure({
        query,
        periodo,
        termId,
        message: "El servicio de docentes no respondió. Puedes registrar manualmente."
      });
    }

    const result = normalizeUnapTeacherListResponse(payload, { query, periodo, termId });
    if (!result.ok && response.status >= 500) {
      return {
        ...result,
        message: "El servicio de docentes no respondió. Puedes registrar manualmente."
      };
    }

    return result;
  }

  private async fetchDniProxy(dni: string, cacheKey: string): Promise<DniLookupResult> {
    const proxySecret = dniProxySecret();
    if (!dniProxyBaseUrl() || !proxySecret) {
      return dniFailure("Consulta DNI no configurada", "peruapi", 500);
    }

    let response: Response;
    try {
      const url = buildDniProxyUrl();
      response = await safeFetchDniProxy(url, {
        dni,
        fetcher: this.options.fetcher ?? fetch,
        proxySecret,
        timeoutMs: dniProxyTimeoutMs()
      });
    } catch {
      return dniFailure("Servicio DNI no disponible", "peruapi", 503);
    }

    if (response.status === 400) {
      return dniFailure("Ingresa un DNI válido de 8 dígitos.", "peruapi", 400);
    }

    if (response.status === 401 || response.status === 403) {
      return dniFailure("Consulta DNI no autorizada", "peruapi", 401);
    }

    if (response.status === 429) {
      return dniFailure("Límite de consultas alcanzado", "peruapi", 429);
    }

    if (response.status === 404) {
      return dniFailure("DNI no encontrado", "peruapi", 404);
    }

    if (response.status === 504) {
      return dniFailure("Tiempo de espera agotado", "peruapi", 504);
    }

    const payload = await readJsonPayload(response);
    if (payload === malformedJson || response.status >= 500) {
      return dniFailure("Servicio DNI no disponible", "peruapi", 503);
    }

    if (!response.ok) {
      return dniFailure("Servicio DNI no disponible", "peruapi", 503);
    }

    const result = normalizeDniProxyResponse(payload, {
      dni,
      codigoMatricula: `NAC-${cacheKey.slice(4, 16).toUpperCase()}`
    });

    if (!result.ok) {
      return {
        ...result,
        httpStatus: 404,
        message: "DNI no encontrado"
      };
    }

    return result;
  }
}

export const identityLookupService = new IdentityLookupService();

export function buildUnapStudentUrl(params: UnapStudentLookupParams) {
  const codigoError = validateCodigoMatricula(params.codigoMatricula);
  if (codigoError) throw new Error(codigoError);

  const baseUrl = new URL(process.env.UNAP_LOOKUP_BASE_URL ?? "https://tramites.unap.edu.pe");
  if (baseUrl.protocol !== "https:" || baseUrl.hostname !== unapAllowedHost) {
    throw new Error("UNAP lookup base URL is not allowed");
  }

  const url = new URL(`/tramite/estudiante/${encodeURIComponent(params.codigoMatricula)}`, baseUrl);
  url.searchParams.set("carrera", params.codigoCarrera);
  return url;
}

export function buildUnapTeacherListUrl(params: UnapTeacherLookupParams) {
  const query = normalizeTeacherQuery(params.query);
  const queryError = validateUnapTeacherQuery(query);
  if (queryError) throw new Error(queryError);

  const baseUrl = new URL(
    process.env.UNAP_TEACHER_LOOKUP_BASE_URL ?? "https://sictransparencia.unap.edu.pe"
  );
  if (baseUrl.protocol !== "https:" || baseUrl.hostname !== unapTeacherAllowedHost) {
    throw new Error("UNAP teacher lookup base URL is not allowed");
  }

  const url = new URL("/plana-docente/docente/lista", baseUrl);
  const length = Math.min(Math.max(Math.trunc(params.length ?? 5), 1), 5);
  const columns = ["name", "dni", "condition", "dedication", ""];

  url.searchParams.set("draw", "1");
  url.searchParams.set("start", "0");
  url.searchParams.set("length", String(length));
  url.searchParams.set("search", query);
  url.searchParams.set("termId", params.termId?.trim() || teacherLookupTermId());
  url.searchParams.set("order[0][column]", "0");
  url.searchParams.set("order[0][dir]", "asc");

  columns.forEach((column, index) => {
    url.searchParams.set(`columns[${index}][data]`, column);
    url.searchParams.set(`columns[${index}][searchable]`, "true");
    url.searchParams.set(`columns[${index}][orderable]`, "false");
    url.searchParams.set(`columns[${index}][search][value]`, "");
    url.searchParams.set(`columns[${index}][search][regex]`, "false");
  });

  return url;
}

export function buildDniProxyUrl() {
  const baseUrlValue = dniProxyBaseUrl();
  if (!baseUrlValue) throw new Error("DNI proxy URL is not configured");

  const baseUrl = new URL(baseUrlValue);
  if (baseUrl.protocol !== "https:") {
    throw new Error("DNI proxy URL is not allowed");
  }

  return new URL("/dni", baseUrl);
}

export async function safeFetchUnap(
  url: URL,
  {
    fetcher = fetch,
    timeoutMs = defaultTimeoutMs
  }: {
    fetcher?: Fetcher;
    timeoutMs?: number;
  } = {}
) {
  if (url.protocol !== "https:" || url.hostname !== unapAllowedHost) {
    throw new Error("UNAP lookup URL is not allowed");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(url, {
      method: "GET",
      redirect: "error",
      credentials: "omit",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "campeonato-full/1.0 identity lookup"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function safeFetchUnapTeacher(
  url: URL,
  {
    fetcher,
    timeoutMs = defaultTimeoutMs
  }: {
    fetcher?: Fetcher;
    timeoutMs?: number;
  } = {}
): Promise<{ status: number; text: string }> {
  if (url.protocol !== "https:" || url.hostname !== unapTeacherAllowedHost) {
    throw new Error("UNAP teacher lookup URL is not allowed");
  }

  const headers = {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://sictransparencia.unap.edu.pe/plana-docente",
    "User-Agent": "campeonato-full/1.0 teacher identity lookup"
  };

  if (!fetcher && allowInsecureTeacherTls()) {
    return requestTextWithHttps(url, headers, { timeoutMs, rejectUnauthorized: false });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await (fetcher ?? fetch)(url, {
      method: "GET",
      redirect: "error",
      credentials: "omit",
      signal: controller.signal,
      headers
    });

    return {
      status: response.status,
      text: await response.text()
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function safeFetchDniProxy(
  url: URL,
  {
    dni,
    fetcher = fetch,
    proxySecret,
    timeoutMs = defaultTimeoutMs
  }: {
    dni: string;
    fetcher?: Fetcher;
    proxySecret: string;
    timeoutMs?: number;
  }
) {
  if (url.protocol !== "https:") {
    throw new Error("DNI proxy URL is not allowed");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetcher(url, {
      method: "POST",
      redirect: "error",
      credentials: "omit",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Proxy-Secret": proxySecret,
        "User-Agent": "campeonato-full/1.0 identity-lookup"
      },
      body: JSON.stringify({ dni })
    });
  } finally {
    clearTimeout(timeout);
  }
}

const malformedJson = Symbol("malformedJson");

async function readJsonPayload(response: Response): Promise<unknown | typeof malformedJson> {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return malformedJson;
  }
}

function parseJsonText(text: string): unknown | typeof malformedJson {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return malformedJson;
  }
}

function lookupTimeoutMs() {
  return positiveNumber(process.env.UNAP_LOOKUP_TIMEOUT_MS, defaultTimeoutMs);
}

function dniProxyTimeoutMs() {
  return positiveNumber(process.env.DNI_PROXY_TIMEOUT_MS, defaultTimeoutMs);
}

function cacheTtlMs() {
  const days = positiveNumber(process.env.IDENTITY_LOOKUP_CACHE_TTL_DAYS, defaultCacheTtlDays);
  return days * 24 * 60 * 60 * 1000;
}

function dniCacheTtlMs() {
  const days = positiveNumber(process.env.DNI_LOOKUP_CACHE_TTL_DAYS, defaultDniCacheTtlDays);
  return days * 24 * 60 * 60 * 1000;
}

function teacherLookupPeriod() {
  return process.env.UNAP_TEACHER_LOOKUP_PERIOD?.trim() || defaultTeacherPeriod;
}

function teacherLookupTermId() {
  return process.env.UNAP_TEACHER_LOOKUP_TERM_ID?.trim() || defaultTeacherTermId;
}

function dniProxyBaseUrl() {
  return process.env.DNI_PROXY_URL?.trim() || "";
}

function dniProxySecret() {
  return process.env.DNI_PROXY_SECRET?.trim() || "";
}

function allowInsecureTeacherTls() {
  const value = process.env.UNAP_TEACHER_LOOKUP_ALLOW_INSECURE_TLS;
  if (value !== undefined) {
    return ["true", "1", "yes"].includes(value.trim().toLowerCase());
  }

  return process.env.NODE_ENV !== "production";
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envEnabled(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return !["false", "0", "no"].includes(value.trim().toLowerCase());
}

function hashLookupKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requestTextWithHttps(
  url: URL,
  headers: Record<string, string>,
  {
    timeoutMs,
    rejectUnauthorized
  }: {
    timeoutMs: number;
    rejectUnauthorized: boolean;
  }
) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: "GET",
        headers,
        timeout: timeoutMs,
        rejectUnauthorized
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf-8")
          });
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Request timeout"));
    });
    request.on("error", reject);
    request.end();
  });
}

function unapFailure({
  codigoMatricula,
  codigoCarrera,
  escuela = null,
  message
}: {
  codigoMatricula?: string;
  codigoCarrera?: string;
  escuela?: string | null;
  message: string;
}): IdentityLookupResult {
  return {
    ok: false,
    source: "unap_tramites",
    codigoMatricula,
    codigoCarrera,
    escuela,
    fullName: null,
    dni: null,
    rawAvailableFields: [],
    message
  };
}

function dniFailure(
  message: string,
  source: DniLookupResult["source"] = "peruapi",
  httpStatus = 400
): DniLookupResult {
  return {
    ok: false,
    source,
    escuela: null,
    fullName: null,
    dni: null,
    rawAvailableFields: [],
    httpStatus,
    message
  };
}

function teacherFailure({
  query,
  periodo,
  termId,
  message
}: {
  query: string;
  periodo: string;
  termId: string;
  message: string;
}): UnapTeacherLookupResult {
  return {
    ok: false,
    source: "unap_docentes",
    query,
    periodo,
    termId,
    recordsFiltered: null,
    results: [],
    message
  };
}
