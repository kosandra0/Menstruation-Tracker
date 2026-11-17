use serde::{ser::SerializeStruct, Serialize, Serializer};

/// Typed error returned to the frontend as `{ code, message }`
/// (mirrors `AppErrorPayload` in packages/shared-types). Messages must never contain health data.
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum AppError {
    #[error("this feature is not implemented yet")]
    NotImplemented,
    #[error("this operation is not supported on this platform")]
    UnsupportedPlatform,
    #[error("storage is locked")]
    StorageLocked,
    #[error("storage is unavailable")]
    StorageUnavailable,
    #[error("invalid argument")]
    InvalidArgument,
    #[error("internal error")]
    Internal,
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::NotImplemented => "not_implemented",
            AppError::UnsupportedPlatform => "unsupported_platform",
            AppError::StorageLocked => "storage_locked",
            AppError::StorageUnavailable => "storage_unavailable",
            AppError::InvalidArgument => "invalid_argument",
            AppError::Internal => "internal",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("code", self.code())?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_code_and_message() {
        let json = serde_json::to_value(AppError::NotImplemented).unwrap();
        assert_eq!(json["code"], "not_implemented");
        assert!(json["message"].is_string());
    }
}
