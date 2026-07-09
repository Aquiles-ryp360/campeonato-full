import { buildFutsal10Seed, futsal10EventId } from "../src/lib/futsal-10-seed";
import { detectScheduleConflicts, shouldAutoRegenerateFixture } from "../src/lib/domain/conflict-detector";
import { getDelegateTeamContext } from "../src/lib/queries/delegate";
import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const data = buildFutsal10Seed();
const event = data.events.find((item) => item.id === futsal10EventId);
assert(event, "No existe Futsal Varones 2026.");

const matches = data.matches.filter((match) => match.eventId === futsal10EventId);
const preliminary = matches.filter((match) => match.stage === "preliminary");
const quarters = matches.filter((match) => match.stage === "quarter_finals");
const semifinals = matches.filter((match) => match.stage === "semi_finals");
const finals = matches.filter((match) => match.stage === "final");
const thirdPlace = matches.filter((match) => match.stage === "third_place");

assert(data.events.length === 1, "La seed debe tener un solo campeonato.");
assert(data.teams.length === 12, "La seed debe tener 12 equipos.");
assert(data.players.length >= 96, "La seed debe tener minimo 96 jugadores.");
assert(preliminary.length === 4, "12 equipos deben generar 4 preliminares.");
assert(quarters.length === 4, "12 equipos deben generar 4 cuartos.");
assert(semifinals.length === 2, "12 equipos deben generar 2 semifinales.");
assert(finals.length === 1, "Debe existir 1 final.");
assert(thirdPlace.length === 1, "Debe existir 1 partido por tercer lugar.");
assert(matches.length === 12, "Total esperado: 12 partidos.");

const labels = new Map(matches.map((match) => [match.label, match]));
assert(labels.get("P1")?.homePlaceholder === "Contabilidad", "P1 local debe ser Contabilidad.");
assert(labels.get("P1")?.awayPlaceholder === "Medicina Humana", "P1 visita debe ser Medicina Humana.");
assert(labels.get("P2")?.homePlaceholder === "Agronomia", "P2 local debe ser Agronomia.");
assert(labels.get("P2")?.awayPlaceholder === "Educacion Fisica", "P2 visita debe ser Educacion Fisica.");
assert(labels.get("P3")?.homePlaceholder === "Ingenieria Mecanica Electrica", "P3 local debe ser Ingenieria Mecanica Electrica.");
assert(labels.get("P3")?.awayPlaceholder === "Ingenieria de Sistemas", "P3 visita debe ser Ingenieria de Sistemas.");
assert(labels.get("P4")?.homePlaceholder === "Derecho", "P4 local debe ser Derecho.");
assert(labels.get("P4")?.awayPlaceholder === "Ingenieria Civil", "P4 visita debe ser Ingenieria Civil.");
assert(labels.get("C1")?.awayPlaceholder === "Ganador P4", "C1 debe recibir Ganador P4.");
assert(labels.get("C3")?.awayPlaceholder === "Ganador P3", "C3 debe recibir Ganador P3.");

assert(labels.get("P1")?.scheduledAt.includes("14:00:00.000Z"), "P1 debe programarse 09:00 America/Lima.");
assert(labels.get("P3")?.scheduledAt.includes("14:30:00.000Z"), "P3 debe programarse 09:30 America/Lima.");
assert(labels.get("C1")?.scheduledAt.includes("15:00:00.000Z"), "C1 debe programarse 10:00 America/Lima.");
assert(labels.get("C3")?.scheduledAt.includes("15:30:00.000Z"), "C3 debe programarse 10:30 America/Lima.");
assert(labels.get("S1")?.scheduledAt.includes("16:00:00.000Z"), "S1 debe programarse 11:00 America/Lima.");
assert(labels.get("F")?.scheduledAt.includes("16:30:00.000Z"), "Final debe programarse 11:30 America/Lima.");

const courtTimeKeys = new Set<string>();
for (const match of matches) {
  const key = `${match.court}-${match.scheduledAt}`;
  assert(!courtTimeKeys.has(key), `Cancha duplicada a la misma hora: ${key}`);
  courtTimeKeys.add(key);
}

assert(new Date(labels.get("S1")!.scheduledAt) > new Date(labels.get("C1")!.scheduledAt), "Semifinal antes de cuartos.");
assert(new Date(labels.get("F")!.scheduledAt) > new Date(labels.get("S1")!.scheduledAt), "Final antes de semifinal.");
assert(shouldAutoRegenerateFixture("draft_auto"), "draft_auto debe regenerar automaticamente.");
assert(shouldAutoRegenerateFixture("published"), "published debe usar la ultima version de equipos.");
assert(!shouldAutoRegenerateFixture("locked"), "locked no debe regenerar automaticamente.");

const delegateTeam = data.teams[0];
const delegateContext = getDelegateTeamContext(data, undefined, delegateTeam.delegateEmail);
assert(delegateContext.delegateTeams.length === 1, "El delegado debe ver solo sus equipos.");
assert(delegateContext.team?.id === delegateTeam.id, "El delegado debe entrar a su equipo vinculado.");
assert(delegateContext.players.every((player) => player.teamId === delegateTeam.id), "El delegado no debe ver planteles ajenos.");
assert(delegateContext.matches.length > 0, "El delegado debe ver su proximo partido conocido.");
assert(
  delegateContext.matches.every(
    (match) => match.homeTeamId === delegateTeam.id || match.awayTeamId === delegateTeam.id
  ),
  "El delegado no debe ver partidos de otros equipos."
);

const conflicts = detectScheduleConflicts({
  matches,
  teams: data.teams,
  players: data.players,
  events: data.events
});
assert(!conflicts.some((conflict) => conflict.type === "court" && conflict.severity === "error"), "No debe haber choque de cancha.");
assert(!conflicts.some((conflict) => conflict.type === "team" && conflict.severity === "error"), "No debe haber choque de equipo.");

const publicModalSource = readFileSync("src/features/public/components/TeamDetailsModal.tsx", "utf8");
assert(!publicModalSource.includes("player.dni"), "El modal publico no debe leer player.dni.");
const matchCardSource = readFileSync("src/features/fixture/components/MatchCard.tsx", "utf8");
assert(matchCardSource.includes("Fixture preliminar") || matchCardSource.includes("fixtureStatusLabel"), "La UI debe mostrar etiqueta de fixture preliminar.");

console.log("Validacion Futsal Varones 2026 OK");
console.log(`Campeonato: ${event!.name}`);
console.log(`Equipos: ${data.teams.length}`);
console.log(`Jugadores: ${data.players.length}`);
console.log(`Partidos: ${matches.length}`);
