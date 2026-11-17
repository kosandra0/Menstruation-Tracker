# Privacy & Security

**Current status: no health data is collected, stored or transmitted. Encryption is NOT implemented.** This document is the design the implementation must meet.

## Principles
Local-first; no mandatory account; no ads, analytics, telemetry or automatic uploads; no third-party fonts/CDNs (system fonts only); no partner sharing without explicit, revocable owner consent.

## Implemented today
- Only UI preferences (theme, mode, motion, sidebar) are persisted, in localStorage.
- Restricted Tauri capabilities (`capabilities/default.json`): window controls + notifications only; no fs/shell/http permissions.
- Restrictive CSP in `tauri.conf.json` (untested). `KeyProtector` fails closed — there is no plaintext fallback.

## Planned: encrypted storage
SQLite + **SQLCipher** (validated library; no home-grown crypto). A random 256-bit database key is generated on first run and wrapped by an OS facility: Windows **DPAPI**, Android **Keystore**, iOS **Keychain**. Optional app-lock passphrase (KDF: Argon2id) is a later layer. If encryption is unavailable the app must refuse to store health data rather than fall back to plaintext.

## Logging
Never log health data, request payloads, database contents or keys. Log codes and component names only. Notification text must be neutral on lock screens.

## Data lifecycle
- **Export:** user-initiated, to a user-chosen path, via the Go worker; clearly warned that exports are unencrypted unless the user opts in to an encrypted archive.
- **Delete:** one action wipes the database file, wrapped key and preferences; documented as irreversible.
- **Backup:** encrypted database file only; user-controlled destination.

## Threats to consider (future work)
Lost/stolen device (key wrapping, optional lock) · malware under the same OS user (DPAPI limits) · shoulder-surfing/notifications (neutral text, hide-on-blur option) · compelled disclosure (local-only data, fast delete) · supply chain (pin and audit dependencies, `cargo audit`, `npm audit`) · webview injection (CSP, no remote content, minimal IPC).

## v0.2.0 status
- **Implemented:** records are stored in `records.vault` (app data dir), encrypted with Windows **DPAPI** (user-bound, app-scoped entropy, `CRYPTPROTECT_UI_FORBIDDEN`), written atomically (temp file + rename), size-limited (32 MiB) and JSON-validated before replacing existing data. If DPAPI is unavailable the vault refuses to read or write (no plaintext fallback). The frontend only sees the decrypted JSON through typed commands. Health records are never written to localStorage.
- **Not SQLCipher.** DPAPI protects against other Windows users and offline disk access without the user's credentials; it does not protect against malware or a person signed in as the user. SQLCipher with an optional Argon2id app lock remains planned.
- **Network:** CSP `connect-src` is limited to the app itself and Tauri IPC; the app makes no network requests. No analytics, advertising or telemetry.
- **Capabilities:** main window: core defaults, minimise/maximise/close/drag, notifications, autostart enable/disable/status. Tray window: core defaults + hide. No fs, shell or http permissions.
- **Notifications:** discreet wording by default; reminders in quiet hours are skipped.
- **Exports:** JSON/CSV exports are unencrypted by design and the UI warns before creating them.
- **Deletion:** Settings > Your data > Delete all records removes the vault file (confirmed by typing DELETE). Appearance preferences and the background image are separate and have their own reset/remove controls.
- **Logging:** only error codes/component names; no record content.
- **Known gap:** an in-flight save can be lost if the process is killed by the OS mid-write; the previous vault stays intact thanks to the atomic rename.


## v0.3.0 additions (2026-11-16)
- Backup files (`.json`, `.md`, `.txt`) are readable and **not encrypted**; the export dialog says so. They contain the same data as the vault plus (optionally) the name and settings.
- Notification history in `localStorage` stores only the kind of notification and its time (plus a reminder id); popups are shown from memory and never written to disk. "Discreet wording" replaces popup text with a generic line.
- The only outward action is `open_external`, which opens one of two fixed links in the user's browser after a click on the About screen.
- The developer's phone number and social handles shown in About are public contact details supplied by the owner; they are static text in the app.
