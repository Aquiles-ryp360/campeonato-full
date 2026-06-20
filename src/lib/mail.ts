import "server-only";

import nodemailer from "nodemailer";

type DelegateCredentialsEmailInput = {
  to: string;
  delegateName: string;
  teamName: string;
  eventName: string;
  username: string;
  password: string;
};

export async function sendDelegateCredentialsEmail({
  to,
  delegateName,
  teamName,
  eventName,
  username,
  password
}: DelegateCredentialsEmailInput) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://campeonato-full.vercel.app";

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
    `Usuario: ${username}`,
    `Contrasena temporal: ${password}`,
    `Login: ${loginUrl}`,
    "",
    "Guarda estas credenciales. Podras usarlas para entrar al panel de delegado y revisar tu plantilla, horarios y observaciones."
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
          <td style="padding: 8px; border: 1px solid #dde4e0; font-weight: 700;">Usuario</td>
          <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(username)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #dde4e0; font-weight: 700;">Contrasena temporal</td>
          <td style="padding: 8px; border: 1px solid #dde4e0;">${escapeHtml(password)}</td>
        </tr>
      </table>
      <p>
        <a href="${loginUrl}" style="display: inline-block; background: #17211f; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">
          Entrar al panel
        </a>
      </p>
      <p style="font-size: 13px; color: #5f6c67;">
        Guarda estas credenciales. Podras usarlas para entrar al panel de delegado y revisar tu plantilla, horarios y observaciones.
      </p>
    </div>
  `;

  // Gmail SMTP uses an app password stored in SMTP_PASS, never the real account password.
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
    text
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
