"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import type { jsPDF as JsPDFDocument } from "jspdf";
import type { Player, Team, TournamentEvent } from "@/lib/types";
import { canEditRoster } from "@/lib/domain/permissions";
import { rosterLimitState } from "@/lib/domain/registration-rules";
import { playerRoleLabel, sportLabel, teamStatusLabel } from "@/lib/utils";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { PlayerTable } from "@/features/teams/components/PlayerTable";

const footballPositions = ["Arquero", "Defensa", "Medio", "Delantero"];
const voleyPositions = ["Armador", "Punta", "Central", "Opuesto", "Libero"];

export function DelegateRosterManager({
  event,
  team,
  players
}: {
  event: TournamentEvent;
  team: Team;
  players: Player[];
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const editable = canEditRoster(event, team);
  const limit = rosterLimitState({ event, playerCount: players.length });
  const positions = event.sport === "voley" ? voleyPositions : footballPositions;
  const canDownloadRoster = team.status === "approved";

  function downloadRoster() {
    if (!canDownloadRoster || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    void generateRosterPdf({ event, team, players })
      .then(() => toast.success("Lista PDF descargada."))
      .catch(() => toast.error("No se pudo generar la lista PDF."))
      .finally(() => setIsGeneratingPdf(false));
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Plantel"
          description={`Minimo ${event.minPlayers}, maximo ${event.maxPlayers}. Estado: ${limit}. La descarga se habilita cuando administracion aprueba el equipo.`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={downloadRoster} disabled={!canDownloadRoster || isGeneratingPdf}>
                <Download className="h-4 w-4" />
                {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
              </Button>
              <Button variant="secondary" disabled={!editable}>
                <Plus className="h-4 w-4" />
                Agregar jugador
              </Button>
            </div>
          }
        />
      </div>
      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Nombres">
            <input className={inputClass} disabled={!editable} placeholder="Nombres" />
          </Field>
          <Field label="Apellidos">
            <input className={inputClass} disabled={!editable} placeholder="Apellidos" />
          </Field>
          <Field label="Numero">
            <input className={inputClass} disabled={!editable} type="number" min={0} placeholder="10" />
          </Field>
          <Field label="Posicion">
            <select className={inputClass} disabled={!editable} defaultValue="">
              <option value="">Opcional</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <PlayerTable players={players} privateView />
    </Card>
  );
}

async function generateRosterPdf({
  event,
  team,
  players
}: {
  event: TournamentEvent;
  team: Team;
  players: Player[];
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedDate = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());

  drawRosterHeader(doc, {
    pageWidth,
    margin,
    title: "Lista oficial de jugadores",
    subtitle: `${event.name} - ${sportLabel(event.sport)}`
  });

  doc.setTextColor(23, 33, 31);
  drawInfoBox(doc, margin, 43, contentWidth / 2 - 3, "Equipo", [
    ["Nombre", team.name],
    ["Delegado", team.delegateName],
    ["Celular", team.delegatePhone],
    ["Estado", teamStatusLabel(team.status)]
  ]);
  drawInfoBox(doc, margin + contentWidth / 2 + 3, 43, contentWidth / 2 - 3, "Campeonato", [
    ["Categoria", event.category],
    ["Jugadores", `${players.length}/${event.maxPlayers}`],
    ["Codigo", team.registrationCode],
    ["Generado", generatedDate]
  ]);

  const columns = [
    { label: "#", x: margin, width: 8 },
    { label: "Jugador", x: margin + 9, width: 47 },
    { label: "DNI", x: margin + 58, width: 22 },
    { label: "Codigo", x: margin + 82, width: 27 },
    { label: "Sem.", x: margin + 111, width: 14 },
    { label: "Rol", x: margin + 127, width: 18 },
    { label: "Nro.", x: margin + 147, width: 12 },
    { label: "Posicion", x: margin + 161, width: 35 }
  ];

  let rowY = 88;
  drawTableHeader(doc, margin, rowY, contentWidth, columns);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  players.forEach((player, index) => {
    rowY += 9;
    if (rowY > pageHeight - 24) {
      doc.addPage();
      drawRosterHeader(doc, {
        pageWidth,
        margin,
        title: "Lista oficial de jugadores",
        subtitle: `${team.name} - Continuacion`
      });
      rowY = 43;
      drawTableHeader(doc, margin, rowY, contentWidth, columns);
      rowY += 9;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 249);
      doc.rect(margin, rowY - 5.5, contentWidth, 8.5, "F");
    }

    const fullName = `${player.firstName} ${player.lastName}`.trim();
    doc.setTextColor(23, 33, 31);
    doc.text(String(index + 1), columns[0].x, rowY);
    doc.text(truncateText(doc, fullName || "-", columns[1].width), columns[1].x, rowY);
    doc.text(truncateText(doc, player.dni || "-", columns[2].width), columns[2].x, rowY);
    doc.text(truncateText(doc, player.studentCode || "-", columns[3].width), columns[3].x, rowY);
    doc.text(truncateText(doc, player.semester || "-", columns[4].width), columns[4].x, rowY);
    doc.text(playerRoleLabel(player.lineupRole), columns[5].x, rowY);
    doc.text(player.jerseyNumber?.toString() ?? "-", columns[6].x, rowY);
    doc.text(truncateText(doc, player.position || "-", columns[7].width), columns[7].x, rowY);
  });

  const footerY = pageHeight - 24;
  doc.setDrawColor(205, 213, 209);
  doc.line(margin, footerY, margin + 70, footerY);
  doc.line(pageWidth - margin - 70, footerY, pageWidth - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(23, 33, 31);
  doc.text("Firma del delegado", margin + 18, footerY + 6);
  doc.text("Validacion de administracion", pageWidth - margin - 58, footerY + 6);

  doc.save(`jugadores-${slugify(team.name)}.pdf`);
}

function drawRosterHeader(
  doc: JsPDFDocument,
  {
    pageWidth,
    margin,
    title,
    subtitle
  }: {
    pageWidth: number;
    margin: number;
    title: string;
    subtitle: string;
  }
) {
  doc.setFillColor(23, 33, 31);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, margin, 23);
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
    doc.text(truncateText(doc, value || "-", width - 31), x + 28, rowY);
  });
}

function drawTableHeader(
  doc: JsPDFDocument,
  margin: number,
  rowY: number,
  contentWidth: number,
  columns: Array<{ label: string; x: number; width: number }>
) {
  doc.setFillColor(238, 243, 240);
  doc.rect(margin, rowY - 5, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(23, 33, 31);
  columns.forEach((column) => doc.text(column.label, column.x, rowY));
  doc.setFont("helvetica", "normal");
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
    .slice(0, 40) || "equipo";
}
