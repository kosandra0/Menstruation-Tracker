# Windows preview executable

This folder contains a dependency-free Go/Win32 desktop preview used to provide a real Windows GUI executable from environments that cannot run the Tauri Windows toolchain.

- Target: Windows x64
- Entry point: `main_windows.go`
- UI: native Win32 + GDI drawing, no bundled browser runtime
- User data: none is collected, saved, or transmitted
- Content: illustrative placeholder screens only

This preview is **not** the production React + Tauri application. The production frontend and Tauri/Rust source remain under `apps/desktop/`. Build the production Tauri installer on a Windows machine with Rust/MSVC, WebView2 and the Tauri CLI, after generating the required application icons.

Build on Windows from this directory:

```powershell
go build -trimpath -ldflags="-s -w -H=windowsgui" -o "Menstruation Tracker.exe" .
```


## Icon assets

Three concept icon pairs are supplied in the repository-level `icons/` folder. Select one before a future branded release and wire it into the Windows resource build.
