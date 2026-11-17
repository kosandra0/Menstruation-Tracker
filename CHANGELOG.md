# Changelog

All notable changes are documented here. The project follows [Semantic Versioning](https://semver.org/).
Every future change must update this file and keep version metadata consistent (`npm run check:version`).

## [0.3.1] - Notification history, popup fade-out, window corners and the None flow level

### Added
- Notification history page (`/notifications`): every reminder and prompt shown, grouped by day; entries not yet opened stay marked. Reachable from the bell panel ("Full history") and Settings > Notifications ("Open history"). History keeps up to 400 entries.
- Popups fade out over about 0.6 s after their time. A popup under the mouse pauses its countdown, but never lasts longer than twice its duration; leaving it gives at least 2 s more.
- "Window corners" slider (0-24 px, default 16) in Settings > Personalisation > Interface roundness: rounds the app window itself. Maximised windows are square.
- Flow "None" in the Daily Log and Calendar: records a day with no bleeding. It is not counted as a flow day.

### Fixed
- The popup countdown bar did not move (its CSS class was missing).
- `cleanLog` now drops unknown flow values on import (they used to be counted as an undefined flow bucket).
- Black outline around the app window: the Windows shadow of the transparent frame is turned off (`shadow: false`).

### Changed
- Version 0.3.1 across all version files (`npm run check:version` 7/7).

## [0.3.0] - Notifications, backups, clock and more ways to personalise

### Added
- Notification system: reminders and "remember to record" prompts (daily log, period expected soon, estimated start passed, record the end of a period) shown as popups drawn by the app in a transparent, never-focused window (`?window=toast`), in the user's theme, anchored to a screen corner. Not Windows toasts. The Windows notification plugin was removed.
- Notification centre (bell in the title bar): history (kind + time only, never notes), unread count, mark all read, clear.
- Notification settings: per-category switches and times, preview buttons, popup look (5 styles, 4 corners, 3 sizes, own theme or the app's, radius 0-24, duration or sticky, animation, logo, countdown bar, stack size), discreet wording and quiet hours.
- Complete backup and restore as `.json`, `.md` or `.txt` (records, name, settings); merge or replace; counts check; welcome-back message after restoring and after 2+ days away.
- Ten more logos (MT04-MT13) in Personalisation (bundled at 256 px), also used for the tray icon.
- Ten more themes (Dusk Lagoon, Mulberry Mist, Clay Rose, Fog Harbor, Copper Dusk, Fig & Honey, Olive Ember, Storm Blossom, Mauve Dune, Pine Slate).
- User name (greeting), interface roundness slider (0-24 px), bar corner radius 0-24 px and bar height up to 28 px.
- Clock (analog/digital, 12/24-hour/region default, time zone, dashboard/title bar placement).
- Daily Log: stress, temperature, weight, cervical fluid, intimacy note.
- Analytics: recording coverage heat map, what you record most, stress/temperature/weight charts, relations between logged values (Pearson, at least 10 shared days), symptom pairs, 30-day comparison, temperature by cycle day.
- About: developer credit, photo, contact options with brand marks; Rust `open_external` command with an exact-URL allow-list.

### Changed
- Bar corner radius now applies to every bar style except Pill; Bar style explains itself and previews.
- Settings rows wrap on narrow windows.

### Fixed
- Bar corner radius had no effect for the Minimal line style.

### Not finished
- Popups appear on the primary monitor only; Windows Focus assist does not silence them.
- Backups are unencrypted readable files; the background image is not backed up.
- SQLCipher, installer/signing, Android app.

## [0.2.0] - Complete desktop rebuild

### Added
- Working tracker: periods, daily logs (flow, mood, energy, pain, sleep, symptoms, hydration, exercise, medication, notes), journal and reminders, stored in a DPAPI-encrypted vault (`records.vault`) in the app data folder. No plaintext fallback: if encryption is unavailable the app refuses to save.
- Deterministic cycle estimates (`@mt/domain`): median of the last six cycles with a spread-based range and an uncertainty note; never shown as a guarantee.
- Insights: cycle and period history, variability, symptom frequency, mood/energy/pain/sleep charts, monthly summaries, data-quality indicator, CSV export.
- Appearance engine: ten themes (light/dark/system), colour overrides with WCAG contrast checks, custom palettes (create, rename, duplicate, import, export), typography settings with installed-font detection, background image with adjustments, palette generation from an image (k-means in a Web Worker), reduced-motion and intensity controls, appearance import/export.
- Logo choice (Bloom Petal, Lunar Cycle, Heartleaf) applied to the UI, start-up and exit screens, window/taskbar icon and tray icon.
- Start-up screen and exit screen using the chosen logo and theme (also when exiting from the tray).
- System tray with a themed right-click menu window, close-to-tray, minimise-to-tray, Exit that fully terminates, optional Start with Windows, single-instance behaviour.
- Six title-bar button styles (Windows, traffic lights, capsule, rings, dots, text).
- More insights: logging consistency/streaks, cycle-length trend, averages by day of cycle, symptoms across the cycle, mood by weekday, sleep-and-mood comparison.
- Dedicated Update log section; "Android app coming soon" pinned in the sidebar and About.
- Customisable dashboard cards, optional mood-adaptive accent, configurable mood bars, first-launch welcome, in-app Update Log.
- Tests: Rust vault/DPAPI tests, colour/contrast tests, cycle-estimation tests, reminder-scheduling tests, store and UI tests.

### Changed
- Rebuilt the application shell, sidebar, title bar, dashboard, calendar, daily log, journal, reminders and Settings.
- Removed all demo content and the old UI-preferences store (replaced by the appearance store; legacy settings are migrated once).
- Version metadata is 0.2.0 everywhere.

### Fixed
- The previous Win32 preview executable is retired. Its resize handler (SetWindowPos inside WM_SIZE, also while minimised) is the suspected cause of the reported freeze, but the freeze could not be reproduced here, so this is a hypothesis, not a confirmed root cause.

### Not finished
- SQLCipher storage, encrypted backup/restore, Go worker integration, installer and code signing, mobile apps.

## [0.1.2] - Icon concepts and release verification

### Added
- Three original app icon concepts in `icons/`, each supplied as a 512×512 PNG and multi-resolution Windows ICO.
- Icon catalogue documentation describing the concepts and their current status.
- Expanded release verification notes distinguishing checks that passed from Windows runtime checks unavailable in this environment.

### Changed
- Incremented all tracked project version metadata consistently to 0.1.2.

### Notes
- The three icon concepts are included as selectable assets; the current executable has not been rebuilt with a selected icon.
- The Windows executable is statically verified as a PE32+ x86-64 GUI binary, but cannot be launched in this Linux environment.

## [0.1.1] - Windows foundation preview

### Added
- Dedicated standalone Windows x64 GUI executable (`Menstruation Tracker.exe`) built from a dependency-free Go/Win32 preview shell.
- Interactive seven-section navigation and six theme palettes with light/dark appearance in the preview.
- Windows PowerShell build script and Windows build guide.
- Release notes clearly distinguishing the native preview executable from the production React + Tauri application.

### Changed
- Incremented project version metadata to 0.1.1 across the application, native configuration, packages and Go worker.
- Set the Go worker module language baseline to Go 1.23 so its scaffold can be tested with the available compiler.

### Notes
- The preview contains illustrative data only and does not persist health records.
- A production Tauri Windows installer was not built in this Linux environment because the Rust/MSVC Windows toolchain and package registry access were unavailable. The Tauri source remains included for a later Windows build.

## [0.1.0] - Foundation

### Added
- Initial monorepo architecture: `apps/`, `packages/`, `services/`, `database/`, `docs/`.
- Technology stack: React 19.2, TypeScript (strict), Vite 7, Tailwind CSS 4, Motion, Radix UI, Lucide, Zustand, React Router 7, date-fns; Tauri 2 + Rust; Go worker; Vitest + Testing Library; ESLint.
- Application shell: custom Windows-style title bar (minimize / maximize / close, drag region), animated collapsible sidebar.
- Navigation structure and seven screens: Dashboard, Cycle Calendar, Daily Log, Insights, Health Journal, Reminders, Settings. Sample content is labelled as illustrative demo data.
- Theme system: six themes (Lavender Dream, Rosewater, Sage Garden, Ocean Mist, Warm Sand, Midnight), each with light and dark, plus system mode; persisted preferences; animated transitions; reduced-motion support.
- Initial design system (tokens in `packages/design-tokens`, Tailwind mapping, UI primitives).
- Go worker scaffold with JSON-lines protocol and `health.ping` / `worker.version`.
- Rust/Tauri foundation: typed errors, command surface, storage and key-protection trait boundaries (fail-closed), restricted capabilities.
- `packages/domain` with date helpers and prediction interfaces (no prediction logic).
- Technical documentation (`docs/`), version consistency script, CI workflow draft.

### Not included (planned)
Encrypted database, real tracking, predictions, reminders scheduling, mobile apps. See `docs/FOUNDATION.md`.
