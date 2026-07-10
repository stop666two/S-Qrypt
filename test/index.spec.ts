import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { env } from 'cloudflare:test';

const TEST_TOKEN = 'abc123test';
const TEST_TOKEN_HASH = '6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a841bf90d';

async function jsonFetch(path: string, options?: RequestInit): Promise<{ status: number; data: any }> {
  const res = await env.DB.fetch(`http://localhost${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await res.json();
  return { status: res.status, data };
}

describe('S-Qrypt v1.0.0 API', () => {
  it('serves frontend HTML at /', async () => {
    const res = await env.DB.fetch('http://localhost/');
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

  it('allows write operations before init (init flow)', async () => {
    // Before init, requireOperationToken returns null (allows)
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({ operation_token: 'any_token_before_init' }),
    });
    expect(status).toBe(201);
    expect(data.id).toBe(1);
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
      }),
    });
    // Then call init
    const { status, data } = await jsonFetch('/api/init', {
      method: 'POST',
      body: JSON.stringify({
        verification_token: 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
        operation_token_hash: TEST_TOKEN_HASH,
        kdf_version: 2,
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

  it('returns verification token', async () => {
    const { status, data } = await jsonFetch('/api/token');
    expect(status).toBe(200);
    expect(data.verification_token).toBe('af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f');
  });

  it('lists notes', async () => {
    const { status, data } = await jsonFetch('/api/notes', {
      headers: { 'X-Verification-Token': 'af3f8e6d9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f' },
    });
    expect(status).toBe(200);
    expect(data.notes.length).toBeGreaterThanOrEqual(1);
    expect(data.notes[0].id).toBe(1);
    expect(data.notes[0].is_test).toBe(1);
  });

  it('rejects write without operation token after init', async () => {
    const { status, data } = await jsonFetch('/api/note', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(status).toBe(403);
    expect(data.error).toBe('forbidden');
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
    expect(status).toBe(403);
    expect(data.error).toBe('forbidden');
  });

  it('returns security headers on HTML page', async () => {
    const res = await env.DB.fetch('http://localhost/');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(res.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
  });
});
