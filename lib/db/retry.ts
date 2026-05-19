/**
 * Retry wrapper for transient Turso / libSQL network errors.
 *
 * Remote Turso connections can intermittently drop TLS in local dev when
 * multiple queries run in parallel. One transparent retry (after 150 ms) is
 * enough to recover without user-visible impact.
 */

const TRANSIENT_PATTERNS = [
  "socket disconnected",
  "TLS connection",
  "ECONNRESET",
  "fetch failed",
  "network error",
];

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  delayMs = 150
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
