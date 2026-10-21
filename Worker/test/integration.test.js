import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import '../src/app.js';

describe('worker integration', () => {
  it('responds to health check', async () => {
    const res = await SELF.fetch('http://example.com/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('rejects unauthorized requests', async () => {
    const res = await SELF.fetch('http://example.com/api/Coin/mywatchlist');
    expect(res.status).toBe(401);
  });

  it('validates refresh payload', async () => {
    const res = await SELF.fetch('http://example.com/api/Auth/refresh', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });

  it('protects iris routes with auth', async () => {
    const res = await SELF.fetch('http://example.com/api/Iris/history/test-user');
    expect(res.status).toBe(401);
  });

  it('limits repeated login attempts', async () => {
    let lastStatus = 0;

    for (let i = 0; i < 6; i += 1) {
      const res = await SELF.fetch('http://example.com/api/Auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: 'ratelimit-test@example.com',
          password: 'bad-password'
        })
      });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});
