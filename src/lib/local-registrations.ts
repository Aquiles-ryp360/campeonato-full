import type { DelegateAccess } from "./auth";
import type { PaymentMethod, PlayerRole } from "./types";

export interface StoredRegistrationPlayer {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  studentCode: string;
  enrollmentFile: string;
  semester: string;
  lineupRole: PlayerRole;
}

export interface StoredRegistration {
  id: string;
  createdAt: string;
  eventId: string;
  teamName: string;
  delegateName: string;
  delegatePhone: string;
  delegateEmail: string;
  paymentMethod: PaymentMethod;
  registrationCode: string;
  delegateAccess: DelegateAccess;
  players: StoredRegistrationPlayer[];
}

const localRegistrationsKey = "campeonato.local.registrations";

export function getLocalRegistrations() {
  if (typeof window === "undefined") return [];

  const rawRegistrations = window.localStorage.getItem(localRegistrationsKey);
  if (!rawRegistrations) return [];

  try {
    return JSON.parse(rawRegistrations) as StoredRegistration[];
  } catch {
    window.localStorage.removeItem(localRegistrationsKey);
    return [];
  }
}

export function saveLocalRegistration(registration: StoredRegistration) {
  if (typeof window === "undefined") return;

  const existingRegistrations = getLocalRegistrations();
  const nextRegistrations = [
    registration,
    ...existingRegistrations.filter(
      (current) => current.registrationCode !== registration.registrationCode
    )
  ];

  window.localStorage.setItem(localRegistrationsKey, JSON.stringify(nextRegistrations));
}
