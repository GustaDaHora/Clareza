// src-tauri/src/models.rs
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
// use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClarezaDocument {
    pub metadata: DocumentMetadata,
    pub content: String,
    pub format_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub id: String,
    pub title: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub word_count: u32,
    pub character_count: u32,
    pub language: String,
    pub tags: Vec<String>,
    pub version: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOperation {
    pub success: bool,
    pub message: String,
    pub path: Option<String>,
    pub content: Option<String>,
    pub metadata: Option<DocumentMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub original_path: String,
    pub backup_path: String,
    pub created_at: DateTime<Utc>,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub title: String,
    pub last_opened: DateTime<Utc>,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: String, // "pdf", "epub", "docx", "html", "md"
    pub include_metadata: bool,
    pub template: Option<String>,
}
