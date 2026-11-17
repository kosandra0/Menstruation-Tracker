use std::sync::atomic::AtomicBool;
use std::sync::{Mutex, OnceLock};

use crate::storage::Vault;

/// Window behaviour pushed from the UI preferences (defaults: normal Windows behaviour).
#[derive(Debug, Clone, Copy, Default)]
pub struct Behavior {
    pub close_to_tray: bool,
    pub minimize_to_tray: bool,
}

/// State of the themed notification (toast) window.
#[derive(Debug, Default)]
pub struct ToastState {
    /// True once the toast page has mounted and registered its event listener.
    pub ready: bool,
    /// Notifications that arrived before the page was ready (delivered once, then cleared).
    pub queue: Vec<String>,
}

/// Shared application state managed by Tauri.
#[derive(Default)]
pub struct AppState {
    pub behavior: Mutex<Behavior>,
    pub toasts: Mutex<ToastState>,
    /// True once the exit sequence has begun (prevents duplicate exit animations).
    pub exiting: AtomicBool,
    /// Initialised during setup, once the app data directory is known.
    pub vault: OnceLock<Vault>,
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }
}
