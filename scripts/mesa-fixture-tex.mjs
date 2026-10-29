// Genera los .tex del kit en papel de la mesa a partir del fixture guardado en Supabase:
//   INTERSEMESTRES_2026-II/mesa-fixture.tex   (fixture + hoja de resultados por disciplina)
//   INTERSEMESTRES_2026-II/mesa-planillas.tex (una planilla por partido, ya llenada)
// Uso: node --env-file=.env.local scripts/mesa-fixture-tex.mjs
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const out = new URL("../INTERSEMESTRES_2026-II/", import.meta.url);

const tex = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([&%#_$])/g, "\\$1")
    .replace(/π/g, "$\\pi$");
const hour = (iso) =>
  new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });
const placeholder = (value) =>
  tex(value ?? "Por definir").replace(/(\d)ro /, "$1.° ").replace(/(\d)do /, "$1.° ");
const stageLabel = (match, groups) =>
  match.stage === "group_stage"
    ? groups.get(match.group_id) ?? "Grupo"
    : { quarter_finals: "Cuartos", semi_finals: "Semifinal", third_place: "3.er lugar", final: "Final", preliminary: "Preliminar" }[
        match.stage
      ] + (match.label && !["F", "3L"].includes(match.label) ? ` ${match.label}` : "");
// Version corta para la tabla del fixture (que entre en una pagina).
const shortStage = (label) => label.replace(/^Grupo /, "Gr. ").replace(/^(Cuartos|Semifinal) /, "");
const shortCourt = (name) => name.replace(/^Cancha /, "").replace(/^Losa.*/, "Losa");

// En la fase final el cruce va en gris abajo: la fila alta deja espacio para escribir el equipo.
const knockoutCell = (text) => `\\vspace*{\\fill}{\\scriptsize\\color{imegray}${text}}`;
const table = (title, rows, stretch) => `\\subsection*{${title}}
{\\footnotesize\\renewcommand{\\arraystretch}{${stretch}}
\\noindent\\begin{tabularx}{\\linewidth}{|c|c|c|c|>{\\RaggedLeft\\arraybackslash}X|c|>{\\RaggedRight\\arraybackslash}X|p{1.5cm}|}
\\hline
\\textbf{N.°} & \\textbf{Hora} & \\textbf{Can.} & \\textbf{Fase} & \\textbf{Local} & \\textbf{Resultado} & \\textbf{Visitante} & \\textbf{Obs.}\\\\ \\hline
${rows
  .map(
    (row) =>
      `${row.n} & ${row.hora} & ${shortCourt(row.cancha)} & ${shortStage(row.fase)} & ${
        row.knockout ? knockoutCell(row.local) : row.local
      } & \\casilla\\,--\\,\\casilla & ${row.knockout ? knockoutCell(row.visita) : row.visita} & \\\\ \\hline`
  )
  .join("\n")}
\\end{tabularx}}`;

const { data: events, error } = await supabase.from("events").select("id, name, sport:sport_id (name)").order("name");
if (error) throw error;

let fixture = "";
let planillas = "";
// Futsal primero, luego voley.
for (const event of events.sort((a, b) => (a.name.includes("FUTSAL") ? -1 : 1) - (b.name.includes("FUTSAL") ? -1 : 1))) {
  const isVoley = /voley/i.test(event.name);
  const discipline = isVoley ? "Vóley Mixto" : "Futsal";
  const [{ data: matches }, { data: teams }, { data: groups }] = await Promise.all([
    supabase.from("matches").select("*, venue:venue_id (name)").eq("event_id", event.id),
    supabase.from("teams").select("id, name").eq("event_id", event.id),
    supabase.from("groups").select("id, name").eq("event_id", event.id)
  ]);
  const teamName = new Map(teams.map((team) => [team.id, tex(team.name)]));
  const groupName = new Map(groups.map((group) => [group.id, group.name]));
  const court = (match) => tex(match.venue?.name ?? "");
  // Mismo orden que la hoja impresa: por hora y luego cancha.
  matches.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at) || court(a).localeCompare(court(b)));

  const side = (match, key) => teamName.get(match[`${key}_team_id`]) ?? placeholder(match[`${key}_placeholder`]);
  const rows = matches.map((match, index) => ({
    n: index + 1,
    hora: hour(match.scheduled_at),
    cancha: court(match),
    fase: stageLabel(match, groupName),
    local: side(match, "home"),
    visita: side(match, "away"),
    knockout: match.stage !== "group_stage",
    final: match.stage === "final"
  }));

  fixture += `\\section*{Fixture y hoja de resultados: ${discipline}}
\\addcontentsline{toc}{section}{Fixture y hoja de resultados: ${discipline}}
{\\small El planillero anota aquí el resultado de cada partido al recibir la planilla firmada. ${
    isVoley ? "Resultado en puntos del set (en la final, sets y puntos de cada set)." : "Si hubo penales, anotarlos en Obs. (ej.: pen. 3--2)."
  } En la fase final, escribir el nombre del equipo clasificado sobre el cruce en gris.}\\par
${table("Fase de grupos", rows.filter((row) => !row.knockout), 1.5)}
${table("Fase final", rows.filter((row) => row.knockout), 2.6)}
\\clearpage
`;

  planillas += rows
    .map(
      (row) =>
        `\\planilla{${discipline}}{${row.n}}{${row.hora}}{${row.cancha}}{${row.fase}}{${row.knockout ? "" : row.local}}{${
          row.knockout ? "" : row.visita
        }}{${row.knockout ? `${row.local} vs ${row.visita}` : ""}}{${isVoley ? (row.final ? "voleyfinal" : "voley") : "futsal"}}\n`
    )
    .join("");
  console.log(`${event.name}: ${rows.length} partidos`);
}

writeFileSync(new URL("mesa-fixture.tex", out), fixture);
writeFileSync(new URL("mesa-planillas-datos.tex", out), planillas);
