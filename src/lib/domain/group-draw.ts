import type { Match } from "../types";
import { generateRoundRobinMatches } from "../scheduler";

export type DrawnGroup = {
  letter: string;
  name: string;
  teamIds: string[];
};

const letters = "ABCDEFGH";

// 12 equipos -> 4 grupos de 3; 18 -> 5 grupos (4-4-4-3-3).
export function defaultGroupCount(teamCount: number) {
  if (teamCount < 4) return 1;
  if (teamCount <= 12) return Math.max(2, Math.ceil(teamCount / 3));
  return Math.min(8, Math.ceil(teamCount / 4));
}

// Reparte lo mas parejo posible; los grupos grandes van primero.
export function groupSizes(teamCount: number, groupCount: number) {
  const base = Math.floor(teamCount / groupCount);
  const extra = teamCount % groupCount;
  return Array.from({ length: groupCount }, (_, index) => base + (index < extra ? 1 : 0));
}

export function drawGroups(teamIds: string[], groupCount: number, random: () => number = Math.random): DrawnGroup[] {
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

  let cursor = 0;
  return groupSizes(teamIds.length, groupCount).map((size, index) => {
    const letter = letters[index];
    const group = { letter, name: `Grupo ${letter}`, teamIds: shuffled.slice(cursor, cursor + size) };
    cursor += size;
    return group;
  });
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
        nextMatchId: id(`C${index + 3}`)
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
        nextMatchId: id(index < 2 ? "S1" : "S2")
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
      nextMatchId: id("F")
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
