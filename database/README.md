# Database

Planned: SQLite encrypted with SQLCipher, owned exclusively by the Rust native layer.
Migrations are numbered, forward-only SQL files in `migrations/` (`NNNN_description.sql`).

**Status:** only `0001_schema_meta.sql` exists. No migration runner or encrypted database is implemented yet.
See [docs/DATABASE_DESIGN.md](../docs/DATABASE_DESIGN.md).
