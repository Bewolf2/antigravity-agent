use std::fmt;
use serde::{Serialize, Serializer};

#[derive(Debug)]
#[allow(dead_code)]
pub enum ServiceError {
    Io(std::io::Error),
    Json(serde_json::Error),
    Http(String),
    Database(String),
    NotFound(String),
    Validation(String),
    Internal(String),
}

impl fmt::Display for ServiceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(e) => write!(f, "IO error: {e}"),
            Self::Json(e) => write!(f, "JSON error: {e}"),
            Self::Http(msg) => write!(f, "HTTP error: {msg}"),
            Self::Database(msg) => write!(f, "Database error: {msg}"),
            Self::NotFound(msg) => write!(f, "Not found: {msg}"),
            Self::Validation(msg) => write!(f, "Validation error: {msg}"),
            Self::Internal(msg) => write!(f, "{msg}"),
        }
    }
}

impl From<std::io::Error> for ServiceError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}

impl From<serde_json::Error> for ServiceError {
    fn from(e: serde_json::Error) -> Self {
        Self::Json(e)
    }
}

impl From<rusqlite::Error> for ServiceError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Database(e.to_string())
    }
}

impl From<reqwest::Error> for ServiceError {
    fn from(e: reqwest::Error) -> Self {
        Self::Http(e.to_string())
    }
}

impl From<base64::DecodeError> for ServiceError {
    fn from(e: base64::DecodeError) -> Self {
        Self::Internal(format!("Base64 decode error: {}", e))
    }
}

impl Serialize for ServiceError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
