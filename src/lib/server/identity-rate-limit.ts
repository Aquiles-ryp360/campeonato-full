import "server-only";

import { createMemoryRateLimiter } from "@/lib/identity/rate-limit";

const windowMs = 60_000;

const unapLimiter = createMemoryRateLimiter({
  limit: positiveNumber(
    process.env.UNAP_LOOKUP_RATE_LIMIT_PER_MINUTE ??
      process.env.IDENTITY_LOOKUP_RATE_LIMIT_PER_MINUTE,
    5
  ),
  windowMs
});

const dniLimiter = createMemoryRateLimiter({
  limit: positiveNumber(process.env.DNI_LOOKUP_RATE_LIMIT_PER_MINUTE, 5),
  windowMs
});

const unapTeacherLimiter = createMemoryRateLimiter({
  limit: positiveNumber(
    process.env.UNAP_TEACHER_LOOKUP_RATE_LIMIT_PER_MINUTE ??
      process.env.IDENTITY_LOOKUP_RATE_LIMIT_PER_MINUTE,
    5
  ),
  windowMs
});

export function checkIdentityRateLimit(kind: "unap" | "dni" | "unap_teacher", ip: string) {
  const limiter =
    kind === "unap" ? unapLimiter : kind === "unap_teacher" ? unapTeacherLimiter : dniLimiter;
  return limiter.check(`${kind}:${ip}`);
}

export function clientIpFromRequest(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
