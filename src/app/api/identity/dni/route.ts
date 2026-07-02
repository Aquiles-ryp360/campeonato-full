import { NextResponse } from "next/server";
import { z } from "zod";
import {
  toPublicIdentityLookupData,
  validateConsentAccepted
} from "@/lib/identity/identity-lookup";
import { identityLookupService } from "@/lib/server/identity-lookup-service";
import {
  checkIdentityRateLimit,
  clientIpFromRequest
} from "@/lib/server/identity-rate-limit";

export const runtime = "nodejs";

const lookupSchema = z.object({
  dni: z.string().min(1),
  consentAccepted: z.boolean().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return handleLookup(request, body);
}

async function handleLookup(request: Request, rawBody: unknown) {
  const parsed = lookupSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("Ingresa un DNI válido de 8 dígitos.", 400);
  }

  const consentError = validateConsentAccepted(parsed.data.consentAccepted === true);
  if (consentError) {
    return jsonError(consentError, 400);
  }

  const rateLimit = checkIdentityRateLimit("dni", clientIpFromRequest(request));
  if (!rateLimit.allowed) {
    return jsonError("Demasiadas consultas. Intenta nuevamente en un minuto.", 429);
  }

  const result = await identityLookupService.lookupDni({ dni: parsed.data.dni });
  if (!result.ok) {
    const status = result.message.includes("API Key")
      ? 401
      : result.message.includes("Límite")
        ? 429
        : result.message.startsWith("No se encontraron")
          ? 404
          : result.message.startsWith("El servicio")
            ? 503
            : 400;
    return NextResponse.json({ ok: false, source: result.source, message: result.message }, { status });
  }

  return NextResponse.json({
    ok: true,
    data: toPublicIdentityLookupData(result, { includeDni: true }),
    source: result.source,
    message: result.message
  });
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}
