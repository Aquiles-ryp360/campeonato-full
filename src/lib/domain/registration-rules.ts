import type { Player, Team, TournamentEvent } from "../types";

export const enrollmentBucketName = "enrollment-files";
export const maxEnrollmentFileSize = 5 * 1024 * 1024;
export const allowedEnrollmentMimeTypes = ["application/pdf", "image/jpeg", "image/png"];

type RegistrationEventLike = Pick<
  TournamentEvent,
  "status" | "registrationOpenUntil" | "maxTeams"
>;

type EventStartLike = Pick<TournamentEvent, "status" | "eventDate" | "scheduleConfig">;

export type RegistrationAvailabilityReason =
  | "open"
  | "not_registration"
  | "missing_deadline"
  | "expired"
  | "full";

export type TeamApprovalIssue =
  | "invalid_event_status"
  | "payment_pending"
  | "below_minimum"
  | "above_maximum"
  | "missing_semester"
  | "duplicate_dni"
  | "duplicate_student_code"
  | "cross_team_duplicate_dni"
  | "cross_team_duplicate_student_code";

const activeTeamStatuses: Team["status"][] = ["registered", "observed", "approved"];

export function isRegistrationOpen(event: TournamentEvent, now = new Date()) {
  return registrationAvailability({ event, now }).open;
}

export function registrationAvailability({
  event,
  teamCount,
  now = new Date()
}: {
  event: RegistrationEventLike;
  teamCount?: number;
  now?: Date;
}) {
  if (event.status !== "registration") {
    return { open: false, reason: "not_registration" as const };
  }

  if (!event.registrationOpenUntil) {
    return { open: false, reason: "missing_deadline" as const };
  }

  if (new Date(event.registrationOpenUntil).getTime() < now.getTime()) {
    return { open: false, reason: "expired" as const };
  }

  if (typeof teamCount === "number" && teamCount >= event.maxTeams) {
    return { open: false, reason: "full" as const };
  }

  return { open: true, reason: "open" as const };
}

export function registrationClosedMessage(reason: RegistrationAvailabilityReason) {
  const messages: Record<RegistrationAvailabilityReason, string> = {
    open: "Inscripciones abiertas.",
    not_registration: "Las inscripciones para este campeonato no estan abiertas.",
    missing_deadline: "Este campeonato no tiene fecha de cierre de inscripcion configurada.",
    expired: "El periodo de inscripcion ha finalizado.",
    full: "Esta categoria ya alcanzo el cupo maximo de equipos."
  };

  return messages[reason];
}

export function isActiveRegistrationTeamStatus(status: Team["status"]) {
  return activeTeamStatuses.includes(status);
}

export function isEventStarted(event: EventStartLike, now = new Date()) {
  if (event.status === "in_progress" || event.status === "finished") return true;

  const startAt = eventStartDate(event);
  return startAt ? startAt.getTime() <= now.getTime() : false;
}

export function canDelegateEditBeforeStart(event: TournamentEvent, now = new Date()) {
  return isRegistrationOpen(event, now) && !isEventStarted(event, now);
}

export function eventStartDate(event: EventStartLike) {
  if (!event.eventDate) return null;

  const datePart = event.eventDate.slice(0, 10);
  const startTime = event.scheduleConfig?.startTime ?? "00:00";
  const date = new Date(`${datePart}T${startTime}:00-05:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function rosterLimitState({
  event,
  playerCount
}: {
  event: Pick<TournamentEvent, "minPlayers" | "maxPlayers">;
  playerCount: number;
}) {
  if (playerCount < event.minPlayers) return "below_minimum";
  if (playerCount > event.maxPlayers) return "above_maximum";
  return "ok";
}

export function hasCompletePlayerRequiredFields(
  player: Pick<Player, "firstName" | "lastName" | "dni" | "studentCode" | "semester">
) {
  return Boolean(
    player.firstName.trim() &&
      player.lastName.trim() &&
      player.dni.trim() &&
      player.studentCode.trim() &&
      player.semester.trim()
  );
}

export function findDuplicateNormalizedValue(values: string[]) {
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeToken(value);
    if (!normalized) continue;
    if (seen.has(normalized)) return value.trim();
    seen.add(normalized);
  }

  return null;
}

export function findCrossTeamDuplicate({
  players,
  existingPlayers,
  existingTeams,
  currentTeamId,
  field
}: {
  players: Array<Pick<Player, "dni" | "studentCode">>;
  existingPlayers: Array<Pick<Player, "teamId" | "dni" | "studentCode">>;
  existingTeams: Array<Pick<Team, "id" | "status">>;
  currentTeamId?: string | null;
  field: "dni" | "studentCode";
}) {
  const activeTeamIds = new Set(
    existingTeams
      .filter((team) => team.id !== currentTeamId && isActiveRegistrationTeamStatus(team.status))
      .map((team) => team.id)
  );
  const submittedValues = new Set(players.map((player) => normalizeToken(player[field])));

  for (const existing of existingPlayers) {
    if (!activeTeamIds.has(existing.teamId)) continue;
    const normalized = normalizeToken(existing[field]);
    if (normalized && submittedValues.has(normalized)) return existing[field].trim();
  }

  return null;
}

export function validateEnrollmentFileMeta({
  type,
  size
}: {
  type: string;
  size: number;
}) {
  if (!allowedEnrollmentMimeTypes.includes(type)) {
    return "Solo se permite PDF, JPG o PNG para la ficha de matricula.";
  }

  if (size > maxEnrollmentFileSize) {
    return "La ficha de matricula no puede superar 5 MB.";
  }

  return null;
}

export function validateJerseyNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number)) return "El numero de camiseta debe ser numerico.";
  if (number < 1 || number > 99) return "El numero de camiseta debe estar entre 1 y 99.";
  return null;
}

export function isJerseyNumberAvailable(players: Player[], playerId: string, jerseyNumber: number) {
  return !players.some(
    (player) => player.id !== playerId && player.jerseyNumber === jerseyNumber
  );
}

export function canChangeJerseyNumberAfterStart(player: Pick<Player, "jerseyNumberChangeCount">) {
  return (player.jerseyNumberChangeCount ?? 0) < 1;
}

export function validateTeamApproval({
  event,
  team,
  players,
  allTeams,
  allPlayers
}: {
  event: TournamentEvent;
  team: Team;
  players: Player[];
  allTeams: Team[];
  allPlayers: Player[];
}) {
  const issues: TeamApprovalIssue[] = [];
  const playerCountState = rosterLimitState({ event, playerCount: players.length });

  if (event.status === "finished") issues.push("invalid_event_status");
  if (team.paymentStatus !== "verified") issues.push("payment_pending");
  if (playerCountState === "below_minimum") issues.push("below_minimum");
  if (playerCountState === "above_maximum") issues.push("above_maximum");
  if (players.some((player) => !player.semester.trim())) {
    issues.push("missing_semester");
  }
  if (findDuplicateNormalizedValue(players.map((player) => player.dni))) {
    issues.push("duplicate_dni");
  }
  if (findDuplicateNormalizedValue(players.map((player) => player.studentCode))) {
    issues.push("duplicate_student_code");
  }

  const eventTeams = allTeams.filter((item) => item.eventId === event.id);
  const eventTeamIds = new Set(eventTeams.map((item) => item.id));
  const eventPlayers = allPlayers.filter((player) => eventTeamIds.has(player.teamId));

  if (
    findCrossTeamDuplicate({
      players,
      existingPlayers: eventPlayers,
      existingTeams: eventTeams,
      currentTeamId: team.id,
      field: "dni"
    })
  ) {
    issues.push("cross_team_duplicate_dni");
  }

  if (
    findCrossTeamDuplicate({
      players,
      existingPlayers: eventPlayers,
      existingTeams: eventTeams,
      currentTeamId: team.id,
      field: "studentCode"
    })
  ) {
    issues.push("cross_team_duplicate_student_code");
  }

  return issues;
}

export function teamApprovalIssueMessage(issue: TeamApprovalIssue) {
  const messages: Record<TeamApprovalIssue, string> = {
    invalid_event_status: "El campeonato no esta en un estado valido para aprobar equipos.",
    payment_pending: "El pago aun no esta validado.",
    below_minimum: "El equipo no cumple el minimo de jugadores.",
    above_maximum: "El equipo supera el maximo de jugadores.",
    missing_semester: "Todos los jugadores deben tener semestre.",
    duplicate_dni: "Hay DNI repetidos dentro del equipo.",
    duplicate_student_code: "Hay codigos repetidos dentro del equipo.",
    cross_team_duplicate_dni: "Hay un jugador con DNI inscrito en otro equipo de esta categoria.",
    cross_team_duplicate_student_code:
      "Hay un jugador con codigo inscrito en otro equipo de esta categoria."
  };

  return messages[issue];
}

export function shouldReturnToReview(team: Team, changedImportantData: boolean) {
  return team.status === "approved" && changedImportantData;
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}
