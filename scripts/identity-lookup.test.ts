import assert from "node:assert/strict";
import test from "node:test";
import {
  applyIdentityLookupToPlayerDraft,
  canSubmitUnapLookup,
  normalizeUnapTeacherListResponse,
  normalizeDniProxyResponse,
  normalizeUnapStudentResponse,
  teacherStorageCodeFromSource,
  validateCodigoMatricula,
  validateConsentAccepted,
  validateDni,
  validateUnapTeacherQuery
} from "../src/lib/identity/identity-lookup";
import { createMemoryRateLimiter } from "../src/lib/identity/rate-limit";

const unapParams = {
  codigoMatricula: "227368",
  codigoCarrera: "36",
  escuelaNombre: "INGENIERÍA MECÁNICA ELÉCTRICA"
};

test("validates DNI as exactly 8 digits", () => {
  assert.equal(validateDni("12345678"), null);
  assert.match(validateDni("1234567") ?? "", /8/);
  assert.match(validateDni("1234567A") ?? "", /8/);
  assert.match(validateDni(" 12345678") ?? "", /8/);
});

test("validates matrícula code as 4 to 12 digits", () => {
  assert.equal(validateCodigoMatricula("227368"), null);
  assert.match(validateCodigoMatricula("123") ?? "", /matrícula/);
  assert.match(validateCodigoMatricula("1234567890123") ?? "", /matrícula/);
  assert.match(validateCodigoMatricula("https://tramites.unap.edu.pe") ?? "", /matrícula/);
});

test("normalizes UNAP response with data.estudiante even when status is false", () => {
  const result = normalizeUnapStudentResponse(
    {
      status: false,
      data: {
        estudiante: {
          nombre: "JUAN PEREZ QUISPE",
          escuela: "INGENIERÍA MECÁNICA ELÉCTRICA",
          codigo_carrera: "36",
          dni: "12345678"
        }
      }
    },
    unapParams
  );

  assert.equal(result.ok, true);
  assert.equal(result.fullName, "JUAN PEREZ QUISPE");
  assert.equal(result.escuela, "INGENIERÍA MECÁNICA ELÉCTRICA");
  assert.equal(result.dni, "12345678");
  assert.deepEqual(result.rawAvailableFields, ["nombre", "escuela", "codigo_carrera", "dni"]);
});

test("normalizes current UNAP response with root estudiante.nombres", () => {
  const result = normalizeUnapStudentResponse(
    {
      status: false,
      deuda: "",
      estudiante: {
        nombres: "AQUILES TAYLOR RAMOS YAPO",
        escuela: "INGENIERÍA MECÁNICA ELÉCTRICA",
        codigo_carrera: "36",
        dni: "74396959"
      }
    },
    unapParams
  );

  assert.equal(result.ok, true);
  assert.equal(result.fullName, "AQUILES TAYLOR RAMOS YAPO");
  assert.equal(result.codigoCarrera, "36");
});

test("returns not found when UNAP response has no estudiante", () => {
  const result = normalizeUnapStudentResponse({ data: null }, unapParams);

  assert.equal(result.ok, false);
  assert.equal(result.fullName, null);
  assert.equal(result.message, "No se encontró estudiante con ese código y escuela.");
});

test("normalizes public UNA teacher list rows", () => {
  const result = normalizeUnapTeacherListResponse(
    {
      recordsFiltered: 1,
      data: [
        {
          id: "0f48b1ef-6d56-4aab-91ee-1dea720568ff",
          name: "DOCENTE UNA EJEMPLO",
          dni: "12345678",
          condition: "NOMBRADO",
          dedication: "TIEMPO COMPLETO"
        }
      ]
    },
    {
      query: "DOCENTE",
      periodo: "2026-I",
      termId: "term-id"
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.recordsFiltered, 1);
  assert.equal(result.results[0]?.fullName, "DOCENTE UNA EJEMPLO");
  assert.equal(result.results[0]?.source, "unap_docentes");
  assert.deepEqual(result.results[0]?.rawAvailableFields, [
    "id",
    "name",
    "dni",
    "condition",
    "dedication"
  ]);
});

test("teacher lookup query requires at least three letters", () => {
  assert.match(validateUnapTeacherQuery("AB") ?? "", /3/);
  assert.equal(validateUnapTeacherQuery("PEREZ"), null);
});

test("teacher storage reference is derived from public source id", () => {
  assert.equal(
    teacherStorageCodeFromSource("0f48b1ef-6d56-4aab-91ee-1dea720568ff"),
    "DOC-0F48B1EF6D56"
  );
});

test("normalizes DNI proxy response", () => {
  const result = normalizeDniProxyResponse(
    {
      ok: true,
      dni: "12345678",
      cliente: "JUAN CARLOS PEREZ QUISPE",
      nombres: "JUAN CARLOS",
      apellido_paterno: "PEREZ",
      apellido_materno: "QUISPE"
    },
    { dni: "12345678", codigoMatricula: "NAC-TEST" }
  );

  assert.equal(result.ok, true);
  assert.equal(result.source, "peruapi");
  assert.equal(result.fullName, "JUAN CARLOS PEREZ QUISPE");
  assert.equal(result.codigoMatricula, "NAC-TEST");
});

test("rate limiter blocks requests after the configured window quota", () => {
  let now = 1000;
  const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 60_000, now: () => now });

  assert.equal(limiter.check("unap:127.0.0.1").allowed, true);
  assert.equal(limiter.check("unap:127.0.0.1").allowed, true);
  assert.equal(limiter.check("unap:127.0.0.1").allowed, false);

  now += 60_000;
  assert.equal(limiter.check("unap:127.0.0.1").allowed, true);
});

test("consent is required before submitting identity data", () => {
  assert.equal(validateConsentAccepted(true), null);
  assert.match(validateConsentAccepted(false) ?? "", /autorización/);
});

test("frontend lookup guard blocks missing school or code", () => {
  assert.equal(
    canSubmitUnapLookup({
      consentAccepted: true,
      codigoMatricula: "227368",
      codigoCarrera: "36"
    }).ok,
    true
  );
  assert.equal(
    canSubmitUnapLookup({
      consentAccepted: true,
      codigoMatricula: "",
      codigoCarrera: "36"
    }).ok,
    false
  );
  assert.equal(
    canSubmitUnapLookup({
      consentAccepted: true,
      codigoMatricula: "227368",
      codigoCarrera: ""
    }).ok,
    false
  );
});

test("applying lookup keeps semester manual", () => {
  const result = normalizeUnapStudentResponse(
    {
      data: {
        estudiante: {
          nombre: "JUAN PEREZ QUISPE",
          escuela: "INGENIERÍA MECÁNICA ELÉCTRICA",
          dni: "12345678"
        }
      }
    },
    unapParams
  );

  const draft = applyIdentityLookupToPlayerDraft({ semester: "V" }, result);

  assert.equal(draft.firstName, "JUAN");
  assert.equal(draft.lastName, "PEREZ QUISPE");
  assert.equal(draft.semester, "V");
});
