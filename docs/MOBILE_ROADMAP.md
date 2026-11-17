# Mobile roadmap (not started)

Tauri 2 supports Android and iOS, so the React UI, `packages/domain` and most Rust code can be reused.
1. Make the UI responsive: bottom navigation replaces the sidebar; hide `TitleBar` on mobile (`isNative` + platform check).
2. Add `platform/android` and `platform/ios` adapters implementing `KeyProtector` with Keystore / Keychain.
3. Build SQLCipher for mobile targets via the Rust storage layer.
4. Replace the Go worker on mobile: essentials (storage, calculations) must not depend on Go. Export/backup either run in Rust or via a gomobile library if justified.
5. Mobile-specific capabilities, notification permission flows, app-lock with biometrics, store-compliance review (health-data policies).
Prerequisites: stable storage + domain APIs from desktop phases 1–4.
