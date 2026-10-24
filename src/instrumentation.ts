import type { Instrumentation } from "next";

export function register() {}

// Errores del servidor: quedan en los logs de Vercel y, si ERROR_WEBHOOK_URL
// esta configurado (Discord/Slack), se envia un aviso.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    digest: (error as { digest?: string }).digest,
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType
  };

  console.error("[request-error]", JSON.stringify(payload));

  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `Error en campeonato-full: ${payload.method} ${payload.path} - ${payload.message}`.slice(0, 1900),
        text: `Error en campeonato-full: ${payload.method} ${payload.path} - ${payload.message}`.slice(0, 1900)
      })
    });
  } catch {
    // Nunca romper la respuesta por fallar el aviso.
  }
};
