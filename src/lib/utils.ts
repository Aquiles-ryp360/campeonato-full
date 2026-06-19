import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { twMerge } from "tailwind-merge";
import type { Match, StandingRow, Team, TournamentEvent } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string) {
  return format(new Date(value), "dd MMM yyyy, HH:mm", { locale: es });
}

export function formatShortDate(value: string) {
  return format(new Date(value), "dd MMM", { locale: es });
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0
  }).format(value);
}

export function sportLabel(sport: TournamentEvent["sport"]) {
  return sport === "futsal" ? "Futsal varones" : "Voley mixto";
}

export function formatLabel(formatValue: TournamentEvent["format"]) {
  const labels: Record<TournamentEvent["format"], string> = {
    league: "Liga por puntos",
    single_elimination: "Eliminacion directa",
    groups_then_knockout: "Grupos + eliminacion"
  };
  return labels[formatValue];
}

export function eventStatusLabel(status: TournamentEvent["status"]) {
  const labels: Record<TournamentEvent["status"], string> = {
    draft: "Borrador",
    registration: "Inscripciones",
    in_progress: "En juego",
    finished: "Finalizado"
  };
  return labels[status];
}

export function teamStatusLabel(status: Team["status"]) {
  const labels: Record<Team["status"], string> = {
    pending_payment: "Pago pendiente",
    registered: "Registrado",
    observed: "Observado",
    approved: "Aprobado"
  };
  return labels[status];
}

export function calculateStandings(
  event: TournamentEvent,
  teams: Team[],
  matches: Match[]
): StandingRow[] {
  const rows = new Map<string, StandingRow>();

  teams
    .filter((team) => team.eventId === event.id)
    .forEach((team) => {
      rows.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      });
    });

  matches
    .filter((match) => match.eventId === event.id && match.status === "finished")
    .forEach((match) => {
      const home = rows.get(match.homeTeamId);
      const away = rows.get(match.awayTeamId);
      if (!home || !away) return;

      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;

      home.played += 1;
      away.played += 1;
      home.goalsFor += homeScore;
      home.goalsAgainst += awayScore;
      away.goalsFor += awayScore;
      away.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        home.won += 1;
        away.lost += 1;
        home.points += event.pointsWin;
        away.points += event.pointsLoss;
      } else if (homeScore < awayScore) {
        away.won += 1;
        home.lost += 1;
        away.points += event.pointsWin;
        home.points += event.pointsLoss;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += event.pointsDraw;
        away.points += event.pointsDraw;
      }
    });

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.teamName.localeCompare(b.teamName)
    );
}

export function getTeamName(teams: Team[], id: string) {
  return teams.find((team) => team.id === id)?.name ?? "Equipo pendiente";
}
