"use client";

/* eslint-disable @next/next/no-img-element -- Admin-entered assets can be local paths or external URLs. */

import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  FileText,
  MessageCircle,
  Plus,
  Smartphone,
  Trash2,
  UserPlus
} from "lucide-react";
import type { jsPDF as JsPDFDocument } from "jspdf";
import { toast } from "sonner";
import { sessionChangeEvent, type DelegateAccess } from "@/lib/auth";
import {
  findDuplicateNormalizedValue,
  registrationAvailability,
  registrationClosedMessage,
  validateEnrollmentFileMeta
} from "@/lib/domain/registration-rules";
import type {
  DocumentType,
  IdentitySource,
  PlayerRole,
  TournamentEvent,
  VerificationStatus
} from "@/lib/types";
import { formatDateTime, formatMoney, playerRoleLabel, sportLabel } from "@/lib/utils";
import { defaultUnapCareerCode, defaultUnapCareerName, unapCareers } from "@/data/unapCareers";
import { identityConsentTextVersion } from "@/lib/identity/identity-lookup";
import { IdentityConsentBlock } from "@/features/identity/components/IdentityConsentBlock";
import {
  IdentityLookupPanel,
  type IdentityLookupApplyPayload
} from "@/features/identity/components/IdentityLookupPanel";
import { EnrollmentFilePicker } from "@/components/enrollment-file-picker";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";

interface PlayerFormRow {
  firstName: string;
  lastName: string;
  dni: string;
  studentCode: string;
  codigoCarrera: string;
  escuela: string;
  enrollmentFile: string;
  enrollmentFileObject: File | null;
  semester: string;
  lineupRole: PlayerRole;
  documentType: DocumentType;
  identitySource: IdentitySource;
  verificationStatus: VerificationStatus;
}

const emptyPlayer: PlayerFormRow = {
  firstName: "",
  lastName: "",
  dni: "",
  studentCode: "",
  codigoCarrera: defaultUnapCareerCode,
  escuela: defaultUnapCareerName,
  enrollmentFile: "",
  enrollmentFileObject: null,
  semester: "",
  lineupRole: "starter",
  documentType: "MANUAL",
  identitySource: "manual",
  verificationStatus: "unverified"
};

const playerRoleOptions: Array<{ value: PlayerRole; label: string }> = [
  { value: "starter", label: "Titular" },
  { value: "substitute", label: "Suplente" }
];

interface RegistrationReceipt {
  event: TournamentEvent;
  teamName: string;
  delegateName: string;
  delegatePhone: string;
  delegateEmail: string;
  paymentMethod: "yape" | "plin";
  registrationCode: string;
  delegateAccess: DelegateAccess;
  players: PlayerFormRow[];
  generatedAt: string;
}

type RegisterDelegateResponse =
  | {
      ok: true;
      teamId: string;
      emailSent: boolean;
      delegateAccess: DelegateAccess;
    }
  | {
      ok: false;
      error: string;
    };

export function RegistrationForm({
  events,
  initialEventId,
  teamCountsByEventId = {}
}: {
  events: TournamentEvent[];
  initialEventId?: string;
  teamCountsByEventId?: Record<string, number>;
}) {
  const [teamCounts, setTeamCounts] = useState(teamCountsByEventId);
  const openEvents = useMemo(
    () => events.filter((event) => registrationAvailability({ event }).open),
    [events]
  );
  const initialOpenEvent = openEvents.find((event) => event.id === initialEventId) ?? openEvents[0];
  const [eventId, setEventId] = useState(initialOpenEvent?.id ?? "");
  const [teamName, setTeamName] = useState("");
  const [delegateName, setDelegateName] = useState("");
  const [delegatePhone, setDelegatePhone] = useState("");
  const [delegateEmail, setDelegateEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"yape" | "plin">("yape");
  const [registrationCode, setRegistrationCode] = useState("");
  const [lastReceipt, setLastReceipt] = useState<RegistrationReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identityConsentAccepted, setIdentityConsentAccepted] = useState(true);
  const [players, setPlayers] = useState<PlayerFormRow[]>([
    { ...emptyPlayer },
    { ...emptyPlayer },
    { ...emptyPlayer }
  ]);

  const event = useMemo(
    () => openEvents.find((current) => current.id === eventId) ?? openEvents[0] ?? null,
    [eventId, openEvents]
  );
  const currentTeamCount = event ? teamCounts[event.id] ?? 0 : 0;
  const currentAvailability = event
    ? registrationAvailability({ event, teamCount: currentTeamCount })
    : null;
  const availableTeamSlots = event
    ? Math.max(0, event.maxTeams - currentTeamCount)
    : 0;
  const branding = useMemo(() => getEventBranding(event), [event]);
  const activePaymentQrUrl =
    paymentMethod === "plin" ? branding.paymentQrPlinUrl : branding.paymentQrYapeUrl;
  const activePaymentLabel = paymentMethod === "plin" ? "QR Plin" : "QR Yape";

  function updatePlayer(index: number, field: keyof PlayerFormRow, value: string) {
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player
      )
    );
  }

  function updatePlayerCareer(index: number, careerCode: string) {
    const career = unapCareers.find((item) => item.code === careerCode);
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index
          ? {
              ...player,
              codigoCarrera: careerCode,
              escuela: careerCode ? career?.name ?? "" : "DOCENTE UNA"
            }
          : player
      )
    );
  }

  function applyIdentityLookup(index: number, payload: IdentityLookupApplyPayload) {
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index
          ? {
              ...player,
              ...payload
            }
          : player
      )
    );
  }

  function updatePlayerFile(index: number, file: File | null) {
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index
          ? {
              ...player,
              enrollmentFile: file?.name ?? "",
              enrollmentFileObject: file
            }
          : player
      )
    );
  }

  function removePlayer(index: number) {
    setPlayers((current) => current.filter((_, playerIndex) => playerIndex !== index));
  }

  function addPlayer() {
    if (!event) {
      toast.error("No hay campeonatos abiertos para inscripcion.");
      return;
    }

    if (!currentAvailability?.open) {
      toast.error(
        registrationClosedMessage(currentAvailability?.reason ?? "not_registration")
      );
      return;
    }

    if (players.length >= event.maxPlayers) {
      toast.error(`Este campeonato permite maximo ${event.maxPlayers} jugadores.`);
      return;
    }

    setPlayers((current) => [...current, { ...emptyPlayer }]);
  }

  async function submitRegistration(eventSubmit: React.FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();

    if (!event) {
      toast.error("No hay campeonatos abiertos para inscripcion.");
      return;
    }

    const completedPlayers = players.filter((player) =>
      Boolean(
        player.firstName &&
          player.lastName &&
          player.dni &&
          player.studentCode &&
          player.semester &&
          player.enrollmentFileObject
      )
    );

    if (!teamName || !delegateName || !delegatePhone || !delegateEmail || !registrationCode) {
      toast.error("Completa equipo, delegado, correo y codigo unico de inscripcion.");
      return;
    }

    if (!identityConsentAccepted) {
      toast.error("Acepta y confirma que cuentas con autorización para registrar estos datos.");
      return;
    }

    const playersWithAnyData = players.filter(
      (player) =>
        player.firstName ||
        player.lastName ||
        player.dni ||
        player.studentCode ||
        player.codigoCarrera ||
        player.escuela ||
        player.semester ||
        player.enrollmentFileObject
    );
    const incompletePlayer = playersWithAnyData.length !== completedPlayers.length;

    if (incompletePlayer) {
      toast.error("Todos los jugadores deben tener semestre y ficha de matricula.");
      return;
    }

    if (completedPlayers.length < event.minPlayers) {
      toast.error(`Este campeonato pide minimo ${event.minPlayers} jugadores.`);
      return;
    }

    if (completedPlayers.length > event.maxPlayers) {
      toast.error(`Este campeonato permite maximo ${event.maxPlayers} jugadores.`);
      return;
    }

    const repeatedDni = findDuplicateNormalizedValue(completedPlayers.map((player) => player.dni));
    if (repeatedDni) {
      toast.error(`El DNI ${repeatedDni} esta repetido en la plantilla.`);
      return;
    }

    const repeatedCode = findDuplicateNormalizedValue(
      completedPlayers.map((player) => player.studentCode)
    );
    if (repeatedCode) {
      toast.error(`El codigo ${repeatedCode} esta repetido en la plantilla.`);
      return;
    }

    for (const player of completedPlayers) {
      const file = player.enrollmentFileObject;
      const fileError = file
        ? validateEnrollmentFileMeta({ type: file.type, size: file.size })
        : "Todos los jugadores deben tener semestre y ficha de matricula.";
      if (fileError) {
        toast.error(fileError);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("eventId", eventId);
      formData.append("teamName", teamName);
      formData.append("delegateName", delegateName);
      formData.append("delegatePhone", delegatePhone);
      formData.append("delegateEmail", delegateEmail);
      formData.append("paymentMethod", paymentMethod);
      formData.append("registrationCode", registrationCode);
      formData.append(
        "players",
        JSON.stringify(
          completedPlayers.map((player) => ({
            firstName: player.firstName,
            lastName: player.lastName,
            dni: player.dni,
            studentCode: player.studentCode,
            codigoCarrera: player.codigoCarrera,
            escuela: player.escuela,
            enrollmentFile: player.enrollmentFile,
            semester: player.semester,
            lineupRole: player.lineupRole,
            documentType: player.documentType,
            identitySource: player.identitySource,
            verificationStatus: player.verificationStatus
          }))
        )
      );
      formData.append("dataConsentAccepted", String(identityConsentAccepted));
      formData.append("dataConsentTextVersion", identityConsentTextVersion);
      completedPlayers.forEach((player, index) => {
        if (player.enrollmentFileObject) {
          formData.append(`enrollmentFile-${index}`, player.enrollmentFileObject);
        }
      });

      const response = await fetch("/api/register-delegate", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json().catch(() => null)) as RegisterDelegateResponse | null;

      if (!response.ok || !payload) {
        toast.error(
          payload && !payload.ok ? payload.error : "No se pudo completar la inscripcion."
        );
        return;
      }

      if (!payload.ok) {
        toast.error(payload.error);
        return;
      }

      const generatedAt = new Date().toISOString();
      const receipt: RegistrationReceipt = {
        event,
        teamName,
        delegateName,
        delegatePhone,
        delegateEmail,
        paymentMethod,
        registrationCode,
        delegateAccess: payload.delegateAccess,
        players: completedPlayers,
        generatedAt
      };

      setLastReceipt(receipt);
      setTeamCounts((current) => ({
        ...current,
        [event.id]: (current[event.id] ?? currentTeamCount) + 1
      }));
      window.dispatchEvent(new Event(sessionChangeEvent));
      try {
        await generateRegistrationReceiptPdf(receipt);
        toast.success(
          payload.emailSent
            ? "Inscripcion registrada. Correo enviado y constancia PDF descargada."
            : "Inscripcion registrada. No se pudo enviar el correo, pero se descargo la constancia PDF."
        );
      } catch {
        toast.error("La inscripcion quedo registrada, pero no se pudo descargar el PDF.");
      }
    } catch {
      toast.error("No se pudo completar la inscripcion. Intentalo otra vez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!event) {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Inscripcion autonoma"
          title="Inscripciones cerradas"
          description="No hay campeonatos en estado de inscripcion. Cuando el admin abra un evento en Supabase, aparecera aqui."
        />
      </Card>
    );
  }

  return (
    <form className="space-y-6 pb-20 md:pb-0" onSubmit={submitRegistration}>
      <div className="overflow-hidden rounded-lg border border-brand-towerMid/25 bg-white shadow-panel">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md border border-brand-towerMid/25 bg-white shadow-insetLine">
              {branding.careerLogoUrl ? (
                <img
                  src={branding.careerLogoUrl}
                  alt={branding.careerName}
                  className="max-h-16 max-w-16 object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-brand-muted" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase" style={{ color: branding.primaryColor }}>
                {branding.organizerName}
              </p>
              <h1 className="mt-1 text-xl font-bold text-ink sm:text-2xl">{event.name}</h1>
              <p className="mt-1 text-sm font-semibold text-brand-muted">{branding.careerName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-brand-towerMid/25 bg-brand-wash px-3 py-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: branding.primaryColor }}
            />
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: branding.secondaryColor }}
            />
            <span className="text-xs font-bold uppercase text-brand-muted">{sportLabel(event.sport)}</span>
            <span className="text-xs font-bold uppercase text-brand-muted">
              {currentTeamCount}/{event.maxTeams}
            </span>
          </div>
        </div>
        <div
          className="h-1.5"
          style={{
            background: `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor})`
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
        <Card className="p-5">
          <SectionHeader
            eyebrow="Inscripcion autonoma"
            title="Datos del equipo"
            description="El delegado elige campeonato, registra su equipo y usa el codigo entregado despues del pago."
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Campeonato">
              <select
                className={inputClass}
                value={eventId}
                onChange={(changeEvent) => setEventId(changeEvent.target.value)}
              >
                {openEvents.map((current) => (
                  <option key={current.id} value={current.id}>
                    {current.name} - {sportLabel(current.sport)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre del equipo">
              <input
                className={inputClass}
                value={teamName}
                onChange={(changeEvent) => setTeamName(changeEvent.target.value)}
                placeholder="Ej. Los Invencibles"
              />
            </Field>
            <Field label="Delegado">
              <input
                className={inputClass}
                value={delegateName}
                onChange={(changeEvent) => setDelegateName(changeEvent.target.value)}
                placeholder="Nombre completo"
              />
            </Field>
            <Field label="Celular">
              <input
                className={inputClass}
                value={delegatePhone}
                onChange={(changeEvent) => setDelegatePhone(changeEvent.target.value)}
                placeholder="999 999 999"
              />
            </Field>
            <Field label="Correo del delegado">
              <input
                className={inputClass}
                value={delegateEmail}
                onChange={(changeEvent) => setDelegateEmail(changeEvent.target.value)}
                placeholder="delegado@correo.com"
                type="email"
              />
            </Field>
            <Field label="Codigo unico">
              <input
                className={inputClass}
                value={registrationCode}
                onChange={(changeEvent) => setRegistrationCode(changeEvent.target.value)}
                placeholder="Ej. FUT-2026-AB7K"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Pago" description="El cobro lo realiza el encargado y entrega un codigo de un solo uso." />
          <div className="mt-5 rounded-lg border border-brand-towerMid/25 bg-brand-wash p-4 shadow-insetLine">
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 place-items-center rounded-md bg-white"
                style={{ color: branding.primaryColor }}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-muted">Monto de inscripcion</p>
                <p className="text-2xl font-black text-ink">{formatMoney(event.registrationFee)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_156px]">
              <div>
                <div className="grid grid-cols-2 gap-2">
                  {(["yape", "plin"] as const).map((method) => {
                    const selected = paymentMethod === method;
                    return (
                      <button
                        type="button"
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`rounded-md border px-3 py-2 text-sm font-bold uppercase transition ${
                          selected
                            ? "text-white"
                            : "border-brand-towerMid/25 bg-white text-ink hover:border-brand-electric/35"
                        }`}
                        style={
                          selected
                            ? {
                                borderColor: branding.primaryColor,
                                backgroundColor: branding.primaryColor
                              }
                            : undefined
                        }
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-2 text-sm font-semibold text-brand-muted">
                  <p>
                    Cierre: <strong>{formatDateTime(event.registrationOpenUntil)}</strong>
                  </p>
                  <p>
                    Jugadores: <strong>{event.minPlayers}</strong> minimo,{" "}
                    <strong>{event.maxPlayers}</strong> maximo.
                  </p>
                  <p>
                    Cupos: <strong>{currentTeamCount}/{event.maxTeams}</strong> equipos inscritos,
                    quedan <strong>{availableTeamSlots}</strong>.
                  </p>
                </div>
                {currentAvailability && !currentAvailability.open ? (
                  <div className="mt-4 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-semibold text-red-800">
                    {registrationClosedMessage(currentAvailability.reason)}
                  </div>
                ) : null}
                <div className="mt-4 space-y-3">
                  <Badge tone="amber">Cada codigo se usa una vez</Badge>
                  <div className="rounded-md border border-brand-towerMid/25 bg-white p-3 shadow-insetLine">
                    <p className="text-sm font-semibold text-ink">Pide el codigo al encargado</p>
                    <p className="mt-1 text-xs leading-5 text-brand-muted">
                      Envia tu captura de pago por WhatsApp
                      {branding.paymentContactPhone ? ` al ${branding.paymentContactPhone}` : ""}.
                    </p>
                    {branding.paymentContactWhatsappUrl ? (
                      <a
                        href={branding.paymentContactWhatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Pedir codigo
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-brand-towerMid/25 bg-white p-3 shadow-insetLine">
                {activePaymentQrUrl ? (
                  <img
                    src={activePaymentQrUrl}
                    alt={activePaymentLabel}
                    className="mx-auto aspect-square w-full object-contain"
                  />
                ) : (
                  <div className="grid aspect-square w-full place-items-center rounded-md bg-brand-wash text-center text-xs font-semibold text-brand-muted">
                    QR no configurado
                  </div>
                )}
                <p className="mt-2 text-center text-xs font-bold uppercase text-brand-muted">
                  {activePaymentLabel}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Jugadores"
          description="DNI, codigo universitario, ficha de matricula y ciclo/semestre."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={addPlayer}
              disabled={isSubmitting || currentAvailability?.open === false}
            >
              <Plus className="h-4 w-4" />
              Agregar jugador
            </Button>
          }
        />

        <div className="mt-5">
          <IdentityConsentBlock
            accepted={identityConsentAccepted}
            onAcceptedChange={setIdentityConsentAccepted}
            disabled={isSubmitting}
          />
        </div>

        <div className="mt-5 space-y-3">
          {players.map((player, index) => (
            <div key={index} className="rounded-md border border-brand-towerMid/25 bg-white p-4 shadow-insetLine">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">Jugador {index + 1}</p>
                  <Badge tone={player.lineupRole === "starter" ? "green" : "blue"}>
                    {player.lineupRole === "starter" ? "Titular" : "Suplente"}
                  </Badge>
                </div>
                {players.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removePlayer(index)}
                    className="grid h-9 w-9 place-items-center rounded-md text-brand-muted hover:bg-red-50 hover:text-red-700"
                    aria-label="Eliminar jugador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="mb-3">
                <IdentityLookupPanel
                  consentAccepted={identityConsentAccepted}
                  disabled={isSubmitting}
                  currentStudentCode={player.studentCode}
                  currentCareerCode={player.codigoCarrera}
                  onApply={(payload) => applyIdentityLookup(index, payload)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className={inputClass}
                  value={player.firstName}
                  onChange={(changeEvent) => updatePlayer(index, "firstName", changeEvent.target.value)}
                  placeholder="Nombres"
                />
                <input
                  className={inputClass}
                  value={player.lastName}
                  onChange={(changeEvent) => updatePlayer(index, "lastName", changeEvent.target.value)}
                  placeholder="Apellidos"
                />
                <input
                  className={inputClass}
                  value={player.dni}
                  onChange={(changeEvent) => updatePlayer(index, "dni", changeEvent.target.value)}
                  placeholder="DNI"
                />
                <input
                  className={inputClass}
                  value={player.studentCode}
                  onChange={(changeEvent) => updatePlayer(index, "studentCode", changeEvent.target.value)}
                  placeholder="Código / referencia"
                />
                <select
                  className={inputClass}
                  value={player.codigoCarrera}
                  onChange={(changeEvent) => updatePlayerCareer(index, changeEvent.target.value)}
                  aria-label={`Escuela del jugador ${index + 1}`}
                >
                  <option value="">Docente / no aplica</option>
                  <option value={defaultUnapCareerCode}>INGENIERÍA MECÁNICA ELÉCTRICA</option>
                  <option value="__select_other__" disabled>
                    Seleccionar otra carrera
                  </option>
                  {unapCareers.filter((career) => career.code !== defaultUnapCareerCode).map((career) => (
                    <option key={career.code} value={career.code}>
                      {career.name}
                    </option>
                  ))}
                  <option value="">Manual / no aplica</option>
                </select>
                <EnrollmentFilePicker
                  id={`public-enrollment-file-${index}`}
                  fileName={player.enrollmentFile}
                  disabled={isSubmitting}
                  onFileChange={(file) => updatePlayerFile(index, file)}
                />
                <input
                  className={inputClass}
                  value={player.semester}
                  onChange={(changeEvent) => updatePlayer(index, "semester", changeEvent.target.value)}
                  placeholder="Ciclo/Semestre"
                />
                <select
                  className={inputClass}
                  value={player.lineupRole}
                  onChange={(changeEvent) =>
                    updatePlayer(index, "lineupRole", changeEvent.target.value as PlayerRole)
                  }
                  aria-label={`Rol del jugador ${index + 1}`}
                >
                  {playerRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {lastReceipt ? (
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-electric/10 text-brand-electric">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-ink">Constancia generada</p>
                <p className="mt-1 text-sm text-brand-muted">
                  PDF A4 con datos del equipo, delegado, codigo y plantilla.
                </p>
                <div className="mt-3 grid gap-2 text-sm text-brand-muted sm:grid-cols-2">
                  <p>
                    Correo de acceso:{" "}
                    <strong className="text-ink">{lastReceipt.delegateAccess.email}</strong>
                  </p>
                  <p>
                    Ingreso: <strong className="text-ink">Entrar con Google</strong>
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void generateRegistrationReceiptPdf(lastReceipt).catch(() =>
                  toast.error("No se pudo descargar la constancia PDF.")
                )
              }
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          style={{ backgroundColor: branding.primaryColor }}
          disabled={isSubmitting || currentAvailability?.open === false}
        >
          <UserPlus className="h-4 w-4" />
          {isSubmitting ? "Registrando..." : "Enviar inscripcion"}
        </Button>
      </div>
    </form>
  );
}

async function generateRegistrationReceiptPdf(receipt: RegistrationReceipt) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedDate = formatDateTime(receipt.generatedAt);
  const primaryRgb = hexToRgb(receipt.event.themePrimaryColor, [23, 33, 31]);

  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, pageWidth, 33, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Constancia de inscripcion deportiva", margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(receipt.event.organizerName ?? "Campeonato UNA Puno", margin, 22);
  doc.text(`Generado: ${generatedDate}`, margin, 27);

  doc.setTextColor(17, 20, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(receipt.event.name, margin, 45);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${sportLabel(receipt.event.sport)} · ${receipt.event.category} · ${formatMoney(receipt.event.registrationFee)}`,
    margin,
    51
  );

  const leftX = margin;
  const rightX = margin + contentWidth / 2 + 4;
  const boxY = 60;
  const boxWidth = contentWidth / 2 - 3;

  drawInfoBox(doc, leftX, boxY, boxWidth, "Equipo", [
    ["Nombre", receipt.teamName],
    ["Delegado", receipt.delegateName],
    ["Celular", receipt.delegatePhone],
    ["Correo", receipt.delegateEmail]
  ]);

  drawInfoBox(doc, rightX, boxY, boxWidth, "Inscripcion", [
    ["Codigo", receipt.registrationCode],
    ["Pago", receipt.paymentMethod.toUpperCase()],
    ["Cierre", formatDateTime(receipt.event.registrationOpenUntil)]
  ]);

  drawInfoBox(doc, margin, 102, contentWidth, "Acceso del delegado", [
    ["Correo", receipt.delegateAccess.email],
    ["Ingreso", "Entrar con Google"],
    ["Panel", receipt.delegateAccess.loginUrl]
  ]);

  const tableY = 136;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Plantilla registrada", margin, tableY);

  const columns = [
    { label: "#", x: margin, width: 8 },
    { label: "Jugador", x: margin + 9, width: 52 },
    { label: "DNI", x: margin + 62, width: 24 },
    { label: "Ref.", x: margin + 87, width: 28 },
    { label: "Rol", x: margin + 116, width: 22 },
    { label: "Ciclo", x: margin + 139, width: 22 },
    { label: "Ficha", x: margin + 162, width: 20 }
  ];

  let rowY = tableY + 8;
  doc.setFillColor(238, 241, 245);
  doc.rect(margin, rowY - 5, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  columns.forEach((column) => doc.text(column.label, column.x, rowY));

  doc.setFont("helvetica", "normal");
  receipt.players.forEach((player, index) => {
    rowY += 9;
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 255);
      doc.rect(margin, rowY - 5.5, contentWidth, 8.5, "F");
    }

    const fullName = `${player.firstName} ${player.lastName}`.trim();
    doc.text(String(index + 1), columns[0].x, rowY);
    doc.text(truncateText(doc, fullName, columns[1].width), columns[1].x, rowY);
    doc.text(truncateText(doc, player.dni, columns[2].width), columns[2].x, rowY);
    doc.text(truncateText(doc, player.studentCode, columns[3].width), columns[3].x, rowY);
    doc.text(playerRoleLabel(player.lineupRole), columns[4].x, rowY);
    doc.text(truncateText(doc, player.semester || "-", columns[5].width), columns[5].x, rowY);
    doc.text(truncateText(doc, player.enrollmentFile || "-", columns[6].width), columns[6].x, rowY);
  });

  const footerY = 266;
  doc.setDrawColor(167, 169, 172);
  doc.line(margin, footerY, margin + 72, footerY);
  doc.line(pageWidth - margin - 72, footerY, pageWidth - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Firma del delegado", margin + 19, footerY + 6);
  doc.text("Validacion del organizador", pageWidth - margin - 61, footerY + 6);

  doc.setFontSize(8);
  doc.setTextColor(95, 100, 117);
  doc.text(
    "Esta constancia resume la inscripcion registrada por el delegado. La validacion final queda a cargo de administracion.",
    margin,
    285,
    { maxWidth: contentWidth }
  );

  const teamSlug = slugify(receipt.teamName) || "equipo";
  const codeSlug = slugify(receipt.registrationCode) || "codigo";
  doc.save(`constancia-${teamSlug}-${codeSlug}.pdf`);
}

function drawInfoBox(
  doc: JsPDFDocument,
  x: number,
  y: number,
  width: number,
  title: string,
  rows: Array<[string, string]>
) {
  const boxHeight = 16 + rows.length * 5;
  doc.setDrawColor(167, 169, 172);
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(x, y, width, boxHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(47, 70, 255);
  doc.text(title, x + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(17, 20, 45);
  rows.forEach(([label, value], index) => {
    const rowY = y + 14 + index * 5;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, x + 4, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(truncateText(doc, value, width - 30), x + 25, rowY);
  });
}

function truncateText(doc: JsPDFDocument, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value;

  let output = value;
  while (output.length > 1 && doc.getTextWidth(`${output}...`) > maxWidth) {
    output = output.slice(0, -1);
  }

  return `${output}...`;
}

function getEventBranding(event: TournamentEvent | null) {
  return {
    organizerName: event?.organizerName || "Comision deportiva de Ingenieria Mecanica Electrica",
    careerName: event?.careerName || "Ingenieria Mecanica Electrica",
    careerLogoUrl: event?.careerLogoUrl || "/epime-09/logo-carrera.png",
    paymentQrYapeUrl: event?.paymentQrYapeUrl || "/epime-09/qr-yape.png",
    paymentQrPlinUrl: event?.paymentQrPlinUrl || "",
    paymentContactPhone: event?.paymentContactPhone || "+51923037653",
    paymentContactWhatsappUrl:
      event?.paymentContactWhatsappUrl ||
      "https://wa.me/51923037356?text=Te%20env%C3%ADo%20la%20captura.%20Por%20favor%2C%20proporci%C3%B3name%20el%20c%C3%B3digo%20%C3%BAnico%20de%20acceso.",
    primaryColor: normalizeHexColor(event?.themePrimaryColor, "#28398f"),
    secondaryColor: normalizeHexColor(event?.themeSecondaryColor, "#f4e84a")
  };
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function hexToRgb(value: string | undefined, fallback: [number, number, number]) {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return fallback;

  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16)
  ] as [number, number, number];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
