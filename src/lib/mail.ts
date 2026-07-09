import "server-only";

import nodemailer from "nodemailer";
import type { Match, Team } from "./types";

type DelegateAccessEmailInput = {
  to: string;
  delegateName: string;
  teamName: string;
  eventName: string;
};

type FixtureEmailInput = {
  to: string;
  recipientName?: string;
  eventName: string;
  fixtureUrl: string;
  matches: Match[];
  teams: Team[];
};

export async function sendDelegateAccessEmail({
  to,
  delegateName,
  teamName,
  eventName
}: DelegateAccessEmailInput) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM;
  const appUrl = appBaseUrl();

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP env vars are not configured");
  }

  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;
  const subject = `Acceso delegado - ${teamName}`;
  const text = [
    `Hola ${delegateName},`,
    "",
    "Tu inscripcion fue registrada correctamente.",
    "",
    `Equipo: ${teamName}`,
    `Campeonato: ${eventName}`,
    `Correo de acceso: ${to}`,
    `Login: ${loginUrl}`,
    "",
    "Usa este mismo correo Google/Gmail para entrar al panel de delegado. No necesitas contrasena temporal."
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #17211f; line-height: 1.5;">
      <h1 style="font-size: 22px; margin-bottom: 12px;">Acceso al panel de delegado</h1>
      <p>Hola ${escapeHtml(delegateName)},</p>
      <p>Tu inscripcion fue registrada correctamente.</p>
      <table style="border-collapse: collapse; margin: 18px 0; width: 100%; max-width: 560px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #dde4e0; font-weight: 700;">Equipo</td>
          <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(teamName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #dde4e0; font-weight: 700;">Campeonato</td>
          <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(eventName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #dde4e0; font-weight: 700;">Correo de acceso</td>
          <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(to)}</td>
        </tr>
      </table>
      <p>
        <a href="${loginUrl}" style="display: inline-block; background: #17211f; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">
          Entrar con Google
        </a>
      </p>
      <p style="font-size: 13px; color: #5f6c67;">
        Usa este mismo correo Google/Gmail para entrar al panel de delegado. No necesitas contrasena temporal.
      </p>
    </div>
  `;

  return mailTransporter().sendMail({
    from,
    to,
    subject,
    html,
    text
  });
}

export async function sendFixtureEmail({
  to,
  recipientName,
  eventName,
  fixtureUrl,
  matches,
  teams
}: FixtureEmailInput) {
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error("SMTP env vars are not configured");

  const orderedMatches = [...matches].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const greetingName = recipientName?.trim() || "equipo";
  const subject = `Fixture - ${eventName}`;
  const rowsText = orderedMatches.map((match) =>
    [
      match.label ?? "Partido",
      formatLimaDateTime(match.scheduledAt),
      match.court,
      `${matchSideName(match, teams, "home")} vs ${matchSideName(match, teams, "away")}`
    ].join(" | ")
  );
  const text = [
    `Hola ${greetingName},`,
    "",
    `Te compartimos el fixture de ${eventName}.`,
    "",
    ...rowsText,
    "",
    `Ver fixture: ${fixtureUrl}`,
    "",
    "Revisa horarios y cruces antes de cada partido."
  ].join("\n");
  const htmlRows = orderedMatches.map((match) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #dde4e0; font-weight: 700;">${escapeHtml(match.label ?? "Partido")}</td>
      <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(formatLimaDateTime(match.scheduledAt))}</td>
      <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(match.court)}</td>
      <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(matchSideName(match, teams, "home"))}</td>
      <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(matchSideName(match, teams, "away"))}</td>
    </tr>
  `).join("");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #17211f; line-height: 1.5;">
      <h1 style="font-size: 22px; margin-bottom: 12px;">Fixture del campeonato</h1>
      <p>Hola ${escapeHtml(greetingName)},</p>
      <p>Te compartimos el fixture de <strong>${escapeHtml(eventName)}</strong>.</p>
      <table style="border-collapse: collapse; margin: 18px 0; width: 100%; max-width: 760px; font-size: 14px;">
        <thead>
          <tr style="background: #17211f; color: #ffffff;">
            <th style="padding: 8px; border: 1px solid #17211f; text-align: left;">Partido</th>
            <th style="padding: 8px; border: 1px solid #17211f; text-align: left;">Hora</th>
            <th style="padding: 8px; border: 1px solid #17211f; text-align: left;">Cancha</th>
            <th style="padding: 8px; border: 1px solid #17211f; text-align: left;">Local</th>
            <th style="padding: 8px; border: 1px solid #17211f; text-align: left;">Visita</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>
      <p>
        <a href="${escapeHtml(fixtureUrl)}" style="display: inline-block; background: #17211f; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">
          Ver fixture actualizado
        </a>
      </p>
      <p style="font-size: 13px; color: #5f6c67;">
        Revisa horarios y cruces antes de cada partido.
      </p>
    </div>
  `;

  return mailTransporter().sendMail({
    from,
    to,
    subject,
    html,
    text
  });
}

export function appBaseUrl() {
  return process.env.MAIL_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://campeonato-full.vercel.app";
}

function mailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || !process.env.MAIL_FROM) {
    throw new Error("SMTP env vars are not configured");
  }

  // Gmail SMTP uses an app password stored in SMTP_PASS, never the real account password.
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass
    }
  });
}

function matchSideName(match: Match, teams: Team[], side: "home" | "away") {
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;
  if (!teamId) return placeholder ?? "Equipo por confirmar";
  return teams.find((team) => team.id === teamId)?.name ?? placeholder ?? "Equipo por confirmar";
}

function formatLimaDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Lima"
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
