//! Native layer of Menstruation Tracker (Tauri 2).
//!
//! Module map (see docs/ARCHITECTURE.md):
//! - `commands`: the only IPC surface exposed to the frontend
//! - `shell`: tray, themed tray-menu window, close/minimize-to-tray, cooperative exit, logo switching
//! - `storage`: DPAPI-encrypted record vault (SQLCipher is future work)
//! - `security`: key/data-protection traits (Windows DPAPI implemented; Keystore/Keychain future)
//! - `platform`: OS-specific adapters isolated from the rest of the crate
//! - `state`, `error`: shared app state and typed errors

pub mod commands;
pub mod error;
pub mod platform;
pub mod security;
pub mod services;
pub mod shell;
pub mod state;
pub mod storage;

use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

use state::AppState;

pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch focuses the running instance instead of creating a duplicate tray icon.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| shell::show_main(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(AppState::new())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            // Debug builds only: automated tests point the vault at a throw-away folder so they can never touch real data.
            #[cfg(debug_assertions)]
            let dir = std::env::var_os("MT_DATA_DIR").map(std::path::PathBuf::from).unwrap_or(dir);
            let vault = storage::Vault::new(dir, security::default_protector());
            let _ = app.state::<AppState>().vault.set(vault);
            shell::setup(app.handle())?;
            Ok(())
        })
        .on_window_event(shell::on_window_event)
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::storage_status,
            commands::records_load,
            commands::records_save,
            commands::records_delete_all,
            commands::set_window_behavior,
            commands::set_app_logo,
            commands::request_exit,
            commands::quit_app,
            commands::hide_to_tray,
            commands::tray_action,
            commands::toast_show,
            commands::toast_layout,
            commands::toast_hide,
            commands::toast_take_pending,
            commands::toast_open,
            commands::open_external
        ])
        .run(tauri::generate_context!())
        .expect("error while running Menstruation Tracker");
}
