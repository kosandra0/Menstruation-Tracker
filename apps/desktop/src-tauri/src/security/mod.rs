//! Encryption-at-rest boundary.
//!
//! v0.2.0: on Windows, [`DpapiProtector`] encrypts data with the Windows Data Protection API (DPAPI),
//! bound to the current Windows user. This is OS-level encryption of the record vault; it is NOT SQLCipher
//! (planned for a later phase). On platforms without an implementation, [`UnavailableKeyProtector`] fails
//! closed: there is deliberately NO plaintext fallback for health data.

use crate::error::{AppError, AppResult};

pub trait KeyProtector {
    /// Encrypt `data` for at-rest storage using OS facilities.
    fn protect(&self, data: &[u8]) -> AppResult<Vec<u8>>;
    /// Decrypt data previously produced by `protect`.
    fn unprotect(&self, blob: &[u8]) -> AppResult<Vec<u8>>;
}

pub struct UnavailableKeyProtector;

impl KeyProtector for UnavailableKeyProtector {
    fn protect(&self, _key: &[u8]) -> AppResult<Vec<u8>> {
        Err(AppError::NotImplemented)
    }
    fn unprotect(&self, _blob: &[u8]) -> AppResult<Vec<u8>> {
        Err(AppError::NotImplemented)
    }
}

#[cfg(windows)]
pub use crate::platform::windows::DpapiProtector;

/// The best available protector for this platform.
#[cfg(windows)]
pub fn default_protector() -> Box<dyn KeyProtector + Send + Sync> {
    Box::new(DpapiProtector)
}
#[cfg(not(windows))]
pub fn default_protector() -> Box<dyn KeyProtector + Send + Sync> {
    Box::new(UnavailableKeyProtector)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unavailable_protector_fails_closed() {
        assert_eq!(UnavailableKeyProtector.protect(b"k"), Err(AppError::NotImplemented));
        assert_eq!(UnavailableKeyProtector.unprotect(b"k"), Err(AppError::NotImplemented));
    }

    #[cfg(windows)]
    #[test]
    fn dpapi_round_trip_and_ciphertext_differs() {
        let p = DpapiProtector;
        let plain = b"private cycle record";
        let blob = p.protect(plain).unwrap();
        assert_ne!(blob.as_slice(), plain.as_slice());
        assert!(!blob.windows(plain.len()).any(|w| w == plain));
        assert_eq!(p.unprotect(&blob).unwrap(), plain);
    }

    #[cfg(windows)]
    #[test]
    fn dpapi_rejects_tampered_data() {
        let p = DpapiProtector;
        let mut blob = p.protect(b"abc").unwrap();
        let last = blob.len() - 1;
        blob[last] ^= 0xFF;
        assert!(p.unprotect(&blob).is_err());
    }
}
