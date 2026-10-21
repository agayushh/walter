/**
 * Fixed-window limiter for anonymous endpoints. Counts live in this server
 * instance's memory, so on serverless each warm instance limits on its own.
 * Good enough to stop casual abuse of the public demo; not a billing guard.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [stale, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(stale);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 } as const;
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) } as const;
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 } as const;
}

export function tooManyRequests(retryAfter: number) {
  return Response.json(
    { message: "Too many requests. Try again in a few minutes." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
