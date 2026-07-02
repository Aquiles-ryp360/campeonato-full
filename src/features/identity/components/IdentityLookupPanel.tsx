"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, IdCard, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge, Field, inputClass } from "@/components/ui";
import { defaultUnapCareerCode, unapCareers } from "@/data/unapCareers";
import {
  canSubmitUnapLookup,
  normalizeTeacherQuery,
  splitFullNameForForm,
  validateDni,
  type IdentitySource,
  type PublicUnapTeacherLookupData,
  type VerificationStatus
} from "@/lib/identity/identity-lookup";

type LookupMode = "student" | "teacher" | "national";

export type IdentityLookupApplyPayload = {
  firstName: string;
  lastName: string;
  dni: string;
  studentCode: string;
  codigoCarrera: string;
  escuela: string;
  documentType: "DNI" | "UNAP_CODE" | "MANUAL";
  identitySource: IdentitySource;
  verificationStatus: VerificationStatus;
};

type StudentLookupResponse = {
  ok: boolean;
  data?: {
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
  source?: IdentitySource;
  message: string;
};

type TeacherLookupResponse = {
  ok: boolean;
  source?: "unap_docentes";
  periodo?: string;
  recordsFiltered?: number | null;
  results?: PublicUnapTeacherLookupData[];
  message: string;
};

export function IdentityLookupPanel({
  consentAccepted,
  disabled = false,
  currentStudentCode = "",
  currentCareerCode = "",
  onApply
}: {
  consentAccepted: boolean;
  disabled?: boolean;
  currentStudentCode?: string;
  currentCareerCode?: string;
  onApply: (payload: IdentityLookupApplyPayload) => void;
}) {
  const [mode, setMode] = useState<LookupMode>("student");
  const [codigoMatricula, setCodigoMatricula] = useState(currentStudentCode);
  const [codigoCarrera, setCodigoCarrera] = useState(currentCareerCode || defaultUnapCareerCode);
  const [studentResult, setStudentResult] = useState<StudentLookupResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isStudentSearching, setIsStudentSearching] = useState(false);
  const [teacherQuery, setTeacherQuery] = useState("");
  const [teacherResults, setTeacherResults] = useState<PublicUnapTeacherLookupData[]>([]);
  const [teacherCache, setTeacherCache] = useState<Record<string, PublicUnapTeacherLookupData[]>>({});
  const [teacherMessage, setTeacherMessage] = useState("");
  const [isTeacherSearching, setIsTeacherSearching] = useState(false);
  const [nationalDni, setNationalDni] = useState("");
  const [nationalResult, setNationalResult] = useState<StudentLookupResponse | null>(null);
  const [nationalConfirmed, setNationalConfirmed] = useState(false);
  const [isNationalSearching, setIsNationalSearching] = useState(false);

  const visibleTeacherResults = useMemo(
    () => rankTeacherResults(teacherResults, teacherQuery),
    [teacherQuery, teacherResults]
  );

  const fetchTeacherSuggestions = useCallback(
    async (query: string, signal: AbortSignal) => {
      setIsTeacherSearching(true);
      setTeacherMessage("");

      try {
        const response = await fetch("/api/identity/unap-teacher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, consentAccepted }),
          signal
        });
        const payload = (await response.json().catch(() => null)) as TeacherLookupResponse | null;
        const results = payload?.results ?? [];

        if (!response.ok || !payload?.ok) {
          setTeacherCache((current) => ({ ...current, [cacheKey(query)]: [] }));
          setTeacherResults([]);
          setTeacherMessage(payload?.message ?? "No se encontraron docentes.");
          return;
        }

        setTeacherCache((current) => ({ ...current, [cacheKey(query)]: results }));
        setTeacherResults(results);
        setTeacherMessage(results.length ? "" : "Sin coincidencias.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTeacherMessage("No se pudo consultar docentes. Puedes registrar manualmente.");
      } finally {
        if (!signal.aborted) setIsTeacherSearching(false);
      }
    },
    [consentAccepted]
  );

  useEffect(() => {
    setCodigoMatricula(currentStudentCode);
  }, [currentStudentCode]);

  useEffect(() => {
    setCodigoCarrera(currentCareerCode || defaultUnapCareerCode);
  }, [currentCareerCode]);

  useEffect(() => {
    if (mode !== "teacher") return;

    const query = normalizeTeacherQuery(teacherQuery);
    if (query.length < 3 || disabled) {
      setTeacherResults([]);
      setTeacherMessage(query ? "Ingresa al menos 3 letras." : "");
      setIsTeacherSearching(false);
      return;
    }

    if (!consentAccepted) {
      setTeacherResults([]);
      setTeacherMessage("Acepta la autorización para buscar docentes.");
      setIsTeacherSearching(false);
      return;
    }

    const cached = teacherCache[cacheKey(query)];
    if (cached) {
      setTeacherResults(cached);
      setTeacherMessage(cached.length ? "" : "Sin coincidencias.");
      setIsTeacherSearching(false);
      return;
    }

    const nearbyCached = findCachedTeacherResults(teacherCache, query);
    if (nearbyCached) {
      setTeacherResults(nearbyCached);
      setTeacherMessage("");
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchTeacherSuggestions(query, controller.signal);
    }, 750);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [consentAccepted, disabled, fetchTeacherSuggestions, mode, teacherCache, teacherQuery]);

  async function searchStudent() {
    const validation = canSubmitUnapLookup({
      consentAccepted,
      codigoMatricula,
      codigoCarrera
    });
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setIsStudentSearching(true);
    setStudentResult(null);
    setConfirmed(false);

    try {
      const response = await fetch("/api/identity/unap-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoMatricula,
          codigoCarrera,
          consentAccepted
        })
      });
      const payload = (await response.json().catch(() => null)) as StudentLookupResponse | null;
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.message ?? "No se encontraron datos con ese código y escuela.");
        return;
      }

      setStudentResult(payload);
      toast.success(payload.message);
    } catch {
      toast.error("El servicio de consulta no respondió. Puedes llenar los datos manualmente.");
    } finally {
      setIsStudentSearching(false);
    }
  }

  async function searchNationalDni() {
    const dniError = validateDni(nationalDni);
    if (dniError) {
      toast.error(dniError);
      return;
    }

    if (!consentAccepted) {
      toast.error("Acepta la autorización para buscar por DNI.");
      return;
    }

    setIsNationalSearching(true);
    setNationalResult(null);
    setNationalConfirmed(false);

    try {
      const response = await fetch("/api/identity/dni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: nationalDni, consentAccepted })
      });
      const payload = (await response.json().catch(() => null)) as StudentLookupResponse | null;
      if (!response.ok || !payload?.ok) {
        toast.message(payload?.message ?? "No se encontraron datos para el DNI ingresado.");
        return;
      }

      setNationalResult(payload);
      toast.success(payload.message);
    } catch {
      toast.error("El servicio de consulta DNI no respondió. Puedes llenar los datos manualmente.");
    } finally {
      setIsNationalSearching(false);
    }
  }

  function applyStudentResult() {
    if (!studentResult?.data?.fullName || !confirmed) {
      toast.error("Verifica que los datos correspondan al participante antes de continuar.");
      return;
    }

    const { firstName, lastName } = splitFullNameForForm(studentResult.data.fullName);
    onApply({
      firstName,
      lastName,
      dni: studentResult.data.dni ?? "",
      studentCode: studentResult.data.codigoMatricula ?? codigoMatricula,
      codigoCarrera: studentResult.data.codigoCarrera ?? codigoCarrera,
      escuela: studentResult.data.escuela ?? "",
      documentType: "UNAP_CODE",
      identitySource: studentResult.source ?? "unap_tramites",
      verificationStatus: "confirmed"
    });
    toast.success("Datos del estudiante copiados al formulario.");
  }

  function applyTeacherResult(teacher: PublicUnapTeacherLookupData) {
    const { firstName, lastName } = splitFullNameForForm(teacher.fullName);
    const teacherDetail = ["DOCENTE UNA", teacher.condition, teacher.dedication]
      .filter(Boolean)
      .join(" · ");

    onApply({
      firstName,
      lastName,
      dni: teacher.dni ?? "",
      studentCode: teacher.studentCode,
      codigoCarrera: "",
      escuela: teacherDetail,
      documentType: "DNI",
      identitySource: "unap_docentes",
      verificationStatus: "confirmed"
    });
    toast.success("Docente copiado al formulario. Verifica los datos antes de enviar.");
  }

  function applyNationalResult() {
    const data = nationalResult?.data;
    const source = nationalResult?.source ?? "peruapi";
    if (!data?.fullName || !nationalConfirmed) {
      toast.error("Verifica que los datos correspondan al participante antes de continuar.");
      return;
    }

    const fallbackName = splitFullNameForForm(data.fullName);
    onApply({
      firstName: data.nombres ?? fallbackName.firstName,
      lastName:
        [data.apellidoPaterno, data.apellidoMaterno].filter(Boolean).join(" ") ||
        fallbackName.lastName,
      dni: data.dni ?? nationalDni,
      studentCode: data.codigoMatricula ?? "",
      codigoCarrera: "",
      escuela: "Consulta nacional DNI",
      documentType: "DNI",
      identitySource: source,
      verificationStatus: "confirmed"
    });
    toast.success("Datos nacionales copiados al formulario.");
  }

  function switchMode(nextMode: LookupMode) {
    setMode(nextMode);
    setStudentResult(null);
    setConfirmed(false);
    setNationalResult(null);
    setNationalConfirmed(false);
    setTeacherMessage("");
  }

  return (
    <div className="rounded-md border border-brand-towerMid/25 bg-brand-wash/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-white text-brand-electric">
            <IdCard className="h-4 w-4" />
          </div>
          <p className="text-sm font-bold text-ink">Búsqueda rápida</p>
        </div>
        <div className="grid grid-cols-3 rounded-md border border-brand-towerMid/25 bg-white p-1 text-xs font-bold">
          <button
            type="button"
            className={`rounded px-2 py-1.5 sm:px-3 ${mode === "student" ? "bg-brand-electric text-white" : "text-brand-muted hover:bg-brand-electric/10 hover:text-brand-electric"}`}
            onClick={() => switchMode("student")}
          >
            Búsqueda estudiante
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1.5 sm:px-3 ${mode === "teacher" ? "bg-brand-electric text-white" : "text-brand-muted hover:bg-brand-electric/10 hover:text-brand-electric"}`}
            onClick={() => switchMode("teacher")}
          >
            Búsqueda docente
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1.5 sm:px-3 ${mode === "national" ? "bg-brand-electric text-white" : "text-brand-muted hover:bg-brand-electric/10 hover:text-brand-electric"}`}
            onClick={() => switchMode("national")}
          >
            Búsqueda nacional
          </button>
        </div>
      </div>

      {mode === "student" ? (
        <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto] md:items-end">
          <Field label="Escuela Profesional">
            <select
              className={inputClass}
              value={codigoCarrera}
              disabled={disabled || isStudentSearching}
              onChange={(event) => setCodigoCarrera(event.target.value)}
            >
              <option value={defaultUnapCareerCode}>INGENIERÍA MECÁNICA ELÉCTRICA</option>
              <option value="__select_other__" disabled>
                Seleccionar otra carrera
              </option>
              {unapCareers.filter((career) => career.code !== defaultUnapCareerCode).map((career) => (
                <option key={career.code} value={career.code}>
                  {career.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Código de matrícula">
            <input
              className={inputClass}
              value={codigoMatricula}
              disabled={disabled || isStudentSearching}
              onChange={(event) => setCodigoMatricula(event.target.value)}
              placeholder="Ej. 227368"
              inputMode="numeric"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isStudentSearching}
            onClick={() => void searchStudent()}
          >
            <Search className="h-4 w-4" />
            {isStudentSearching ? "Buscando..." : "Buscar estudiante"}
          </Button>
        </div>
      ) : mode === "teacher" ? (
        <div className="mt-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Nombre o apellido del docente">
              <input
                className={inputClass}
                value={teacherQuery}
                disabled={disabled}
                onChange={(event) => setTeacherQuery(event.target.value)}
                placeholder="Ej. PEREZ"
                autoComplete="off"
              />
            </Field>
            <div className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-brand-towerMid/25">
              <Search className="h-4 w-4" />
              {isTeacherSearching ? "Buscando..." : "Sugerencias"}
            </div>
          </div>

          {visibleTeacherResults.length ? (
            <div className="mt-3 grid gap-2">
              {visibleTeacherResults.map((teacher) => (
                <button
                  key={`${teacher.sourceId}-${teacher.fullName}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => applyTeacherResult(teacher)}
                  className="flex min-h-[68px] w-full items-center justify-between gap-3 rounded-md border border-brand-towerMid/25 bg-white px-3 py-2 text-left transition hover:border-brand-electric/40 hover:bg-white"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-electric/10 text-brand-electric">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{teacher.fullName}</span>
                      <span className="mt-0.5 block truncate text-xs text-brand-muted">
                        DNI {teacher.dniMasked ?? "no informado"} · {teacher.condition ?? "Clase no informada"} ·{" "}
                        {teacher.dedication ?? "Dedicación no informada"}
                      </span>
                    </span>
                  </span>
                  <Badge tone="green">Usar</Badge>
                </button>
              ))}
            </div>
          ) : teacherMessage ? (
            <p className="mt-3 rounded-md border border-brand-towerMid/25 bg-white px-3 py-2 text-sm font-semibold text-brand-muted">
              {teacherMessage}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="DNI nacional">
            <input
              className={inputClass}
              value={nationalDni}
              disabled={disabled || isNationalSearching}
              onChange={(event) => setNationalDni(event.target.value)}
              placeholder="8 dígitos"
              inputMode="numeric"
              autoComplete="off"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isNationalSearching}
            onClick={() => void searchNationalDni()}
          >
            <Search className="h-4 w-4" />
            {isNationalSearching ? "Buscando..." : "Buscar DNI"}
          </Button>
        </div>
      )}

      {studentResult?.ok && studentResult.data ? (
        <div className="mt-3 rounded-md border border-brand-electric/20 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-ink">{studentResult.data.fullName}</p>
              <p className="mt-1 text-xs text-brand-muted">
                {studentResult.data.escuela ?? "Escuela no informada"} · Código{" "}
                {studentResult.data.codigoMatricula ?? codigoMatricula}
              </p>
              {studentResult.data.dniMasked ? (
                <p className="mt-1 text-xs text-brand-muted">DNI {studentResult.data.dniMasked}</p>
              ) : null}
            </div>
            <Badge tone="green">Datos encontrados</Badge>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-ink">
            <input
              className="mt-1 h-4 w-4 rounded border-brand-towerMid/40 text-brand-electric focus:ring-brand-electric"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>Confirmo que estos datos corresponden al participante.</span>
          </label>
          <div className="mt-3">
            <Button type="button" disabled={!confirmed} onClick={applyStudentResult}>
              <CheckCircle2 className="h-4 w-4" />
              Usar datos
            </Button>
          </div>
        </div>
      ) : null}

      {nationalResult?.ok && nationalResult.data ? (
        <div className="mt-3 rounded-md border border-brand-electric/20 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-ink">{nationalResult.data.fullName}</p>
              {nationalResult.data.dniMasked ? (
                <p className="mt-1 text-xs text-brand-muted">DNI {nationalResult.data.dniMasked}</p>
              ) : null}
              <p className="mt-1 text-xs text-brand-muted">Fuente: Consulta DNI nacional</p>
            </div>
            <Badge tone="blue">Datos encontrados</Badge>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-ink">
            <input
              className="mt-1 h-4 w-4 rounded border-brand-towerMid/40 text-brand-electric focus:ring-brand-electric"
              type="checkbox"
              checked={nationalConfirmed}
              onChange={(event) => setNationalConfirmed(event.target.checked)}
            />
            <span>Confirmo que estos datos corresponden al participante.</span>
          </label>
          <div className="mt-3">
            <Button type="button" disabled={!nationalConfirmed} onClick={applyNationalResult}>
              <CheckCircle2 className="h-4 w-4" />
              Usar estos datos
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function cacheKey(query: string) {
  return foldSearchText(query);
}

function findCachedTeacherResults(
  cache: Record<string, PublicUnapTeacherLookupData[]>,
  query: string
) {
  const foldedQuery = foldSearchText(query);
  const prefixKey = Object.keys(cache)
    .filter((key) => foldedQuery.startsWith(key))
    .sort((left, right) => right.length - left.length)[0];

  if (!prefixKey) return null;
  const ranked = rankTeacherResults(cache[prefixKey], query);
  return ranked.length ? ranked : cache[prefixKey];
}

function rankTeacherResults(results: PublicUnapTeacherLookupData[], query: string) {
  const foldedQuery = foldSearchText(query);
  if (foldedQuery.length < 3) return results;

  const scored = results.map((teacher) => ({
    teacher,
    score: teacherMatchScore(teacher.fullName, foldedQuery)
  }));
  const matching = scored.filter((item) => item.score > 0);

  return (matching.length ? matching : scored)
    .sort((left, right) => right.score - left.score || left.teacher.fullName.localeCompare(right.teacher.fullName))
    .map((item) => item.teacher);
}

function teacherMatchScore(fullName: string, foldedQuery: string) {
  const foldedName = foldSearchText(fullName);
  const tokens = foldedQuery.split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  if (foldedName.startsWith(foldedQuery)) return 100;
  if (foldedName.includes(foldedQuery)) return 90;
  if (tokens.every((token) => foldedName.includes(token))) return 70;
  return tokens.filter((token) => foldedName.includes(token)).length * 10;
}

function foldSearchText(value: string) {
  return normalizeTeacherQuery(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}
