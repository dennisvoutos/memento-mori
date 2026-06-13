/**
 * In-memory denylist of revoked JWT JTIs.
 *
 * **IMPORTANT LIMITATION**: This denylist is stored in-memory only. It does
 * NOT survive process restarts (all entries are cleared on restart) and is NOT
 * shared across multiple process instances (e.g. horizontal scaling, cluster
 * mode, or multi-replica deployments). Each instance maintains its own
 * independent denylist.
 *
 * This is acceptable for single-instance deployments because access tokens
 * live at most 15 minutes and every revoked token expires naturally within
 * that window anyway. For multi-instance deployments, a Redis-backed denylist
 * (or a database-backed solution) would be needed to ensure revoked tokens are
 * recognized across all instances.
 *
 * Entries auto-expire after the configured maxAgeMs and are periodically
 * purged to prevent unbounded memory growth.
 */

const denylist = new Map<string, number>(); // jti → expiry epoch ms

/** Handle to the periodic purge interval, so we don't create duplicates. */
let purgeInterval: ReturnType<typeof setInterval> | null = null;

function purgeExpired(now: number): void {
  for (const [jti, expiry] of denylist) {
    if (now > expiry) {
      denylist.delete(jti);
    }
  }
}

/**
 * Starts a periodic cleanup interval that purges expired entries every 60
 * seconds, so the Map doesn't grow unbounded over the lifetime of the process.
 */
function startPeriodicPurge(): void {
  if (purgeInterval !== null) return; // already running
  purgeInterval = setInterval(() => {
    purgeExpired(Date.now());
  }, 60_000);
  // Allow the process to exit even if this interval is still scheduled.
  if (purgeInterval && typeof purgeInterval === 'object' && 'unref' in purgeInterval) {
    purgeInterval.unref();
  }
}

// ── Startup ──
console.log('🔐 Token denylist initialized (in-memory — not shared across instances)');
startPeriodicPurge();

export function revokeToken(jti: string, maxAgeMs: number): void {
  const now = Date.now();
  denylist.set(jti, now + maxAgeMs);
  purgeExpired(now);
}

export function isTokenRevoked(jti: string): boolean {
  const expiry = denylist.get(jti);
  if (expiry === undefined) {
    return false;
  }

  if (Date.now() > expiry) {
    denylist.delete(jti);
    return false;
  }

  return true;
}
