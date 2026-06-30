"use client";

import { useMemo, useState } from "react";
import type { CompetitionData } from "@/lib/data-mappers";
import { getChampionshipPublicContext } from "@/lib/queries/public";
import { Card, SectionHeader } from "@/components/ui";
import { TeamCard } from "@/features/teams/components/TeamCard";
import { TeamDetailsModal } from "./TeamDetailsModal";
import { ChampionshipHero } from "./ChampionshipHero";
import { ChampionshipSummaryCards } from "./ChampionshipSummaryCards";
import { FormatRenderer } from "./FormatRenderer";

export function PublicHome({
  data,
  initialChampionship,
  initialCategoryId
}: {
  data: CompetitionData;
  initialChampionship?: string;
  initialCategoryId?: string;
}) {
  const initial = getChampionshipPublicContext(data, initialChampionship, initialCategoryId);
  const [eventId, setEventId] = useState(initial.event?.id ?? "");
  const [categoryId, setCategoryId] = useState(initial.selectedCategory?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const context = useMemo(
    () => getChampionshipPublicContext(data, eventId || initialChampionship, categoryId),
    [categoryId, data, eventId, initialChampionship]
  );

  if (!context.event) {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Vista publica"
          title="No hay campeonatos configurados"
          description="Cuando exista informacion en Supabase o mocks, se mostrara aqui."
        />
      </Card>
    );
  }

  const courts = Array.from(new Set(context.matches.map((match) => match.court))).slice(0, 3);
  const selectedTeam = context.teams.find((team) => team.id === selectedTeamId) ?? null;
  const hasOfficialDraw = context.matches.some((match) => match.stage !== "group_stage");

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <ChampionshipHero
        event={context.event}
        events={context.events}
        categories={context.categories}
        selectedCategoryId={context.selectedCategory?.id ?? categoryId}
        teamCount={context.teams.length}
        courts={courts}
        onChangeEvent={(nextEventId) => {
          setEventId(nextEventId);
          setCategoryId("");
          setSelectedTeamId(null);
        }}
        onChangeCategory={(nextCategoryId) => {
          setCategoryId(nextCategoryId);
          setSelectedTeamId(null);
        }}
      />

      <ChampionshipSummaryCards
        event={context.event}
        teams={context.teams}
        matches={context.matches}
      />

      <Card id="equipos-inscritos" className="p-5">
        <SectionHeader
          title="Equipos inscritos"
          description="Selecciona un equipo para ver detalle publico sin DNI ni documentos."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {context.teams.length > 0 ? (
            context.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                playerCount={context.players.filter((player) => player.teamId === team.id).length}
                onOpen={(nextTeam) => setSelectedTeamId(nextTeam.id)}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55 sm:col-span-2 lg:col-span-4">
              Todavia no hay equipos inscritos en este campeonato.
            </div>
          )}
        </div>
      </Card>

      {hasOfficialDraw ? (
        <FormatRenderer
          event={context.event}
          teams={context.teams}
          players={context.players}
          matches={context.matches}
          standings={context.standings}
          groups={context.groups}
          groupTeams={context.groupTeams}
          groupStandings={context.groupStandings}
        />
      ) : null}

      <TeamDetailsModal
        team={selectedTeam}
        event={context.event}
        players={context.players.filter((player) => player.teamId === selectedTeam?.id)}
        matches={context.matches}
        teams={context.teams}
        onClose={() => setSelectedTeamId(null)}
      />
    </div>
  );
}
