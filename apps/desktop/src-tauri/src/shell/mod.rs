//! Desktop shell behaviour: system tray, themed tray-menu window, close/minimize-to-tray,
//! the coordinated exit sequence and runtime logo switching.
//!
//! Design notes (see docs/ARCHITECTURE.md, "Window behaviour"):
//! - Nothing here blocks the UI thread or polls. The only background thread is a one-shot exit watchdog.
//! - Exit is cooperative: Rust emits `mt://exit`, the UI plays its exit animation and calls `quit_app`.
//!   If the UI does not answer within [`EXIT_WATCHDOG`], Rust exits anyway, so a stuck webview can never
//!   keep the process alive.
//! - The tray menu is a small frameless webview window rendered by the same React app and theme as the
//!   main window (route `?window=tray`), so it always matches the user's chosen appearance.

use std::sync::atomic::Ordering;
use std::time::Duration;

use tauri::image::Image;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Runtime, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent,
};

use crate::state::AppState;

pub const MAIN: &str = "main";
pub const TRAY_MENU: &str = "tray-menu";
pub const TRAY_ID: &str = "main";
pub const EVT_EXIT: &str = "mt://exit";
pub const EVT_NAVIGATE: &str = "mt://navigate";
pub const EVT_TRAY_OPEN: &str = "mt://tray-open";
pub const TOAST: &str = "toast";
pub const EVT_TOAST: &str = "mt://toast";

/// Upper bound for the exit animation round trip before Rust terminates the process itself.
const EXIT_WATCHDOG: Duration = Duration::from_secs(4);

/// Logical width of the notification window (the cards inside are narrower; the rest is shadow room).
pub const TOAST_WIDTH: f64 = 440.0;
const TOAST_MIN_HEIGHT: f64 = 40.0;
const TOAST_MAX_HEIGHT: f64 = 720.0;
const TOAST_MARGIN: f64 = 6.0;
/// Screen corners the notification window may be anchored to.
pub const TOAST_CORNERS: [&str; 4] = ["bottom-right", "bottom-left", "top-right", "top-left"];

const TRAY_WIDTH: f64 = 248.0;
const TRAY_HEIGHT: f64 = 318.0;

/// The selectable app logos (id, PNG bytes). Ids mirror `LOGO_IDS` in `@mt/config`.
const LOGOS: [(&str, &[u8]); 13] = [
    ("bloom-petal", include_bytes!("../../icons/bloom-petal.png")),
    ("lunar-cycle", include_bytes!("../../icons/lunar-cycle.png")),
    ("heartleaf", include_bytes!("../../icons/heartleaf.png")),
    ("mt04-petal-drop", include_bytes!("../../icons/mt04-petal-drop.png")),
    ("mt05-cycle-calendar", include_bytes!("../../icons/mt05-cycle-calendar.png")),
    ("mt06-gentle-profile", include_bytes!("../../icons/mt06-gentle-profile.png")),
    ("mt07-lotus-stillness", include_bytes!("../../icons/mt07-lotus-stillness.png")),
    ("mt08-moon-blossom", include_bytes!("../../icons/mt08-moon-blossom.png")),
    ("mt09-hourglass-bloom", include_bytes!("../../icons/mt09-hourglass-bloom.png")),
    ("mt10-heart-rhythm", include_bytes!("../../icons/mt10-heart-rhythm.png")),
    ("mt11-calendar-drop", include_bytes!("../../icons/mt11-calendar-drop.png")),
    ("mt12-butterfly-petals", include_bytes!("../../icons/mt12-butterfly-petals.png")),
    ("mt13-path-of-renewal", include_bytes!("../../icons/mt13-path-of-renewal.png")),
];

pub fn is_known_logo(id: &str) -> bool {
    LOGOS.iter().any(|(n, _)| *n == id)
}

fn logo_image(id: &str) -> Option<Image<'static>> {
    LOGOS.iter().find(|(n, _)| *n == id).and_then(|(_, b)| Image::from_bytes(b).ok())
}

/// Applies the chosen logo to the taskbar/title icon and the tray icon.
pub fn set_logo<R: Runtime>(app: &AppHandle<R>, id: &str) -> bool {
    let Some(img) = logo_image(id) else { return false };
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.set_icon(img.clone());
    }
    if let Some(t) = app.tray_by_id(TRAY_ID) {
        let _ = t.set_icon(Some(img));
    }
    true
}

pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
    hide_tray_menu(app);
}

pub fn hide_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.hide();
    }
    hide_tray_menu(app);
}

pub fn hide_tray_menu<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window(TRAY_MENU) {
        let _ = w.hide();
    }
}

/// Starts the cooperative exit sequence (idempotent).
pub fn begin_exit<R: Runtime>(app: &AppHandle<R>) {
    let state = app.state::<AppState>();
    if state.exiting.swap(true, Ordering::SeqCst) {
        return;
    }
    // The exit animation must be visible even when the app was hidden in the tray.
    show_main(app);
    let _ = app.emit_to(MAIN, EVT_EXIT, ());
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(EXIT_WATCHDOG);
        finish_exit(&handle);
    });
}

/// Removes the tray icon (avoids ghost icons) and terminates the process.
pub fn finish_exit<R: Runtime>(app: &AppHandle<R>) {
    let _ = app.remove_tray_by_id(TRAY_ID);
    app.exit(0);
}

pub fn navigate<R: Runtime>(app: &AppHandle<R>, path: &str) {
    show_main(app);
    let _ = app.emit_to(MAIN, EVT_NAVIGATE, path.to_string());
}

/// Window event hook: close/minimize-to-tray behaviour.
pub fn on_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    let app = window.app_handle();
    match (window.label(), event) {
        (MAIN, WindowEvent::CloseRequested { api, .. }) => {
            api.prevent_close();
            let close_to_tray = app.state::<AppState>().behavior.lock().map(|b| b.close_to_tray).unwrap_or(false);
            if close_to_tray {
                hide_main(app);
            } else {
                begin_exit(app);
            }
        }
        (MAIN, WindowEvent::Resized(_)) => {
            let minimize_to_tray =
                app.state::<AppState>().behavior.lock().map(|b| b.minimize_to_tray).unwrap_or(false);
            if minimize_to_tray && window.is_minimized().unwrap_or(false) {
                hide_main(app);
            }
        }
        (TRAY_MENU, WindowEvent::Focused(false)) => {
            let _ = window.hide();
        }
        _ => {}
    }
}

/// Anchors the notification window to a corner of the primary monitor's work area (the part not covered by the taskbar).
pub fn place_toast<R: Runtime>(app: &AppHandle<R>, corner: &str, height: f64) {
    let Some(w) = app.get_webview_window(TOAST) else { return };
    let height = height.clamp(TOAST_MIN_HEIGHT, TOAST_MAX_HEIGHT);
    let monitor = app.primary_monitor().ok().flatten().or_else(|| w.current_monitor().ok().flatten());
    let Some(m) = monitor else { return };
    let scale = m.scale_factor();
    let area = m.work_area();
    let (aw, ah) = (area.size.width as f64, area.size.height as f64);
    let (ax, ay) = (area.position.x as f64, area.position.y as f64);
    let (pw, ph) = (TOAST_WIDTH * scale, height * scale);
    let margin = TOAST_MARGIN * scale;
    let x = if corner.ends_with("left") { ax + margin } else { ax + aw - pw - margin };
    let y = if corner.starts_with("top") { ay + margin } else { ay + ah - ph - margin };
    let _ = w.set_size(tauri::LogicalSize::new(TOAST_WIDTH, height));
    let _ = w.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
}

/// Delivers one notification (a JSON string built by the UI) to the themed notification window and shows it without
/// taking keyboard focus. Notifications that arrive before the window's page is ready are queued, not lost.
pub fn show_toast<R: Runtime>(app: &AppHandle<R>, payload: String, corner: &str) {
    let state = app.state::<AppState>();
    let deliver_now = match state.toasts.lock() {
        Ok(mut t) => {
            if t.ready {
                true
            } else {
                t.queue.push(payload.clone());
                false
            }
        }
        Err(_) => false,
    };
    if let Some(w) = app.get_webview_window(TOAST) {
        place_toast(app, corner, 120.0);
        let _ = w.show();
    }
    if deliver_now {
        let _ = app.emit_to(TOAST, EVT_TOAST, payload);
    }
}

/// Called by the notification page once its listener exists; returns anything that arrived earlier.
pub fn take_pending_toasts<R: Runtime>(app: &AppHandle<R>) -> Vec<String> {
    match app.state::<AppState>().toasts.lock() {
        Ok(mut t) => {
            t.ready = true;
            std::mem::take(&mut t.queue)
        }
        Err(_) => Vec::new(),
    }
}

pub fn hide_toast<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window(TOAST) {
        let _ = w.hide();
    }
}

/// Creates the tray icon, the (hidden) themed tray-menu window and the (hidden) themed notification window.
pub fn setup<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    // The notification window: frameless, transparent, never focused, hidden until a notification arrives.
    let toast_window = WebviewWindowBuilder::new(app, TOAST, WebviewUrl::App("index.html?window=toast".into()))
        .title("Menstruation Tracker notification")
        .inner_size(TOAST_WIDTH, 120.0)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .focused(false)
        .focusable(false);
    #[cfg(all(windows, debug_assertions))]
    let toast_window = match std::env::var("MT_WEBVIEW_ARGS") {
        Ok(args) if !args.is_empty() => toast_window.additional_browser_args(&args),
        _ => toast_window,
    };
    toast_window.build()?;

    let tray_window = WebviewWindowBuilder::new(app, TRAY_MENU, WebviewUrl::App("index.html?window=tray".into()))
        .title("Menstruation Tracker tray menu")
        .inner_size(TRAY_WIDTH, TRAY_HEIGHT)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .focused(false);
    // Debug builds only (compiled out of release builds): lets automated UI checks give every webview the same
    // browser arguments (WebView2 requires webviews sharing a profile to agree), e.g. a local debugging port.
    #[cfg(all(windows, debug_assertions))]
    let tray_window = match std::env::var("MT_WEBVIEW_ARGS") {
        Ok(args) if !args.is_empty() => tray_window.additional_browser_args(&args),
        _ => tray_window,
    };
    tray_window.build()?;

    let icon = logo_image("bloom-petal").or_else(|| app.default_window_icon().cloned());
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Menstruation Tracker")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();
            match event {
                TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }
                | TrayIconEvent::DoubleClick { button: MouseButton::Left, .. } => show_main(app),
                TrayIconEvent::Click { button: MouseButton::Right, button_state: MouseButtonState::Up, position, .. } => {
                    show_tray_menu(app, position)
                }
                _ => {}
            }
        });
    if let Some(i) = icon {
        builder = builder.icon(i);
    }
    builder.build(app)?;
    Ok(())
}

/// Places the themed menu next to the cursor, clamped to the monitor under it.
fn show_tray_menu<R: Runtime>(app: &AppHandle<R>, cursor: PhysicalPosition<f64>) {
    let Some(w) = app.get_webview_window(TRAY_MENU) else { return };
    let size = w.outer_size().map(|s| (s.width as f64, s.height as f64)).unwrap_or((TRAY_WIDTH, TRAY_HEIGHT));
    let (mut x, mut y) = (cursor.x - size.0, cursor.y - size.1);
    if let Ok(Some(m)) = app.monitor_from_point(cursor.x, cursor.y) {
        let (mx, my) = (m.position().x as f64, m.position().y as f64);
        let (mw, mh) = (m.size().width as f64, m.size().height as f64);
        x = x.clamp(mx, (mx + mw - size.0).max(mx));
        y = y.clamp(my, (my + mh - size.1).max(my));
    }
    let _ = w.set_position(PhysicalPosition::new(x as i32, y as i32));
    let _ = w.show();
    let _ = w.set_focus();
    let _ = app.emit_to(TRAY_MENU, EVT_TRAY_OPEN, ());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn knows_exactly_the_selectable_logos() {
        assert_eq!(LOGOS.len(), 13);
        for id in ["bloom-petal", "lunar-cycle", "heartleaf", "mt04-petal-drop", "mt13-path-of-renewal"] {
            assert!(is_known_logo(id), "{id}");
        }
        for bad in ["", "Bloom-Petal", "../icon", "bloom-petal.png", "other"] {
            assert!(!is_known_logo(bad), "{bad}");
        }
    }

    #[test]
    fn embedded_logo_images_decode() {
        for (id, _) in LOGOS {
            let img = logo_image(id).unwrap_or_else(|| panic!("logo {id} failed to decode"));
            assert!(img.width() >= 256 && img.width() == img.height(), "{id}: {}x{}", img.width(), img.height());
        }
    }

    #[test]
    fn toast_corners_are_the_four_screen_corners() {
        assert_eq!(TOAST_CORNERS.len(), 4);
        for c in TOAST_CORNERS {
            assert!(c.starts_with("top") || c.starts_with("bottom"));
            assert!(c.ends_with("left") || c.ends_with("right"));
        }
    }

    #[test]
    fn exit_watchdog_is_bounded() {
        assert!(EXIT_WATCHDOG.as_secs() <= 5);
    }
}
