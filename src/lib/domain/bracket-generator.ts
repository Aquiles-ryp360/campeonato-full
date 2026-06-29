import type { FixtureStatus, Match, MatchStage, SeedingMode, Team, TournamentFormat } from "../types";

export interface BracketOptions {
  eventId: string;
  format?: TournamentFormat;
  maxTeams?: number;
  thirdPlace?: boolean;
  seedingMode?: SeedingMode;
  randomSeed?: string;
  manualSeeds?: string[];
  fixtureStatus?: FixtureStatus;
}

export interface BracketSlot {
  id: string;
  label: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeLabel: string;
  awayLabel: string;
  match?: Match;
  nextMatchId?: string;
  sourceMatchIds?: string[];
}

export interface BracketRound {
  id: string;
  name: string;
  stage: MatchStage;
  order: number;
  slots: BracketSlot[];
}

export interface GeneratedBracket {
  rounds: BracketRound[];
  thirdPlace?: BracketSlot;
  matches: Match[];
  bracketSize: number;
  lowerPowerOfTwo: number;
  preliminaryMatches: number;
  preliminaryTeams: number;
  byeCount: number;
  status: "complete" | "incomplete";
  warnings: string[];
}

type Entrant =
  | {
      kind: "team";
      seed: number;
      team: Team;
    }
  | {
      kind: "winner";
      seed: number;
      matchId: string;
      label: string;
    }
  | {
      kind: "loser";
      matchId: string;
      label: string;
    };

export function lowerPowerOfTwo(value: number) {
  if (value < 2) return 0;
  return 2 ** Math.floor(Math.log2(value));
}

export function nextPowerOfTwo(value: number) {
  if (value <= 2) return 2;
  return 2 ** Math.ceil(Math.log2(value));
}

export function generateKnockoutBracket({
  teams,
  matches = [],
  eventId,
  includeThirdPlace,
  ...options
}: {
  teams: Team[];
  matches?: Match[];
  eventId?: string;
  includeThirdPlace?: boolean;
} & Partial<BracketOptions>): GeneratedBracket {
  const resolvedEventId = eventId ?? teams[0]?.eventId ?? "event";
  const thirdPlace = options.thirdPlace ?? includeThirdPlace ?? true;
  const fixtureStatus = options.fixtureStatus ?? "draft_auto";
  const orderedTeams = seedTeams(teams, {
    seedingMode: options.seedingMode ?? "registration_order",
    randomSeed: options.randomSeed,
    manualSeeds: options.manualSeeds
  });

  if (orderedTeams.length < 2) {
    return {
      rounds: [],
      matches: [],
      bracketSize: 0,
      lowerPowerOfTwo: 0,
      preliminaryMatches: 0,
      preliminaryTeams: 0,
      byeCount: 0,
      status: "incomplete",
      warnings: ["Se necesitan al menos 2 equipos para generar una llave."]
    };
  }

  const generated = createGeneratedMatches({
    eventId: resolvedEventId,
    teams: orderedTeams,
    thirdPlace,
    fixtureStatus
  });
  const effectiveMatches = matches.length > 0 ? mergeExistingMatches(generated.matches, matches, resolvedEventId) : generated.matches;
  const rounds = matchesToRounds(effectiveMatches);
  const thirdPlaceMatch = effectiveMatches.find((match) => match.stage === "third_place");

  return {
    rounds,
    thirdPlace: thirdPlaceMatch ? matchToSlot(thirdPlaceMatch) : undefined,
    matches: effectiveMatches,
    bracketSize: generated.bracketSize,
    lowerPowerOfTwo: generated.lowerPower,
    preliminaryMatches: generated.preliminaryMatches,
    preliminaryTeams: generated.preliminaryMatches * 2,
    byeCount: Math.max(0, generated.bracketSize - orderedTeams.length),
    status: "complete",
    warnings: generated.warnings
  };
}

export function generateKnockoutMatches(teams: Team[], options: BracketOptions) {
  return generateKnockoutBracket({ ...options, teams }).matches;
}

function createGeneratedMatches({
  eventId,
  teams,
  thirdPlace,
  fixtureStatus
}: {
  eventId: string;
  teams: Team[];
  thirdPlace: boolean;
  fixtureStatus: FixtureStatus;
}) {
  const teamCount = teams.length;
  const lowerPower = lowerPowerOfTwo(teamCount);
  const bracketSize = lowerPower === teamCount ? lowerPower : nextPowerOfTwo(teamCount);
  const preliminaryMatches = teamCount === lowerPower ? 0 : teamCount - lowerPower;
  const directSeedCount = teamCount - preliminaryMatches * 2;
  const seedEntrants = new Map<number, Entrant>();
  const preliminary: Match[] = [];
  const warnings: string[] = [];

  for (let seed = 1; seed <= directSeedCount; seed += 1) {
    const team = teams[seed - 1];
    if (team) seedEntrants.set(seed, { kind: "team", seed, team });
  }

  for (let index = 0; index < preliminaryMatches; index += 1) {
    const lowSeed = directSeedCount + index + 1;
    const highSeed = teamCount - index;
    const home = teams[lowSeed - 1];
    const away = teams[highSeed - 1];
    const matchId = `${eventId}-p${index + 1}`;

    preliminary.push(createMatch({
      id: matchId,
      eventId,
      round: 1,
      stage: "preliminary",
      position: index + 1,
      label: `P${index + 1}`,
      home,
      away,
      fixtureStatus
    }));

    seedEntrants.set(lowSeed, {
      kind: "winner",
      seed: lowSeed,
      matchId,
      label: `Ganador P${index + 1}`
    });
  }

  const mainPower = lowerPower;
  const mainSeedOrder = seededOrder(mainPower);
  const mainRounds: Match[] = [];
  let currentEntrants: Entrant[] = [];
  const firstMainRoundName = stageForEntrants(mainPower);
  let roundNumber = preliminary.length > 0 ? 2 : 1;

  for (let index = 0; index < mainSeedOrder.length; index += 2) {
    const homeSeed = mainSeedOrder[index];
    const awaySeed = mainSeedOrder[index + 1];
    const homeEntrant = seedEntrants.get(homeSeed) ?? missingSeed(homeSeed);
    const awayEntrant = seedEntrants.get(awaySeed) ?? missingSeed(awaySeed);
    const position = index / 2 + 1;
    const label = labelForStage(firstMainRoundName, position);
    const matchId = `${eventId}-${label.toLowerCase()}`;

    mainRounds.push(createMatchFromEntrants({
      id: matchId,
      eventId,
      round: roundNumber,
      stage: firstMainRoundName,
      position,
      label,
      home: homeEntrant,
      away: awayEntrant,
      fixtureStatus
    }));

    currentEntrants.push({
      kind: "winner",
      seed: position,
      matchId,
      label: `Ganador ${label}`
    });
  }

  let entrantsCount = currentEntrants.length;
  while (entrantsCount >= 2) {
    roundNumber += 1;
    const stage = stageForEntrants(entrantsCount);
    const nextEntrants: Entrant[] = [];

    for (let index = 0; index < entrantsCount; index += 2) {
      const position = index / 2 + 1;
      const label = labelForStage(stage, position);
      const matchId = `${eventId}-${label.toLowerCase()}`;
      const home = currentEntrants[index];
      const away = currentEntrants[index + 1];

      mainRounds.push(createMatchFromEntrants({
        id: matchId,
        eventId,
        round: roundNumber,
        stage,
        position,
        label,
        home,
        away,
        fixtureStatus
      }));

      nextEntrants.push({
        kind: "winner",
        seed: position,
        matchId,
        label: `Ganador ${label}`
      });
    }

    currentEntrants = nextEntrants;
    entrantsCount = currentEntrants.length;
  }

  const semifinalMatches = mainRounds.filter((match) => match.stage === "semi_finals");
  const thirdPlaceMatch =
    thirdPlace && semifinalMatches.length === 2
      ? createMatchFromEntrants({
          id: `${eventId}-3l`,
          eventId,
          round: roundNumber,
          stage: "third_place",
          position: 1,
          label: "3L",
          home: {
            kind: "loser",
            matchId: semifinalMatches[0].id,
            label: `Perdedor ${semifinalMatches[0].label ?? "S1"}`
          },
          away: {
            kind: "loser",
            matchId: semifinalMatches[1].id,
            label: `Perdedor ${semifinalMatches[1].label ?? "S2"}`
          },
          fixtureStatus
        })
      : null;

  if (thirdPlace && semifinalMatches.length < 2) {
    warnings.push("El tercer lugar solo se crea cuando existen dos semifinales.");
  }

  const allMatches = [...preliminary, ...mainRounds, ...(thirdPlaceMatch ? [thirdPlaceMatch] : [])];
  linkNextMatches(allMatches);

  return {
    matches: allMatches,
    bracketSize,
    lowerPower,
    preliminaryMatches,
    warnings
  };
}

function createMatch({
  id,
  eventId,
  round,
  stage,
  position,
  label,
  home,
  away,
  fixtureStatus
}: {
  id: string;
  eventId: string;
  round: number;
  stage: MatchStage;
  position: number;
  label: string;
  home?: Team;
  away?: Team;
  fixtureStatus: FixtureStatus;
}): Match {
  return {
    id,
    eventId,
    round,
    stage,
    bracketPosition: position,
    label,
    homeTeamId: home?.id ?? "",
    awayTeamId: away?.id ?? "",
    homePlaceholder: home?.name ?? "Equipo por confirmar",
    awayPlaceholder: away?.name ?? "Equipo por confirmar",
    scheduledAt: "",
    court: "Cancha por definir",
    status: "scheduled",
    fixtureStatus,
    isFixturePreliminary: fixtureStatus === "draft_auto" || fixtureStatus === "draft_review"
  };
}

function createMatchFromEntrants({
  id,
  eventId,
  round,
  stage,
  position,
  label,
  home,
  away,
  fixtureStatus
}: {
  id: string;
  eventId: string;
  round: number;
  stage: MatchStage;
  position: number;
  label: string;
  home: Entrant;
  away: Entrant;
  fixtureStatus: FixtureStatus;
}): Match {
  const sourceMatchIds = [sourceMatchId(home), sourceMatchId(away)].filter(
    (value): value is string => Boolean(value)
  );

  return {
    id,
    eventId,
    round,
    stage,
    bracketPosition: position,
    label,
    homeTeamId: home.kind === "team" ? home.team.id : "",
    awayTeamId: away.kind === "team" ? away.team.id : "",
    homePlaceholder: entrantLabel(home),
    awayPlaceholder: entrantLabel(away),
    homeSourceMatchId: sourceMatchId(home),
    awaySourceMatchId: sourceMatchId(away),
    sourceMatchIds,
    dependsOnMatchIds: sourceMatchIds,
    scheduledAt: "",
    court: "Cancha por definir",
    status: "scheduled",
    fixtureStatus,
    isFixturePreliminary: fixtureStatus === "draft_auto" || fixtureStatus === "draft_review"
  };
}

function linkNextMatches(matches: Match[]) {
  for (const match of matches) {
    const next = matches.find((candidate) => candidate.sourceMatchIds?.includes(match.id));
    if (next) {
      match.nextMatchId = next.id;
      match.isHomeNext = next.homeSourceMatchId === match.id;
    }
  }
}

function matchesToRounds(matches: Match[]): BracketRound[] {
  return stageOrderFromMatches(matches).map((stage, index) => {
    const stageMatches = matches
      .filter((match) => match.stage === stage)
      .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));

    return {
      id: stage,
      name: stageName(stage),
      stage,
      order: index + 1,
      slots: stageMatches.map(matchToSlot)
    };
  });
}

function matchToSlot(match: Match): BracketSlot {
  return {
    id: match.id,
    label: match.label ?? `${stageName(match.stage)} ${match.bracketPosition ?? ""}`.trim(),
    homeTeamId: match.homeTeamId || undefined,
    awayTeamId: match.awayTeamId || undefined,
    homeLabel: match.homePlaceholder ?? "Equipo por confirmar",
    awayLabel: match.awayPlaceholder ?? "Equipo por confirmar",
    match,
    nextMatchId: match.nextMatchId,
    sourceMatchIds: match.sourceMatchIds
  };
}

function seededOrder(size: number): number[] {
  if (size <= 2) return [1, 2];
  const previous = seededOrder(size / 2);
  return previous.flatMap((seed) => [seed, size + 1 - seed]);
}

function seedTeams(
  teams: Team[],
  options: {
    seedingMode: SeedingMode;
    randomSeed?: string;
    manualSeeds?: string[];
  }
) {
  if (options.seedingMode === "manual" && options.manualSeeds?.length) {
    const byId = new Map(teams.map((team) => [team.id, team]));
    return [
      ...options.manualSeeds.map((id) => byId.get(id)).filter((team): team is Team => Boolean(team)),
      ...teams.filter((team) => !options.manualSeeds?.includes(team.id))
    ];
  }

  if (options.seedingMode === "random") {
    return seededShuffle(teams, options.randomSeed ?? "fixture");
  }

  return [...teams].sort((a, b) => (a.createdAt ?? a.id).localeCompare(b.createdAt ?? b.id));
}

function seededShuffle(teams: Team[], seed: string) {
  const result = [...teams];
  let state = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0) || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 9301 + 49297) % 233280;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function stageOrderFromMatches(matches: Match[]) {
  return stageOrder.filter((stage) => matches.some((match) => match.stage === stage));
}

function stageForEntrants(entrants: number): MatchStage {
  if (entrants >= 16) return "round_of_16";
  if (entrants >= 8) return "quarter_finals";
  if (entrants >= 4) return "semi_finals";
  return "final";
}

function labelForStage(stage: MatchStage, position: number) {
  if (stage === "preliminary") return `P${position}`;
  if (stage === "quarter_finals") return `C${position}`;
  if (stage === "semi_finals") return `S${position}`;
  if (stage === "final") return "F";
  if (stage === "third_place") return "3L";
  if (stage === "round_of_16") return `O${position}`;
  return `G${position}`;
}

function stageName(stage: MatchStage) {
  const labels: Record<MatchStage, string> = {
    group_stage: "Fase de grupos",
    preliminary: "Ronda preliminar",
    round_of_16: "Octavos de final",
    quarter_finals: "Cuartos de final",
    semi_finals: "Semifinal",
    final: "Final",
    third_place: "Tercer lugar"
  };

  return labels[stage];
}

const stageOrder: MatchStage[] = [
  "preliminary",
  "round_of_16",
  "quarter_finals",
  "semi_finals",
  "final",
  "third_place"
];

function entrantLabel(entrant: Entrant) {
  if (entrant.kind === "team") return entrant.team.name;
  return entrant.label;
}

function sourceMatchId(entrant: Entrant) {
  return entrant.kind === "winner" || entrant.kind === "loser" ? entrant.matchId : undefined;
}

function missingSeed(seed: number): Entrant {
  return {
    kind: "winner",
    seed,
    matchId: "",
    label: `Seed ${seed} por confirmar`
  };
}

function mergeExistingMatches(generated: Match[], existing: Match[], eventId: string) {
  const existingById = new Map(existing.filter((match) => match.eventId === eventId).map((match) => [match.id, match]));
  return generated.map((match) => ({
    ...match,
    ...existingById.get(match.id),
    homePlaceholder: existingById.get(match.id)?.homePlaceholder ?? match.homePlaceholder,
    awayPlaceholder: existingById.get(match.id)?.awayPlaceholder ?? match.awayPlaceholder,
    sourceMatchIds: existingById.get(match.id)?.sourceMatchIds ?? match.sourceMatchIds,
    dependsOnMatchIds: existingById.get(match.id)?.dependsOnMatchIds ?? match.dependsOnMatchIds
  }));
}
