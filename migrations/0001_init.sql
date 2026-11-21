-- Keep in sync with ensureSchema() in src/index.ts.
CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY,
  verification_token TEXT NOT NULL,
  verification_token_hash TEXT NOT NULL DEFAULT '',
  operation_token_hash TEXT NOT NULL DEFAULT '',
  init_completed INTEGER NOT NULL DEFAULT 0,
  kdf_version INTEGER NOT NULL DEFAULT 1,
  salt TEXT NOT NULL DEFAULT '',
  audit_public_key TEXT NOT NULL DEFAULT '',
  token_issued_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypted_meta_packet TEXT NOT NULL DEFAULT '',
  encrypted_body TEXT NOT NULL DEFAULT '',
  is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0,1)),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  kdf_version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auth_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypted_entry TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_active ON notes(is_test, deleted, id);
