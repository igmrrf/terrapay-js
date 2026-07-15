/**
 * Global serial gate that guarantees a minimum delay between every outbound
 * call. Because it wraps `fetch` (see proxy.ts), the spacing covers not just
 * each test but also the SDK's internal retries — nothing leaves the process
 * closer than `minGapMs` apart.
 */

let minGapMs = 2000;
let lastCallAt = 0;
// Serializes the gate: each acquire chains off the previous one.
let tail: Promise<void> = Promise.resolve();

export function setMinGap(ms: number): void {
  minGapMs = ms;
}

export function getMinGap(): number {
  return minGapMs;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Acquire a slot. Resolves once at least `minGapMs` has elapsed since the
 * previous acquired slot. Calls are served strictly in arrival order.
 */
export function acquire(): Promise<void> {
  const mine = tail.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, lastCallAt + minGapMs - now);
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
  });
  // Keep the chain alive even if a consumer throws downstream.
  tail = mine.catch(() => {});
  return mine;
}
