import "server-only";

import { Resend } from "resend";

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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://campeonato-full.vercel.app";

  if (!apiKey || !from) {
    throw new Error("Resend env vars are not configured");
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

  // Resend requires a verified sending domain before emailing real delegates.
  const resend = new Resend(apiKey);
  const response = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
