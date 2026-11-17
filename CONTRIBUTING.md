# Contributing

This repository is a Windows-first Tauri desktop application with a React/TypeScript frontend, a Rust native layer, portable TypeScript packages, and an optional Go worker scaffold.

## Development setup

Use Node.js 24 and npm. The committed **package-lock.json** is the reproducible dependency source; do not switch package managers or regenerate the lockfile with pnpm.

    npm ci
    npm run check
    npm run build

For native Windows work, install Rust stable with the MSVC target, Visual Studio Build Tools with the C++ workload and Windows SDK, and the WebView2 Runtime. See **BUILD-WINDOWS.md**.

## Architecture rules

- Keep cycle calculations and prediction rules in **packages/domain**. Do not duplicate cycle logic in React, Rust, or Go.
- Keep UI code in **apps/desktop/src**; the root **src/App.tsx** and **src/main.tsx** are intentional Vite entry shims.
- Keep native filesystem, vault, security, window, and platform operations behind the Rust/Tauri layer and its typed commands.
- Shared contracts belong in **packages/shared-types**.
- The Go worker is optional and must not become a requirement for essential tracker functionality.
- Treat estimates as uncertain. Never present them as medical diagnoses or contraception guidance.

## Version changes

When changing the application version, update every version source together:

1. Root **package.json**.
2. **apps/desktop/package.json**.
3. **apps/desktop/src-tauri/tauri.conf.json**.
4. **apps/desktop/src-tauri/Cargo.toml**.
5. **packages/config/src/index.ts**.
6. **services/go-worker/internal/health/health.go**.
7. The top version heading in **CHANGELOG.md**.

Then run:

    npm run check:version

The normal **npm run check** command already includes this check.

## Verification

Before submitting a change, run the checks relevant to the files touched:

    npm run check
    npm run build
    npm run test:go              # only when Go code or its contract changes

On Windows, also run:

    cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
    cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --release

The Rust build expects the frontend bundle in the repository-root **dist/** directory. Run **npm run build** first.

Use synthetic data only. Never commit real health records, **records.vault**, backups, exports, local app data, or screenshots containing personal health information. Backup/export files are readable and unencrypted.

## Pull requests

Describe the affected feature, the tests/build checks you ran, any Windows-only checks you could not run, and any data migration or privacy implications. Do not claim a build passed unless it was actually run.
