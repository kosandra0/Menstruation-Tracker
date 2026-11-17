# Foundation and implementation status

This document began as a record of the early v0.1.1 Windows preview. The application has since been rebuilt. The old v0.1.1 descriptions below are historical context, not a description of the current product.

## Current project baseline

The tracked application version is **0.3.1**. Version consistency is checked by **npm run check:version**.

The active product is a Windows desktop application built with:

- React and TypeScript for the interface.
- Vite for the frontend build, producing a single-file bundle in the repository-root **dist/** directory.
- Tauri 2 and Rust for the desktop shell, native commands, Windows integration, and protected record storage.
- Portable TypeScript packages for cycle calculations, shared types, configuration, and design tokens.

The root **src/main.tsx** and **src/App.tsx** files are intentionally thin Vite entry shims. The real application code lives under **apps/desktop/src/**.

## Implemented

- Period history, daily logs, journal, reminders, and notification history.
- Cycle estimates with a range, basis, and uncertainty note.
- Insights, charts, trends, and CSV export.
- Theme, palette, logo, font, clock, title-bar, and dashboard customisation.
- Tauri system tray, single-instance behaviour, window lifecycle, and optional Start with Windows.
- Windows DPAPI-protected record vault with no plaintext fallback.
- User-initiated backup and restore in readable, unencrypted formats.

See **CHANGELOG.md** for the complete release history and **ARCHITECTURE.md** for the code boundaries.

## Not shipped yet

- SQLCipher-backed database storage.
- Encrypted backup archives.
- Android and iOS applications.
- Go worker integration into normal desktop operation.
- Verified NSIS installer and code signing.

The Go worker under **services/go-worker/** is a separate scaffold. The older Go/Win32 UI preview under **apps/windows-preview/** is retained for historical reference and is not the production application.

## Historical v0.1.1 preview

The first Windows deliverable was a dependency-free Go/Win32 preview shell. It provided a native window and illustrative placeholder screens, but it was not the React/Tauri production application and did not implement persistent menstrual records or cycle calculations.

The production desktop architecture was introduced in v0.2.0. Later versions added notification popups, backup/restore, additional analytics, personalisation, and notification history. The current state is described by the release changelog, not by the early preview notes.

## Useful references

- [Project overview](../README.md)
- [Windows build guide](../BUILD-WINDOWS.md)
- [Privacy & Security](PRIVACY_SECURITY.md)
- [Architecture](ARCHITECTURE.md)
- [Development roadmap](DEVELOPMENT_ROADMAP.md)
