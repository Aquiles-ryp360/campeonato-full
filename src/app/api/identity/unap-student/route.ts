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
  codigo: z.string().trim().min(1).optional(),
  carrera: z.string().trim().min(1).optional(),
  codigoMatricula: z.string().trim().min(1).optional(),
  codigoCarrera: z.string().trim().min(1).optional(),
  escuelaNombre: z.string().trim().optional(),
  consentAccepted: z.boolean().optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  return handleLookup(request, {
    codigo: url.searchParams.get("codigo") ?? undefined,
    carrera: url.searchParams.get("carrera") ?? undefined,
    consentAccepted: url.searchParams.get("consentAccepted") === "true"
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return handleLookup(request, body);
}

async function handleLookup(request: Request, rawBody: unknown) {
  const parsed = lookupSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError("Datos de consulta inválidos.", 400);
  }

  const consentError = validateConsentAccepted(parsed.data.consentAccepted === true);
  if (consentError) {
    return jsonError(consentError, 400);
  }

  const rateLimit = checkIdentityRateLimit("unap", clientIpFromRequest(request));
  if (!rateLimit.allowed) {
    return jsonError("Demasiadas consultas. Intenta nuevamente en un minuto.", 429);
  }

  const result = await identityLookupService.lookupUnapStudent({
    codigoMatricula: parsed.data.codigoMatricula ?? parsed.data.codigo ?? "",
    codigoCarrera: parsed.data.codigoCarrera ?? parsed.data.carrera ?? "",
    escuelaNombre: parsed.data.escuelaNombre
  });

  if (!result.ok) {
    const status = result.message.startsWith("No se encontró")
      ? 404
      : result.message.startsWith("El servicio")
        ? 503
        : 400;
    return NextResponse.json({ ok: false, message: result.message }, { status });
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
