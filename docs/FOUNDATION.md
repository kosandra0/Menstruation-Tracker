# Foundation status (v0.1.1)

> **v0.2.0 update:** the "Not implemented" list below is partly outdated. As of v0.2.0 the Tauri application is built and run on Windows; real tracking, estimates, reminders, a DPAPI-encrypted record vault, tray, themes and customisation exist. Still not implemented: SQLCipher, encrypted backup, Go worker integration, installer/signing, mobile apps. See CHANGELOG.md for the authoritative state.

## Built in this release
- Standalone Windows x64 GUI preview: `Menstruation Tracker.exe`, compiled as a PE32+ Windows GUI executable using Go 1.23.2, with no third-party Go dependencies.
- Native Win32/GDI shell with custom title bar, seven navigation sections, six theme palettes, light/dark switching, and illustrative placeholder screens.
- Windows build script: `scripts/build-windows-preview.ps1`.
- Updated version metadata and changelog to v0.1.1.

## Important artifact boundary
The supplied React + TypeScript + Tauri 2 + Rust project remains the intended production desktop application. The included EXE is a separate native Windows foundation preview so a real Windows GUI executable can be delivered from this Linux build environment. It does not embed or run the React/Tauri frontend and is not a Tauri/MSI/NSIS production installer.

The EXE was cross-compiled here and verified as a PE32+ x86-64 Windows GUI binary. It was not launched on a Windows host in this environment.

## Production stack still requiring a Windows build
- React + TypeScript + Vite frontend under `apps/desktop/`.
- Tauri 2 and Rust native shell under `apps/desktop/src-tauri/`.
- Windows packaging requires Rust stable with the MSVC target, Microsoft C++ Build Tools / Windows SDK, WebView2 support, Node dependencies, Tauri CLI and generated app icons.
- The Tauri bundler remains disabled until those prerequisites are available and its configuration is verified on Windows.

## Not implemented in either preview shell
Encrypted health-data database, real period logging, persistent daily logs, medical algorithms, cycle prediction, scheduled notifications, cloud backup, partner sharing and mobile apps. These must be developed in controlled phases and verified before release.

## Verification limitations for this build
The container is Linux and has no Rust toolchain or Windows MSVC linker. The npm package registry was unreachable during dependency installation, so the React frontend build and frontend tests could not be rerun here. The Go Windows preview cross-compilation and Go worker tests are checked separately in the release verification report.
