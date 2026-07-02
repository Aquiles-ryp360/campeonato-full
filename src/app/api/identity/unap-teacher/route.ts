import { NextResponse } from "next/server";
import { z } from "zod";
import {
  toPublicUnapTeacherLookupData,
  validateConsentAccepted
} from "@/lib/identity/identity-lookup";
import { identityLookupService } from "@/lib/server/identity-lookup-service";
import {
  checkIdentityRateLimit,
  clientIpFromRequest
} from "@/lib/server/identity-rate-limit";

export const runtime = "nodejs";

const lookupSchema = z.object({
  query: z.string().trim().min(1),
  periodo: z.string().trim().optional(),
  termId: z.string().trim().optional(),
  consentAccepted: z.boolean().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Ingresa nombre o apellido del docente.", 400);
  }

  const consentError = validateConsentAccepted(parsed.data.consentAccepted === true);
  if (consentError) {
    return jsonError(consentError, 400);
  }

  const rateLimit = checkIdentityRateLimit("unap_teacher", clientIpFromRequest(request));
  if (!rateLimit.allowed) {
    return jsonError("Demasiadas consultas. Espera un minuto o registra manualmente.", 429);
  }

  const result = await identityLookupService.lookupUnapTeachers({
    query: parsed.data.query,
    periodo: parsed.data.periodo,
    termId: parsed.data.termId,
    length: 5
  });

  if (!result.ok) {
    const status = result.message.startsWith("No se encontró")
      ? 404
      : result.message.startsWith("El servicio")
        ? 503
        : 400;
    return NextResponse.json(
      {
        ok: false,
        source: result.source,
        periodo: result.periodo,
        message: result.message
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    source: result.source,
    periodo: result.periodo,
    recordsFiltered: result.recordsFiltered,
    results: result.results.map((teacher) =>
      toPublicUnapTeacherLookupData(teacher, { includeDni: true })
    ),
    message: result.message
  });
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}
