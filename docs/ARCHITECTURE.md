# Architecture

## Layers
1. **Presentation** — React screens/components (`apps/desktop/src/features`, `components`).
2. **Application** — Zustand stores, router, typed services (`stores`, `services`, `app`).
3. **Domain** — `packages/domain`: portable, deterministic TypeScript. No React/Tauri/OS imports. **The only place cycle rules live**; Rust and Go must not re-implement them.
4. **Infrastructure** — `services/*` adapters calling native commands via `invokeNative`.
5. **Native** — Rust/Tauri (`src-tauri`): IPC commands, storage, security, platform adapters.
6. **Auxiliary** — Go worker for background jobs (optional on desktop, never required for mobile essentials).

```
React UI → stores/services → invokeNative → Tauri command → storage / security / platform
                                                    └→ (future) spawn Go worker → JSON lines stdin/stdout
```

## Boundaries and rules
- The frontend never touches the database or filesystem directly; only Tauri commands returning `AppResult<T>`.
- Dependency direction: features → components/services/stores → packages. Packages never import apps.
- Contracts live in `packages/shared-types` (Rust and Go mirror them by hand; consider codegen later).
- Errors: Rust `AppError` ⇄ TS `AppError` (`{code, message}`); messages never contain health data. React `ErrorBoundary` + route `errorElement`.
- Platform code sits behind `platform/windows` and `platform/shared`; add `android`/`ios` adapters later.
- Go: spawned on demand, JSON lines only, no listener, no direct frontend access.

## Medical and data-integrity principles (binding for future work)
Predictions use only recorded data; are expressed as `Estimate<T>` (value, range, basis, uncertainty note); are correctable via history edits; are never shown as certain or as contraception; the app is not a diagnostic device.

## Workspace mechanics
Vite root is the repository root. `@mt/*` packages are `file:` dependencies (symlinks) with `main: src/index.ts`, so no build step is needed. Tailwind scans `apps/` and `packages/` automatically.

## v0.2.0 additions

### Window behaviour (src-tauri/src/shell)
- Tray icon and a **themed tray-menu window**: a small frameless transparent webview that loads the same React bundle with `?window=tray`, shares the appearance store (same origin, `storage` event sync), and therefore always matches the user's theme, colours, font and logo. Capability `tray-menu` allows only core events and `window:hide`.
- **Cooperative exit**: every exit path (title-bar close with close-to-tray off, tray Exit, ...) calls `begin_exit`. Rust shows the main window if hidden, emits `mt://exit`, and starts a one-shot 4 s watchdog. The UI plays the exit screen, flushes unsaved records and calls `quit_app`. If the UI does not answer, the watchdog exits anyway, so a stuck webview can never keep the process alive. The tray icon is removed before exit (no ghost icon).
- Close-to-tray / minimise-to-tray flags are pushed from UI preferences with `set_window_behavior`; no polling, no background threads other than the watchdog.
- `tauri-plugin-single-instance` makes a second launch focus the running instance.
- Logo switching: `set_app_logo` swaps the window/taskbar and tray icons at runtime (PNG bytes embedded at build time).

### Appearance engine
`stores/appearance.ts` (persisted, versioned, every field re-validated on hydration and import) -> `lib/palette.ts` (theme -> user overrides -> optional mood accent) -> `ThemeProvider` (CSS variables on `<html>`, typography variables, motion attribute). `packages/design-tokens` contains the pure colour maths (`color.ts`), the palette generator and override/audit logic (`generate.ts`) and the built-in themes. A tiny colour-only snapshot (`mt.boot.v1`) is read by an inline script in `index.html` so launches never flash the wrong theme.

### Settings architecture
`features/settings/SettingsPage.tsx` is a registry of sections (`SETTINGS_SECTIONS`: id, title, keywords, component). Search filters the registry; `#section` hashes deep-link. Visual changes apply live and are persisted immediately; destructive or bulk actions (delete records, reset, import) use confirmation dialogs.

### Image-based theming
`lib/imagePalette.ts`: `createImageBitmap` shrinks the image off-thread, a Blob-URL Web Worker runs deterministic k-means (k=6) ignoring transparent pixels, `candidatesFromSwatches` ranks colours by population x colourfulness and discards near-white/near-black unless nothing else exists. Candidates become ordinary custom palettes through `generatePalette`, so the contrast policy is identical to every other palette. Applying never overwrites the previous theme; analysis reruns only when the image changes.

### Estimation method
`@mt/domain` `estimateNextPeriodStart`: median of the last 6 cycle lengths; half-width of the range = max(2, ceil(1.5 x sample sd)) days, at least 3 days with fewer than 3 cycles; null with fewer than 2 recorded starts. Always paired with `uncertaintyNote` and `ESTIMATE_DISCLAIMER`. Limits: assumes a stable pattern, ignores medication/pregnancy/illness, cannot detect ovulation, must not be used as contraception.

### Animation conventions
Durations/easing live in `lib/motion.ts` and the CSS tokens (`--dur-*`, `--ease-out`). Everything animates once and rests: no endless loops (the only repeating CSS animation is the skeleton shimmer, shown only while loading). Reduced motion: OS preference or the in-app override, enforced by `MotionConfig` and a CSS rule.

### Go worker
Unchanged and not used by the desktop app in v0.2.0 (the protocol in GO_SERVICE_PROTOCOL.md still applies). It stays optional and must never be required for mobile essentials.


## v0.3.0 additions (2026-11-16)

### Notification popups
- Not Windows toasts. `shell::setup` creates a hidden, transparent, frameless, always-on-top, non-focusable webview window (`toast`) that loads `index.html?window=toast` and renders `ToastWindow` with the same appearance store as the main window (so it shares theme, fonts and logo through `localStorage` and the `storage` event).
- The main window decides *what* to show (`features/notifications/notify.ts`): it builds a JSON payload (text, route, and a copy of the popup look) and calls `toast_show`. Rust validates size (8 KiB) and the corner name, queues the payload if the page is not ready yet, positions the window in the primary monitor's work area and shows it without taking focus. The page sizes the window to its content (`toast_layout`), hides it when empty (`toast_hide`) and opens in-app routes on click (`toast_open`, route characters validated in Rust).
- Scheduling: `useNotificationEngine` (reminders + prompts) uses one re-armed timer (capped at 15 min). Prompt rules are pure functions in `features/notifications/nudges.ts` with unit tests. Prompts are consumed (not shown late) inside quiet hours or more than 3 h after their time.
- Privacy: history stores only category, time and (for reminders) the reminder id; the label is read from the encrypted records at display time.
- The Windows notification plugin was removed (Cargo dependency, capability, JS usage).

### Backup / restore
- `lib/backup.ts`: `.json` is the data; `.md` and `.txt` contain a readable report plus the same JSON on one marked line (whole-line markers, last match wins). Import validates with `parseRecords` / `sanitizeAppearance`, checks stored counts, supports merge (periods by start date, logs by date, journal/reminders by id, newer `updatedAt` wins) and replace. Files are not encrypted; the background image is not included.

### External links
- `open_external` accepts only two exact `https://` URLs (Instagram, Telegram) and starts `explorer.exe <url>` (no shell). The app otherwise makes no network connections.
