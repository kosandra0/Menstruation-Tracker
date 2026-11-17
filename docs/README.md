# Documentation index

This folder contains the design and engineering references for Menstruation Tracker. The root **README.md** is the quickest project overview; the **CHANGELOG.md** is the release-by-release feature record.

## Architecture and engineering

| Document | What it covers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Application layers, dependency direction, native boundaries, cycle-estimation rules, notifications, and backup architecture. |
| [FOUNDATION.md](FOUNDATION.md) | Current implementation status and the historical transition from the early Win32 preview to the Tauri application. |
| [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md) | Theme, colour, typography, animation, and interface conventions. |
| [GO_SERVICE_PROTOCOL.md](GO_SERVICE_PROTOCOL.md) | JSON-lines contract for the optional Go worker scaffold. |

## Data, privacy, and future work

| Document | What it covers |
|---|---|
| [PRIVACY_SECURITY.md](PRIVACY_SECURITY.md) | Implemented storage protection, privacy boundaries, known limitations, and planned security work. |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | Planned database layout and migration strategy; SQLCipher is not shipped. |
| [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | Product and engineering work still planned. |
| [MOBILE_ROADMAP.md](MOBILE_ROADMAP.md) | Future Android and iOS direction; neither app has started. |

## Build and contribution

- [Windows build guide](../BUILD-WINDOWS.md)
- [Contribution and verification checklist](../CONTRIBUTING.md)
- [Changelog](../CHANGELOG.md)

## Documentation precedence

For current shipped behaviour, prefer the versioned release metadata, changelog, root README, and the implementation itself. Roadmaps describe future work. The foundation document records historical context and must not override current release documentation.
