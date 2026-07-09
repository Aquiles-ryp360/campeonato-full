"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, GripVertical, MapPin, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import type { Match, Team, TournamentEvent, Venue } from "@/lib/types";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { isExhibitionMatch } from "@/lib/domain/fixture-preview";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";

type DraftSide = "home" | "away";

type DragPayload = {
  teamId: string;
  matchId?: string;
  side?: DraftSide;
};

export function FixtureManualEditor({
  event,
  teams,
  matches,
  venues
}: {
  event: TournamentEvent;
  teams: Team[];
  matches: Match[];
  venues: Venue[];
}) {
  const router = useRouter();
  const [draftMatches, setDraftMatches] = useState(() => sortedMatches(matches));
  const [saving, setSaving] = useState(false);
  const activeTeams = useMemo(
    () => teams.filter((team) => isActiveRegistrationTeamStatus(team.status)),
    [teams]
  );
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const courts = useMemo(() => {
    const configured = event.scheduleConfig?.courts?.filter(Boolean) ?? [];
    const fromMatches = draftMatches.map((match) => match.court).filter(Boolean);
    const fromVenues = venues.map((venue) => venue.name).filter(Boolean);
    return Array.from(new Set([...configured, ...fromMatches, ...fromVenues])).sort();
  }, [draftMatches, event.scheduleConfig?.courts, venues]);
  const groupedRounds = useMemo(() => groupMatchesByStage(draftMatches), [draftMatches]);
  const dirty = useMemo(() => hasChanges(matches, draftMatches), [draftMatches, matches]);

  useEffect(() => {
    setDraftMatches(sortedMatches(matches));
  }, [matches]);

  function assignTeam({
    matchId,
    side,
    teamId,
    source
  }: {
    matchId: string;
    side: DraftSide;
    teamId: string;
    source?: { matchId?: string; side?: DraftSide };
  }) {
    setDraftMatches((current) => {
      const next = current.map((match) => ({ ...match }));
      const target = next.find((match) => match.id === matchId);
      const team = teamById.get(teamId);
      if (!target || !isSideEditable(target, side)) return current;

      const targetCurrentTeamId = getSideTeamId(target, side);
      const targetIsOfficial = !isExhibitionMatch(target);

      if (source?.matchId && source.side) {
        const sourceMatch = next.find((match) => match.id === source.matchId);
        if (sourceMatch && isSideEditable(sourceMatch, source.side)) {
          setSideTeam(sourceMatch, source.side, targetCurrentTeamId, teamById.get(targetCurrentTeamId));
        }
        if (teamId && targetIsOfficial && (!sourceMatch || isExhibitionMatch(sourceMatch))) {
          clearTeamFromOtherOfficialSlots(next, teamId, matchId, side);
        }
      } else if (teamId) {
        if (targetIsOfficial) {
          const sourceSlot = findEditableOfficialSlotWithTeam(next, teamId, matchId, side);
          if (sourceSlot && targetCurrentTeamId) {
            setSideTeam(sourceSlot.match, sourceSlot.side, targetCurrentTeamId, teamById.get(targetCurrentTeamId));
          } else {
            clearTeamFromOtherOfficialSlots(next, teamId, matchId, side);
          }
        }
      }

      setSideTeam(target, side, teamId, team);
      return sortedMatches(next);
    });
  }

  function clearSlot(matchId: string, side: DraftSide) {
    setDraftMatches((current) =>
      current.map((match) => {
        if (match.id !== matchId || !isSideEditable(match, side)) return match;
        const next = { ...match };
        setSideTeam(next, side, "", undefined);
        return next;
      })
    );
  }

  function updateSchedule(matchId: string, field: "time" | "court", value: string) {
    setDraftMatches((current) =>
      current.map((match) => {
        if (match.id !== matchId) return match;
        if (field === "court") return { ...match, court: value };

        const startsAt = buildPeruDateTime(match.scheduledAt || event.eventDate, value);
        return {
          ...match,
          scheduledAt: startsAt.toISOString()
        };
      })
    );
  }

  function handleDrop(matchId: string, side: DraftSide, eventDrop: React.DragEvent<HTMLDivElement>) {
    eventDrop.preventDefault();
    const raw = eventDrop.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as DragPayload;
      assignTeam({
        matchId,
        side,
        teamId: payload.teamId,
        source: {
          matchId: payload.matchId,
          side: payload.side
        }
      });
    } catch {
      toast.error("No se pudo mover el equipo.");
    }
  }

  async function saveChanges() {
    if (!dirty) {
      toast.info("No hay cambios para guardar.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/fixture-manual", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          matches: draftMatches.map((match) => ({
            id: match.id,
            round: match.round,
            stage: match.stage,
            bracketPosition: match.bracketPosition ?? null,
            label: match.label ?? null,
            nextMatchId: match.nextMatchId ?? null,
            isHomeNext: match.isHomeNext ?? null,
            homeSourceMatchId: match.homeSourceMatchId ?? null,
            awaySourceMatchId: match.awaySourceMatchId ?? null,
            sourceMatchIds: match.sourceMatchIds ?? [],
            dependsOnMatchIds: match.dependsOnMatchIds ?? [],
            notes: match.notes ?? null,
            homeTeamId: match.homeTeamId || null,
            awayTeamId: match.awayTeamId || null,
            scheduledAt: match.scheduledAt,
            court: match.court
          }))
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; updated?: number }
        | null;

      if (!response.ok || payload?.ok === false) {
        toast.error(payload?.error ?? "No se pudo guardar el fixture manual.");
        return;
      }

      toast.success(`Fixture manual guardado: ${payload?.updated ?? draftMatches.length} partido(s).`);
      router.refresh();
    } catch {
      toast.error("No se pudo guardar el fixture manual.");
    } finally {
      setSaving(false);
    }
  }

  if (event.format !== "single_elimination" || matches.length === 0) {
    return null;
  }

  return (
    <Card className="p-5">
      <SectionHeader
        eyebrow="Editor manual"
        title="Ajustar llaves y horarios"
        description="Arrastra equipos a slots editables o usa los selectores. Los cambios quedan en pantalla hasta guardar."
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={!dirty || saving} onClick={() => setDraftMatches(sortedMatches(matches))}>
              <RotateCcw className="h-4 w-4" />
              Revertir
            </Button>
            <Button disabled={!dirty || saving} onClick={() => void saveChanges()}>
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar ajustes"}
            </Button>
          </div>
        }
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-md border border-brand-towerMid/25 bg-brand-wash p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase text-brand-muted">Equipos activos</p>
            <Badge tone="blue">{activeTeams.length}</Badge>
          </div>
          <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
            {activeTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                draggable
                onDragStart={(dragEvent) => {
                  dragEvent.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ teamId: team.id } satisfies DragPayload)
                  );
                }}
                className="flex min-h-10 items-center gap-2 rounded-md border border-brand-towerMid/20 bg-white px-3 text-left text-sm font-bold text-ink shadow-insetLine hover:border-brand-electric/30 hover:text-brand-electric"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-brand-muted" />
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: team.primaryColor }} />
                <span className="truncate">{team.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-4">
          {groupedRounds.map((round) => (
            <section key={round.key} className="rounded-md border border-brand-towerMid/25 bg-white p-3 shadow-insetLine">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase text-brand-muted">{round.label}</p>
                <Badge tone="neutral">{round.matches.length}</Badge>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {round.matches.map((match) => (
                  <article key={match.id} className="rounded-md border border-brand-towerMid/25 bg-brand-wash p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-brand-navy px-2 py-1 text-xs font-black text-white">
                          {match.label ?? `R${match.round}`}
                        </span>
                        {isExhibitionMatch(match) ? <Badge tone="amber">Exhibicion</Badge> : null}
                      </div>
                      <span className="text-xs font-bold text-brand-muted">Ronda {match.round}</span>
                    </div>

                    <div className="grid gap-2">
                      <TeamSlot
                        label="Local"
                        side="home"
                        match={match}
                        teams={activeTeams}
                        editable={isSideEditable(match, "home")}
                        onAssign={assignTeam}
                        onClear={clearSlot}
                        onDrop={handleDrop}
                      />
                      <TeamSlot
                        label="Visitante"
                        side="away"
                        match={match}
                        teams={activeTeams}
                        editable={isSideEditable(match, "away")}
                        onAssign={assignTeam}
                        onClear={clearSlot}
                        onDrop={handleDrop}
                      />
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Field label="Hora">
                        <div className="relative">
                          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                          <input
                            className={`${inputClass} pl-9`}
                            type="time"
                            value={timeInputValue(match.scheduledAt)}
                            onChange={(changeEvent) => updateSchedule(match.id, "time", changeEvent.target.value)}
                          />
                        </div>
                      </Field>
                      <Field label="Cancha">
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                          <select
                            className={`${inputClass} pl-9`}
                            value={match.court}
                            onChange={(changeEvent) => updateSchedule(match.id, "court", changeEvent.target.value)}
                          >
                            {courts.map((court) => (
                              <option key={court} value={court}>
                                {court}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Field>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TeamSlot({
  label,
  side,
  match,
  teams,
  editable,
  onAssign,
  onClear,
  onDrop
}: {
  label: string;
  side: DraftSide;
  match: Match;
  teams: Team[];
  editable: boolean;
  onAssign: (input: { matchId: string; side: DraftSide; teamId: string; source?: { matchId?: string; side?: DraftSide } }) => void;
  onClear: (matchId: string, side: DraftSide) => void;
  onDrop: (matchId: string, side: DraftSide, eventDrop: React.DragEvent<HTMLDivElement>) => void;
}) {
  const teamId = getSideTeamId(match, side);
  const placeholder = getSidePlaceholder(match, side);
  const team = teams.find((item) => item.id === teamId);

  return (
    <div
      onDragOver={(dragEvent) => {
        if (editable) dragEvent.preventDefault();
      }}
      onDrop={(dropEvent) => editable && onDrop(match.id, side, dropEvent)}
      className={`rounded-md border p-2 ${
        editable ? "border-brand-electric/20 bg-white" : "border-dashed border-brand-towerMid/35 bg-white/60"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase text-brand-muted">{label}</p>
        {!editable ? <Badge tone="neutral">Ganador automatico</Badge> : null}
      </div>
      {editable ? (
        <div className="grid gap-2">
          <select
            className={inputClass}
            value={teamId}
            onChange={(changeEvent) =>
              onAssign({
                matchId: match.id,
                side,
                teamId: changeEvent.target.value
              })
            }
          >
            <option value="">Equipo por confirmar</option>
            {teams.map((teamOption) => (
              <option key={teamOption.id} value={teamOption.id}>
                {teamOption.name}
              </option>
            ))}
          </select>
          {team ? (
            <button
              type="button"
              draggable
              onDragStart={(dragEvent) => {
                dragEvent.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ teamId: team.id, matchId: match.id, side } satisfies DragPayload)
                );
              }}
              className="flex min-h-9 items-center gap-2 rounded-md bg-brand-wash px-2 text-left text-sm font-bold text-ink"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-brand-muted" />
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: team.primaryColor }} />
              <span className="truncate">{team.name}</span>
            </button>
          ) : null}
          {teamId ? (
            <button
              type="button"
              className="text-left text-xs font-bold text-red-700 hover:text-red-900"
              onClick={() => onClear(match.id, side)}
            >
              Quitar equipo de este slot
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-10 items-center gap-2 rounded-md bg-brand-wash px-2 text-sm font-bold text-brand-muted">
          <span className="h-3 w-3 rounded-sm border border-brand-towerMid/40 bg-slate-300" />
          <span className="truncate">{placeholder}</span>
        </div>
      )}
    </div>
  );
}

function sortedMatches(matches: Match[]) {
  return [...matches].sort(
    (a, b) =>
      a.round - b.round ||
      stageRank(a.stage) - stageRank(b.stage) ||
      (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0) ||
      a.scheduledAt.localeCompare(b.scheduledAt) ||
      a.id.localeCompare(b.id)
  );
}

function groupMatchesByStage(matches: Match[]) {
  const groups = new Map<string, Match[]>();
  for (const match of matches) {
    const key = match.stage;
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => stageRank(a as Match["stage"]) - stageRank(b as Match["stage"]))
    .map(([key, groupedMatches]) => ({
      key,
      label: stageLabel(key as Match["stage"]),
      matches: sortedMatches(groupedMatches)
    }));
}

function isSideEditable(match: Match, side: DraftSide) {
  return side === "home" ? !match.homeSourceMatchId : !match.awaySourceMatchId;
}

function getSideTeamId(match: Match, side: DraftSide) {
  return side === "home" ? match.homeTeamId : match.awayTeamId;
}

function getSidePlaceholder(match: Match, side: DraftSide) {
  return side === "home"
    ? match.homePlaceholder ?? "Equipo por confirmar"
    : match.awayPlaceholder ?? "Equipo por confirmar";
}

function setSideTeam(match: Match, side: DraftSide, teamId: string, team?: Team) {
  if (side === "home") {
    match.homeTeamId = teamId;
    match.homePlaceholder = team?.name ?? "Equipo por confirmar";
    return;
  }

  match.awayTeamId = teamId;
  match.awayPlaceholder = team?.name ?? "Equipo por confirmar";
}

function clearTeamFromOtherOfficialSlots(matches: Match[], teamId: string, targetMatchId: string, targetSide: DraftSide) {
  for (const match of matches) {
    if (isExhibitionMatch(match)) continue;
    for (const side of ["home", "away"] as const) {
      if (match.id === targetMatchId && side === targetSide) continue;
      if (!isSideEditable(match, side)) continue;
      if (getSideTeamId(match, side) === teamId) {
        setSideTeam(match, side, "", undefined);
      }
    }
  }
}

function findEditableOfficialSlotWithTeam(matches: Match[], teamId: string, targetMatchId: string, targetSide: DraftSide) {
  for (const match of matches) {
    if (isExhibitionMatch(match)) continue;
    for (const side of ["home", "away"] as const) {
      if (match.id === targetMatchId && side === targetSide) continue;
      if (!isSideEditable(match, side)) continue;
      if (getSideTeamId(match, side) === teamId) return { match, side };
    }
  }

  return null;
}

function buildPeruDateTime(referenceDate: string | undefined, time: string) {
  const datePart = peruDatePart(referenceDate);
  const normalized = time.length === 5 ? `${time}:00` : time;
  const date = new Date(`${datePart}T${normalized}-05:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function peruDatePart(value?: string) {
  const source = value ? new Date(value) : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(source);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function timeInputValue(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function hasChanges(original: Match[], draft: Match[]) {
  const byId = new Map(original.map((match) => [match.id, match]));
  return draft.some((match) => {
    const originalMatch = byId.get(match.id);
    if (!originalMatch) return true;
    return (
      originalMatch.homeTeamId !== match.homeTeamId ||
      originalMatch.awayTeamId !== match.awayTeamId ||
      originalMatch.scheduledAt !== match.scheduledAt ||
      originalMatch.court !== match.court
    );
  });
}

function stageRank(stage: Match["stage"]) {
  const rank: Record<Match["stage"], number> = {
    group_stage: 0,
    preliminary: 1,
    round_of_16: 2,
    quarter_finals: 3,
    semi_finals: 4,
    final: 5,
    third_place: 6
  };

  return rank[stage];
}

function stageLabel(stage: Match["stage"]) {
  const labels: Record<Match["stage"], string> = {
    group_stage: "Exhibicion / fase libre",
    preliminary: "Ronda preliminar",
    round_of_16: "Octavos de final",
    quarter_finals: "Cuartos de final",
    semi_finals: "Semifinal",
    final: "Final",
    third_place: "Tercer lugar"
  };

  return labels[stage];
}
