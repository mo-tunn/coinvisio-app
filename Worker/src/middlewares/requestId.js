function generateRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function requestId() {
  return async (c, next) => {
    const headerId = c.req.header('x-request-id') || c.req.header('cf-ray');
    const id = headerId || generateRequestId();
    c.set('requestId', id);
    c.header('x-request-id', id);
    await next();
  };
}
