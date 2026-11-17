//! IPC surface. Every command returns `AppResult<T>`; keep commands thin and delegate to services.
//! Arguments are validated here (the webview is an untrusted boundary). Errors never contain health data.

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::error::{AppError, AppResult};
use crate::platform;
use crate::shell;
use crate::state::AppState;
use crate::storage::{StorageState, StorageStatus, Vault};

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub platform: &'static str,
}

pub fn build_app_info() -> AppInfo {
    AppInfo {
        name: "Menstruation Tracker",
        version: env!("CARGO_PKG_VERSION"),
        platform: platform::name(),
    }
}

fn vault<'a>(state: &'a State<'_, AppState>) -> AppResult<&'a Vault> {
    state.vault.get().ok_or(AppError::StorageUnavailable)
}

#[tauri::command]
pub fn app_info() -> AppResult<AppInfo> {
    Ok(build_app_info())
}

#[tauri::command]
pub fn storage_status(state: State<'_, AppState>) -> AppResult<StorageStatus> {
    Ok(match state.vault.get() {
        Some(v) => v.status(),
        None => StorageStatus { state: StorageState::Locked, encrypted: false, schema_version: None },
    })
}

/// Returns the decrypted records JSON, or `null` if nothing has been saved yet.
#[tauri::command]
pub fn records_load(state: State<'_, AppState>) -> AppResult<Option<String>> {
    vault(&state)?.load()
}

#[tauri::command]
pub fn records_save(state: State<'_, AppState>, json: String) -> AppResult<()> {
    vault(&state)?.save(&json)
}

/// Irreversibly deletes all stored records. The UI must confirm with the user first.
#[tauri::command]
pub fn records_delete_all(state: State<'_, AppState>) -> AppResult<bool> {
    vault(&state)?.delete()
}

#[tauri::command]
pub fn set_window_behavior(state: State<'_, AppState>, close_to_tray: bool, minimize_to_tray: bool) -> AppResult<()> {
    let mut b = state.behavior.lock().map_err(|_| AppError::Internal)?;
    b.close_to_tray = close_to_tray;
    b.minimize_to_tray = minimize_to_tray;
    Ok(())
}

#[tauri::command]
pub fn set_app_logo(app: AppHandle, id: String) -> AppResult<()> {
    if !shell::is_known_logo(&id) {
        return Err(AppError::InvalidArgument);
    }
    if shell::set_logo(&app, &id) {
        Ok(())
    } else {
        Err(AppError::Internal)
    }
}

/// Begins the cooperative exit sequence (UI plays the exit animation, then calls `quit_app`).
#[tauri::command]
pub fn request_exit(app: AppHandle) -> AppResult<()> {
    shell::begin_exit(&app);
    Ok(())
}

/// Final step of the exit sequence; terminates the process.
#[tauri::command]
pub fn quit_app(app: AppHandle) -> AppResult<()> {
    shell::finish_exit(&app);
    Ok(())
}

#[tauri::command]
pub fn hide_to_tray(app: AppHandle) -> AppResult<()> {
    shell::hide_main(&app);
    Ok(())
}

/// Shows one notification in the themed notification window. `payload` is a JSON document built by the UI.
#[tauri::command]
pub fn toast_show(app: AppHandle, payload: String, corner: String) -> AppResult<()> {
    if payload.len() > 8 * 1024 || !shell::TOAST_CORNERS.contains(&corner.as_str()) {
        return Err(AppError::InvalidArgument);
    }
    shell::show_toast(&app, payload, &corner);
    Ok(())
}

/// Resizes the notification window to its content and anchors it to the chosen corner.
#[tauri::command]
pub fn toast_layout(app: AppHandle, height: f64, corner: String) -> AppResult<()> {
    if !height.is_finite() || !shell::TOAST_CORNERS.contains(&corner.as_str()) {
        return Err(AppError::InvalidArgument);
    }
    shell::place_toast(&app, &corner, height);
    Ok(())
}

#[tauri::command]
pub fn toast_hide(app: AppHandle) -> AppResult<()> {
    shell::hide_toast(&app);
    Ok(())
}

/// The notification page calls this once after it has registered its listener.
#[tauri::command]
pub fn toast_take_pending(app: AppHandle) -> AppResult<Vec<String>> {
    Ok(shell::take_pending_toasts(&app))
}

/// A notification was clicked: bring the main window forward on one of the app's own screens.
#[tauri::command]
pub fn toast_open(app: AppHandle, path: String) -> AppResult<()> {
    if !is_app_route(&path) {
        return Err(AppError::InvalidArgument);
    }
    shell::navigate(&app, &path);
    Ok(())
}

/// Only plain in-app routes are accepted (a slash, then letters, digits and `/ - ? = & #`).
pub fn is_app_route(path: &str) -> bool {
    path.starts_with('/')
        && path.len() <= 80
        && !path.contains("//")
        && path.chars().all(|c| c.is_ascii_alphanumeric() || "/-?=&#".contains(c))
}

/// Links the About screen may open in the default browser. Only this exact allow-list is accepted, so the webview
/// can never launch arbitrary programs or addresses.
pub const ALLOWED_EXTERNAL: [&str; 2] = ["https://instagram.com/i.have.lost.it.all", "https://t.me/i_am_the_last_passenger"];

pub fn is_allowed_external(url: &str) -> bool {
    ALLOWED_EXTERNAL.contains(&url)
}

#[tauri::command]
pub fn open_external(url: String) -> AppResult<()> {
    if !is_allowed_external(&url) {
        return Err(AppError::InvalidArgument);
    }
    std::process::Command::new("explorer.exe").arg(&url).spawn().map(|_| ()).map_err(|_| AppError::Internal)
}

/// Actions triggered from the themed tray-menu window.
#[tauri::command]
pub fn tray_action(app: AppHandle, action: String) -> AppResult<()> {
    match action.as_str() {
        "show" => shell::show_main(&app),
        "hide" => shell::hide_main(&app),
        "dashboard" => shell::navigate(&app, "/"),
        "exit" => shell::begin_exit(&app),
        _ => return Err(AppError::InvalidArgument),
    }
    if let Some(w) = app.get_webview_window(shell::TRAY_MENU) {
        let _ = w.hide();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_info_reports_crate_version() {
        assert_eq!(build_app_info().version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn only_plain_app_routes_are_accepted() {
        for ok in ["/", "/daily-log", "/daily-log?date=2026-11-16", "/settings#notifications"] {
            assert!(is_app_route(ok), "{ok}");
        }
        for bad in ["", "daily-log", "//evil.example", "/a b", "/..\\x", "https://x", "/<script>"] {
            assert!(!is_app_route(bad), "{bad}");
        }
    }

    #[test]
    fn only_the_two_contact_links_can_be_opened() {
        for ok in ALLOWED_EXTERNAL {
            assert!(is_allowed_external(ok));
        }
        for bad in ["https://evil.example", "http://t.me/i_am_the_last_passenger", "file:///c:/windows/system32/calc.exe", "calc.exe", ""] {
            assert!(!is_allowed_external(bad), "{bad}");
        }
    }
}
