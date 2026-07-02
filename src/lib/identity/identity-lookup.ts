import { findUnapCareerByCode } from "../../data/unapCareers";

export const identityConsentTextVersion = "identity_lookup_v1_2026-07";

export type IdentitySource =
  | "manual"
  | "unap_tramites"
  | "dni_provider"
  | "unap_docentes"
  | "peruapi";
export type VerificationStatus = "unverified" | "auto_filled" | "confirmed" | "manual_review";
export type DocumentType = "DNI" | "UNAP_CODE" | "MANUAL";

export type UnapStudentLookupParams = {
  codigoMatricula: string;
  codigoCarrera: string;
  escuelaNombre?: string;
};

export type IdentityLookupResult = {
  ok: boolean;
  source: "unap_tramites" | "dni_provider" | "peruapi";
  codigoMatricula?: string;
  codigoCarrera?: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  escuela: string | null;
  fullName: string | null;
  dni: string | null;
  rawAvailableFields: string[];
  message: string;
};

export type DniLookupResult = IdentityLookupResult & {
  source: "dni_provider" | "peruapi";
};

export type UnapTeacherLookupParams = {
  query: string;
  periodo?: string;
  termId?: string;
  length?: number;
};

export type UnapTeacherLookupItem = {
  source: "unap_docentes";
  sourceId: string;
  periodo: string;
  termId: string;
  fullName: string;
  dni: string | null;
  condition: string | null;
  dedication: string | null;
  rawAvailableFields: string[];
};

export type UnapTeacherLookupResult = {
  ok: boolean;
  source: "unap_docentes";
  query: string;
  periodo: string;
  termId: string;
  recordsFiltered: number | null;
  results: UnapTeacherLookupItem[];
  message: string;
};

export type PublicIdentityLookupData = {
  codigoMatricula?: string;
  codigoCarrera?: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  escuela: string | null;
  fullName: string | null;
  dniMasked: string | null;
  dni?: string | null;
};

export type PublicUnapTeacherLookupData = {
  sourceId: string;
  periodo: string;
  fullName: string;
  dniMasked: string | null;
  dni?: string | null;
  condition: string | null;
  dedication: string | null;
  studentCode: string;
};

export function validateCodigoMatricula(value: string) {
  const normalized = value.trim();
  if (!normalized) return "Ingresa un código de matrícula válido.";
  if (!/^\d{4,12}$/.test(normalized)) return "Ingresa un código de matrícula válido.";
  return null;
}

export function validateDni(value: string) {
  const normalized = value.trim();
  if (normalized !== value || !/^\d{8}$/.test(normalized)) {
    return "Ingresa un DNI válido de 8 dígitos.";
  }
  return null;
}

export function validateUnapTeacherQuery(value: string) {
  const normalized = normalizeTeacherQuery(value);
  if (normalized.length < 3) return "Ingresa al menos 3 letras del nombre o apellido del docente.";
  if (normalized.length > 80) return "La búsqueda de docente es demasiado larga.";
  return null;
}

export function normalizeTeacherQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateUnapStudentLookupInput(params: UnapStudentLookupParams):
  | {
      ok: true;
      value: UnapStudentLookupParams;
    }
  | {
      ok: false;
      message: string;
    } {
  const codigoMatricula = params.codigoMatricula.trim();
  const codigoCarrera = params.codigoCarrera.trim();
  const escuelaNombre = params.escuelaNombre?.trim();

  if (!codigoCarrera) {
    return { ok: false, message: "Selecciona una escuela profesional." };
  }

  const career = findUnapCareerByCode(codigoCarrera);
  if (!career) {
    return { ok: false, message: "Selecciona una escuela profesional válida." };
  }

  const codigoError = validateCodigoMatricula(codigoMatricula);
  if (codigoError) {
    return { ok: false, message: codigoError };
  }

  return {
    ok: true,
    value: {
      codigoMatricula,
      codigoCarrera,
      escuelaNombre: escuelaNombre || career.name
    }
  };
}

export function validateConsentAccepted(accepted: boolean) {
  return accepted
    ? null
    : "Acepta y confirma que cuentas con autorización para registrar estos datos.";
}

export function canSubmitUnapLookup({
  consentAccepted,
  codigoMatricula,
  codigoCarrera
}: {
  consentAccepted: boolean;
  codigoMatricula: string;
  codigoCarrera: string;
}) {
  const consentError = validateConsentAccepted(consentAccepted);
  if (consentError) return { ok: false as const, message: consentError };

  return validateUnapStudentLookupInput({ codigoMatricula, codigoCarrera });
}

export function normalizeUnapStudentResponse(
  payload: unknown,
  params: UnapStudentLookupParams
): IdentityLookupResult {
  const estudiante = extractEstudiante(payload);
  const rawAvailableFields = estudiante ? Object.keys(estudiante) : [];
  const fullName = stringField(estudiante, "nombre") ?? stringField(estudiante, "nombres");
  const escuela = stringField(estudiante, "escuela") ?? params.escuelaNombre ?? null;
  const dni = stringField(estudiante, "dni");
  const codigoCarrera = stringField(estudiante, "codigo_carrera") ?? params.codigoCarrera;

  if (!fullName) {
    return {
      ok: false,
      source: "unap_tramites",
      codigoMatricula: params.codigoMatricula,
      codigoCarrera,
      escuela,
      fullName: null,
      dni: dni ?? null,
      rawAvailableFields,
      message: "No se encontró estudiante con ese código y escuela."
    };
  }

  return {
    ok: true,
    source: "unap_tramites",
    codigoMatricula: params.codigoMatricula,
    codigoCarrera,
    escuela,
    fullName,
    dni: dni ?? null,
    rawAvailableFields,
    message: "Datos encontrados. Verifica que correspondan al participante."
  };
}

export function toPublicIdentityLookupData(
  result: IdentityLookupResult,
  { includeDni = false }: { includeDni?: boolean } = {}
): PublicIdentityLookupData {
  return {
    codigoMatricula: result.codigoMatricula,
    codigoCarrera: result.codigoCarrera,
    nombres: result.nombres,
    apellidoPaterno: result.apellidoPaterno,
    apellidoMaterno: result.apellidoMaterno,
    escuela: result.escuela,
    fullName: result.fullName,
    dniMasked: maskDni(result.dni),
    ...(includeDni ? { dni: result.dni } : {})
  };
}

export function normalizePeruApiDniResponse(
  payload: unknown,
  {
    dni,
    codigoMatricula
  }: {
    dni: string;
    codigoMatricula?: string;
  }
): DniLookupResult {
  const root = isRecord(payload) ? payload : null;
  const data = firstRecord(root?.data, root?.result, root?.persona, root);
  const rawAvailableFields = data ? Object.keys(data) : [];

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
    joinNameParts(nombres, apellidoPaterno, apellidoMaterno);
  const responseDni = stringField(data, "dni") ?? stringField(data, "numero") ?? dni;

  if (!fullName) {
    return {
      ok: false,
      source: "peruapi",
      codigoMatricula,
      nombres: nombres ?? null,
      apellidoPaterno: apellidoPaterno ?? null,
      apellidoMaterno: apellidoMaterno ?? null,
      escuela: null,
      fullName: null,
      dni: responseDni,
      rawAvailableFields,
      message: "No se encontraron datos para el DNI ingresado."
    };
  }

  return {
    ok: true,
    source: "peruapi",
    codigoMatricula,
    nombres: nombres ?? null,
    apellidoPaterno: apellidoPaterno ?? null,
    apellidoMaterno: apellidoMaterno ?? null,
    escuela: "Consulta nacional DNI",
    fullName,
    dni: responseDni,
    rawAvailableFields,
    message: "Datos encontrados. Verifica que correspondan al participante."
  };
}

export function normalizeUnapTeacherListResponse(
  payload: unknown,
  params: Required<Pick<UnapTeacherLookupParams, "query" | "periodo" | "termId">>
): UnapTeacherLookupResult {
  const root = isRecord(payload) ? payload : null;
  const rows = Array.isArray(root?.data) ? root.data : [];
  const results = rows
    .filter(isRecord)
    .map((row): UnapTeacherLookupItem | null => {
      const fullName = stringField(row, "name");
      const sourceId = stringField(row, "id");
      if (!fullName || !sourceId) return null;

      return {
        source: "unap_docentes",
        sourceId,
        periodo: params.periodo,
        termId: params.termId,
        fullName,
        dni: stringField(row, "dni"),
        condition: stringField(row, "condition"),
        dedication: stringField(row, "dedication"),
        rawAvailableFields: Object.keys(row)
      };
    })
    .filter((item): item is UnapTeacherLookupItem => Boolean(item));

  const recordsFilteredValue = root?.recordsFiltered;
  const recordsFiltered =
    typeof recordsFilteredValue === "number" && Number.isFinite(recordsFilteredValue)
      ? recordsFilteredValue
      : null;

  return {
    ok: results.length > 0,
    source: "unap_docentes",
    query: params.query,
    periodo: params.periodo,
    termId: params.termId,
    recordsFiltered,
    results,
    message:
      results.length > 0
        ? "Docentes encontrados. Selecciona y verifica el participante."
        : "No se encontró docente en la plana docente del periodo seleccionado."
  };
}

export function toPublicUnapTeacherLookupData(
  result: UnapTeacherLookupItem,
  { includeDni = false }: { includeDni?: boolean } = {}
): PublicUnapTeacherLookupData {
  return {
    sourceId: result.sourceId,
    periodo: result.periodo,
    fullName: result.fullName,
    dniMasked: maskDni(result.dni),
    ...(includeDni ? { dni: result.dni } : {}),
    condition: result.condition,
    dedication: result.dedication,
    studentCode: teacherStorageCodeFromSource(result.sourceId, result.dni)
  };
}

export function teacherStorageCodeFromSource(sourceId: string | null | undefined, dni?: string | null) {
  const cleanId = (sourceId ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase();
  if (cleanId) return `DOC-${cleanId}`;

  const dniDigits = (dni ?? "").replace(/\D/g, "");
  if (dniDigits) return `DOC-DNI-${dniDigits.slice(-4)}`;

  return "DOCENTE-UNA";
}

export function maskDni(dni: string | null | undefined) {
  if (!dni) return null;
  const digits = dni.replace(/\D/g, "");
  if (digits.length <= 2) return "*".repeat(digits.length);
  return `${"*".repeat(Math.max(digits.length - 2, 0))}${digits.slice(-2)}`;
}

export function splitFullNameForForm(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };

  return {
    firstName: parts.slice(0, -2).join(" "),
    lastName: parts.slice(-2).join(" ")
  };
}

export function applyIdentityLookupToPlayerDraft<T extends { semester: string }>(
  draft: T,
  result: IdentityLookupResult
) {
  const { firstName, lastName } = splitFullNameForForm(result.fullName);

  return {
    ...draft,
    firstName,
    lastName,
    dni: result.dni ?? "",
    studentCode: result.codigoMatricula ?? "",
    codigoCarrera: result.codigoCarrera ?? "",
    escuela: result.escuela ?? "",
    documentType: result.source === "unap_tramites" ? "UNAP_CODE" : "DNI",
    identitySource: result.source,
    verificationStatus: "auto_filled"
  };
}

function extractEstudiante(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;

  const data = payload.data;
  if (isRecord(data) && isRecord(data.estudiante)) return data.estudiante;
  if (data === null) return null;
  if (isRecord(payload.estudiante)) return payload.estudiante;

  return null;
}

function stringField(source: Record<string, unknown> | null, field: string) {
  const value = source?.[field];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstRecord(...values: unknown[]) {
  return values.find(isRecord) ?? null;
}

function joinNameParts(
  nombres: string | null | undefined,
  apellidoPaterno: string | null | undefined,
  apellidoMaterno: string | null | undefined
) {
  const fullName = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ").trim();
  return fullName || null;
}
