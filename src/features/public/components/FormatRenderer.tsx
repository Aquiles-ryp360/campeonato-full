"use client";

import { useState } from "react";
import type {
  Group,
  GroupStanding,
  GroupTeam,
  Match,
  Player,
  StandingRow,
  Team,
  TournamentEvent
} from "@/lib/types";
import { Card, SectionHeader } from "@/components/ui";
import { MatchCard } from "@/features/fixture/components/MatchCard";
import { KnockoutBracket } from "@/features/brackets/components/KnockoutBracket";
import { GroupStageView } from "@/features/brackets/components/GroupStageView";
import { StandingsTable } from "@/features/brackets/components/StandingsTable";
import { buildGroupQualificationPlan } from "@/lib/domain/standings";
import { TeamDetailsModal } from "./TeamDetailsModal";
import { MatchDetailsModal } from "./MatchDetailsModal";

export function FormatRenderer({
  event,
  teams,
  players,
  matches,
  standings,
  groups,
  groupTeams,
  groupStandings
}: {
  event: TournamentEvent;
  teams: Team[];
  players: Player[];
  matches: Match[];
  standings: StandingRow[];
  groups: Group[];
  groupTeams: GroupTeam[];
  groupStandings: GroupStanding[];
}) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const upcomingMatches = matches
    .filter((match) => match.status === "scheduled")
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 4);
  const groupQualification = event.format === "groups_then_knockout"
    ? buildGroupQualificationPlan({
        event,
        groups,
        groupTeams,
        groupStandings,
        matches,
        teams
      })
    : null;
  const qualifiedKnockoutTeams = groupQualification
    ? teams.filter((team) => groupQualification.qualifiedTeamIds.has(team.id))
    : teams;

  return (
    <section id="formato" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_0.82fr]">
      <div className="space-y-6">
        {event.format === "league" ? (
          <Card className="overflow-hidden">
            <div className="border-b border-brand-towerMid/20 p-5">
              <SectionHeader title="Tabla de posiciones" description={event.rulesSummary} />
            </div>
            <StandingsTable
              rows={standings}
              onOpenTeam={(teamId) => {
                const team = teams.find((item) => item.id === teamId);
                if (team) setSelectedTeam(team);
              }}
            />
          </Card>
        ) : null}

        {event.format === "groups_then_knockout" ? (
          <>
            <div>
              <SectionHeader title="Grupos y clasificados" description="La tabla aparece por grupo y la fase final debajo." />
            </div>
            <GroupStageView
              event={event}
              groups={groups}
              groupTeams={groupTeams}
              groupStandings={groupStandings}
              matches={matches}
              teams={teams}
              onOpenTeam={setSelectedTeam}
            />
            <Card className="p-5">
              <SectionHeader title="Llave final" description="Se activa cuando existan clasificados." />
              <div className="mt-4">
                {qualifiedKnockoutTeams.length >= 2 ? (
                  <KnockoutBracket
                    eventId={event.id}
                    teams={qualifiedKnockoutTeams}
                    matches={matches}
                    onOpenTeam={setSelectedTeam}
                  />
                ) : (
                  <div className="rounded-md border border-dashed border-ink/20 p-6 text-center text-sm text-ink/55">
                    La llave final se arma con los clasificados directos y mejores terceros.
                  </div>
                )}
              </div>
            </Card>
          </>
        ) : null}

        {event.format === "single_elimination" ? (
          <Card className="p-5">
            <SectionHeader title="Llave de eliminacion" description="Generada segun cantidad de equipos, con byes cuando corresponde." />
            <div className="mt-4">
              <KnockoutBracket
                eventId={event.id}
                teams={teams}
                matches={matches}
                onOpenTeam={setSelectedTeam}
              />
            </div>
          </Card>
        ) : null}
      </div>

      <Card className="p-5">
        <SectionHeader title="Proximos partidos" description="Cruces inmediatos del campeonato seleccionado." />
        <div className="mt-4 space-y-3">
          {upcomingMatches.length > 0 ? (
            upcomingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                event={event}
                teams={teams}
                onOpenTeam={setSelectedTeam}
                onOpenMatch={setSelectedMatch}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-brand-towerMid/40 bg-brand-wash/60 p-6 text-center text-sm font-semibold text-brand-muted">
              No hay partidos programados.
            </div>
          )}
        </div>
      </Card>

      <TeamDetailsModal
        team={selectedTeam}
        event={event}
        players={players.filter((player) => player.teamId === selectedTeam?.id)}
        matches={matches}
        teams={teams}
        onClose={() => setSelectedTeam(null)}
      />
      <MatchDetailsModal match={selectedMatch} teams={teams} onClose={() => setSelectedMatch(null)} />
    </section>
  );
}
