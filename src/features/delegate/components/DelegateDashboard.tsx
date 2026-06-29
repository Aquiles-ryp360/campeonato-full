"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, FileText, ListChecks } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import { fetchBrowserCompetitionData } from "@/lib/browser-competition-data";
import { getStoredSession } from "@/lib/auth";
import { getDelegateTeamContext } from "@/lib/queries/delegate";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { DelegateTeamSwitcher } from "./DelegateTeamSwitcher";
import { DelegateSummaryCards } from "./DelegateSummaryCards";
import { DelegateAlerts } from "./DelegateAlerts";
import { DelegateRegistrationForm } from "./DelegateRegistrationForm";
import { DelegateRosterManager } from "./DelegateRosterManager";
import { DelegateMatchesView } from "./DelegateMatchesView";
import { DelegateNotices } from "./DelegateNotices";

export type DelegateView = "dashboard" | "registration" | "roster" | "matches" | "notices";

export function DelegateDashboard({
  initialData,
  view = "dashboard"
}: {
  initialData: CompetitionData;
  view?: DelegateView;
}) {
  const [data, setData] = useState(initialData);
  const [delegateEmail, setDelegateEmail] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | undefined>();

  useEffect(() => {
    setDelegateEmail(getStoredSession()?.username.toLowerCase() ?? null);
    fetchBrowserCompetitionData({ includeRegistrationCodes: true })
      .then(setData)
      .catch(() => toast.error("No se pudieron cargar los datos actualizados del delegado."));
  }, []);

  const context = useMemo(
    () => getDelegateTeamContext(data, teamId, delegateEmail),
    [data, delegateEmail, teamId]
  );

  if (!context.team || !context.event) {
    return (
      <Card className="p-6">
        <SectionHeader
          eyebrow="Panel delegado"
          title="Aun no tienes equipo vinculado"
          description="Ingresa con el correo usado en la inscripcion para ver tus equipos."
        />
      </Card>
    );
  }

  const bases =
    data.tournamentBases.find((base) =>
      base.championshipName.toLowerCase().includes(context.event?.name.toLowerCase() ?? "")
    ) ??
    data.tournamentBases.find((base) => base.published) ??
    data.tournamentBases[0] ??
    null;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Panel delegado"
          title={`${context.team.name} - ${context.event.name}`}
          description="Gestiona solo la informacion de tu equipo y sus partidos."
          action={
            <DelegateTeamSwitcher
              teams={context.delegateTeams}
              events={data.events}
              value={context.team.id}
              onChange={setTeamId}
            />
          }
        />
      </div>

      <DelegateSummaryCards
        event={context.event}
        team={context.team}
        players={context.players}
        matches={context.matches}
      />

      {view === "dashboard" ? (
        <>
          <DelegateAlerts
            event={context.event}
            team={context.team}
            players={context.players}
            matches={context.matches}
            allTeams={data.teams}
            allPlayers={data.players}
            allEvents={data.events}
          />
          <Card className="p-5">
            <SectionHeader title="Acciones rapidas" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button href="/delegado/inscripcion" variant="secondary">
                <Edit className="h-4 w-4" />
                Editar inscripcion
              </Button>
              <Button href="/delegado/plantel" variant="secondary">
                <ListChecks className="h-4 w-4" />
                Gestionar plantel
              </Button>
              <Button href="/delegado/partidos" variant="secondary">
                Ver mis partidos
              </Button>
              <Button href="/delegado/avisos" variant="secondary">
                <FileText className="h-4 w-4" />
                Ver bases
              </Button>
            </div>
          </Card>
          <DelegateMatchesView
            event={context.event}
            team={context.team}
            teams={data.teams}
            matches={context.matches}
          />
        </>
      ) : null}

      {view === "registration" ? <DelegateRegistrationForm event={context.event} team={context.team} /> : null}
      {view === "roster" ? (
        <DelegateRosterManager event={context.event} team={context.team} players={context.players} />
      ) : null}
      {view === "matches" ? (
        <DelegateMatchesView event={context.event} team={context.team} teams={data.teams} matches={context.matches} />
      ) : null}
      {view === "notices" ? (
        <DelegateNotices event={context.event} team={context.team} bases={bases} />
      ) : null}

      <Badge tone="blue">Correo delegado: {delegateEmail ?? "sesion pendiente"}</Badge>
    </div>
  );
}
