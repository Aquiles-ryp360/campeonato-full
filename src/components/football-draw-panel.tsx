"use client";

import { useMemo, useState } from "react";
import { Save, Shuffle, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import {
  createFootballMatches,
  createFootballPreviewMatches,
  footballEvent,
  footballEventId,
  footballVenueId
} from "@/lib/football-content";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import type { Match, Team } from "@/lib/types";
import { formatDateTime, getTeamName } from "@/lib/utils";
import { Badge, Button, Card, SectionHeader } from "./ui";

export function FootballDrawPanel({
  data,
  onDataChange
}: {
  data: CompetitionData;
  onDataChange: (nextData: CompetitionData) => void;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const event =
    data.events.find((current) => current.id === footballEventId) ??
    data.events.find((current) => current.sport === "futbol") ??
    footballEvent;
  const teams = useMemo(
    () =>
      data.teams
        .filter((team) => team.eventId === event.id)
        .filter((team) => team.status === "approved" || team.status === "registered"),
    [data.teams, event.id]
  );
  const matches = data.matches
    .filter((match) => match.eventId === event.id && match.stage !== "group_stage")
    .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
  const hasOddTeamCount = teams.length % 2 === 1;

  async function drawAndPublish(mode: "random" | "github") {
    if (teams.length < 2) {
      toast.error("Necesitas al menos 2 equipos de futbol para sortear llaves.");
      return;
    }

    const orderedTeams = mode === "random" ? shuffleTeams(teams) : orderedFromGithub(teams);
    const generatedMatches = createFootballMatches(event.id, orderedTeams);
    publishLocally(generatedMatches);

    if (!hasSupabaseEnv()) {
      toast.info("Sorteo generado en vista local. Para publicarlo en servidor, configura Supabase.");
      return;
    }

    setIsPublishing(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const canPersist = await validateSupabaseSeed(supabase, event.id, generatedMatches);

      if (!canPersist) {
        toast.info("Sorteo visible en admin. Aplica la migracion 006 o crea el evento/equipos en Supabase para publicarlo.");
        return;
      }

      const deleteResponse = await supabase
        .from("matches")
        .delete()
        .eq("event_id", event.id)
        .neq("stage", "group_stage");

      if (deleteResponse.error) {
        toast.error(`No se pudieron limpiar llaves anteriores: ${deleteResponse.error.message}`);
        return;
      }

      const insertResponse = await supabase.from("matches").insert(
        generatedMatches.map((match) => ({
          event_id: match.eventId,
          round: match.round,
          stage: match.stage,
          bracket_position: match.bracketPosition,
          home_team_id: match.homeTeamId,
          away_team_id: match.awayTeamId,
          scheduled_at: match.scheduledAt,
          venue_id: footballVenueId,
          status: match.status,
          notes: match.notes
        }))
      );

      if (insertResponse.error) {
        toast.error(`No se pudo publicar el sorteo: ${insertResponse.error.message}`);
        return;
      }

      toast.success("Sorteo de futbol publicado. Las llaves publicas ya usan esos cruces.");
    } finally {
      setIsPublishing(false);
    }
  }

  function publishLocally(generatedMatches: Match[]) {
    onDataChange({
      ...data,
      matches: [
        ...data.matches.filter(
          (match) => !(match.eventId === event.id && match.stage !== "group_stage")
        ),
        ...generatedMatches
      ]
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          eyebrow="Futbol"
          title="Sorteo de llaves"
          description="Genera eliminacion directa con los equipos inscritos y publica las llaves para la vista publica."
          action={<Badge tone={matches.length > 0 ? "green" : "amber"}>{matches.length > 0 ? "Llaves activas" : "Pendiente"}</Badge>}
        />
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-mist p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink/65">
                <UsersRound className="h-4 w-4" />
                Equipos listos
              </div>
              <p className="mt-2 text-3xl font-bold text-ink">{teams.length}</p>
            </div>
            <div className="rounded-md bg-mist p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink/65">
                <Trophy className="h-4 w-4" />
                Cruces
              </div>
              <p className="mt-2 text-3xl font-bold text-ink">{Math.floor(teams.length / 2)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void drawAndPublish("random")} disabled={isPublishing || teams.length < 2}>
              <Shuffle className="h-4 w-4" />
              Sortear aleatorio
            </Button>
            <Button
              variant="secondary"
              onClick={() => void drawAndPublish("github")}
              disabled={isPublishing || teams.length < 2}
            >
              <Save className="h-4 w-4" />
              Usar orden GitHub
            </Button>
          </div>

          {hasOddTeamCount ? (
            <div className="rounded-md border border-amber-300/30 bg-amber-100 p-3 text-sm text-amber-950">
              Hay cantidad impar de equipos; el sorteo dejara un equipo libre para ajuste manual.
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-ink/10 bg-mist p-4">
          <p className="text-xs font-bold uppercase text-ink/45">Vista previa publicada</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(matches.length > 0 ? matches : createFootballPreviewMatches(event.id, teams)).map((match) => (
              <div key={match.id} className="rounded-md border border-ink/10 bg-white p-3 text-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge tone="blue">Llave {match.bracketPosition ?? 1}</Badge>
                  <span className="text-xs text-ink/45">{formatDateTime(match.scheduledAt)}</span>
                </div>
                <p className="font-semibold text-ink">{getTeamName(teams, match.homeTeamId)}</p>
                <p className="my-1 text-xs font-bold uppercase text-ink/35">vs</p>
                <p className="font-semibold text-ink">{getTeamName(teams, match.awayTeamId)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function shuffleTeams(teams: Team[]) {
  const nextTeams = [...teams];

  for (let index = nextTeams.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [nextTeams[index], nextTeams[swapIndex]] = [nextTeams[swapIndex], nextTeams[index]];
  }

  return nextTeams;
}

function orderedFromGithub(teams: Team[]) {
  return createFootballPreviewMatches(footballEventId, teams)
    .flatMap((match) => [
      teams.find((team) => team.id === match.homeTeamId),
      teams.find((team) => team.id === match.awayTeamId)
    ])
    .filter((team): team is Team => Boolean(team));
}

function randomInt(maxExclusive: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

async function validateSupabaseSeed(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  eventId: string,
  matches: Match[]
) {
  const [eventResponse, teamsResponse] = await Promise.all([
    supabase.from("events").select("id").eq("id", eventId).maybeSingle(),
    supabase.from("teams").select("id").eq("event_id", eventId)
  ]);

  if (eventResponse.error || teamsResponse.error || !eventResponse.data) return false;

  const persistedTeamIds = new Set((teamsResponse.data ?? []).map((team) => team.id as string));
  return matches.every(
    (match) => persistedTeamIds.has(match.homeTeamId) && persistedTeamIds.has(match.awayTeamId)
  );
}
