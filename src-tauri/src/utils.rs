// src-tauri/src/utils.rs
use crate::errors::ClarezaError;
// use crate::models::{ClarezaDocument, DocumentMetadata, BackupInfo};
use crate::models::{ DocumentMetadata };
use std::path::{Path, PathBuf};
// use std::fs;
use chrono::Utc;
use uuid::Uuid;

pub struct FileUtils;

impl FileUtils {
    /// Safely canonicalize and validate a path to prevent directory traversal
    pub fn safe_canonicalize<P: AsRef<Path>>(path: P) -> Result<PathBuf, ClarezaError> {
        let path = path.as_ref();
        
        // Resolve the path
        let canonical = path.canonicalize()
            .map_err(|e| ClarezaError::Path(format!("Cannot canonicalize path: {}", e)))?;
            
        // Additional security checks
        if canonical.to_string_lossy().contains("..") {
            return Err(ClarezaError::Path("Path traversal detected".to_string()));
        }
        
        Ok(canonical)
    }
    
    /// Create a backup of a file with timestamp
    pub fn create_backup_path(original_path: &Path) -> Result<PathBuf, ClarezaError> {
        let parent = original_path.parent()
            .ok_or_else(|| ClarezaError::Path("Cannot determine parent directory".to_string()))?;
            
        let file_stem = original_path.file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| ClarezaError::Path("Invalid file name".to_string()))?;
            
        let extension = original_path.extension()
            .and_then(|s| s.to_str())
            .unwrap_or("");
            
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let backup_name = if extension.is_empty() {
            format!("{}.backup.{}", file_stem, timestamp)
        } else {
            format!("{}.backup.{}.{}", file_stem, timestamp, extension)
        };
        
        Ok(parent.join(backup_name))
    }
    
    /// Atomically write content to a file
    pub async fn atomic_write<P: AsRef<Path>>(path: P, content: &str) -> Result<(), ClarezaError> {
        let path = path.as_ref();
        let temp_path = path.with_extension("tmp");
        
        // Write to temporary file first
        tokio::fs::write(&temp_path, content.as_bytes()).await?;
        
        // Atomically move temp file to target
        tokio::fs::rename(temp_path, path).await?;
        
        Ok(())
    }
    
    /// Read file with encoding detection
    pub async fn read_with_encoding<P: AsRef<Path>>(path: P) -> Result<String, ClarezaError> {
        let bytes = tokio::fs::read(path).await?;
        
        // Try UTF-8 first
        match String::from_utf8(bytes.clone()) {
            Ok(content) => Ok(content),
            Err(_) => {
                // Try to detect encoding
                let (decoded, _, had_errors) = encoding_rs::UTF_8.decode(&bytes);
                if had_errors {
                    return Err(ClarezaError::InvalidFormat("Cannot decode file encoding".to_string()));
                }
                Ok(decoded.into_owned())
            }
        }
    }
    
    /// Get application data directory
    pub fn get_app_data_dir() -> Result<PathBuf, ClarezaError> {
        dirs::data_local_dir()
            .map(|dir| dir.join("Clareza"))
            .ok_or_else(|| ClarezaError::Path("Cannot determine app data directory".to_string()))
    }
    
    /// Ensure directory exists
    pub async fn ensure_dir_exists<P: AsRef<Path>>(path: P) -> Result<(), ClarezaError> {
        tokio::fs::create_dir_all(path).await?;
        Ok(())
    }
}

pub fn create_document_metadata(title: &str) -> DocumentMetadata {
    let now = Utc::now();
    DocumentMetadata {
        id: Uuid::new_v4().to_string(),
        title: title.to_string(),
        created_at: now,
        modified_at: now,
        word_count: 0,
        character_count: 0,
        language: "pt-BR".to_string(),
        tags: Vec::new(),
        version: 1,
    }
}

pub fn update_content_stats(metadata: &mut DocumentMetadata, content: &str) {
    metadata.character_count = content.len() as u32;
    metadata.word_count = content.split_whitespace().count() as u32;
    metadata.modified_at = Utc::now();
}
