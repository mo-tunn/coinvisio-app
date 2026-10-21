import { describe, it, expect } from 'vitest';
import {
  parseBoolean,
  parseDate,
  parseRiskTolerance,
  getUserIdFromClaims
} from '../src/utils/parsers.js';
import { normalizeCoinRecommendation } from '../src/utils/mappers.js';

describe('utils', () => {
  it('parses boolean values', () => {
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('0')).toBe(false);
    expect(parseBoolean(undefined, true)).toBe(true);
  });

  it('parses risk tolerance', () => {
    expect(parseRiskTolerance('low')).toBe(0);
    expect(parseRiskTolerance('Medium')).toBe(1);
    expect(parseRiskTolerance('2')).toBe(2);
  });

  it('parses dates safely', () => {
    expect(parseDate('not-a-date')).toBe(null);
    expect(parseDate('2026-02-02T00:00:00Z')).not.toBe(null);
  });

  it('extracts user id from claims', () => {
    const payload = { sub: '123e4567-e89b-12d3-a456-426614174000' };
    expect(getUserIdFromClaims(payload)).toBe(payload.sub);
  });

  it('normalizes coin recommendations', () => {
    const coin = { symbol: 'BTC', volumeChange: 0.2 };
    const normalized = normalizeCoinRecommendation(coin);
    expect(normalized.symbol).toBe('BTC');
    expect(normalized.volume_change).toBe(0.2);
  });
});
