import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SELF, env } from 'cloudflare:test';

const TEST_TOKEN = 'abc123test';
const TEST_TOKEN_HASH = '03223b3b6fbb56617a7015252b37d8050a9e85c8102e682f18457940b1d4e1bd';

// isolatedStorage is off, so D1 state survives between runs. Every run must start
// from an empty vault, otherwise "first init" style tests fail on the second run.
beforeAll(async () => {
  for (const table of ['notes', 'config', 'auth_limits', 'audit_logs']) {
    try {
      await env.DB.exec(`DELETE FROM ${table}`);
    } catch {
      // table does not exist yet (first run) — ensureSchema creates it on first request
    }
  }
});

async function jsonFetch(path: string, options?: RequestInit): Promise<{ status: number; data: any; headers: Headers }> {
  const res = await SELF.fetch(`http://localhost${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}

describe('S-Qrypt v1.0.0 API', () => {
  it('serves frontend HTML at /', async () => {
    const res = await SELF.fetch('http://localhost/');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('S-Qrypt');
    // Argon2id and the SPA itself are separate same-origin scripts, so the CSP
    // can keep script-src free of 'unsafe-inline'.
    expect(text).toContain('src="/argon2.js"');
    expect(text).toContain('src="/app.js"');
    expect(text).not.toContain('/crypto-sandbox');
    expect(res.headers.get('Content-Security-Policy')).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('serves the SPA bundle as a script', async () => {
    const res = await SELF.fetch('http://localhost/app.js');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/javascript');
    const body = await res.text();
    expect(body).toContain('deriveKA');
    expect(body).toContain('HKDF');
  });

  it('init-check returns not_initialized', async () => {
    const { status, data } = await jsonFetch('/api/init-check');
    expect(status).toBe(200);
    expect(data.initialized).toBe(false);
  });

  it('token returns 404 before init', async () => {
    const { status } = await jsonFetch('/api/token');
    expect(status).toBe(404);
  });

  it('rejects write before init without setup token (fail-closed)', async () => {
    // Before init, writes fail closed: anonymous write is forbidden
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: 'any_token_before_init' }),
    });
    expect(status).toBe(403);
    expect(data.error).toBe('forbidden');
  });

  it('rejects bootstrap write with wrong setup token', async () => {
    const { status } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: 'any_token_before_init', setup_token: 'wrong-setup-token' }),
    });
    expect(status).toBe(403);
  });

  it('allows bootstrap write with valid setup token (init flow)', async () => {
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: 'any_token_before_init', setup_token: 'test-setup-token' }),
    });
    expect(status).toBe(201);
    expect(data.id).toBe(1);
  });

  it('rejects notes read before init without verification token (fail-closed)', async () => {
    const { status } = await jsonFetch('/api/notes?offset=0&limit=1');
    expect(status).toBe(401);
  });

  it('rejects init with wrong setup token', async () => {
    const { status, data } = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'test',
        operation_token_hash: 'test',
        setup_token: 'wrong-setup-token',
      }),
    });
    expect(status).toBe(403);
    expect(data.error).toBe('invalid_setup_token');
  });

  it('rejects oversized and malformed init payloads (R-18)', async () => {
    const oversizedSalt = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'a'.repeat(64),
        operation_token_hash: 'b'.repeat(64),
        salt: 'a'.repeat(1024 * 1024),
        setup_token: 'test-setup-token',
      }),
    });
    expect(oversizedSalt.status).toBe(400);
    expect(oversizedSalt.data.error).toBe('invalid_salt');

    const malformedToken = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'not-hex-token',
        operation_token_hash: 'b'.repeat(64),
        setup_token: 'test-setup-token',
      }),
    });
    expect(malformedToken.status).toBe(400);
    expect(malformedToken.data.error).toBe('invalid_verification_token');
  });

  it('init creates config', async () => {
    // First update the placeholder note with encrypted data
    await jsonFetch('/api/note/1', {
      method: 'PUT',
      body: JSON.stringify({
        operation_token: 'any_token',
        encrypted_meta_packet: 'dGVzdF9tZXRh',
        encrypted_body: 'dGVzdF9ib2R5',
        is_test: 1,
        setup_token: 'test-setup-token',
      }),
    });
    // Then call init
    const { status, data } = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
        operation_token_hash: TEST_TOKEN_HASH,
        kdf_version: 2,
        setup_token: 'test-setup-token',
      }),
    });
    expect(status).toBe(201);
    expect(data.status).toBe('ok');
  });

  it('rejects duplicate init', async () => {
    const { status, data } = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'test',
        operation_token_hash: 'test',
        setup_token: 'test-setup-token',
      }),
    });
    expect(status).toBe(409);
    expect(data.error).toBe('already_initialized');
  });

  it('returns init status after init', async () => {
    const { data } = await jsonFetch('/api/init-check');
    expect(data.initialized).toBe(true);
    expect(data.kdf_version).toBe(2);
  });

  it('token endpoint does not leak verification token', async () => {
    const { status, data, headers } = await jsonFetch('/api/token');
    expect(status).toBe(200);
    expect(data.verification_token).toBeUndefined();
    expect(data.salt).toBeUndefined();
    expect(data.audit_public_key).toBeUndefined();
    expect(headers.get('Cache-Control')).toBe('no-store');
  });

  it('lists notes', async () => {
    const { status, data } = await jsonFetch('/api/notes', {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    expect(status).toBe(200);
    expect(Array.isArray(data.notes)).toBe(true);
    expect(data.notes.find((n: any) => n.is_test === 1)).toBeUndefined();
  });

  it('rejects wrong verification token with 401', async () => {
    const { status, data } = await jsonFetch('/api/notes', {
      headers: { 'X-Verification-Token': 'wrong-verification-token' },
    });
    expect(status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('rejects write without operation token after init', async () => {
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(status).toBe(400);
    expect(data.error).toBe('invalid_token');
  });

  it('creates placeholder note with operation token', async () => {
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(status).toBe(201);
    expect(data.id).toBe(2);
  });

  it('updates note with operation token', async () => {
    const { status, data } = await jsonFetch('/api/note/2', {
      method: 'PUT',
      body: JSON.stringify({
        operation_token: TEST_TOKEN,
        encrypted_meta_packet: 'bmV3X21ldGFf',
        encrypted_body: 'bmV3X2JvZHlf',
      }),
    });
    expect(status).toBe(200);
    expect(data.status).toBe('updated');
  });

  it('updates note preserving provided created_at', async () => {
    const { status } = await jsonFetch('/api/note/2', {
      method: 'PUT',
      body: JSON.stringify({
        operation_token: TEST_TOKEN,
        encrypted_meta_packet: 'bmV3X21ldGFf',
        encrypted_body: 'bmV3X2JvZHlf',
        created_at: '2020-01-02T03:04:05.000Z',
        updated_at: '2020-01-03T04:05:06.000Z',
      }),
    });
    expect(status).toBe(200);
    const { status: s2, data } = await jsonFetch('/api/notes', {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    expect(s2).toBe(200);
    const row = (data.notes || []).find((n: { id: number }) => n.id === 2);
    expect(row && row.created_at).toBe('2020-01-02T03:04:05.000Z');
    expect(row && row.updated_at).toBe('2020-01-03T04:05:06.000Z');
  });

  it('rejects invalid created_at', async () => {
    const { status, data } = await jsonFetch('/api/note/2', {
      method: 'PUT',
      body: JSON.stringify({
        operation_token: TEST_TOKEN,
        encrypted_meta_packet: 'bmV3X21ldGFf',
        encrypted_body: 'bmV3X2JvZHlf',
        created_at: 12345,
      }),
    });
    expect(status).toBe(400);
    expect(data.error).toBe('invalid_created_at');
  });

  it('gets single note', async () => {
    const { status, data } = await jsonFetch('/api/note/2', {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    expect(status).toBe(200);
    expect(data.id).toBe(2);
    expect(data.encrypted_meta_packet).toBe('bmV3X21ldGFf');
    expect(data.encrypted_body).toBe('bmV3X2JvZHlf');
  });

  it('soft-deletes note', async () => {
    const { status, data } = await jsonFetch('/api/note/2/soft-delete', {
      method: 'PATCH',
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(status).toBe(200);
    expect(data.status).toBe('soft_deleted');
  });

  it('hard-deletes note', async () => {
    const { status, data } = await jsonFetch('/api/note/1', {
      method: 'DELETE',
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(status).toBe(200);
    expect(data.status).toBe('deleted');
  });

  it('returns 404 for deleted note', async () => {
    const { status } = await jsonFetch('/api/note/1', {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    expect(status).toBe(404);
  });

  it('rejects invalid operation token', async () => {
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: 'wrong_token' }),
    });
    expect(status).toBe(403);
    expect(data.error).toBe('forbidden');
  });

  it('rejects missing operation token field', async () => {
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(status).toBe(400);
    expect(data.error).toBe('invalid_token');
  });

  it('returns security headers on HTML page', async () => {
    const res = await SELF.fetch('http://localhost/');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(res.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('sets framing protection on HTML responses (R-09)', async () => {
    for (const path of ['/', '/deploy']) {
      const res = await SELF.fetch('http://localhost' + path);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    }
  });

  it('rejects a foreign Origin instead of letting any https site through (R-05)', async () => {
    const evil = await jsonFetch('/api/note', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(evil.status).toBe(403);
    expect(evil.data.error).toBe('forbidden_origin');

    const sameOrigin = await jsonFetch('/api/note', {
      method: 'POST',
      headers: { Origin: 'http://localhost' },
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(sameOrigin.status).toBe(201);
  });

  it('stores a real timestamp when updated_at is omitted (R-02)', async () => {
    const created = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    const id = created.data.id;
    await jsonFetch('/api/note/' + id, {
      method: 'PUT',
      body: JSON.stringify({
        operation_token: TEST_TOKEN,
        encrypted_meta_packet: 'dGVzdF9tZXRh',
        encrypted_body: 'dGVzdF9ib2R5',
      }),
    });
    const list = await jsonFetch('/api/notes', {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    const row = list.data.notes.find((n: { id: number }) => n.id === id);
    expect(row).toBeDefined();
    expect(row.updated_at).not.toBe("datetime('now')");
    expect(Number.isNaN(Date.parse(row.updated_at))).toBe(false);
  });

  it('hides test notes from single-note reads (R-21)', async () => {
    const created = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    const id = created.data.id;
    await jsonFetch('/api/note/' + id, {
      method: 'PUT',
      body: JSON.stringify({
        operation_token: TEST_TOKEN,
        encrypted_meta_packet: 'dGVzdF9tZXRh',
        encrypted_body: 'dGVzdF9ib2R5',
        is_test: 1,
      }),
    });
    const read = await jsonFetch('/api/note/' + id, {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    expect(read.status).toBe(404);
  });

  it('requires the operation token for audit writes (R-17)', async () => {
    const noOpToken = await jsonFetch('/api/audit/log', {
      method: 'POST',
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
      body: JSON.stringify({ encrypted_entry: 'AAAA', fingerprint_hash: 'b'.repeat(16) }),
    });
    expect(noOpToken.status).toBe(400);
    expect(noOpToken.data.error).toBe('invalid_token');

    const withOpToken = await jsonFetch('/api/audit/log', {
      method: 'POST',
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
      body: JSON.stringify({
        operation_token: TEST_TOKEN,
        encrypted_entry: 'AAAA',
        fingerprint_hash: 'b'.repeat(16),
      }),
    });
    expect(withOpToken.status).toBe(201);
  });

  it('reports a total consistent with the page that returned it (R-25)', async () => {
    const headers = { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' };
    const first = await jsonFetch('/api/notes?offset=0&limit=1', { headers });
    expect(first.status).toBe(200);
    expect(first.data.notes).toHaveLength(1);
    expect(first.data.total).toBeGreaterThanOrEqual(2);
    expect(first.data.notes[0].total).toBeUndefined();

    const beyond = await jsonFetch('/api/notes?offset=9999&limit=1', { headers });
    expect(beyond.status).toBe(200);
    expect(beyond.data.notes).toHaveLength(0);
    expect(beyond.data.total).toBe(first.data.total);
  });

  it('rejects cross-site requests that omit Origin/Referer (P2)', async () => {
    const crossSite = await jsonFetch('/api/note', {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'cross-site' },
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(crossSite.status).toBe(403);
    expect(crossSite.data.error).toBe('forbidden_origin');

    const sameSite = await jsonFetch('/api/note', {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'same-origin' },
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(sameSite.status).toBe(201);
  });

  it('expires and rotates the verification token (P4)', async () => {
    const vt = { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' };
    await env.DB.exec("UPDATE config SET token_issued_at = 1 WHERE id = 'app_config'");

    const expired = await jsonFetch('/api/notes', { headers: vt });
    expect(expired.status).toBe(401);
    expect(expired.data.error).toBe('token_expired');

    // Rotating needs the MK-derived operation token, not the verification token.
    const noProof = await jsonFetch('/api/vault/rotate', {
      method: 'POST',
      body: JSON.stringify({ operation_token: 'wrong' }),
    });
    expect(noProof.status).toBe(403);

    const rotated = await jsonFetch('/api/vault/rotate', {
      method: 'POST',
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(rotated.status).toBe(200);
    expect(rotated.data.token_issued_at).toBeGreaterThan(1);
    expect((await jsonFetch('/api/token')).data.token_issued_at).toBe(rotated.data.token_issued_at);

    const renewed = await jsonFetch('/api/notes', { headers: vt });
    expect(renewed.status).toBe(200);
  });

  it('does not throttle a 20-note import at 40 writes (R-03)', { timeout: 60000 }, async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      const created = await jsonFetch('/api/note', {
        method: 'POST',
        body: JSON.stringify({ operation_token: TEST_TOKEN }),
      });
      statuses.push(created.status);
      const put = await jsonFetch('/api/note/' + created.data.id, {
        method: 'PUT',
        body: JSON.stringify({
          operation_token: TEST_TOKEN,
          encrypted_meta_packet: 'dGVzdF9tZXRh',
          encrypted_body: 'dGVzdF9ib2R5',
        }),
      });
      statuses.push(put.status);
    }
    expect(statuses.filter((s) => s === 429)).toHaveLength(0);
    expect(statuses.every((s) => s === 200 || s === 201)).toBe(true);
  });

  it('throttles repeated failed authentication (R-04)', { timeout: 180000 }, async () => {
    const counts: Record<number, number> = {};
    // 105 crosses the 100-per-window cap with as few D1 writes as possible.
    for (let i = 0; i < 105; i++) {
      const { status } = await jsonFetch('/api/notes', {
        headers: { 'X-Verification-Token': 'wrong' + i },
      });
      counts[status] = (counts[status] ?? 0) + 1;
    }
    expect(counts[401]).toBeGreaterThan(0);
    expect(counts[429]).toBeGreaterThan(0);
    // Later assertions need the bucket clear again.
    await env.DB.exec('DELETE FROM auth_limits');
  });

  it('upgrades a v2 vault to a salted v3 KDF (P1)', async () => {
    const bad = await jsonFetch('/api/vault/upgrade', {
      method: 'POST',
      body: JSON.stringify({ mode: 'begin', operation_token: TEST_TOKEN, salt: 'abc' }),
    });
    expect(bad.status).toBe(400);
    expect(bad.data.error).toBe('invalid_salt');

    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const begin = await jsonFetch('/api/vault/upgrade', {
      method: 'POST',
      body: JSON.stringify({ mode: 'begin', operation_token: TEST_TOKEN, salt }),
    });
    expect(begin.status).toBe(200);
    expect(begin.data.status).toBe('salt_staged');
    expect((await jsonFetch('/api/token')).data.salt).toBe(salt);
    // Staging the salt must not change the derivation yet.
    expect((await jsonFetch('/api/init-check')).data.kdf_version).toBe(2);

    const finish = await jsonFetch('/api/vault/upgrade', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'finish',
        operation_token: TEST_TOKEN,
        verification_token: 'c'.repeat(64),
        operation_token_hash: 'd'.repeat(64),
      }),
    });
    expect(finish.status).toBe(200);
    expect(finish.data.kdf_version).toBe(3);
    expect((await jsonFetch('/api/init-check')).data.kdf_version).toBe(3);

    const oldToken = await jsonFetch('/api/notes', {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    expect(oldToken.status).toBe(401);
    const newToken = await jsonFetch('/api/notes', {
      headers: { 'X-Verification-Token': 'c'.repeat(64) },
    });
    expect(newToken.status).toBe(200);

    const staleOpToken = await jsonFetch('/api/vault/upgrade', {
      method: 'POST',
      body: JSON.stringify({ mode: 'begin', operation_token: TEST_TOKEN, salt }),
    });
    expect(staleOpToken.status).toBe(403);
  });

  it('fails closed when the config read throws during init (F1)', async () => {
    const spy = vi.spyOn(env.DB, 'prepare').mockImplementation(() => {
      throw new Error('d1 down');
    });
    try {
      const res = await jsonFetch('/api/init', {
        method: 'POST',
        body: JSON.stringify({
          verification_token: 'c'.repeat(64),
          operation_token_hash: 'd'.repeat(64),
          kdf_version: 3,
          salt: 'a'.repeat(32),
          setup_token: 'test-setup-token',
        }),
      });
      expect(res.status).toBe(503);
      expect(res.data.error).toBe('db_unavailable');
    } finally {
      spy.mockRestore();
    }
  });

  it('refuses to overwrite a vault that still has notes (F2)', async () => {
    await env.DB.exec('DELETE FROM config');

    const blocked = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'c'.repeat(64),
        operation_token_hash: 'd'.repeat(64),
        kdf_version: 3,
        salt: 'a'.repeat(32),
        setup_token: 'test-setup-token',
      }),
    });
    expect(blocked.status).toBe(409);
    expect(blocked.data.error).toBe('orphan_notes');
    // 被拒后 config 仍未写入：数据没有被新盐覆盖
    expect((await jsonFetch('/api/init-check')).data.initialized).toBe(false);

    const forced = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'e'.repeat(64),
        operation_token_hash: 'f'.repeat(64),
        kdf_version: 3,
        salt: 'b'.repeat(32),
        setup_token: 'test-setup-token',
        force: true,
      }),
    });
    expect(forced.status).toBe(201);
  });
});

describe('vault-bound KDF parameters', () => {
  const baseInit = {
    verification_token: 'a'.repeat(64),
    operation_token_hash: 'b'.repeat(64),
    kdf_version: 3,
    salt: 'c'.repeat(32),
    setup_token: 'test-setup-token',
  };

  it('rejects a half-specified or out-of-range recipe', async () => {
    await env.DB.exec('DELETE FROM config');
    const half = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({ ...baseInit, kdf_mb: 32 }),
    });
    expect(half.status).toBe(400);
    expect(half.data.error).toBe('invalid_kdf_params');

    const huge = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({ ...baseInit, kdf_mb: 4096, kdf_ro: 128 }),
    });
    expect(huge.status).toBe(400);
    expect(huge.data.error).toBe('invalid_kdf_params');
  });

  it('stores the recipe and hands it back from /api/token', async () => {
    await env.DB.exec('DELETE FROM notes');
    const init = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({ ...baseInit, kdf_mb: 24, kdf_ro: 80 }),
    });
    expect(init.status).toBe(201);

    const tok = await jsonFetch('/api/token');
    expect(tok.status).toBe(200);
    expect(tok.data.kdf_mb).toBe(24);
    expect(tok.data.kdf_ro).toBe(80);
  });
});

describe('reset path (delete config, notes remain)', () => {
  const initBody = {
    verification_token: 'a'.repeat(64),
    operation_token_hash: TEST_TOKEN_HASH,
    kdf_version: 3,
    salt: 'c'.repeat(32),
    kdf_mb: 32,
    kdf_ro: 128,
    setup_token: 'test-setup-token',
  };

  it('still creates a placeholder after config is gone while real notes remain', async () => {
    await env.DB.exec('DELETE FROM notes');
    await env.DB.exec('DELETE FROM config');

    const ph = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: TEST_TOKEN, setup_token: 'test-setup-token' }),
    });
    expect(ph.status).toBe(201);
    await jsonFetch(`/api/note/${ph.data.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        operation_token: TEST_TOKEN,
        encrypted_meta_packet: 'bWV0YQ==',
        encrypted_body: 'Ym9keQ==',
        is_test: 1,
        setup_token: 'test-setup-token',
      }),
    });
    expect((await jsonFetch('/api/init', { method: 'POST', body: JSON.stringify(initBody) })).status).toBe(201);

    const real = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: TEST_TOKEN }),
    });
    expect(real.status).toBe(201);

    // 迁移动作：配置被删、笔记还在
    await env.DB.exec('DELETE FROM config');
    const again = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: TEST_TOKEN, setup_token: 'test-setup-token' }),
    });
    // 旧实现数「全部笔记」，这里会 409 placeholder_exists，迁移被彻底堵死
    expect(again.status).toBe(201);
    expect(again.data.id).toBeGreaterThan(0);
  });
});
