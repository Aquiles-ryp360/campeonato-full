import type { Match } from "../types";
import { generateRoundRobinMatches } from "../scheduler";

export type DrawnGroup = {
  letter: string;
  name: string;
  teamIds: string[];
};

const letters = "ABCDEFGH";

// 12 equipos -> 4 grupos de 3; 18 -> 5 grupos (4-4-4-3-3).
// Grupos segun inscritos, solo entre las llaves soportadas (2, 4 o 5 grupos).
// ponytail: con 21+ equipos quedan 5 grupos grandes; para mas grupos hay que agregar sus cruces en quarterFinalSlots.
export function defaultGroupCount(teamCount: number) {
  if (teamCount < 4) return 1;
  if (teamCount <= 9) return 2;
  if (teamCount <= 16) return 4;
  return 5;
}

// Reparte lo mas parejo posible; los grupos grandes van primero.
export function groupSizes(teamCount: number, groupCount: number) {
  const base = Math.floor(teamCount / groupCount);
  const extra = teamCount % groupCount;
  return Array.from({ length: groupCount }, (_, index) => base + (index < extra ? 1 : 0));
}

// Etiqueta = semestre del equipo; dos equipos con la misma etiqueta no deberian caer en el mismo grupo.
export type DrawTags = Record<string, string>;

const ordinalWords: Record<string, number> = {
  primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, quinto: 5, sexto: 6,
  septimo: 7, setimo: 7, octavo: 8, noveno: 9, decimo: 10, undecimo: 11, onceavo: 11, duodecimo: 12
};
const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

// "2", "segundo semestre-A", "1MER SEMESTRE", "Décimo", "XI" -> "2", "2", "1", "10", "11".
export function semesterTag(text: string) {
  const clean = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const digits = clean.match(/\d+/);
  if (digits) return String(Number(digits[0]));
  for (const word of clean.split(/[^a-z]+/)) {
    if (ordinalWords[word]) return String(ordinalWords[word]);
    const roman = romanNumerals.indexOf(word);
    if (roman >= 0) return String(roman + 1);
  }
  return clean;
}

// El semestre que mas se repite entre los jugadores del equipo.
export function suggestTeamTag(semesters: string[]) {
  const counts = new Map<string, number>();
  for (const tag of semesters.map(semesterTag).filter(Boolean)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

// Grupo donde cae el equipo: el que tiene menos equipos con su etiqueta y, a igualdad, el mas vacio.
export function pickGroup(
  groups: string[][],
  sizes: number[],
  teamId: string,
  tags: DrawTags = {},
  random: () => number = Math.random
) {
  const tag = tags[teamId];
  const score = (index: number) => [tag ? groups[index].filter((id) => tags[id] === tag).length : 0, groups[index].length];
  const open = groups.map((_, index) => index).filter((index) => groups[index].length < sizes[index]);
  if (open.length === 0) throw new Error("Todos los grupos estan llenos.");
  const best = open.reduce((min, index) => {
    const [a, b] = [score(index), score(min)];
    return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? index : min;
  });
  const ties = open.filter((index) => score(index).join() === score(best).join());
  return ties[Math.floor(random() * ties.length)];
}

// Equipos del mismo semestre que comparten grupo.
export function groupConflicts(groups: string[][], tags: DrawTags = {}) {
  return groups.flatMap((teamIds, groupIndex) => {
    const byTag = new Map<string, string[]>();
    for (const id of teamIds) if (tags[id]) byTag.set(tags[id], [...(byTag.get(tags[id]) ?? []), id]);
    return [...byTag].filter(([, ids]) => ids.length > 1).map(([tag, ids]) => ({ groupIndex, tag, teamIds: ids }));
  });
}

export function toDrawnGroups(groups: string[][]): DrawnGroup[] {
  return groups.map((teamIds, index) => ({ letter: letters[index], name: `Grupo ${letters[index]}`, teamIds }));
}

export function drawGroups(
  teamIds: string[],
  groupCount: number,
  random: () => number = Math.random,
  tags: DrawTags = {}
): DrawnGroup[] {
  if (groupCount < 1 || groupCount > letters.length) {
    throw new Error(`El numero de grupos debe estar entre 1 y ${letters.length}.`);
  }
  if (teamIds.length < groupCount * 2) {
    throw new Error("Cada grupo necesita al menos 2 equipos.");
  }

  const shuffled = [...teamIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  // Primero las etiquetas mas repetidas: asi el reparto voraz casi siempre separa a todos.
  // ponytail: voraz, no busca el optimo exacto; si quedara un cruce evitable se corrige con intercambio manual en el panel.
  const frequency = (id: string) => (tags[id] ? teamIds.filter((other) => tags[other] === tags[id]).length : 0);
  shuffled.sort((a, b) => frequency(b) - frequency(a));

  const sizes = groupSizes(teamIds.length, groupCount);
  const groups: string[][] = sizes.map(() => []);
  for (const id of shuffled) groups[pickGroup(groups, sizes, id, tags, random)].push(id);
  return toDrawnGroups(groups);
}

// Partidos todos contra todos; round = fecha. groupId lleva la letra hasta persistir.
export function buildGroupStageMatches(eventId: string, groups: DrawnGroup[]): Match[] {
  return groups.flatMap((group) =>
    generateRoundRobinMatches(eventId, group.teamIds).map((match, index) => ({
      ...match,
      id: `${eventId}-g${group.letter}${index + 1}`,
      groupId: group.letter,
      bracketPosition: index + 1,
      label: `${group.letter}${index + 1}`
    }))
  );
}

type Slot = { home: string; away: string };

// Cruces publicados en las bases: 4 grupos (8 clasificados) y 5 grupos (10 con preliminar).
function quarterFinalSlots(groupCount: number): { preliminary: Slot[]; quarters: Slot[] } | null {
  if (groupCount === 2) {
    return { preliminary: [], quarters: [] };
  }
  if (groupCount === 4) {
    return {
      preliminary: [],
      quarters: [
        { home: "1ro Grupo A", away: "2do Grupo B" },
        { home: "1ro Grupo B", away: "2do Grupo A" },
        { home: "1ro Grupo C", away: "2do Grupo D" },
        { home: "1ro Grupo D", away: "2do Grupo C" }
      ]
    };
  }
  if (groupCount === 5) {
    return {
      preliminary: [
        { home: "2do Grupo B", away: "2do Grupo C" },
        { home: "2do Grupo D", away: "2do Grupo E" }
      ],
      quarters: [
        { home: "1ro Grupo B", away: "2do Grupo A" },
        { home: "1ro Grupo C", away: "1ro Grupo D" },
        { home: "1ro Grupo A", away: "Ganador P1" },
        { home: "1ro Grupo E", away: "Ganador P2" }
      ]
    };
  }
  return null;
}

export function supportsGroupKnockout(groupCount: number) {
  return quarterFinalSlots(groupCount) !== null;
}

export function buildGroupKnockoutMatches({
  eventId,
  groupCount,
  firstRound,
  thirdPlace
}: {
  eventId: string;
  groupCount: number;
  firstRound: number;
  thirdPlace: boolean;
}): Match[] {
  const slots = quarterFinalSlots(groupCount);
  if (!slots) {
    throw new Error("La llave automatica soporta 2, 4 o 5 grupos.");
  }

  const id = (label: string) => `${eventId}-${label.toLowerCase()}`;
  const base = {
    eventId,
    homeTeamId: "",
    awayTeamId: "",
    scheduledAt: "",
    court: "Cancha por definir",
    status: "scheduled" as const
  };
  const matches: Match[] = [];
  let round = firstRound;

  if (slots.preliminary.length > 0) {
    slots.preliminary.forEach((slot, index) => {
      matches.push({
        ...base,
        id: id(`P${index + 1}`),
        round,
        stage: "preliminary",
        bracketPosition: index + 1,
        label: `P${index + 1}`,
        homePlaceholder: slot.home,
        awayPlaceholder: slot.away,
        // El ganador de P1/P2 entra como visitante en C3/C4.
        nextMatchId: id(`C${index + 3}`),
        isHomeNext: false
      });
    });
    round += 1;
  }

  // Con 2 grupos se va directo a semifinales: 1A-2B y 1B-2A.
  const semiSlots: Slot[] =
    groupCount === 2
      ? [
          { home: "1ro Grupo A", away: "2do Grupo B" },
          { home: "1ro Grupo B", away: "2do Grupo A" }
        ]
      : [
          { home: "Ganador C1", away: "Ganador C2" },
          { home: "Ganador C3", away: "Ganador C4" }
        ];

  if (slots.quarters.length > 0) {
    slots.quarters.forEach((slot, index) => {
      const fromPreliminary = slot.away.startsWith("Ganador P") ? id(slot.away.replace("Ganador ", "")) : undefined;
      matches.push({
        ...base,
        id: id(`C${index + 1}`),
        round,
        stage: "quarter_finals",
        bracketPosition: index + 1,
        label: `C${index + 1}`,
        homePlaceholder: slot.home,
        awayPlaceholder: slot.away,
        awaySourceMatchId: fromPreliminary,
        sourceMatchIds: fromPreliminary ? [fromPreliminary] : [],
        dependsOnMatchIds: fromPreliminary ? [fromPreliminary] : [],
        nextMatchId: id(index < 2 ? "S1" : "S2"),
        isHomeNext: index % 2 === 0
      });
    });
    round += 1;
  }

  semiSlots.forEach((slot, index) => {
    const sources = groupCount === 2 ? [] : [id(`C${index * 2 + 1}`), id(`C${index * 2 + 2}`)];
    matches.push({
      ...base,
      id: id(`S${index + 1}`),
      round,
      stage: "semi_finals",
      bracketPosition: index + 1,
      label: `S${index + 1}`,
      homePlaceholder: slot.home,
      awayPlaceholder: slot.away,
      homeSourceMatchId: sources[0],
      awaySourceMatchId: sources[1],
      sourceMatchIds: sources,
      dependsOnMatchIds: sources,
      nextMatchId: id("F"),
      isHomeNext: index === 0
    });
  });
  round += 1;

  const semis = [id("S1"), id("S2")];
  if (thirdPlace) {
    matches.push({
      ...base,
      id: id("3L"),
      round,
      stage: "third_place",
      bracketPosition: 1,
      label: "3L",
      homePlaceholder: "Perdedor S1",
      awayPlaceholder: "Perdedor S2",
      homeSourceMatchId: semis[0],
      awaySourceMatchId: semis[1],
      sourceMatchIds: semis,
      dependsOnMatchIds: semis
    });
    round += 1;
  }

  matches.push({
    ...base,
    id: id("F"),
    round,
    stage: "final",
    bracketPosition: 1,
    label: "F",
    homePlaceholder: "Ganador S1",
    awayPlaceholder: "Ganador S2",
    homeSourceMatchId: semis[0],
    awaySourceMatchId: semis[1],
    sourceMatchIds: semis,
    dependsOnMatchIds: semis
  });

  return matches;
}
