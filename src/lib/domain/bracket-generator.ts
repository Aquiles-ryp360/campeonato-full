import type { Match, MatchStage, Team } from "../types";

export interface BracketSlot {
  id: string;
  label: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeLabel: string;
  awayLabel: string;
  match?: Match;
  nextMatchId?: string;
}

export interface BracketRound {
  id: string;
  name: string;
  slots: BracketSlot[];
}

export interface GeneratedBracket {
  rounds: BracketRound[];
  thirdPlace?: BracketSlot;
  bracketSize: number;
  byeCount: number;
}

const stageOrder: MatchStage[] = [
  "round_of_16",
  "quarter_finals",
  "semi_finals",
  "final"
];

export function nextPowerOfTwo(value: number) {
  if (value <= 2) return 2;
  return 2 ** Math.ceil(Math.log2(value));
}

export function generateKnockoutBracket({
  eventId,
  teams,
  matches,
  includeThirdPlace = true
}: {
  eventId: string;
  teams: Team[];
  matches: Match[];
  includeThirdPlace?: boolean;
}): GeneratedBracket {
  const playoffMatches = matches
    .filter((match) => match.eventId === eventId && match.stage !== "group_stage")
    .sort((a, b) => a.round - b.round || (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
  const thirdPlaceMatch = playoffMatches.find((match) => match.stage === "third_place");
  const bracketMatches = playoffMatches.filter((match) => match.stage !== "third_place");
  const bracketSize = nextPowerOfTwo(Math.max(2, teams.length));
  const byeCount = Math.max(0, bracketSize - teams.length);

  if (bracketMatches.length > 0) {
    const rounds = stageOrder
      .map((stage) => {
        const stageMatches = bracketMatches.filter((match) => match.stage === stage);
        if (stageMatches.length === 0) return null;

        return {
          id: stage,
          name: stageName(stage),
          slots: stageMatches.map((match, index) => matchToSlot(match, index))
        };
      })
      .filter(Boolean) as BracketRound[];

    return {
      rounds,
      thirdPlace: thirdPlaceMatch ? matchToSlot(thirdPlaceMatch, 0, "Tercer lugar") : undefined,
      bracketSize,
      byeCount
    };
  }

  return createEmptyBracket(eventId, teams, bracketSize, byeCount, includeThirdPlace);
}

function createEmptyBracket(
  eventId: string,
  teams: Team[],
  bracketSize: number,
  byeCount: number,
  includeThirdPlace: boolean
): GeneratedBracket {
  const rounds: BracketRound[] = [];
  const previousPower = bracketSize / 2;
  const preliminaryMatches = Math.max(0, teams.length - previousPower);
  let cursor = 0;

  if (preliminaryMatches > 0) {
    rounds.push({
      id: "preliminary",
      name: "Ronda previa",
      slots: Array.from({ length: preliminaryMatches }, (_, index) => {
        const home = teams[cursor++];
        const away = teams[cursor++];
        return {
          id: `${eventId}-pre-${index + 1}`,
          label: `Previa ${index + 1}`,
          homeTeamId: home?.id,
          awayTeamId: away?.id,
          homeLabel: home?.name ?? "Equipo por confirmar",
          awayLabel: away?.name ?? "Equipo por confirmar",
          nextMatchId: `${eventId}-round-1-${index + 1}`
        };
      })
    });
  }

  const entrantsForMainRound = Math.max(2, bracketSize / (preliminaryMatches > 0 ? 2 : 1));
  const mainRoundMatches = Math.max(1, entrantsForMainRound / 2);
  rounds.push({
    id: "round-1",
    name: roundNameForEntrants(entrantsForMainRound),
    slots: Array.from({ length: mainRoundMatches }, (_, index) => {
      const home = teams[cursor++];
      const away = teams[cursor++];
      return {
        id: `${eventId}-round-1-${index + 1}`,
        label: `${roundNameForEntrants(entrantsForMainRound)} ${index + 1}`,
        homeTeamId: home?.id,
        awayTeamId: away?.id,
        homeLabel: home?.name ?? (index < preliminaryMatches ? "Ganador ronda previa" : "Libre / por confirmar"),
        awayLabel: away?.name ?? "Libre / por confirmar",
        nextMatchId: `${eventId}-round-2-${Math.floor(index / 2) + 1}`
      };
    })
  });

  let entrants = entrantsForMainRound / 2;
  let roundIndex = 2;
  while (entrants >= 2) {
    rounds.push({
      id: `round-${roundIndex}`,
      name: roundNameForEntrants(entrants),
      slots: Array.from({ length: entrants / 2 }, (_, index) => ({
        id: `${eventId}-round-${roundIndex}-${index + 1}`,
        label: `${roundNameForEntrants(entrants)} ${index + 1}`,
        homeLabel: "Ganador llave anterior",
        awayLabel: "Ganador llave anterior",
        nextMatchId:
          entrants > 2
            ? `${eventId}-round-${roundIndex + 1}-${Math.floor(index / 2) + 1}`
            : undefined
      }))
    });
    entrants /= 2;
    roundIndex += 1;
  }

  return {
    rounds,
    thirdPlace: includeThirdPlace
      ? {
          id: `${eventId}-third-place`,
          label: "Tercer lugar",
          homeLabel: "Perdedor semifinal",
          awayLabel: "Perdedor semifinal"
        }
      : undefined,
    bracketSize,
    byeCount
  };
}

function matchToSlot(match: Match, index: number, fallbackLabel?: string): BracketSlot {
  return {
    id: match.id,
    label: fallbackLabel ?? `${stageName(match.stage)} ${match.bracketPosition ?? index + 1}`,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeLabel: "Equipo local",
    awayLabel: "Equipo visitante",
    match,
    nextMatchId: match.nextMatchId
  };
}

function stageName(stage: MatchStage) {
  const labels: Record<MatchStage, string> = {
    group_stage: "Fase de grupos",
    round_of_16: "Octavos",
    quarter_finals: "Cuartos",
    semi_finals: "Semifinal",
    final: "Final",
    third_place: "Tercer lugar"
  };

  return labels[stage];
}

function roundNameForEntrants(entrants: number) {
  if (entrants >= 16) return "Octavos";
  if (entrants >= 8) return "Cuartos";
  if (entrants >= 4) return "Semifinal";
  return "Final";
}
