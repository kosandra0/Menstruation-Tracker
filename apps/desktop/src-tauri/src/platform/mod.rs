//! Platform adapters. OS-specific code lives in its own module behind `cfg`.

pub mod shared;
#[cfg(windows)]
pub mod windows;

/// Short platform identifier reported to the UI.
pub fn name() -> &'static str {
    if cfg!(windows) {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}
