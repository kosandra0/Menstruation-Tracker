# Menstruation Tracker - v0.3.0 (Windows desktop)

A private, local-first menstrual health tracker. Windows desktop first (Tauri 2 + React + Rust); an **Android app is coming later** (not started).

> A tracking and personal-recording tool, not a medical device. Estimates are never certainties and must not be used as contraception.

## What works in v0.3.0

- **Record**: periods (start/end, edit, delete), daily logs (flow, mood, energy, pain, sleep, symptoms, water, exercise, medication, notes), a private journal, reminders.
- **Understand**: next-period *estimate with a range and an uncertainty note* (median of your last six cycles), cycle and period history, variability, symptom frequency, mood/energy/pain/sleep charts, logging streaks, cycle-length trend, averages by day of cycle, symptoms across the cycle, mood by weekday, sleep-and-mood comparison, monthly summaries, CSV export. Everything shows how it is calculated and how many days it is based on.
- **Make it yours**: ten themes (light/dark/system), custom colours with contrast checks, saved/imported/exported palettes, fonts and text sizing, a background image with adjustments and themes generated from the image, six title-bar button styles, three app logos, optional mood-adaptive accent, configurable mood bars, customisable dashboard, reduced-motion support.
- **Desktop behaviour**: start-up and exit screens in your logo and theme, system tray with a themed right-click menu, close/minimise to tray, optional Start with Windows, single instance.
- **Notifications** (v0.3.0): reminders and gentle "remember to record" prompts shown as popups drawn by the app in your theme (not Windows toasts), a bell with history in the title bar, per-kind switches, previews and popup styling.
- **Backup and restore** (v0.3.0): everything (records, name, settings) as `.json`, `.md` or `.txt`; merge or replace; a welcome-back message after restoring or after a few days away.
- **More to personalise** (v0.3.0): 20 themes, 13 logos, your name, interface roundness, analog or digital clock (12/24 h, your region and time zone).
- **Privacy**: no account, no analytics, no network use. Records are stored in a Windows-DPAPI-encrypted file (`records.vault`); if encryption is unavailable the app refuses to save.

## Not done yet (honest list)

SQLCipher storage, *encrypted* backup/restore (backups are readable files), Go worker integration, NSIS installer and code signing, Android and iOS apps. DPAPI does not protect against malware running as you. See `CHANGELOG.md` and `docs/`.

## Quick start

```sh
npm install
npm run check               # typecheck + lint + tests + version consistency
npm run build               # frontend -> dist/index.html
cd apps/desktop/src-tauri
cargo test --lib            # Rust tests (include real DPAPI tests)
cargo build --release       # -> target/release/menstruation-tracker.exe
```

Details, prerequisites and data locations: [BUILD-WINDOWS.md](BUILD-WINDOWS.md).

## Layout

| Path | Purpose |
|---|---|
| `apps/desktop/src` | React UI (features, components, stores, services) |
| `apps/desktop/src-tauri` | Rust / Tauri native layer (shell, storage, security, commands) |
| `apps/mobile` | Placeholder for the future Android/iOS apps |
| `packages/domain` | Portable cycle logic, estimates, analytics (the only place cycle rules live) |
| `packages/design-tokens` | Themes, colour maths, palette generation |
| `packages/*` | `shared-types`, `ui`, `config` (linked as `@mt/*`) |
| `services/go-worker` | Go JSON-lines worker scaffold (not used by the desktop app yet) |
| `docs/` | Architecture, privacy, design system, roadmap |
