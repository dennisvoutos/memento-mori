// In-memory denylist of revoked JWT JTIs.
// Entries auto-expire after the configured maxAgeMs.
// This is intentionally in-memory: a restart clears all entries,
// which is acceptable because access tokens live at most 15 minutes
// and every revoked token expires naturally within that window anyway.

const denylist = new Map<string, number>(); // jti → expiry epoch ms

function purgeExpired(now: number): void {
  for (const [jti, expiry] of denylist) {
    if (now > expiry) {
      denylist.delete(jti);
    }
  }
}

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
