# Windows build guide (v0.3.1)

The current application is the **Tauri 2 + React + TypeScript + Rust** desktop application. The Go/Win32 preview from v0.1.x is retired; its source remains under **apps/windows-preview/** for historical reference only.

## Prerequisites

The following toolchain was used on the development machine (Windows 10 22H2):

| Tool | Version used | Notes |
|---|---|---|
| Node.js / npm | 24.15.0 / 11.12.1 | Run npm commands from the repository root. |
| Rust | 1.99.1 (stable, MSVC host) | Include target **x86_64-pc-windows-msvc**. |
| Visual Studio Build Tools | 2022, C++ workload + Windows SDK | Provides the MSVC linker and Windows build tools. |
| WebView2 Runtime | 157.0.4341.46 | Normally present on Windows 10/11 with Edge. |

Go is only needed for **services/go-worker/**; it is not used by the desktop app yet.

## Install and verify the frontend

Run from the repository root:

    npm ci
    npm run check
    npm run build

- **npm ci** installs the exact dependency tree described by **package-lock.json**.
- **npm run check** runs TypeScript checks, ESLint, Vitest, and version consistency validation.
- **npm run build** writes the single-file frontend bundle to **dist/index.html**.

## Build and test the native application

On Windows, after the frontend build has completed:

    cd apps/desktop/src-tauri
    cargo test --lib
    cargo build --release

The Tauri configuration points **frontendDist** at the repository-root **dist/** folder. The frontend bundle must exist before Cargo compiles the Tauri context; the Rust CI job performs the frontend build on its own runner for this reason.

The release executable is written to:

    apps/desktop/src-tauri/target/release/menstruation-tracker.exe

For development with hot reload, run this from the repository root:

    npx --prefix apps/desktop tauri dev --config apps/desktop/src-tauri/tauri.conf.json

## Data locations

- Records: **%APPDATA%/app.menstruationtracker.desktop/records.vault** (Windows DPAPI-protected).
- Appearance preferences and background image: the WebView2 profile under **%LOCALAPPDATA%/app.menstruationtracker.desktop/**.
- Start with Windows (optional and user-controlled): **HKCU/Software/Microsoft/Windows/CurrentVersion/Run**.

## Installer and signing status

**bundle.active** remains **false**. The NSIS installer has not been built and verified as part of this release, and the Windows executable is not code-signed. Windows SmartScreen may therefore display an unknown-publisher warning.

## Automated UI checks (development only)

Debug builds honour **MT_WEBVIEW_ARGS** so local test tooling can pass browser arguments to the webview. This is compiled out of release builds. Never ship a binary built with debugging arguments enabled.
