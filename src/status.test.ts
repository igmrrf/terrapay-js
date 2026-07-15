import { describe, expect, it } from 'bun:test';
import {
  REMIT_PENDING_CODES,
  REMIT_SUCCESS_CODES,
  classifyRemitStatus,
  normalizeRemitCode,
} from './status.js';

describe('status', () => {
  it('normalizeRemitCode strips the composite "code:message" shape', () => {
    expect(normalizeRemitCode('3000:Remit Success')).toBe('3000');
    expect(normalizeRemitCode('3050')).toBe('3050');
    expect(normalizeRemitCode(undefined)).toBe('');
    expect(normalizeRemitCode(null)).toBe('');
  });

  it('classifyRemitStatus recognizes REMIT_SUCCESS (3000) as SUCCESS', () => {
    expect(classifyRemitStatus('3000')).toBe('SUCCESS');
    expect(classifyRemitStatus('3000:Remit Success')).toBe('SUCCESS');
  });

  it('classifyRemitStatus recognizes acknowledgement/pending codes as PENDING', () => {
    expect(classifyRemitStatus('3050:Remit Acknowledged.')).toBe('PENDING');
    expect(classifyRemitStatus('3208')).toBe('PENDING');
    expect(classifyRemitStatus('3251')).toBe('PENDING');
  });

  it('classifyRemitStatus treats bare textual statuses case-insensitively', () => {
    expect(classifyRemitStatus('SUCCESS')).toBe('SUCCESS');
    expect(classifyRemitStatus('pending')).toBe('PENDING');
  });

  it('classifyRemitStatus falls back to FAILED for anything else', () => {
    expect(classifyRemitStatus('3032')).toBe('FAILED'); // Remit failed
    expect(classifyRemitStatus('')).toBe('FAILED');
    expect(classifyRemitStatus(undefined)).toBe('FAILED');
  });

  it('REMIT_SUCCESS_CODES / REMIT_PENDING_CODES contain the expected codes and no overlap', () => {
    expect(REMIT_SUCCESS_CODES.has('3000')).toBe(true);
    expect(REMIT_PENDING_CODES.has('3050')).toBe(true);
    expect(REMIT_PENDING_CODES.has('3000')).toBe(false);
    expect(REMIT_SUCCESS_CODES.has('3050')).toBe(false);
  });
});
