const INITIAL_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60_000;

export const getRetryDelay = (retryAfter: string | null, failures: number, now = new Date()): number => {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - now.getTime());
  }

  return Math.min(INITIAL_RETRY_DELAY_MS * 2 ** Math.max(0, failures - 1), MAX_RETRY_DELAY_MS);
};
