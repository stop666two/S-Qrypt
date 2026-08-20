CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY,
  verification_token TEXT NOT NULL,
  verification_token_hash TEXT NOT NULL DEFAULT '',
  operation_token_hash TEXT NOT NULL DEFAULT '',
  init_completed INTEGER NOT NULL DEFAULT 0,
  kdf_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encrypted_meta_packet TEXT NOT NULL DEFAULT '',
  encrypted_body TEXT NOT NULL DEFAULT '',
  is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_notes_active ON notes(is_test, deleted, id);
