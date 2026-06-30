import "server-only";

import nodemailer from "nodemailer";

type DelegateAccessEmailInput = {
  to: string;
  delegateName: string;
  teamName: string;
  eventName: string;
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://campeonato-full.vercel.app";

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP env vars are not configured");
  }

  const loginUrl = `${appUrl.replace(/\/$/, "")}/login?next=%2Fdelegado`;
  const subject = `Equipo aprobado - ${teamName}`;
  const text = [
    `Hola ${delegateName},`,
    "",
    "Tu equipo fue aprobado por administracion. Ya puedes ingresar al panel del delegado.",
    "",
    `Equipo: ${teamName}`,
    `Campeonato: ${eventName}`,
    `Correo de acceso: ${to}`,
    `Panel: ${loginUrl}`,
    "",
    "Usa este mismo correo para solicitar el enlace magico de acceso. No necesitas contrasena temporal."
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; color: #17211f; line-height: 1.5;">
      <h1 style="font-size: 22px; margin-bottom: 12px;">Equipo aprobado</h1>
      <p>Hola ${escapeHtml(delegateName)},</p>
      <p>Tu equipo fue aprobado por administracion. Ya puedes ingresar al panel del delegado.</p>
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
          Entrar al panel
        </a>
      </p>
      <p style="font-size: 13px; color: #5f6c67;">
        Usa este mismo correo para solicitar el enlace magico de acceso. No necesitas contrasena temporal.
      </p>
    </div>
  `;

  // Gmail SMTP uses an app password stored in SMTP_PASS, never the real account password.
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass
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
