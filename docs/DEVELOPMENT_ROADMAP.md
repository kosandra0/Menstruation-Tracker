# Development roadmap (suggested order)

0. **Verify toolchains** — run `cargo test`, `go test ./...`, `tauri dev`; generate icons; fix whatever surfaces. Install pnpm if desired and migrate lockfile.
1. **Storage foundation** — SQLCipher in Rust, Windows DPAPI `KeyProtector`, migration runner, `storage_status` real values, repository traits + tests.
2. **Daily log & periods** — period start/end, daily entries (flow, mood, symptoms, notes); full edit/delete; Zustand + service layer; calendar bound to real data (remove demo markers).
3. **Domain estimates** — `CycleEstimator` in `packages/domain` with ranges/uncertainty, heavy unit tests, UI copy per the medical principles.
4. **Journal** — encrypted entries, tags, search.
5. **Reminders** — native notifications with neutral text, scheduling, permission flow.
6. **Insights** — charts from real data using `Estimate` semantics.
7. **Data control** — export/delete/backup (Go worker integration), app lock, hide-on-blur.
8. **Hardening** — a11y/contrast audit, CSP test, dependency audit, installer (NSIS), signing, auto-update policy (privacy-preserving).
9. **Mobile** — see MOBILE_ROADMAP.md.

Every phase: update CHANGELOG.md, bump versions everywhere (`npm run check:version`), update docs.

## v0.2.0 progress against this roadmap
Done (with the DPAPI vault instead of SQLCipher): phases 2 (daily log and periods), 3 (estimates), 4 (journal, vault-encrypted), 5 (reminders), 6 (insights), parts of 7 (export/delete; no backup, no app lock) and the UI part of 8. Remaining: phase 1 SQLCipher migration, app lock, hide-on-blur, encrypted backup, NSIS installer and signing, accessibility audit with assistive technology, Go worker use cases, phase 9 mobile.
