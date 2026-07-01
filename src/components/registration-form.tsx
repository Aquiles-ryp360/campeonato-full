"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Plus, Smartphone, Trash2, UserPlus } from "lucide-react";
import type { jsPDF as JsPDFDocument } from "jspdf";
import { toast } from "sonner";
import { sessionChangeEvent, type DelegateAccess } from "@/lib/auth";
import type { PlayerRole, TournamentEvent } from "@/lib/types";
import { formatDateTime, formatMoney, playerRoleLabel, sportLabel } from "@/lib/utils";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";

interface PlayerFormRow {
  firstName: string;
  lastName: string;
  dni: string;
  studentCode: string;
  enrollmentFile: string;
  semester: string;
  lineupRole: PlayerRole;
}

const emptyPlayer: PlayerFormRow = {
  firstName: "",
  lastName: "",
  dni: "",
  studentCode: "",
  enrollmentFile: "",
  semester: "",
  lineupRole: "starter"
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
  initialEventId
}: {
  events: TournamentEvent[];
  initialEventId?: string;
}) {
  const openEvents = useMemo(
    () => events.filter((event) => event.status === "registration" || event.status === "draft"),
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
  const [players, setPlayers] = useState<PlayerFormRow[]>([
    { ...emptyPlayer },
    { ...emptyPlayer },
    { ...emptyPlayer }
  ]);

  const event = useMemo(
    () => openEvents.find((current) => current.id === eventId) ?? openEvents[0] ?? null,
    [eventId, openEvents]
  );

  function updatePlayer(index: number, field: keyof PlayerFormRow, value: string) {
    setPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player
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

    const completedPlayers = players.filter(
      (player) => player.firstName && player.lastName && player.dni && player.studentCode
    );

    if (!teamName || !delegateName || !delegatePhone || !delegateEmail || !registrationCode) {
      toast.error("Completa equipo, delegado, correo y codigo unico de inscripcion.");
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

    const repeatedDni = findDuplicateValue(completedPlayers.map((player) => player.dni));
    if (repeatedDni) {
      toast.error(`El DNI ${repeatedDni} esta repetido en la plantilla.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/register-delegate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId,
          teamName,
          delegateName,
          delegatePhone,
          delegateEmail,
          paymentMethod,
          registrationCode,
          players: completedPlayers
        })
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
      window.dispatchEvent(new Event(sessionChangeEvent));
      try {
        await generateRegistrationReceiptPdf(receipt);
        toast.success(
          payload.emailSent
            ? "Inscripcion registrada. Correo enviado y constancia PDF descargada."
            : "Inscripcion registrada. Se descargo la constancia PDF."
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
          <div className="mt-5 rounded-lg border border-ink/10 bg-mist p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-field">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-ink/60">Monto de inscripcion</p>
                <p className="text-2xl font-bold text-ink">{formatMoney(event.registrationFee)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["yape", "plin"] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-md border px-3 py-2 text-sm font-bold uppercase transition ${
                    paymentMethod === method
                      ? "border-field bg-field text-white"
                      : "border-ink/10 bg-white text-ink"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm text-ink/65">
              <p>
                Cierre: <strong>{formatDateTime(event.registrationOpenUntil)}</strong>
              </p>
              <p>
                Jugadores: <strong>{event.minPlayers}</strong> minimo,{" "}
                <strong>{event.maxPlayers}</strong> maximo.
              </p>
            </div>
            <div className="mt-4">
              <Badge tone="amber">El admin carga lotes de codigos y cada codigo se usa una vez</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader
          title="Jugadores"
          description="DNI, codigo universitario, ficha de matricula y ciclo/semestre. Foto queda opcional para despues."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={addPlayer}
            >
              <Plus className="h-4 w-4" />
              Agregar jugador
            </Button>
          }
        />

        <div className="mt-5 space-y-3">
          {players.map((player, index) => (
            <div key={index} className="rounded-md border border-ink/10 bg-white p-4">
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
                    className="grid h-9 w-9 place-items-center rounded-md text-ink/55 hover:bg-red-50 hover:text-red-700"
                    aria-label="Eliminar jugador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
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
                  placeholder="Codigo"
                />
                <input
                  className={inputClass}
                  value={player.enrollmentFile}
                  onChange={(changeEvent) => updatePlayer(index, "enrollmentFile", changeEvent.target.value)}
                  readOnly
                  placeholder="Ficha de matricula"
                  title="Nombre del archivo seleccionado"
                />
                <input
                  className={inputClass}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(changeEvent) =>
                    updatePlayer(
                      index,
                      "enrollmentFile",
                      changeEvent.target.files?.[0]?.name ?? ""
                    )
                  }
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
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-field/10 text-field">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-ink">Constancia generada</p>
                <p className="mt-1 text-sm text-ink/60">
                  PDF A4 con datos del equipo, delegado, codigo y plantilla.
                </p>
                <div className="mt-3 grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
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
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
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

  doc.setFillColor(23, 33, 31);
  doc.rect(0, 0, pageWidth, 33, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Constancia de inscripcion deportiva", margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Campeonato Carreras", margin, 22);
  doc.text(`Generado: ${generatedDate}`, margin, 27);

  doc.setTextColor(23, 33, 31);
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
    { label: "Codigo", x: margin + 87, width: 28 },
    { label: "Rol", x: margin + 116, width: 22 },
    { label: "Ciclo", x: margin + 139, width: 22 },
    { label: "Ficha", x: margin + 162, width: 20 }
  ];

  let rowY = tableY + 8;
  doc.setFillColor(238, 243, 240);
  doc.rect(margin, rowY - 5, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  columns.forEach((column) => doc.text(column.label, column.x, rowY));

  doc.setFont("helvetica", "normal");
  receipt.players.forEach((player, index) => {
    rowY += 9;
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 249);
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
  doc.setDrawColor(205, 213, 209);
  doc.line(margin, footerY, margin + 72, footerY);
  doc.line(pageWidth - margin - 72, footerY, pageWidth - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Firma del delegado", margin + 19, footerY + 6);
  doc.text("Validacion del organizador", pageWidth - margin - 61, footerY + 6);

  doc.setFontSize(8);
  doc.setTextColor(95, 108, 103);
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
  doc.setDrawColor(221, 228, 224);
  doc.setFillColor(248, 250, 249);
  doc.roundedRect(x, y, width, boxHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(47, 111, 78);
  doc.text(title, x + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(23, 33, 31);
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function findDuplicateValue(values: string[]) {
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) return value.trim();
    seen.add(normalized);
  }

  return null;
}
