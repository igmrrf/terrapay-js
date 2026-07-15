/**
 * Loads sandbox credentials and proxy settings from prioritized env files (.env, .env.local, .env.test, .env.test.local) and builds a TerraPayConfig.
 *
 * Notable behaviour: if `TERRAPAY_PASSWORD_HASHED=false` is set but the password value is a 64-char hex string (i.e. already a SHA-256 hash).
 * Feeding that to the SDK with `isPasswordHashed:false` makes it hash the hash and
 * every request 401s. We detect the 64-hex shape and treat it as pre-hashed, unless
 * `TERRAPAY_PASSWORD_HASHED` is explicitly set to `true`/`false` AND the value is not
 * obviously a hash. An override env `TERRAPAY_FORCE_HASHED=true|false` wins over all.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TerraPayConfig } from '../src/types/index.js';

const SHA256_HEX = /^[0-9a-f]{64}$/i;

/** Parse a dotenv-style file into a record. Ignores blanks and `#` comments. */
function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return out;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export interface LoadedEnv {
  config: TerraPayConfig;
  /** True if we overrode the file's PASSWORD_HASHED flag because the value looked pre-hashed. */
  hashCorrected: boolean;
  /** The raw environment string as loaded (Sandbox/uat/production). */
  rawEnvironment: string;
  /** SOCKS/HTTP proxy URL the harness will route through (empty = direct). */
  proxyUrl: string;
}

export function loadEnv(): LoadedEnv {
  const file: Record<string, string> = {};
  for (const name of ['.env', '.env.local', '.env.test', '.env.test.local']) {
    const path = join(import.meta.dir, '..', name);
    Object.assign(file, parseEnvFile(path));
  }
  // process.env wins over the file so callers can override anything at runtime.
  const get = (k: string): string | undefined => process.env[k] ?? file[k];

  // Propagate all keys to process.env so external packages (like socks-ssh) can read them
  for (const [key, val] of Object.entries(file)) {
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }

  const username = get('TERRAPAY_USERNAME');
  const password = get('TERRAPAY_PASSWORD');
  const originCountry = get('TERRAPAY_ORIGIN_COUNTRY') ?? 'NG';
  const rawEnvironment = get('TERRAPAY_ENVIRONMENT') ?? 'uat';
  if (!username || !password) {
    throw new Error(
      'Missing TERRAPAY_USERNAME / TERRAPAY_PASSWORD. Set them in .env.test or the environment.',
    );
  }
  // Map any non-production value (Sandbox, uat, UAT, test...) to the SDK's 'uat'.
  const environment: 'uat' | 'production' =
    rawEnvironment.toLowerCase() === 'production' ? 'production' : 'uat';

  // Resolve the hashing flag.
  const fileFlag = (get('TERRAPAY_PASSWORD_HASHED') ?? '').toLowerCase();
  const forced = (get('TERRAPAY_FORCE_HASHED') ?? '').toLowerCase();
  const looksHashed = SHA256_HEX.test(password);

  let isPasswordHashed: boolean;
  let hashCorrected = false;
  if (forced === 'true' || forced === 'false') {
    isPasswordHashed = forced === 'true';
  } else if (looksHashed) {
    // A 64-hex value is a SHA-256 digest; never let the SDK hash it again.
    isPasswordHashed = true;
    hashCorrected = fileFlag === 'false';
  } else {
    isPasswordHashed = fileFlag === 'true';
  }

  const maxRetries = Number(get('TERRAPAY_MAX_RETRIES') ?? '3');

  const config: TerraPayConfig = {
    username,
    password,
    originCountry,
    environment,
    isPasswordHashed,
    maxRetries: Number.isFinite(maxRetries) ? maxRetries : 3,
    publicKey: get('TERRAPAY_PUBLIC_KEY'),
    statementsBaseUrl: get('TERRAPAY_STATEMENTS_BASE_URL'),
    // Effectively disable the circuit breaker for the integration suite: each test
    // exercises a different endpoint, so one unreachable host (e.g. the statements
    // host if not allow-listed) must not trip the breaker and cascade 503s onto
    // every subsequent call.
    circuitBreaker: { failureThreshold: 100_000, resetTimeout: 1 },
  };

  const proxyUrl = get('SOCKS_PROXY') ?? get('TERRAPAY_PROXY') ?? 'socks5://127.0.0.1:1080';

  return {
    config,
    hashCorrected,
    rawEnvironment,
    proxyUrl: proxyUrl === 'none' ? '' : proxyUrl,
  };
}
