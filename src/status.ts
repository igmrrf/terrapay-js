import { RemitResponseCode } from './types/responses.js';

/** Codes in {@link RemitResponseCode} that represent a successfully paid-out remit. */
export const REMIT_SUCCESS_CODES: ReadonlySet<string> = new Set([RemitResponseCode.REMIT_SUCCESS]);

/**
 * Codes in {@link RemitResponseCode} that represent a remit still in flight —
 * acknowledged, on hold, or awaiting a beneficiary-side action. Not success,
 * not (yet) failure.
 */
export const REMIT_PENDING_CODES: ReadonlySet<string> = new Set([
  RemitResponseCode.REMIT_ACKNOWLEDGED_STATUS_PENDING,
  RemitResponseCode.REVERSAL_PENDING,
  RemitResponseCode.BENEFICIARY_OPT_IN_PENDING,
  RemitResponseCode.BENEFICIARY_PENDING_CASHOUT,
  RemitResponseCode.BENEFICIARY_PENDING_REVIEW,
  RemitResponseCode.BENEFICIARY_PENDING_REGISTRATION,
  RemitResponseCode.BENEFICIARY_PENDING_UPGRADE,
  RemitResponseCode.BENEFICIARY_PENDING_ADJUSTMENT,
  RemitResponseCode.REMIT_ACKNOWLEDGED_TRANSACTION_IS_ON_HOLD_DUE_TO_A_POSSIBLE_DUPLICATE,
]);

/**
 * Strips a composite `"3000:Remit Success"` code down to the bare code
 * (`"3000"`). TerraPay returns both shapes depending on the endpoint.
 */
export function normalizeRemitCode(code: string | undefined | null): string {
  return (code ?? '').split(':')[0].trim();
}

/**
 * Classifies a raw remit status/response code into one of three buckets.
 * Accepts TerraPay's numeric codes (bare `"3000"` or composite
 * `"3000:Remit Success"`) as well as the bare textual shape (`"SUCCESS"`,
 * `"PENDING"`) some endpoints return instead. Anything not recognized as
 * success or pending classifies as `'FAILED'`.
 */
export function classifyRemitStatus(
  code: string | undefined | null,
): 'SUCCESS' | 'PENDING' | 'FAILED' {
  const normalized = normalizeRemitCode(code);
  if (REMIT_SUCCESS_CODES.has(normalized) || normalized.toUpperCase() === 'SUCCESS') {
    return 'SUCCESS';
  }
  if (REMIT_PENDING_CODES.has(normalized) || normalized.toUpperCase() === 'PENDING') {
    return 'PENDING';
  }
  return 'FAILED';
}
