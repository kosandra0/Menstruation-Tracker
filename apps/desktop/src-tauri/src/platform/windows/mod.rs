//! Windows-specific adapters (compiled only on Windows): DPAPI key/data protection.

use std::ffi::c_void;

use windows::Win32::Foundation::{LocalFree, HLOCAL};
use windows::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
};

use crate::error::{AppError, AppResult};
use crate::security::KeyProtector;

/// Fixed application entropy. It is not a secret (DPAPI's protection comes from the Windows user
/// credentials); it only scopes blobs to this application so other apps' blobs are not accepted.
const ENTROPY: &[u8] = b"app.menstruationtracker.desktop/vault/v1";

pub struct DpapiProtector;

fn blob(data: &[u8]) -> CRYPT_INTEGER_BLOB {
    CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 }
}

/// Copies and frees a DPAPI-allocated output blob.
fn take(out: CRYPT_INTEGER_BLOB) -> Vec<u8> {
    if out.pbData.is_null() {
        return Vec::new();
    }
    unsafe {
        let v = std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(out.pbData as *mut c_void)));
        v
    }
}

impl KeyProtector for DpapiProtector {
    fn protect(&self, data: &[u8]) -> AppResult<Vec<u8>> {
        let input = blob(data);
        let entropy = blob(ENTROPY);
        let mut out = CRYPT_INTEGER_BLOB::default();
        unsafe {
            CryptProtectData(&input, None, Some(&entropy), None, None, CRYPTPROTECT_UI_FORBIDDEN, &mut out)
                .map_err(|_| AppError::StorageUnavailable)?;
        }
        Ok(take(out))
    }

    fn unprotect(&self, data: &[u8]) -> AppResult<Vec<u8>> {
        let input = blob(data);
        let entropy = blob(ENTROPY);
        let mut out = CRYPT_INTEGER_BLOB::default();
        unsafe {
            CryptUnprotectData(&input, None, Some(&entropy), None, None, CRYPTPROTECT_UI_FORBIDDEN, &mut out)
                .map_err(|_| AppError::StorageLocked)?;
        }
        Ok(take(out))
    }
}
