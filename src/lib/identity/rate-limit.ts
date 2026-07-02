export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function createMemoryRateLimiter({
  limit,
  windowMs,
  now = () => Date.now()
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      const current = buckets.get(key);

      if (!current || current.resetAt <= currentTime) {
        const resetAt = currentTime + windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt };
      }

      if (current.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: current.resetAt };
      }

      current.count += 1;
      return {
        allowed: true,
        remaining: Math.max(limit - current.count, 0),
        resetAt: current.resetAt
      };
    },
    clear() {
      buckets.clear();
    }
  };
}
