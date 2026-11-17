//! Storage boundary. The frontend never touches the filesystem; it calls commands that use this module.
//!
//! v0.2.0 implementation: the "record vault" is a single DPAPI-encrypted file (`records.vault`) in the
//! app data directory holding the user's JSON records. Writes are atomic (temp file + rename).
//! This is OS-level encryption bound to the Windows user - NOT SQLCipher (planned, see docs/DATABASE_DESIGN.md).
//! If encryption is unavailable the vault refuses to read or write: there is no plaintext fallback.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::{AppError, AppResult};
use crate::security::KeyProtector;

#[derive(Debug, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum StorageState {
    NotInitialized,
    Locked,
    Ready,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StorageStatus {
    pub state: StorageState,
    /// True only when records are stored encrypted by the OS (DPAPI). Never true for plaintext.
    pub encrypted: bool,
    pub schema_version: Option<u32>,
}

/// Upper bound for the serialized records (guards memory and disk).
pub const MAX_VAULT_BYTES: usize = 32 * 1024 * 1024;
const VAULT_FILE: &str = "records.vault";

pub struct Vault {
    dir: PathBuf,
    protector: Box<dyn KeyProtector + Send + Sync>,
}

impl Vault {
    pub fn new(dir: PathBuf, protector: Box<dyn KeyProtector + Send + Sync>) -> Self {
        Self { dir, protector }
    }

    fn path(&self) -> PathBuf {
        self.dir.join(VAULT_FILE)
    }

    pub fn exists(&self) -> bool {
        self.path().is_file()
    }

    /// Returns the decrypted JSON text, or `None` if no vault exists yet.
    pub fn load(&self) -> AppResult<Option<String>> {
        let p = self.path();
        if !p.is_file() {
            return Ok(None);
        }
        let blob = fs::read(&p).map_err(|_| AppError::StorageUnavailable)?;
        let plain = self.protector.unprotect(&blob)?;
        String::from_utf8(plain).map(Some).map_err(|_| AppError::StorageUnavailable)
    }

    pub fn save(&self, json: &str) -> AppResult<()> {
        if json.len() > MAX_VAULT_BYTES {
            return Err(AppError::InvalidArgument);
        }
        // Validate before touching disk so a bad payload can never replace good data.
        serde_json::from_str::<serde_json::Value>(json).map_err(|_| AppError::InvalidArgument)?;
        let blob = self.protector.protect(json.as_bytes())?;
        write_atomic(&self.dir, &self.path(), &blob)
    }

    /// Irreversibly deletes the vault file. Returns whether a file was removed.
    pub fn delete(&self) -> AppResult<bool> {
        let p = self.path();
        if !p.is_file() {
            return Ok(false);
        }
        fs::remove_file(&p).map_err(|_| AppError::StorageUnavailable)?;
        Ok(true)
    }

    pub fn status(&self) -> StorageStatus {
        // Probe encryption availability without writing anything.
        let available = self.protector.protect(b"probe").and_then(|b| self.protector.unprotect(&b)).is_ok();
        StorageStatus {
            state: if !available {
                StorageState::Locked
            } else if self.exists() {
                StorageState::Ready
            } else {
                StorageState::NotInitialized
            },
            encrypted: available,
            schema_version: if self.exists() { Some(1) } else { None },
        }
    }
}

fn write_atomic(dir: &Path, target: &Path, data: &[u8]) -> AppResult<()> {
    fs::create_dir_all(dir).map_err(|_| AppError::StorageUnavailable)?;
    let tmp = target.with_extension("vault.tmp");
    fs::write(&tmp, data).map_err(|_| AppError::StorageUnavailable)?;
    fs::rename(&tmp, target).map_err(|_| {
        let _ = fs::remove_file(&tmp);
        AppError::StorageUnavailable
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::security::UnavailableKeyProtector;

    /// Test-only reversible protector (XOR) so vault logic is testable on any OS.
    struct Xor;
    impl KeyProtector for Xor {
        fn protect(&self, d: &[u8]) -> AppResult<Vec<u8>> {
            Ok(d.iter().map(|b| b ^ 0x5A).collect())
        }
        fn unprotect(&self, d: &[u8]) -> AppResult<Vec<u8>> {
            Ok(d.iter().map(|b| b ^ 0x5A).collect())
        }
    }

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("mt-test-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&d);
        d
    }

    #[test]
    fn save_load_delete_round_trip_and_not_plaintext_on_disk() {
        let dir = tmp("rt");
        let v = Vault::new(dir.clone(), Box::new(Xor));
        assert_eq!(v.load().unwrap(), None);
        v.save(r#"{"periods":[1,2,3]}"#).unwrap();
        let raw = fs::read(dir.join(VAULT_FILE)).unwrap();
        assert!(!String::from_utf8_lossy(&raw).contains("periods"));
        assert_eq!(v.load().unwrap().as_deref(), Some(r#"{"periods":[1,2,3]}"#));
        assert!(v.delete().unwrap());
        assert!(!v.delete().unwrap());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn rejects_invalid_json_and_keeps_existing_data() {
        let dir = tmp("bad");
        let v = Vault::new(dir.clone(), Box::new(Xor));
        v.save(r#"{"ok":true}"#).unwrap();
        assert_eq!(v.save("not json"), Err(AppError::InvalidArgument));
        assert_eq!(v.load().unwrap().as_deref(), Some(r#"{"ok":true}"#));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn refuses_to_store_without_encryption() {
        let dir = tmp("closed");
        let v = Vault::new(dir.clone(), Box::new(UnavailableKeyProtector));
        assert_eq!(v.save("{}"), Err(AppError::NotImplemented));
        assert!(!dir.join(VAULT_FILE).exists());
        let s = v.status();
        assert!(!s.encrypted);
        assert_eq!(s.state, StorageState::Locked);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn status_serializes_camel_case() {
        let json = serde_json::to_value(StorageStatus {
            state: StorageState::NotInitialized,
            encrypted: false,
            schema_version: None,
        })
        .unwrap();
        assert_eq!(json["schemaVersion"], serde_json::Value::Null);
        assert_eq!(json["state"], "not_initialized");
    }
}
