export function logger() {
  return async (c, next) => {
    const start = Date.now();
    try {
      await next();
    } finally {
      const durationMs = Date.now() - start;
      const requestId = c.get('requestId');
      const url = new URL(c.req.url);
      const status = c.res?.status || 500;
      const log = {
        level: 'info',
        requestId,
        method: c.req.method,
        path: url.pathname,
        status,
        durationMs
      };
      console.log(JSON.stringify(log));
    }
  };
}
