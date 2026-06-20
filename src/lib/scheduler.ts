import type { Match, Team, TimeSlot, Venue, MatchStage } from "./types";
import { addDays, parseISO, differenceInMinutes, format, parse } from "date-fns";

export interface ScheduledMatchResult {
  scheduledMatches: Match[];
  unassignedMatches: Match[];
  warnings: string[];
}

/**
 * Mapea los slots semanales a fechas del calendario a partir de una fecha de inicio.
 * Genera opciones cronológicas ordenadas.
 */
export function generateDateSlots(
  startDate: Date,
  daysToGenerate: number,
  timeSlots: TimeSlot[],
  venues: Venue[]
) {
  const slots: Array<{
    date: Date;
    dateStr: string;
    timeSlot: TimeSlot;
    venue: Venue;
  }> = [];

  for (let i = 0; i < daysToGenerate; i++) {
    const currentDate = addDays(startDate, i);
    const dayOfWeek = currentDate.getDay(); // 0: Domingo, 1: Lunes, etc.

    // Filtrar los slots de tiempo activos para este día de la semana
    const activeSlotsForDay = timeSlots.filter(
      (ts) => ts.active && ts.dayOfWeek === dayOfWeek
    );

    for (const ts of activeSlotsForDay) {
      for (const venue of venues) {
        if (venue.active) {
          slots.push({
            date: currentDate,
            dateStr: format(currentDate, "yyyy-MM-dd"),
            timeSlot: ts,
            venue
          });
        }
      }
    }
  }

  // Ordenar cronológicamente: por fecha, luego por hora de inicio, luego por cancha
  return slots.sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime);
  });
}

/**
 * Genera emparejamientos Round Robin (Todos contra todos) usando el método de la mesa redonda (Circle Method).
 */
export function generateRoundRobinMatches(
  eventId: string,
  teamIds: string[]
): Omit<Match, "id">[] {
  const matches: Omit<Match, "id">[] = [];
  const list = [...teamIds];

  if (list.length % 2 !== 0) {
    list.push("BYE"); // Añadimos un comodín para número impar de equipos
  }

  const rounds = list.length - 1;
  const half = list.length / 2;

  for (let round = 1; round <= rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[list.length - 1 - i];

      // Omitir partidos contra el equipo fantasma (BYE)
      if (home !== "BYE" && away !== "BYE") {
        matches.push({
          eventId,
          round,
          stage: "group_stage",
          homeTeamId: home,
          awayTeamId: away,
          scheduledAt: "", // Se definirá en el Scheduler
          status: "scheduled"
        });
      }
    }
    // Rotar la lista (manteniendo el primer elemento fijo)
    list.splice(1, 0, list.pop()!);
  }

  return matches;
}

/**
 * Genera llaves vacías para una fase de eliminación directa (Playoffs).
 */
export function generatePlayoffBracket(
  eventId: string,
  teamsCount: 16 | 8 | 4 | 2,
  teamIds: string[] = []
): Omit<Match, "id">[] {
  const matches: Omit<Match, "id">[] = [];

  // Mapeamos el conteo de equipos a la ronda inicial de playoffs
  let stage: MatchStage;
  if (teamsCount === 16) stage = "round_of_16";
  else if (teamsCount === 8) stage = "quarter_finals";
  else if (teamsCount === 4) stage = "semi_finals";
  else stage = "final";

  const numMatches = teamsCount / 2;

  // Rellenar la primera ronda
  for (let i = 0; i < numMatches; i++) {
    const homeTeamId = teamIds[i * 2] ?? "";
    const awayTeamId = teamIds[i * 2 + 1] ?? "";

    matches.push({
      eventId,
      round: 1, // Primera ronda de playoffs
      stage,
      bracketPosition: i + 1,
      homeTeamId,
      awayTeamId,
      scheduledAt: "",
      status: "scheduled"
    });
  }

  return matches;
}

/**
 * Motor del Scheduler inteligente.
 * Programa un lote de partidos respetando las restricciones del campeonato y disponibilidad.
 */
export function scheduleMatches({
  matchesToSchedule,
  timeSlots,
  venues,
  teams,
  allMatches = [],
  startDateStr,
  preventCrossSport = false,
  minimumRestMinutes = 60
}: {
  matchesToSchedule: Match[];
  timeSlots: TimeSlot[];
  venues: Venue[];
  teams: Team[];
  allMatches?: Match[];
  startDateStr: string;
  preventCrossSport?: boolean;
  minimumRestMinutes?: number;
}): ScheduledMatchResult {
  const warnings: string[] = [];
  const scheduledMatches: Match[] = [];
  const unassignedMatches: Match[] = [];

  const startDate = parseISO(startDateStr);
  const daysToGenerate = 30; // Generamos slots para los próximos 30 días de campeonato

  // 1. Obtener todas las opciones espacio-tiempo ordenadas cronológicamente
  const dateSlots = generateDateSlots(startDate, daysToGenerate, timeSlots, venues);

  if (dateSlots.length === 0) {
    return {
      scheduledMatches: [],
      unassignedMatches: [...matchesToSchedule],
      warnings: ["No se encontraron horarios de disponibilidad configurados para las canchas activas."]
    };
  }

  // Combinación en memoria de partidos asignados para tracking de colisiones
  const currentSchedules = [...allMatches, ...scheduledMatches];

  // Agrupamiento por carrera para la validación multi-deporte
  const getTeamCareer = (teamId: string) => {
    return teams.find((t) => t.id === teamId)?.academicCareer || "";
  };

  // Función para evaluar si un equipo tiene conflicto de descanso mínimo
  const hasRestConflict = (
    teamId: string,
    targetStart: Date,
    targetDurationMinutes: number
  ): boolean => {
    const targetEnd = addDays(targetStart, 0); // Modificación en memoria de fecha/hora
    const targetStartMs = targetStart.getTime();

    for (const m of currentSchedules) {
      if (m.status !== "postponed" && m.scheduledAt) {
        if (m.homeTeamId === teamId || m.awayTeamId === teamId) {
          const matchStart = new Date(m.scheduledAt);
          // Asumimos duración promedio de 90 minutos si no se conoce el deporte
          const matchEnd = new Date(matchStart.getTime() + 90 * 60 * 1000); 

          const diffBefore = differenceInMinutes(targetStart, matchEnd);
          const diffAfter = differenceInMinutes(matchStart, new Date(targetStartMs + targetDurationMinutes * 60 * 1000));

          if (
            (diffBefore >= 0 && diffBefore < minimumRestMinutes) ||
            (diffAfter >= 0 && diffAfter < minimumRestMinutes) ||
            (targetStart >= matchStart && targetStart <= matchEnd)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 2. Bucle principal de programación
  for (const match of matchesToSchedule) {
    let assigned = false;

    // Buscar una opción cronológica libre
    for (const slot of dateSlots) {
      const slotStart = combineDateAndTime(slot.dateStr, slot.timeSlot.startTime);
      const duration = 60; // Duración base estimada de 60 minutos

      // VALIDACIÓN 1: Cancha ocupada
      const isVenueBusy = currentSchedules.some(
        (m) =>
          m.scheduledAt &&
          m.venueId === slot.venue.id &&
          m.status !== "postponed" &&
          isTimeOverlapping(
            parseISO(m.scheduledAt),
            60, // Duración del partido existente
            slotStart,
            duration
          )
      );

      if (isVenueBusy) continue;

      // VALIDACIÓN 2: Superposición de equipos (Home/Away)
      const isHomeTeamBusy = currentSchedules.some(
        (m) =>
          m.scheduledAt &&
          (m.homeTeamId === match.homeTeamId || m.awayTeamId === match.homeTeamId) &&
          m.status !== "postponed" &&
          isTimeOverlapping(parseISO(m.scheduledAt), 60, slotStart, duration)
      );

      const isAwayTeamBusy = currentSchedules.some(
        (m) =>
          m.scheduledAt &&
          (m.homeTeamId === match.awayTeamId || m.awayTeamId === match.awayTeamId) &&
          m.status !== "postponed" &&
          isTimeOverlapping(parseISO(m.scheduledAt), 60, slotStart, duration)
      );

      if (isHomeTeamBusy || isAwayTeamBusy) continue;

      // VALIDACIÓN 3: Conflicto de descanso mínimo
      if (hasRestConflict(match.homeTeamId, slotStart, duration)) continue;
      if (hasRestConflict(match.awayTeamId, slotStart, duration)) continue;

      // VALIDACIÓN 4: Conflicto de Carrera Universitaria (Evitar cruce entre deportes)
      if (preventCrossSport) {
        const homeCareer = getTeamCareer(match.homeTeamId);
        const awayCareer = getTeamCareer(match.awayTeamId);

        if (homeCareer || awayCareer) {
          const hasCareerConflict = currentSchedules.some((m) => {
            if (!m.scheduledAt || m.status === "postponed") return false;
            
            // Verificamos si hay superposición horaria
            const isOverlap = isTimeOverlapping(parseISO(m.scheduledAt), 60, slotStart, duration);
            if (!isOverlap) return false;

            // Si hay superposición, verificar si juega la misma carrera
            const mHomeCareer = getTeamCareer(m.homeTeamId);
            const mAwayCareer = getTeamCareer(m.awayTeamId);

            const homeMatchConflict = homeCareer && (mHomeCareer === homeCareer || mAwayCareer === homeCareer);
            const awayMatchConflict = awayCareer && (mHomeCareer === awayCareer || mAwayCareer === awayCareer);

            return homeMatchConflict || awayMatchConflict;
          });

          if (hasCareerConflict) continue;
        }
      }

      // ASIGNACIÓN EXITOSA
      match.scheduledAt = slotStart.toISOString();
      match.venueId = slot.venue.id;
      
      // Guardar en arrays de tracking
      scheduledMatches.push(match);
      currentSchedules.push(match);
      assigned = true;
      break;
    }

    if (!assigned) {
      unassignedMatches.push(match);
      const homeName = teams.find((t) => t.id === match.homeTeamId)?.name ?? match.homeTeamId;
      const awayName = teams.find((t) => t.id === match.awayTeamId)?.name ?? match.awayTeamId;
      warnings.push(
        `No se pudo programar el partido ${homeName} vs ${awayName} por falta de horarios o canchas libres sin conflictos.`
      );
    }
  }

  return {
    scheduledMatches,
    unassignedMatches,
    warnings
  };
}

// ====================================================
// UTILIDADES INTERNAS DE TIEMPO
// ====================================================

function combineDateAndTime(dateStr: string, timeStr: string): Date {
  // Soporta formatos "HH:MM:SS" o "HH:MM"
  const cleanTime = timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
  return parse(`${dateStr} ${cleanTime}`, "yyyy-MM-dd HH:mm", new Date());
}

function isTimeOverlapping(
  startA: Date,
  durationAMinutes: number,
  startB: Date,
  durationBMinutes: number
): boolean {
  const endA = new Date(startA.getTime() + durationAMinutes * 60 * 1000);
  const endB = new Date(startB.getTime() + durationBMinutes * 60 * 1000);
  return startA < endB && startB < endA;
}
