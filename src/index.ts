import { homeHtml } from './homeHtml';
import { cryptoSandboxHtml } from './cryptoSandboxHtml';
import { deployHtml } from './deployHtml';
import { argon2WasmBase64, argon2Js } from './argon2Files';

declare function atob(s: string): string;

let cachedWasm: ArrayBuffer | null = null;
function arg2wasm(): ArrayBuffer {
  if (cachedWasm) return cachedWasm;
  const s = atob(argon2WasmBase64);
  const len = s.length;
  const b = new Uint8Array(len);
  for (let i = 0; i < len; i++) b[i] = s.charCodeAt(i);
  cachedWasm = b.buffer;
  return cachedWasm;
}

const API_PREFIX = '/api';

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; object-src 'none'; img-src 'self' data: blob: https://static.cloudflareinsights.com; connect-src 'self' https://static.cloudflareinsights.com;",
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hexSha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureColumn(db: D1Database, table: string, column: string, ddl: string): Promise<void> {
  const res = await db.prepare(PRIMARY_READ + 'SELECT name FROM pragma_table_info(?)').bind(table).all<{ name: string }>();
  const exists = res.results?.some(r => r.name === column) ?? false;
  if (!exists) await db.exec(ddl);
}

let schemaEnsured = false;
async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaEnsured) return;
  await db.exec(
    "CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, verification_token TEXT NOT NULL, verification_token_hash TEXT NOT NULL DEFAULT '', operation_token_hash TEXT NOT NULL DEFAULT '', init_completed INTEGER NOT NULL DEFAULT 0, kdf_version INTEGER NOT NULL DEFAULT 1, salt TEXT NOT NULL DEFAULT '')"
  );
  await ensureColumn(db, 'config', 'verification_token_hash', "ALTER TABLE config ADD COLUMN verification_token_hash TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'config', 'salt', "ALTER TABLE config ADD COLUMN salt TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'config', 'audit_public_key', "ALTER TABLE config ADD COLUMN audit_public_key TEXT NOT NULL DEFAULT ''");
  await db.exec(
    "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, encrypted_meta_packet TEXT NOT NULL DEFAULT '', encrypted_body TEXT NOT NULL DEFAULT '', is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1)), deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0,1)), created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))"
  );
  await ensureColumn(db, 'notes', 'created_at', "ALTER TABLE notes ADD COLUMN created_at TEXT DEFAULT (datetime('now'))");
  await ensureColumn(db, 'notes', 'updated_at', "ALTER TABLE notes ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))");
  await db.exec("CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, window_start INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0)");
  await db.exec("CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, encrypted_entry TEXT NOT NULL, fingerprint_hash TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)");
  try { await db.exec("CREATE INDEX IF NOT EXISTS idx_notes_active ON notes(is_test, deleted, id)"); } catch (e) { console.warn('[s-qrypt] create idx_notes_active failed:', e instanceof Error ? e.message : e); }
  schemaEnsured = true;
}

async function getClientIp(request: Request): Promise<string> {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

async function verifyOperationToken(db: D1Database, token: string): Promise<boolean> {
  const config = await db.prepare(
    PRIMARY_READ + 'SELECT operation_token_hash FROM config WHERE id = ?'
  ).bind('app_config').first<{ operation_token_hash: string }>();
  if (!config || !config.operation_token_hash) return false;
  const tokenHash = await hexSha256(token);
  return constantTimeEqual(tokenHash, config.operation_token_hash);
}

async function checkOperationToken(db: D1Database, token: string | undefined, bootstrapToken?: string, envSetupToken?: string): Promise<Response | null> {
  const config = await db.prepare(
    PRIMARY_READ + 'SELECT init_completed, operation_token_hash FROM config WHERE id = ?'
  ).bind('app_config').first<{ init_completed: number; operation_token_hash: string }>();
  if (!config || config.init_completed !== 1) {
    if (typeof bootstrapToken === 'string' && bootstrapToken.length <= 256 && envSetupToken && constantTimeEqual(bootstrapToken, envSetupToken)) return null;
    return errorResponse('forbidden', 403);
  }
  if (!config.operation_token_hash) return errorResponse('forbidden', 403);
  if (!token) return errorResponse('missing_operation_token', 403);
  const valid = await verifyOperationToken(db, token);
  if (!valid) return errorResponse('forbidden', 403);
  return null;
}

async function requireVerificationToken(request: Request, db: D1Database): Promise<Response | null> {
  const config = await db.prepare(
    PRIMARY_READ + 'SELECT init_completed, verification_token, verification_token_hash FROM config WHERE id = ?'
  ).bind('app_config').first<{ init_completed: number; verification_token: string; verification_token_hash: string }>();
  if (!config || config.init_completed !== 1) return errorResponse('unauthorized', 401);
  const token = request.headers.get('X-Verification-Token');
  if (!token) return errorResponse('unauthorized', 401);
  if (config.verification_token_hash) {
    if (!constantTimeEqual(await hexSha256(token), config.verification_token_hash)) {
      return errorResponse('unauthorized', 401);
    }
  } else if (config.verification_token) {
    if (!constantTimeEqual(token, config.verification_token)) {
      return errorResponse('unauthorized', 401);
    }
    const vHash = await hexSha256(token);
    await db.prepare(
      "UPDATE config SET verification_token_hash = ?, verification_token = '' WHERE id = ?"
    ).bind(vHash, 'app_config').run();
  } else {
    return errorResponse('unauthorized', 401);
  }
  return null;
}

function csrfCheck(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  if (!origin && !referer) return null;
  const allowed = (s: string) => {
    try {
      const u = new URL(s);
      if (u.protocol === 'https:') return true;
      if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) return true;
      return false;
    } catch {
      return false;
    }
  };
  if (origin && !allowed(origin)) return jsonResponse({ error: 'forbidden_origin' }, 403);
  if (referer && !allowed(referer)) return jsonResponse({ error: 'forbidden_referer' }, 403);
  return null;
}

function validateString(v: unknown, maxLen: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= maxLen;
}

async function parseJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await request.json();
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const RATE_WINDOW_MS = 300000;
const RATE_LOCK_MS = 600000;
const RATE_MAX_WRITE = 40;
const RATE_MAX_READ = 100;

// D1 replicates reads to nearby replicas by default; a read that lands on a
// replica can briefly miss the latest write (e.g. login succeeds against the
// primary config row, then the note list query hits a stale replica and
// returns empty). Prefixing reads with this hint forces the primary instance.
const PRIMARY_READ = '/* d1_primary */ ';

async function writeRateLimit(db: D1Database, key: string, max: number = RATE_MAX_WRITE): Promise<Response | null> {
  const now = Date.now();
  let row = await db.prepare(PRIMARY_READ + 'SELECT * FROM auth_limits WHERE key = ?')
    .bind(key).first<{ key: string; attempts: number; window_start: number; locked_until: number }>();
  if (row && row.locked_until > now) {
    return jsonResponse({ error: 'rate_limited', retry_after: Math.ceil((row.locked_until - now) / 1000) }, 429);
  }
  if (!row || (now - row.window_start) > RATE_WINDOW_MS) {
    await db.prepare('INSERT OR REPLACE INTO auth_limits (key, attempts, window_start, locked_until) VALUES (?, 1, ?, 0)').bind(key, now).run();
    return null;
  }
  const newAttempts = row.attempts + 1;
  if (newAttempts >= max) {
    await db.prepare('UPDATE auth_limits SET attempts = ?, locked_until = ? WHERE key = ?').bind(newAttempts, now + RATE_LOCK_MS, key).run();
    return jsonResponse({ error: 'rate_limited', retry_after: Math.ceil(RATE_LOCK_MS / 1000) }, 429);
  }
  await db.prepare('UPDATE auth_limits SET attempts = ? WHERE key = ?').bind(newAttempts, key).run();
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    await ensureSchema(env.DB);

    const csrfRes = csrfCheck(request);
    if (csrfRes && path.startsWith('/api')) return csrfRes;

    // Serve SPA
    if (path === '/' || path === '/index.html') {
      return htmlResponse(homeHtml);
    }

    // PWA: Web App Manifest
    if (path === '/manifest.webmanifest') {
      return new Response(JSON.stringify({
        name: 'S-Qrypt',
        short_name: 'S-Qrypt',
        description: '后量子安全加密笔记',
        start_url: '/',
        display: 'standalone',
        background_color: '#08080e',
        theme_color: '#6c6cff',
        icons: [{ src: '/app-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }],
      }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    // PWA: Service Worker
    if (path === '/sw.js') {
      return new Response(
        `self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>new Response('Offline',{status:503}))))`,
        { status: 200, headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' } }
      );
    }

    // PWA: App Icon
    if (path === '/app-icon.svg') {
      return new Response(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="#12121a"/><text x="256" y="290" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="220" fill="#6c6cff">S</text><text x="256" y="420" text-anchor="middle" font-family="system-ui" font-weight="300" font-size="60" fill="#8888aa">Q</text></svg>`,
        { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cross-Origin-Resource-Policy': 'cross-origin', 'Cache-Control': 'no-store' } }
      );
    }

    // Self-hosted argon2 WASM (sandbox cross-origin compatible)
    if (path === '/argon2.wasm') {
      return new Response(arg2wasm(), {
        status: 200,
        headers: {
          'Content-Type': 'application/wasm',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (path === '/argon2.js') {
      return new Response(argon2Js, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Serve crypto sandbox iframe (isolated origin via sandbox attribute in parent)
    if (path === '/crypto-sandbox') {
      return new Response(cryptoSandboxHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; img-src 'self' data:; connect-src 'self' https://static.cloudflareinsights.com;",
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Deploy guide page
    if (path === '/deploy') {
      return new Response(deployHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      });
    }

    // GET /api/init-check — check initialization status
    if (path === `${API_PREFIX}/init-check`) {
      let dbBound = false;
      try {
        const config = await env.DB.prepare(
          PRIMARY_READ + 'SELECT init_completed, kdf_version FROM config WHERE id = ?'
        ).bind('app_config').first<{ init_completed: number; kdf_version: number }>();
        dbBound = true;
        return jsonResponse({
          initialized: config ? config.init_completed === 1 : false,
          kdf_version: config?.kdf_version ?? 1,
          db_bound: true,
        });
      } catch (e) {
        return jsonResponse({
          initialized: false,
          kdf_version: 1,
          db_bound: false,
        });
      }
    }

    // GET /api/token — get verification token
    if (path === `${API_PREFIX}/token`) {
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'token:' + ip, RATE_MAX_READ);
      if (rl) return rl;
      const config = await env.DB.prepare(
        PRIMARY_READ + 'SELECT salt, audit_public_key FROM config WHERE id = ?'
      ).bind('app_config').first<{ salt: string; audit_public_key: string }>();
      if (!config) return errorResponse('not_initialized', 404);
      return jsonResponse({
        salt: config.salt || undefined,
        audit_public_key: config.audit_public_key || undefined,
      }, 200, { 'Cache-Control': 'no-store' });
    }

    // POST /api/init — initialize vault
    if (path === `${API_PREFIX}/init` && method === 'POST') {
      const existing = await env.DB.prepare(
        PRIMARY_READ + 'SELECT init_completed FROM config WHERE id = ?'
      ).bind('app_config').first<{ init_completed: number }>();
      if (existing && existing.init_completed === 1) {
        return errorResponse('already_initialized', 409);
      }

      let body: {
        verification_token?: string;
        operation_token_hash?: string;
        setup_token?: string;
        salt?: string;
        kdf_version?: number;
        audit_public_key?: string;
      };
      try {
        body = await request.json();
      } catch {
        return errorResponse('invalid_json', 400);
      }
      if (!env.SETUP_TOKEN) return errorResponse('setup_token_not_configured', 503);
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'init:' + ip, 20);
      if (rl) return rl;
      if (typeof body.setup_token !== 'string' || body.setup_token.length > 256 || !constantTimeEqual(body.setup_token, env.SETUP_TOKEN)) {
        return errorResponse('invalid_setup_token', 403);
      }
      if (!body.verification_token) return errorResponse('missing_verification_token');
      if (!body.operation_token_hash) return errorResponse('missing_operation_token_hash');

      const verificationTokenHash = await hexSha256(body.verification_token);
      await env.DB.prepare(
        `INSERT INTO config (id, verification_token, verification_token_hash, operation_token_hash, init_completed, kdf_version, salt, audit_public_key)
         VALUES (?, '', ?, ?, 1, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           verification_token = '',
           verification_token_hash = excluded.verification_token_hash,
           operation_token_hash = excluded.operation_token_hash,
           init_completed = 1,
           kdf_version = excluded.kdf_version,
           salt = excluded.salt,
           audit_public_key = excluded.audit_public_key`
      ).bind(
        'app_config',
        verificationTokenHash,
        body.operation_token_hash,
        body.kdf_version ?? 1,
        body.salt ?? '',
        body.audit_public_key ?? ''
      ).run();

      return jsonResponse({ status: 'ok' }, 201);
    }

    // GET /api/notes — list notes metadata
    if (path === `${API_PREFIX}/notes` && method === 'GET') {
      const authErr = await requireVerificationToken(request, env.DB);
      if (authErr) return authErr;

      const rawOffset = Number(url.searchParams.get('offset'));
      const rawLimit = Number(url.searchParams.get('limit'));
      const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
      const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(100, Math.floor(rawLimit)) : 50;
      const showDeleted = url.searchParams.get('deleted') === '1';
      const whereClause = showDeleted
        ? "WHERE is_test != 1 AND deleted = 1"
        : "WHERE is_test != 1 AND deleted != 1";
      const totalRow = await env.DB.prepare(
        PRIMARY_READ + `SELECT COUNT(*) as cnt FROM notes ${whereClause}`
      ).first<{ cnt: number }>();
      const rows = await env.DB.prepare(
        PRIMARY_READ + `SELECT id, encrypted_meta_packet, is_test, deleted, created_at, updated_at FROM notes ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`
      ).bind(limit, offset).all<{ id: number; encrypted_meta_packet: string; is_test: number; deleted: number }>();
      return jsonResponse({ notes: rows.results, total: totalRow?.cnt ?? 0, offset, limit });
    }

    // POST /api/note — create placeholder note
    if (path === `${API_PREFIX}/note` && method === 'POST') {
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.operation_token, 128)) return errorResponse('invalid_token', 400);
      const opRes = await checkOperationToken(env.DB, body.operation_token, body.setup_token as string | undefined, env.SETUP_TOKEN);
      if (opRes) return opRes;
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'write:' + ip);
      if (rl) return rl;

      const result = await env.DB.prepare(
        `INSERT INTO notes (encrypted_meta_packet, encrypted_body) VALUES ('', '') RETURNING id`
      ).first<{ id: number }>();
      return jsonResponse({ id: result?.id ?? -1 }, 201);
    }

    // GET /api/note/:id — get single note
    const noteMatch = path.match(/^\/api\/note\/(\d+)$/);
    if (noteMatch && method === 'GET') {
      const authErr = await requireVerificationToken(request, env.DB);
      if (authErr) return authErr;

      const noteId = Number(noteMatch[1]);
      const row = await env.DB.prepare(
        PRIMARY_READ + 'SELECT id, encrypted_meta_packet, encrypted_body, created_at, updated_at, deleted FROM notes WHERE id = ?'
      ).bind(noteId).first<{ id: number; encrypted_meta_packet: string; encrypted_body: string; deleted: number }>();
      if (!row || row.deleted === 1) return errorResponse('not_found', 404);
      return jsonResponse({
        id: row.id,
        encrypted_meta_packet: row.encrypted_meta_packet,
        encrypted_body: row.encrypted_body,
      });
    }

    // PUT /api/note/:id — update note
    if (noteMatch && method === 'PUT') {
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.operation_token, 128)) return errorResponse('invalid_token', 400);
      const opRes = await checkOperationToken(env.DB, body.operation_token, body.setup_token as string | undefined, env.SETUP_TOKEN);
      if (opRes) return opRes;

      const noteId = Number(noteMatch[1]);
      if (!isNaN(noteId) && noteId < 1) return errorResponse('invalid_id', 400);
      if (!validateString(body.encrypted_meta_packet, 10000)) return errorResponse('invalid_meta', 400);
      if (!validateString(body.encrypted_body, 2097152)) return errorResponse('invalid_body', 400);
      if (body.is_test !== undefined && (typeof body.is_test !== 'number' || !Number.isInteger(body.is_test) || (body.is_test !== 0 && body.is_test !== 1))) return errorResponse('invalid_is_test', 400);
      if (body.created_at !== undefined && !validateString(body.created_at, 64)) return errorResponse('invalid_created_at', 400);
      if (body.updated_at !== undefined && !validateString(body.updated_at, 64)) return errorResponse('invalid_updated_at', 400);
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'write:' + ip);
      if (rl) return rl;
      const result = await env.DB.prepare(
        "UPDATE notes SET encrypted_meta_packet = ?, encrypted_body = ?, updated_at = ?" +
        (body.created_at !== undefined ? ", created_at = ?" : "") +
        (body.is_test !== undefined ? ", is_test = ?" : "") + " WHERE id = ?"
      ).bind(
        body.encrypted_meta_packet, body.encrypted_body,
        body.updated_at !== undefined ? body.updated_at : "datetime('now')",
        ...(body.created_at !== undefined ? [body.created_at] : []),
        ...(body.is_test !== undefined ? [body.is_test as number] : []),
        noteId
      ).run();
      if (result.meta.changes === 0) return errorResponse('not_found', 404);
      return jsonResponse({ status: 'updated' });
    }

    // DELETE /api/note/:id — hard delete
    if (noteMatch && method === 'DELETE') {
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.operation_token, 128)) return errorResponse('invalid_token', 400);
      const opRes = await checkOperationToken(env.DB, body.operation_token, body.setup_token as string | undefined, env.SETUP_TOKEN);
      if (opRes) return opRes;

      const noteId = Number(noteMatch[1]);
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'write:' + ip);
      if (rl) return rl;
      const result = await env.DB.prepare(
        'DELETE FROM notes WHERE id = ?'
      ).bind(noteId).run();
      if (result.meta.changes === 0) return errorResponse('not_found', 404);
      return jsonResponse({ status: 'deleted' });
    }

    // PATCH /api/note/:id/restore — restore soft-deleted note
    const restoreMatch = path.match(/^\/api\/note\/(\d+)\/restore$/);
    if (restoreMatch && method === 'PATCH') {
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.operation_token, 128)) return errorResponse('invalid_token', 400);
      const opRes = await checkOperationToken(env.DB, body.operation_token, body.setup_token as string | undefined, env.SETUP_TOKEN);
      if (opRes) return opRes;
      const noteId = Number(restoreMatch[1]);
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'write:' + ip);
      if (rl) return rl;
      const result = await env.DB.prepare(
        'UPDATE notes SET deleted = 0 WHERE id = ?'
      ).bind(noteId).run();
      if (result.meta.changes === 0) return errorResponse('not_found', 404);
      return jsonResponse({ status: 'restored' });
    }

    // PATCH /api/note/:id/soft-delete — soft delete
    const softDeleteMatch = path.match(/^\/api\/note\/(\d+)\/soft-delete$/);
    if (softDeleteMatch && method === 'PATCH') {
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.operation_token, 128)) return errorResponse('invalid_token', 400);
      const opRes = await checkOperationToken(env.DB, body.operation_token, body.setup_token as string | undefined, env.SETUP_TOKEN);
      if (opRes) return opRes;

      const noteId = Number(softDeleteMatch[1]);
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'write:' + ip);
      if (rl) return rl;
      const result = await env.DB.prepare(
        'UPDATE notes SET deleted = 1 WHERE id = ?'
      ).bind(noteId).run();
      if (result.meta.changes === 0) return errorResponse('not_found', 404);
      return jsonResponse({ status: 'soft_deleted' });
    }

    // POST /api/audit/log — submit encrypted audit entry (needs auth)
    if (path === `${API_PREFIX}/audit/log` && method === 'POST') {
      const authErr = await requireVerificationToken(request, env.DB);
      if (authErr) return authErr;
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.encrypted_entry, 5000)) return errorResponse('invalid_entry', 400);
      if (!validateString(body.fingerprint_hash, 64)) return errorResponse('invalid_fingerprint', 400);
      const ip = await getClientIp(request);
      const rl = await writeRateLimit(env.DB, 'audit:' + ip);
      if (rl) return rl;
      await env.DB.prepare(
        'INSERT INTO audit_logs (encrypted_entry, fingerprint_hash) VALUES (?, ?)'
      ).bind(body.encrypted_entry, body.fingerprint_hash).run();
      return jsonResponse({ status: 'logged' }, 201);
    }

    // GET /api/audit/logs — retrieve audit entries (verified access)
    if (path === `${API_PREFIX}/audit/logs` && method === 'GET') {
      const authErr = await requireVerificationToken(request, env.DB);
      if (authErr) return authErr;
      const rawLimit = Number(url.searchParams.get('limit'));
      const rawOffset = Number(url.searchParams.get('offset'));
      const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(200, Math.floor(rawLimit)) : 50;
      const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
      const totalRow = await env.DB.prepare(PRIMARY_READ + 'SELECT COUNT(*) as cnt FROM audit_logs').first<{ cnt: number }>();
      const rows = await env.DB.prepare(
        PRIMARY_READ + 'SELECT id, encrypted_entry, created_at FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?'
      ).bind(limit, offset).all();
      return jsonResponse({ entries: rows.results, total: totalRow?.cnt ?? 0 });
    }

    // PUT /api/audit/key — update audit public key (requires operation token)
    if (path === `${API_PREFIX}/audit/key` && method === 'PUT') {
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.operation_token, 128)) return errorResponse('invalid_token', 400);
      const opRes = await checkOperationToken(env.DB, body.operation_token, body.setup_token as string | undefined, env.SETUP_TOKEN);
      if (opRes) return opRes;
      if (typeof body.audit_public_key !== 'string' || body.audit_public_key.length > 10000)
        return errorResponse('invalid_key', 400);
      await env.DB.prepare(
        'UPDATE config SET audit_public_key = ? WHERE id = ?'
      ).bind(body.audit_public_key, 'app_config').run();
      return jsonResponse({ status: 'key_updated' });
    }

    // DELETE /api/audit/logs — clear all audit logs (requires operation token)
    if (path === `${API_PREFIX}/audit/logs` && method === 'DELETE') {
      const body = await parseJsonBody(request);
      if (!body) return errorResponse('invalid_json', 400);
      if (!validateString(body.operation_token, 128)) return errorResponse('invalid_token', 400);
      const opRes = await checkOperationToken(env.DB, body.operation_token, body.setup_token as string | undefined, env.SETUP_TOKEN);
      if (opRes) return opRes;
      await env.DB.exec('DELETE FROM audit_logs');
      return jsonResponse({ status: 'logs_cleared' });
    }

    return errorResponse('not_found', 404);
  },
};
