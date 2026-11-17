# Menstruation Tracker

**Current version: 0.3.1 · Windows desktop · Tauri 2 + React + TypeScript + Rust**

A private, local-first menstrual health tracker. The Windows desktop application is the active product; Android and iOS are future work and have not started.

> This is a personal tracking and recording tool, not a medical device. Cycle estimates are uncertain and must never be used as contraception or as a diagnosis.

## What is included in v0.3.1

### Record
- Period starts and ends, with history editing and deletion.
- Daily logs for flow, mood, energy, pain, sleep, symptoms, water, exercise, medication, stress, temperature, weight, cervical fluid, and notes.
- Private journal, configurable reminders, and notification history.

### Understand
- Next-period estimate with a range, uncertainty note, and a basis drawn from up to the last six cycles.
- Cycle and period history, variability, symptom frequency, logging streaks, trends, and monthly summaries.
- Charts and comparisons for mood, energy, pain, sleep, symptoms, and other logged values.
- CSV export and data-quality indicators.

### Personalise
- Twenty themes, thirteen logos, custom colours with contrast checks, saved/imported/exported palettes, fonts, text sizing, and background-image themes.
- Customisable dashboard, interface and window roundness, title-bar button styles, mood bars, and reduced-motion support.
- Analog or digital clock with 12/24-hour display and time-zone options.

### Desktop experience
- Tauri 2 native Windows shell with a custom title bar, system tray, single-instance behaviour, and optional Start with Windows.
- Close/minimise to tray options and themed start-up/exit screens.
- In-app reminder popups, quiet hours, notification settings, and history.

## Privacy and data safety

The application is local-first: no account, cloud sync, advertising, analytics, telemetry, or automatic upload is required.

- On Windows, health records are stored in **records.vault** and protected with Windows DPAPI. If DPAPI protection is unavailable, the app refuses to save rather than silently falling back to plaintext.
- DPAPI is user-bound protection, not a defence against malware running as the same signed-in Windows user.
- Backup and export files (JSON, Markdown, text, and CSV) are readable and **not encrypted**. Keep them in a private location and do not commit them to Git.
- Appearance preferences and background-image data are stored separately in the WebView2 profile.
- The only documented outward action is an explicit user click that opens one of the fixed external links on the About screen.

The current vault is DPAPI-protected; it is **not SQLCipher**. Encrypted backup files, SQLCipher, and a full installer/signing pipeline are not shipped yet. See **docs/PRIVACY_SECURITY.md** before handling real records.

## Quick start

Use Node.js 24 and the committed npm lockfile:

    npm ci
    npm run check                 # typecheck, lint, tests, version consistency
    npm run build                 # frontend -> dist/index.html

On Windows, with Rust stable, the MSVC C++ build tools, Windows SDK, and WebView2 available:

    cd apps/desktop/src-tauri
    cargo test --lib
    cargo build --release

The Rust/Tauri build embeds the frontend from the repository-root **dist/** directory. Build the frontend before running Cargo commands. Full prerequisites, data locations, and development commands are in **BUILD-WINDOWS.md**.

## Repository map

| Path | Responsibility |
|---|---|
| **src/** | Tiny root Vite entry shims; the actual UI lives under apps/desktop/src/. |
| **apps/desktop/src/** | React application: routes, feature screens, components, stores, services, and styles. |
| **apps/desktop/src-tauri/** | Tauri configuration and Rust native layer: commands, vault storage, security, shell, and Windows platform code. |
| **apps/mobile/** | Android/iOS placeholder; no mobile application is implemented yet. |
| **apps/windows-preview/** | Retired Go/Win32 preview retained for historical reference, not the production app. |
| **packages/domain/** | Portable cycle rules, calculations, records, and analytics. Keep cycle logic here. |
| **packages/design-tokens/** | Themes, colour maths, palette generation, and design tokens. |
| **packages/shared-types/**, **packages/config/**, **packages/ui/** | Shared contracts and workspace configuration/UI package boundaries. |
| **services/go-worker/** | Optional Go JSON-lines worker scaffold; it is not integrated into the desktop app yet. |
| **database/** | Planned database design and migration notes; SQLCipher is not implemented. |
| **docs/** | Architecture, privacy, database, UI, development, and roadmap documentation. |

The root Vite configuration is intentional: **src/main.tsx** is a small shim that imports the real desktop entry point. Do not move or delete these shims without updating Vite and Tauri configuration.

## Documentation

- **docs/README.md**: documentation index.
- **docs/ARCHITECTURE.md**: architecture and dependency boundaries.
- **docs/PRIVACY_SECURITY.md**: implemented storage protection, limitations, and future work.
- **BUILD-WINDOWS.md**: Windows build guide.
- **CHANGELOG.md**: release history.
- **docs/DEVELOPMENT_ROADMAP.md**: planned work.
- **docs/DATABASE_DESIGN.md**: database design.
- **docs/GO_SERVICE_PROTOCOL.md**: Go worker protocol.
- **CONTRIBUTING.md**: contribution and verification rules.

## Current boundaries and planned work

- Android and iOS are not started.
- The Go worker is a scaffold and is not required by the desktop application.
- SQLCipher storage and encrypted backups are not implemented.
- The NSIS bundle is disabled and the Windows executable is not code-signed.

These boundaries are deliberately stated so the repository does not imply that planned security or platform work has already shipped.

## License

Apache License 2.0. See **LICENSE**.
