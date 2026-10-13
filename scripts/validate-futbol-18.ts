import { readFileSync } from "node:fs";
import { buildFutbol18Seed, futbol18EventId } from "../src/lib/futbol-18-seed";
import { buildGroupQualificationPlan } from "../src/lib/domain/standings";
import { detectScheduleConflicts, shouldAutoRegenerateFixture } from "../src/lib/domain/conflict-detector";
import type { GroupStanding } from "../src/lib/types";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const data = buildFutbol18Seed();
const event = data.events.find((item) => item.id === futbol18EventId);
assert(event, "No existe Futbol Relampago 2026.");

const matches = data.matches.filter((match) => match.eventId === futbol18EventId);
const groupMatches = matches.filter((match) => match.stage === "group_stage");
const preliminary = matches.filter((match) => match.stage === "preliminary");
const quarters = matches.filter((match) => match.stage === "quarter_finals");
const semifinals = matches.filter((match) => match.stage === "semi_finals");
const finals = matches.filter((match) => match.stage === "final");
const thirdPlace = matches.filter((match) => match.stage === "third_place");

assert(data.events.length === 1, "La seed debe tener un solo campeonato.");
assert(data.teams.length === 18, "La seed debe tener 18 equipos.");
assert(data.players.length >= 144, "La seed debe tener minimo 144 jugadores.");
assert(data.groups.length === 5, "La seed debe tener 5 grupos.");
assert(groupMatches.length === 24, "La fase de grupos debe tener 24 partidos.");
assert(preliminary.length === 2, "10 clasificados deben generar 2 preliminares.");
assert(quarters.length === 4, "10 clasificados deben generar 4 cuartos.");
assert(semifinals.length === 2, "Deben existir 2 semifinales.");
assert(finals.length === 1, "Debe existir 1 final.");
assert(thirdPlace.length === 1, "Debe existir 1 partido por tercer lugar.");
assert(matches.length === 34, "Total esperado: 34 partidos.");

const groupSizes = data.groups.map(
  (group) => data.groupTeams.filter((row) => row.groupId === group.id).length
);
assert(
  groupSizes.join(",") === "4,4,4,3,3",
  `Distribucion de grupos incorrecta: ${groupSizes.join(",")}`
);

const labels = new Map(matches.map((match) => [match.label, match]));
assert(labels.get("P1")?.homePlaceholder === "2do Grupo B", "P1 local debe ser 2do Grupo B.");
assert(labels.get("P1")?.awayPlaceholder === "2do Grupo C", "P1 visita debe ser 2do Grupo C.");
assert(labels.get("C3")?.awayPlaceholder === "Ganador P1", "C3 debe recibir Ganador P1.");
assert(labels.get("C4")?.awayPlaceholder === "Ganador P2", "C4 debe recibir Ganador P2.");
assert(labels.get("S1")?.homePlaceholder === "Ganador C1", "S1 debe recibir Ganador C1.");
assert(labels.get("F")?.homePlaceholder === "Ganador S1", "La final debe recibir Ganador S1.");

const earliest = matches.reduce((current, match) =>
  match.scheduledAt < current.scheduledAt ? match : current
);
assert(earliest.scheduledAt === "2026-08-15T13:00:00.000Z", "El primer partido debe iniciar 08:00 America/Lima.");
assert(
  new Date(labels.get("P1")!.scheduledAt) > new Date(earliest.scheduledAt),
  "La ronda preliminar debe jugarse despues de la fase de grupos."
);
assert(
  new Date(labels.get("F")!.scheduledAt) > new Date(labels.get("S1")!.scheduledAt),
  "La final debe jugarse despues de semifinales."
);
assert(
  new Date(labels.get("S1")!.scheduledAt) > new Date(labels.get("C1")!.scheduledAt),
  "Semifinal antes de cuartos."
);
assert(shouldAutoRegenerateFixture("draft_auto"), "draft_auto debe regenerar automaticamente.");

const courtTimeKeys = new Set<string>();
for (const match of matches) {
  const key = `${match.court}-${match.scheduledAt}`;
  assert(!courtTimeKeys.has(key), `Cancha duplicada a la misma hora: ${key}`);
  courtTimeKeys.add(key);
}

const conflicts = detectScheduleConflicts({
  matches,
  teams: data.teams,
  players: data.players,
  events: data.events
});
assert(!conflicts.some((conflict) => conflict.type === "court" && conflict.severity === "error"), "No debe haber choque de cancha.");
assert(!conflicts.some((conflict) => conflict.type === "team" && conflict.severity === "error"), "No debe haber choque de equipo.");

const plan = buildGroupQualificationPlan({
  event: event!,
  groups: data.groups,
  groupTeams: data.groupTeams,
  groupStandings: syntheticStandings(),
  teams: data.teams,
  matches: []
});
assert(plan.qualifiedTeamIds.size === 10, "Deben clasificar 10 equipos (dos por grupo).");
assert(plan.bestThirdCount === 0, "No deben clasificar mejores terceros.");
assert(plan.knockoutSize === 10, "La llave final debe ser de 10 equipos.");

const publicModalSource = readFileSync("src/features/public/components/TeamDetailsModal.tsx", "utf8");
assert(!publicModalSource.includes("player.dni"), "El modal publico no debe leer player.dni.");

console.log("Validacion Futbol Relampago 2026 OK");
console.log(`Campeonato: ${event!.name}`);
console.log(`Equipos: ${data.teams.length}`);
console.log(`Jugadores: ${data.players.length}`);
console.log(`Partidos: ${matches.length}`);

function syntheticStandings(): GroupStanding[] {
  return data.groups.flatMap((group) => {
    const teamIds = data.groupTeams
      .filter((row) => row.groupId === group.id)
      .map((row) => row.teamId);
    return teamIds.map((teamId, index) => ({
      id: `standing-${group.id}-${teamId}`,
      groupId: group.id,
      teamId,
      played: 3,
      won: Math.max(0, 3 - index),
      drawn: 0,
      lost: index,
      goalsFor: Math.max(1, 9 - index * 3),
      goalsAgainst: index * 2,
      goalDifference: Math.max(1, 9 - index * 3) - index * 2,
      points: Math.max(0, 9 - index * 3)
    }));
  });
}
