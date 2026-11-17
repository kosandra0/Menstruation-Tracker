# Database design (planned — not implemented)

- **Engine:** SQLite with SQLCipher, owned only by Rust (`src-tauri/src/storage`). The encryption backend and repository code are developed independently behind the `Storage` trait.
- **Never plaintext:** if SQLCipher or key protection is unavailable, storage stays `not_initialized` (reported by `storage_status`).
- **Migrations:** forward-only `database/migrations/NNNN_name.sql`, each applied in a transaction and recorded in `schema_migrations`. Only `0001_schema_meta.sql` exists.
- **Repositories:** one trait per aggregate (periods, daily entries, journal, settings), taking a transaction handle; multi-step writes occur in a single transaction. Edits and deletes of history must be supported (users correct past entries).
- **Dates:** local calendar dates as `YYYY-MM-DD` text (`IsoDate`), not UTC timestamps.
- **Key handling:** see PRIVACY_SECURITY.md. Rotating the key = `PRAGMA rekey` in a transaction with a pre-flight backup.
- **Integrity:** `PRAGMA integrity_check` and foreign keys on; Go worker may run offline integrity checks on copies.
- **Testing:** in-memory/temporary-file SQLCipher databases in Rust unit tests; migration up-tests from every previous version.

## v0.2.0 current storage
Until SQLCipher lands, records live in one DPAPI-encrypted JSON document (`records.vault`, `RecordsData` version 1 in `@mt/domain`: periods, per-day logs keyed by ISO date, journal entries, reminders, custom symptoms). Reads/writes go through `storage::Vault` (Rust) and `recordsService` (TS). `parseRecords` tolerates damaged shapes. A later migration to SQLite/SQLCipher will read this document once, import it transactionally and keep the old vault as a backup until the user confirms.
