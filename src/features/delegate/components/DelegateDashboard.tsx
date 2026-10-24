"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, FileText, ListChecks, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { CompetitionData } from "@/lib/data-mappers";
import type { ChampionshipVenue } from "@/lib/server/championship-venue";
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
import { DelegateRosterDownloadButton } from "./DelegateRosterDownloadButton";
import { DelegateVenueCard } from "./DelegateVenueCard";

export type DelegateView = "dashboard" | "registration" | "roster" | "matches" | "notices";

export function DelegateDashboard({
  initialData,
  view = "dashboard",
  venue
}: {
  initialData: CompetitionData;
  view?: DelegateView;
  venue?: ChampionshipVenue;
}) {
  const [data, setData] = useState(initialData);
  const [delegateEmail, setDelegateEmail] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | undefined>();

  const refreshDelegateData = useCallback(async () => {
    const updatedData = await fetchBrowserCompetitionData({ includeRegistrationCodes: true });
    setData(updatedData);
  }, []);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    setDelegateEmail(getStoredSession()?.username.toLowerCase() ?? null);
    refreshDelegateData()
      .catch(() => toast.error("No se pudieron cargar los datos actualizados del delegado."));
  }, [refreshDelegateData]);

  const context = useMemo(
    () => getDelegateTeamContext(data, teamId, delegateEmail),
    [data, delegateEmail, teamId]
  );

  if (!context.team || !context.event) {
    return (
      <div className="space-y-6 pb-20 md:pb-0">
        {venue ? <DelegateVenueCard venue={venue} /> : null}
        <Card className="p-6">
          <SectionHeader
            eyebrow="Panel delegado"
            title="Aún no tienes un equipo vinculado"
            description={`Entraste con ${delegateEmail ?? "un correo sin equipo"}. Para ver la sede y tus partidos, cierra sesión y entra con el mismo Gmail que usaste al inscribir tu equipo.`}
            action={
              <Button href="/#inscripciones" variant="secondary">
                Inscribir un equipo
              </Button>
            }
          />
        </Card>
      </div>
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
      <section className="relative overflow-hidden rounded-lg bg-technical-blue p-5 text-white shadow-panel sm:p-6">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-1/3 opacity-25 lg:block"
          style={{
            background:
              "repeating-linear-gradient(135deg, transparent 0 18px, rgba(240,232,52,0.45) 18px 20px, transparent 20px 38px)"
          }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 bg-brand-yellow text-xl font-black text-brand-navy shadow-lift"
              style={{ borderColor: context.team.primaryColor || "rgba(255,255,255,0.3)" }}
              aria-hidden="true"
            >
              {context.team.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-brand-yellow">Panel del delegado</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold uppercase italic leading-none tracking-tight sm:text-4xl">{context.team.name}</h1>
              <p className="mt-1 text-sm font-semibold text-white/70">{context.event.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <DelegateRosterDownloadButton teamId={context.team.id} teamName={context.team.name} />
            <DelegateTeamSwitcher
              teams={context.delegateTeams}
              events={data.events}
              value={context.team.id}
              onChange={setTeamId}
            />
          </div>
        </div>
      </section>

      <DelegateSummaryCards
        event={context.event}
        team={context.team}
        players={context.players}
        matches={context.matches}
      />

      {view === "dashboard" ? (
        <>
          {venue ? <DelegateVenueCard venue={venue} /> : null}
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
            <SectionHeader title="Acciones rápidas" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button href="/delegado/campeonato">
                <Trophy className="h-4 w-4" />
                Ver campeonato
              </Button>
              <Button href="/delegado/inscripcion" variant="secondary">
                <Edit className="h-4 w-4" />
                Editar inscripción
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

      {view === "registration" ? (
        <DelegateRegistrationForm event={context.event} team={context.team} onSaved={refreshDelegateData} />
      ) : null}
      {view === "roster" ? (
        <DelegateRosterManager
          event={context.event}
          team={context.team}
          players={context.players}
          onRosterChanged={refreshDelegateData}
        />
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
