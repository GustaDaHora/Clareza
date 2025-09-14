// src-tauri/src/errors.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ClarezaError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Path error: {0}")]
    Path(String),
    
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    // #[error("Permission denied: {0}")]
    // PermissionDenied(String),
    
    #[error("Invalid format: {0}")]
    InvalidFormat(String),
    
    // #[error("Backup error: {0}")]
    // Backup(String),
    
    #[error("Export error: {0}")]
    Export(String),
}

impl serde::Serialize for ClarezaError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
