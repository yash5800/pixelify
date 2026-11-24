/**
 * Tracks whether a compiled upscaler session is currently executing a run.
 *
 * A model switch must free the old session/worker, but a run that is still
 * using it must not have its worker terminated underneath it. `releaseSession`
 * defers the release until the last in-flight run using that session ends.
 */
interface Releasable {
  release?: () => unknown;
}

const inUse = new Map<object, number>();
const deferred = new Set<object>();

export function beginSessionUse(session: unknown): void {
  if (!session || typeof session !== 'object') return;
  inUse.set(session, (inUse.get(session) ?? 0) + 1);
}

export function endSessionUse(session: unknown): void {
  if (!session || typeof session !== 'object') return;
  const remaining = (inUse.get(session) ?? 1) - 1;
  if (remaining > 0) {
    inUse.set(session, remaining);
    return;
  }
  inUse.delete(session);
  if (deferred.delete(session)) {
    try { void (session as Releasable).release?.(); } catch { /* best effort */ }
  }
}

/** Release immediately, or as soon as the runs still using it finish. */
export function releaseSession(session: unknown): void {
  if (!session || typeof session !== 'object') return;
  if (inUse.has(session)) {
    deferred.add(session);
    return;
  }
  try { void (session as Releasable).release?.(); } catch { /* best effort */ }
}
