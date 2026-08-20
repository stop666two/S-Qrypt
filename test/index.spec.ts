import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SELF } from 'cloudflare:test';

const TEST_TOKEN = 'abc123test';
const TEST_TOKEN_HASH = '03223b3b6fbb56617a7015252b37d8050a9e85c8102e682f18457940b1d4e1bd';

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
    expect(text).toContain('deriveKA');
    expect(text).toContain('deriveKB');
    expect(text).toContain('deriveKC');
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
});
