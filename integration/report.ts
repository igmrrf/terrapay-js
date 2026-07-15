/**
 * Writes the integration run to `integration/results/<session>/` for review:
 *   - one file PER REQUEST: `<endpoint>.json` (e.g. `accounts.getStatus.json`),
 *     each holding `request` + `response` (or `error`) + `httpCalls`.
 *   - `_summary.json` — meta, counts, and per-endpoint outcomes.
 *   - `_summary.log`  — human-readable summary + per-endpoint detail.
 * The session folder is named `session-<timestamp>`; `results/latest` is kept as
 * a copy of the newest session for convenience.
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ReportMeta {
  timestamp: string;
  rawEnvironment: string;
  environment: string;
  baseUrl: string;
  username: string;
  isPasswordHashed: boolean;
  hashCorrected: boolean;
  proxy: string;
  gapMs: number;
  preflight: string;
}

export interface HttpAttempt {
  method: string;
  url: string;
  status?: number;
  ms: number;
  error?: string;
}

export interface ReportResult {
  method: string;
  outcome: string;
  detail: string;
  request?: { method: string; url: string; body?: unknown };
  data?: unknown;
  error?: unknown;
  httpCalls?: HttpAttempt[];
}

/** One endpoint's entry in the keyed `results` object. */
interface EndpointEntry {
  outcome: string;
  detail: string;
  request?: { method: string; url: string; body?: unknown };
  response?: unknown;
  error?: unknown;
  httpCalls?: HttpAttempt[];
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_k, v) => {
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      if (typeof v === 'bigint') return v.toString();
      return v;
    },
    2,
  );
}

export function writeReport(
  meta: ReportMeta,
  results: ReportResult[],
): { jsonPath: string; logPath: string } {
  const dir = join(import.meta.dir, 'results');
  mkdirSync(dir, { recursive: true });

  const counts = {
    ok: results.filter((r) => r.outcome === 'ok').length,
    apiReject: results.filter((r) => r.outcome === 'api-reject').length,
    skip: results.filter((r) => r.outcome === 'skip').length,
    httpCalls: results.reduce((n, r) => n + (r.httpCalls?.length ?? 0), 0),
  };

  // Keyed by endpoint name → { request, response | error }.
  const byEndpoint: Record<string, EndpointEntry> = {};
  for (const r of results) {
    const entry: EndpointEntry = {
      outcome: r.outcome,
      detail: r.detail,
      request: r.request,
      httpCalls: r.httpCalls,
    };
    if (r.outcome === 'ok') {
      entry.response = r.data;
    } else {
      entry.error = r.error;
    }
    byEndpoint[r.method] = entry;
  }

  const payload = { meta, counts, results: byEndpoint };
  const stamp = meta.timestamp.replace(/[:.]/g, '-');

  const jsonPath = join(dir, `run-${stamp}.json`);
  const jsonBody = safeStringify(payload);
  writeFileSync(jsonPath, jsonBody);
  writeFileSync(join(dir, 'latest.json'), jsonBody);

  // ---- human-readable log ----
  const indent = (s: string) => s.replace(/\n/g, '\n          ');
  const L: string[] = [];
  L.push('═══ TerraPay sandbox integration run ═══');
  L.push(`timestamp        ${meta.timestamp}`);
  L.push(`environment      ${meta.rawEnvironment} → ${meta.environment}`);
  L.push(`base             ${meta.baseUrl}`);
  L.push(`user             ${meta.username}  (isPasswordHashed=${meta.isPasswordHashed})`);
  if (meta.hashCorrected) L.push('hash             ⚠ auto-corrected pre-hashed value');
  L.push(`proxy            ${meta.proxy}`);
  L.push(`gap              ${meta.gapMs}ms`);
  L.push(`preflight        ${meta.preflight}`);
  L.push('');
  L.push(
    `summary          ${counts.ok} ok · ${counts.apiReject} api-reject · ${counts.skip} skipped · ${counts.httpCalls} HTTP calls`,
  );
  L.push('');

  for (const [name, e] of Object.entries(byEndpoint)) {
    const icon = e.outcome === 'ok' ? '✅' : e.outcome === 'api-reject' ? '🟡' : '⏭️';
    L.push(`━━━ ${icon} ${name} ━━━`);
    L.push(`  ${e.detail}`);
    if (e.request) {
      L.push(`  request:  ${e.request.method} ${e.request.url}`);
      if (e.request.body !== undefined) {
        L.push(`  body:     ${indent(safeStringify(e.request.body))}`);
      }
    }
    if (e.response !== undefined) {
      L.push(`  response: ${indent(safeStringify(e.response))}`);
    }
    if (e.error !== undefined) {
      L.push(`  error:    ${indent(safeStringify(e.error))}`);
    }
    if (e.httpCalls && e.httpCalls.length > 1) {
      L.push(`  attempts: ${e.httpCalls.length}`);
    }
    L.push('');
  }

  const logBody = L.join('\n');
  const logPath = join(dir, `run-${stamp}.log`);
  writeFileSync(logPath, logBody);
  writeFileSync(join(dir, 'latest.log'), logBody);

  return { jsonPath, logPath };
}
