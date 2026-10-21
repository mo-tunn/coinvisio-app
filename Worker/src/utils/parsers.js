const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(lowered)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(lowered)) return false;
  }
  return defaultValue;
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function parseInteger(value, defaultValue = null) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;
  return parsed;
}

export function parseRiskTolerance(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'low') return 0;
    if (lowered === 'medium') return 1;
    if (lowered === 'high') return 2;
    const numeric = Number.parseInt(value, 10);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return null;
}

export function isValidUuid(value) {
  if (!value || typeof value !== 'string') return false;
  return UUID_RE.test(value);
}

export function getUserIdFromClaims(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.sub,
    payload.nameidentifier,
    payload.nameIdentifier,
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
  ];
  for (const candidate of candidates) {
    if (isValidUuid(candidate)) return candidate;
  }
  return null;
}

export function toNull(value) {
  return value === undefined ? null : value;
}
