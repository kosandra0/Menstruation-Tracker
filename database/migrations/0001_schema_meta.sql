-- 0001: migration bookkeeping only. No health-data tables exist yet (see docs/DATABASE_DESIGN.md).
-- Applied by the future Rust storage layer inside a transaction against the SQLCipher database.
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    applied_at TEXT    NOT NULL
);
