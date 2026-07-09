import { NextResponse } from "next/server";
import type { jsPDF as JsPDFDocument } from "jspdf";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireDelegateTeamAccess, ServerAccessError } from "@/lib/server-access";
import {
  mapEvent,
  mapPlayer,
  mapTeam,
  type EventRow,
  type PlayerRow,
  type TeamRow
} from "@/lib/data-mappers";
import type { Player, Team, TournamentEvent } from "@/lib/types";
import { formatDateTime, playerRoleLabel, sportLabel, teamStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const teamSelect = `
  id,
  event_id,
  name,
  delegate_name,
  delegate_phone,
  delegate_email,
  academic_career,
  primary_color,
  secondary_color,
  status,
  admin_observation,
  payment_validated_at,
  created_at,
  registration_code:registration_code_id (
    id,
    code,
    method,
    status
  )
`;

const playerSelect = `
  id,
  team_id,
  first_name,
  last_name,
  dni,
  dni_masked,
  student_code,
  codigo_carrera,
  escuela,
  enrollment_file,
  semester,
  lineup_role,
  document_type,
  identity_source,
  identity_verified_at,
  data_consent_accepted_at,
  data_consent_text_version,
  registered_by_delegate_id,
  verification_status,
  jersey_number,
  jersey_number_change_count,
  jersey_number_changed_at,
  jersey_number_changed_by,
  position,
  photo_url
`;

export async function GET(_request: Request, context: RouteContext) {
  const { id: teamId } = await context.params;

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase.", 500);
  }

  try {
    await requireDelegateTeamAccess(teamId, admin);

    const [teamResponse, playersResponse] = await Promise.all([
      admin.from("teams").select(teamSelect).eq("id", teamId).maybeSingle<TeamRow>(),
      admin
        .from("players")
        .select(playerSelect)
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })
    ]);

    if (teamResponse.error) throw new ServerAccessError(teamResponse.error.message, 500);
    if (playersResponse.error) throw new ServerAccessError(playersResponse.error.message, 500);
    if (!teamResponse.data) return jsonError("Equipo no encontrado.", 404);

    const eventResponse = await admin
      .from("events")
      .select("*")
      .eq("id", teamResponse.data.event_id)
      .maybeSingle<EventRow>();

    if (eventResponse.error) throw new ServerAccessError(eventResponse.error.message, 500);
    if (!eventResponse.data) return jsonError("Campeonato no encontrado.", 404);

    const team = mapTeam(teamResponse.data);
    const event = mapEvent(eventResponse.data);
    const players = ((playersResponse.data ?? []) as PlayerRow[]).map(mapPlayer);
    const pdf = await generateRosterPdf({ event, team, players });
    const fileName = `plantel-${slugify(team.name) || "equipo"}.pdf`;

    return new NextResponse(pdf, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/pdf"
      }
    });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unexpected delegate roster export error", error);
    return jsonError("No se pudo generar la descarga del plantel.", 500);
  }
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
  const primaryRgb = hexToRgb(event.themePrimaryColor ?? team.primaryColor, [35, 44, 118]);
  const generatedAt = formatDateTime(new Date().toISOString());

  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Plantel actualizado del equipo", margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(event.organizerName ?? "Campeonato UNA Puno", margin, 22);
  doc.text(`Generado: ${generatedAt}`, margin, 28);

  doc.setTextColor(17, 20, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(team.name, margin, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${event.name} - ${sportLabel(event.sport)} - ${event.category}`, margin, 51, {
    maxWidth: contentWidth
  });

  const leftX = margin;
  const rightX = margin + contentWidth / 2 + 4;
  const boxY = 60;
  const boxWidth = contentWidth / 2 - 3;

  drawInfoBox(doc, leftX, boxY, boxWidth, "Equipo", [
    ["Delegado", team.delegateName],
    ["Celular", team.delegatePhone],
    ["Correo", team.delegateEmail],
    ["Carrera", team.academicCareer ?? "-"]
  ]);

  drawInfoBox(doc, rightX, boxY, boxWidth, "Inscripcion", [
    ["Codigo", team.registrationCode],
    ["Estado", teamStatusLabel(team.status)],
    ["Pago", team.paymentStatus === "verified" ? "Pago validado" : "Pago pendiente"],
    ["Jugadores", `${players.length} / ${event.maxPlayers}`]
  ]);

  let rowY = 112;
  drawRosterTableHeader(doc, margin, rowY, contentWidth);
  rowY += 8;

  if (players.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(95, 100, 117);
    doc.text("Todavia no hay jugadores registrados en este equipo.", margin + 2, rowY + 4);
  } else {
    players.forEach((player, index) => {
      if (rowY > pageHeight - 24) {
        doc.addPage();
        rowY = 18;
        drawRosterTableHeader(doc, margin, rowY, contentWidth);
        rowY += 8;
      }

      drawRosterRow(doc, player, index, margin, rowY, contentWidth);
      rowY += 8;
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(95, 100, 117);
    doc.text(
      "Documento generado desde el panel de delegado con la informacion registrada en el sistema.",
      margin,
      pageHeight - 10,
      { maxWidth: contentWidth - 24 }
    );
    doc.text(`${page}/${pageCount}`, pageWidth - margin - 8, pageHeight - 10);
  }

  return doc.output("arraybuffer");
}

function drawRosterTableHeader(
  doc: JsPDFDocument,
  x: number,
  y: number,
  width: number
) {
  doc.setFillColor(238, 241, 245);
  doc.rect(x, y - 5, width, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(17, 20, 45);
  rosterColumns(x).forEach((column) => doc.text(column.label, column.x, y));
}

function drawRosterRow(
  doc: JsPDFDocument,
  player: Player,
  index: number,
  x: number,
  y: number,
  width: number
) {
  if (index % 2 === 0) {
    doc.setFillColor(248, 250, 255);
    doc.rect(x, y - 5, width, 8, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(17, 20, 45);

  const fullName = `${player.firstName} ${player.lastName}`.trim();
  const columns = rosterColumns(x);
  const values = [
    String(index + 1),
    fullName,
    player.dni,
    player.studentCode,
    player.semester || "-",
    player.jerseyNumber ? String(player.jerseyNumber) : "-",
    player.position || "-",
    playerRoleLabel(player.lineupRole),
    player.escuela || "-"
  ];

  columns.forEach((column, columnIndex) => {
    doc.text(truncateText(doc, values[columnIndex], column.width), column.x, y);
  });
}

function rosterColumns(startX: number) {
  return [
    { label: "#", x: startX + 2, width: 6 },
    { label: "Jugador", x: startX + 10, width: 42 },
    { label: "DNI", x: startX + 54, width: 20 },
    { label: "Codigo", x: startX + 76, width: 24 },
    { label: "Ciclo", x: startX + 102, width: 15 },
    { label: "Nro.", x: startX + 119, width: 12 },
    { label: "Posicion", x: startX + 133, width: 22 },
    { label: "Rol", x: startX + 157, width: 19 },
    { label: "Escuela", x: startX + 178, width: 16 }
  ];
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
    doc.text(truncateText(doc, value, width - 32), x + 28, rowY);
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

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
