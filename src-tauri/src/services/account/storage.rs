use crate::services::ServiceError;
use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Clone)]
pub struct RawAccountFields {
    pub auth_status: String,
    pub oauth_token: Option<String>,
    pub user_status: Option<String>,
}

pub fn resolve_antigravity_db_path() -> Result<PathBuf, ServiceError> {
    crate::platform::get_antigravity_db_path()
        .ok_or_else(|| ServiceError::NotFound("Antigravity database path not found".to_string()))
}

pub fn open_antigravity_connection() -> Result<(Connection, PathBuf), ServiceError> {
    let db_path = resolve_antigravity_db_path()?;
    let conn = Connection::open(&db_path).map_err(|e| {
        ServiceError::Database(format!(
            "Failed to open SQLite database ({}): {e}",
            db_path.display()
        ))
    })?;
    Ok((conn, db_path))
}

pub fn query_item_value(
    conn: &Connection,
    key: &str,
) -> Result<Option<String>, ServiceError> {
    conn.query_row("SELECT value FROM ItemTable WHERE key = ?", [key], |row| {
        row.get(0)
    })
    .optional()
    .map_err(|e| {
        ServiceError::Database(format!(
            "Failed to query key '{key}' from ItemTable: {e}"
        ))
    })
}

pub fn load_current_raw_account_fields() -> Result<RawAccountFields, ServiceError> {
    let (conn, _db_path) = open_antigravity_connection()?;

    let auth_status = query_item_value(&conn, crate::constants::database::AUTH_STATUS)?
        .ok_or_else(|| {
            ServiceError::NotFound("antigravityAuthStatus not found in database".to_string())
        })?;
    let oauth_token = query_item_value(&conn, crate::constants::database::OAUTH_TOKEN)?;
    let user_status = query_item_value(&conn, crate::constants::database::USER_STATUS)?;

    Ok(RawAccountFields {
        auth_status,
        oauth_token,
        user_status,
    })
}

/// 列出指定目錄下所有 .json 檔案
pub fn list_json_files(dir: &Path) -> Result<Vec<PathBuf>, ServiceError> {
    let entries = fs::read_dir(dir).map_err(|e| {
        ServiceError::Io(std::io::Error::new(
            e.kind(),
            format!("Failed to read directory ({}): {e}", dir.display()),
        ))
    })?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| {
            ServiceError::Io(std::io::Error::new(
                e.kind(),
                format!("Failed to read directory entry: {e}"),
            ))
        })?;
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            files.push(path);
        }
    }
    Ok(files)
}

pub fn list_backup_json_files(config_dir: &Path) -> Result<Vec<PathBuf>, ServiceError> {
    let antigravity_dir = config_dir.join("antigravity-accounts");
    list_json_files(&antigravity_dir).map_err(|e| {
        ServiceError::Internal(format!(
            "Failed to read backup directory ({}): {e}",
            antigravity_dir.display()
        ))
    })
}

/// 通用 JSON 反序列化，附帶錯誤 context
pub fn parse_json<T: serde::de::DeserializeOwned>(
    content: &str,
    context: &str,
) -> Result<T, ServiceError> {
    serde_json::from_str(content)
        .map_err(|e| ServiceError::Json(serde_json::Error::from(e)))
        .map_err(|e| ServiceError::Internal(format!("Failed to parse JSON for {context}: {e}")))
}

pub fn parse_backup_file(path: &Path) -> Result<RawAccountFields, ServiceError> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown");

    let content = fs::read_to_string(path).map_err(|e| {
        ServiceError::Io(std::io::Error::new(
            e.kind(),
            format!("Failed to read backup file '{file_name}': {e}"),
        ))
    })?;
    let backup_data: Value =
        parse_json(&content, &format!("backup file '{file_name}'"))?;

    // 支援兩種格式：新格式（頂層）與舊格式（巢狀在 "_raw" 下）
    let data: &Value = if backup_data.get(crate::constants::database::AUTH_STATUS).is_some() {
        &backup_data
    } else if let Some(raw) = backup_data.get("_raw") {
        raw
    } else {
        return Err(ServiceError::NotFound(format!(
            "Backup file '{file_name}' is missing antigravityAuthStatus"
        )));
    };

    let auth_status = data
        .get(crate::constants::database::AUTH_STATUS)
        .and_then(|v| v.as_str())
        .ok_or_else(|| {
            ServiceError::NotFound(format!(
                "Backup file '{file_name}' is missing antigravityAuthStatus"
            ))
        })?
        .to_string();

    let oauth_token = data
        .get(crate::constants::database::OAUTH_TOKEN)
        .and_then(|v| v.as_str())
        .map(ToString::to_string);

    let user_status = data
        .get(crate::constants::database::USER_STATUS)
        .and_then(|v| v.as_str())
        .map(ToString::to_string);

    Ok(RawAccountFields {
        auth_status,
        oauth_token,
        user_status,
    })
}

pub fn backup_file_modified_time(path: &Path) -> SystemTime {
    fs::metadata(path)
        .and_then(|meta| meta.modified())
        .unwrap_or(SystemTime::UNIX_EPOCH)
}

pub fn validate_account_file_name(account_file_name: &str) -> Result<(), ServiceError> {
    if account_file_name.is_empty() {
        return Err(ServiceError::Validation(
            "Account file name cannot be empty".to_string(),
        ));
    }

    if account_file_name.contains('/') || account_file_name.contains('\\') {
        return Err(ServiceError::Validation(
            "Account file name contains path separators".to_string(),
        ));
    }

    if account_file_name.starts_with('.') || account_file_name.contains("..") {
        return Err(ServiceError::Validation(
            "Account file name contains invalid path segments".to_string(),
        ));
    }

    if !account_file_name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-' | '@' | '+'))
    {
        return Err(ServiceError::Validation(
            "Account file name may only contain ASCII letters, numbers, '.', '_', '-', '@', or '+'"
                .to_string(),
        ));
    }

    Ok(())
}

pub fn resolve_backup_file_path(account_file_name: &str) -> Result<PathBuf, ServiceError> {
    validate_account_file_name(account_file_name)?;
    Ok(crate::directories::get_accounts_directory()
        .join(format!("{account_file_name}.json")))
}

pub fn write_backup_file(
    account_file_name: &str,
    fields: &RawAccountFields,
) -> Result<PathBuf, ServiceError> {
    let accounts_dir = crate::directories::get_accounts_directory();
    let account_file = resolve_backup_file_path(account_file_name)?;

    let content = serde_json::json!({
        crate::constants::database::AUTH_STATUS: fields.auth_status,
        crate::constants::database::OAUTH_TOKEN: fields.oauth_token,
        crate::constants::database::USER_STATUS: fields.user_status,
    });

    let serialized = serde_json::to_string_pretty(&content).map_err(|e| {
        ServiceError::Internal(format!("Failed to serialize account backup JSON: {e}"))
    })?;

    fs::create_dir_all(&accounts_dir).map_err(|e| {
        ServiceError::Io(std::io::Error::new(
            e.kind(),
            format!(
                "Failed to create account backup directory ({}): {e}",
                accounts_dir.display()
            ),
        ))
    })?;

    fs::write(&account_file, serialized).map_err(|e| {
        ServiceError::Io(std::io::Error::new(
            e.kind(),
            format!(
                "Failed to write account backup file ({}): {e}",
                account_file.display()
            ),
        ))
    })?;

    Ok(account_file)
}
