# Privacy & Security

Menstruation Tracker is designed as a local-first personal health-record application. This document separates implemented protections from planned work and explains the limits of the current Windows storage model.

> The application is not a medical device. Its estimates are not diagnoses and must never be used as contraception.

## Implemented today

### Health records

- On Windows, records are stored in **records.vault** under the Tauri application data directory.
- The Rust native layer protects the vault using Windows Data Protection API (DPAPI), with app-scoped entropy and user-bound protection.
- Writes use a temporary file followed by an atomic rename, and the stored payload is size-limited and JSON-validated before replacing the existing vault.
- If DPAPI protection is unavailable, the application refuses to read or write the vault. There is no plaintext fallback.
- Health records are not stored in frontend localStorage. The frontend accesses them through typed native commands.

### Preferences and notifications

- Appearance preferences and the optional background image are stored separately in the WebView2 profile.
- Notification history persists only notification kind/time metadata and, for reminders, a reminder identifier. It does not persist journal notes or daily-log text.
- Discreet notification wording is available to reduce sensitive text in popups.

### Network and permissions

- No account, cloud sync, advertising, analytics, telemetry, or automatic record upload is part of the application.
- The app's Content Security Policy restricts content and connection sources to the local app and Tauri IPC.
- Tauri capabilities are deliberately limited. Filesystem, shell, and HTTP permissions are not broadly granted to the frontend.
- The documented outward action is **open_external**, which accepts a small allow-list of fixed HTTPS destinations and is invoked by an explicit user action in About.

## Important limitations

- **DPAPI is not SQLCipher.** It protects data using the signed-in Windows user's OS credentials. It does not protect an unlocked session from malware running as that same user, nor from someone with access to the unlocked account.
- **Backups and exports are readable, not encrypted.** JSON, Markdown, text, and CSV exports can contain the same sensitive records as the vault. Keep them in a private location, transfer them carefully, and do not commit them to Git.
- The background image and appearance preferences are separate from the health-record vault and have their own storage and removal controls.
- Deleting all records removes the vault after confirmation. Appearance preferences and the background image are separate and are not automatically removed by that action.
- An operating-system termination during a save can interrupt the in-flight operation; atomic replacement preserves the previous vault file if the new write does not complete.

## Data locations

- Records: **%APPDATA%/app.menstruationtracker.desktop/records.vault**
- Appearance preferences and background image: the WebView2 profile under **%LOCALAPPDATA%/app.menstruationtracker.desktop/**
- Start with Windows (when enabled by the user): **HKCU/Software/Microsoft/Windows/CurrentVersion/Run**

## Planned work, not yet shipped

- SQLite encrypted with SQLCipher, with the encryption key protected by the platform's native key store.
- Encrypted backup and restore.
- Optional app-lock passphrase and additional protection for unlocked sessions.
- Android Keystore and iOS Keychain integrations when mobile applications are developed.
- Further supply-chain checks and a verified Windows installer/signing pipeline.

The planned design is documented in **DATABASE_DESIGN.md** and the **development roadmap**. Do not describe these items as current protections until they are implemented and tested.

## Repository handling

Use synthetic records in development and tests. Never commit **records.vault**, actual backup/export files, personal health screenshots, local app data, credentials, or machine-specific secrets. The repository ignore rules are a safety net, not a substitute for checking staged files before every commit.
