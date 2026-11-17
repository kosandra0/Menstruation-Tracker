# Windows build guide (v0.3.0)

v0.2.0 and v0.3.0 ship the real **Tauri 2 + React + Rust** desktop application. The Go/Win32 preview from v0.1.x is retired
(its source is kept in `apps/windows-preview/` for history only).

## Prerequisites (verified on the development machine, Windows 10 22H2)

| Tool | Version used | Notes |
|---|---|---|
| Node.js / npm | 24.15.0 / 11.12.1 | `npm install` at the repository root |
| Rust (MSVC host) | 1.99.1 | `rustup` stable, target `x86_64-pc-windows-msvc` |
| Visual Studio Build Tools | 2022 (C++ workload + Windows SDK) | provides the MSVC linker |
| WebView2 Runtime | 157.0.4341.46 | already present on Windows 10/11 with Edge |

Go is only needed for `services/go-worker` (not used by the desktop app yet) and was not installed on the build machine.

## Build and run

```powershell
npm install
npm run check                 # typecheck + lint + vitest + version check
npm run build                 # frontend -> dist/index.html (single file)
cd apps/desktop/src-tauri
cargo test --lib              # Rust unit tests (includes real DPAPI tests)
cargo build --release         # -> target\release\menstruation-tracker.exe (embeds ../../../dist)
```

`custom-protocol` is a default Cargo feature, so a plain `cargo build` embeds `dist/` instead of loading the dev server.
Run `npm run build` again whenever the frontend changes, then rebuild (or touch `src-tauri/src/lib.rs`) so Cargo re-embeds it.

For development with hot reload use the Tauri CLI: `npx --prefix apps/desktop tauri dev --config apps/desktop/src-tauri/tauri.conf.json`.

## Data locations

- Records: `%APPDATA%\app.menstruationtracker.desktop\records.vault` (DPAPI-encrypted).
- Appearance preferences and the background image: the WebView2 profile under `%LOCALAPPDATA%\app.menstruationtracker.desktop\`.
- Start with Windows (optional, user-controlled): `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.

## Installer

`bundle.active` is still `false`: the NSIS installer was not built or verified in v0.2.0 or v0.3.0, and the executable is not code-signed.
Windows SmartScreen may warn about an unknown publisher.

## Automated UI checks (development only)

Debug builds honour the environment variable `MT_WEBVIEW_ARGS` (compiled out of release builds) so test tooling can pass the
same browser arguments to every webview, for example `--remote-debugging-port=9333`. The main window needs the same value via
`additionalBrowserArgs` (e.g. through the `TAURI_CONFIG` build-time override). Never ship a build made that way.
