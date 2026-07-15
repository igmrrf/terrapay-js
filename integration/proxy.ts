/**
 * Installs a `globalThis.fetch` shim that:
 *   1. passes through the global rate-limit gate (2s between every call),
 *   2. delegates SOCKS5 SSH proxy tunneling and selective host routing to `socks-ssh`.
 *
 * The SDK calls the global `fetch` with no proxy option, so wrapping it here
 * keeps the SDK source untouched.
 */
import { cleanup as cleanupSocksSsh, init as initSocksSsh } from 'socks-ssh';
import { acquire } from './rate-limit.js';

export interface CallRecord {
  method: string;
  url: string;
  /** Parsed request body (JSON when possible), or a marker for multipart. */
  requestBody?: unknown;
  status?: number;
  ms: number;
  ok: boolean;
  error?: string;
}

/** Best-effort parse of a fetch request body for logging. */
function readRequestBody(body: unknown): unknown {
  if (body == null) return undefined;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return '[multipart/form-data]';
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return String(body);
}

const originalFetch = globalThis.fetch;
export const calls: CallRecord[] = [];
let installed = false;

/**
 * Monkeypatch the global fetch to use socks-ssh for selective tunneling.
 * Returns a teardown function that restores fetch and cleans up the SSH tunnel.
 */
export async function installProxyFetch(proxyUrl: string): Promise<() => void> {
  if (installed) return () => {};
  installed = true;

  let socksSshFetch = globalThis.fetch;

  if (proxyUrl) {
    // Initialize socks-ssh. This will establish SSH tunnel if configured,
    // and override globalThis.fetch with undici selective SOCKS proxying.
    await initSocksSsh({
      socksProxy: proxyUrl,
      tunnelHosts: 'terrapay.com',
    });
    socksSshFetch = globalThis.fetch;
  }

  // Wrap the patched fetch with the SDK-specific rate limit gate & call logger
  globalThis.fetch = (async (input: any, init: any = {}) => {
    await acquire();

    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input?.url ?? String(input));
    const method = (init?.method ?? input?.method ?? 'GET').toUpperCase();

    const start = Date.now();
    const rec: CallRecord = {
      method,
      url,
      requestBody: readRequestBody(init?.body ?? input?.body),
      ms: 0,
      ok: false,
    };
    calls.push(rec);

    try {
      const res = await socksSshFetch(input, init);
      rec.status = res.status;
      rec.ok = res.ok;
      rec.ms = Date.now() - start;
      return res;
    } catch (err) {
      rec.ms = Date.now() - start;
      rec.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
    cleanupSocksSsh();
    installed = false;
  };
}

/** Human-readable description of the active route, for logging. */
export function getActiveProxy(): string {
  const sshConnect =
    process.env.SSH_CONNECT ||
    (process.env.SSH_HOST ? `${process.env.SSH_USER || ''}@${process.env.SSH_HOST}` : '');
  if (sshConnect) {
    return `AUTO-TUNNEL (SSH: ${sshConnect})`;
  }
  return process.env.SOCKS_PROXY || 'socks5://127.0.0.1:1080';
}

/**
 * Preflight: confirm the tunnel actually reaches the sandbox before the suite
 * runs, so failures read as "tunnel down" rather than 16 opaque errors.
 * Any HTTP response (even 401/404) proves the TCP+TLS path works end to end.
 */
export async function preflight(baseUrl: string): Promise<string> {
  const probeUrl = `${baseUrl}/gsma/accounts/all/balance_v1`;
  try {
    const res = await fetch(probeUrl, { method: 'GET' });
    return `reachable (HTTP ${res.status})`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Preflight to ${probeUrl} failed via proxy "${getActiveProxy()}": ${msg}
Is the SSH tunnel configuration correct? Check SSH_CONNECT, SSH_HOST, SSH_USER, SSH_KEY, etc. in .env.test.`,
    );
  }
}
