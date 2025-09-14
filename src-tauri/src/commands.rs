// src-tauri/src/commands.rs
use crate::models::{ClarezaDocument, DocumentMetadata, FileOperation, BackupInfo, RecentFile, ExportOptions};
use crate::utils::{FileUtils, create_document_metadata, update_content_stats};
use crate::errors::ClarezaError;
use std::path::PathBuf;
use tauri::command;
use chrono::Utc;

#[command]
pub async fn create_document(title: String) -> Result<FileOperation, ClarezaError> {
    let metadata = create_document_metadata(&title);
    let document = ClarezaDocument {
        metadata: metadata.clone(),
        content: String::new(),
        format_version: "1.0".to_string(),
    };
    
    Ok(FileOperation {
        success: true,
        message: "Document created successfully".to_string(),
        path: None,
        content: Some(document.content),
        metadata: Some(metadata),
    })
}

#[command]
pub async fn open_document(path: String) -> Result<FileOperation, ClarezaError> {
    let safe_path = FileUtils::safe_canonicalize(&path)?;
    
    if !safe_path.exists() {
        return Err(ClarezaError::FileNotFound(path));
    }
    
    let content = FileUtils::read_with_encoding(&safe_path).await?;
    
    // Try to parse as Clareza document first
    let (document_content, metadata) = if safe_path.extension()
        .and_then(|ext| ext.to_str()) == Some("clareza") {
        
        let document: ClarezaDocument = serde_json::from_str(&content)?;
        (document.content, Some(document.metadata))
    } else {
        // Plain text file
        let mut metadata = create_document_metadata(
            &safe_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Untitled")
        );
        update_content_stats(&mut metadata, &content);
        (content, Some(metadata))
    };
    
    Ok(FileOperation {
        success: true,
        message: format!("File opened: {}", safe_path.display()),
        path: Some(safe_path.to_string_lossy().to_string()),
        content: Some(document_content),
        metadata,
    })
}

#[command]
pub async fn save_document(
    path: String, 
    content: String, 
    metadata: Option<DocumentMetadata>
) -> Result<FileOperation, ClarezaError> {
    let safe_path = FileUtils::safe_canonicalize(&path)?;
    
    let mut doc_metadata = metadata.unwrap_or_else(|| {
        create_document_metadata(
            &safe_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Untitled")
        )
    });
    
    update_content_stats(&mut doc_metadata, &content);
    
    let final_content = if safe_path.extension()
        .and_then(|ext| ext.to_str()) == Some("clareza") {
        
        let document = ClarezaDocument {
            metadata: doc_metadata.clone(),
            content: content.clone(),
            format_version: "1.0".to_string(),
        };
        serde_json::to_string_pretty(&document)?
    } else {
        content
    };
    
    FileUtils::atomic_write(&safe_path, &final_content).await?;
    
    Ok(FileOperation {
        success: true,
        message: format!("File saved: {}", safe_path.display()),
        path: Some(safe_path.to_string_lossy().to_string()),
        content: None,
        metadata: Some(doc_metadata),
    })
}

#[command]
pub async fn save_document_as(
    content: String,
    suggested_name: Option<String>,
    metadata: Option<DocumentMetadata>
) -> Result<FileOperation, ClarezaError> {
    // In a real implementation, you might want to show a file dialog
    // For now, we'll save to the app data directory with timestamp
    let app_data_dir = FileUtils::get_app_data_dir()?;
    FileUtils::ensure_dir_exists(&app_data_dir).await?;
    
    let filename = suggested_name.unwrap_or_else(|| {
        format!("document_{}.clareza", Utc::now().format("%Y%m%d_%H%M%S"))
    });
    
    let save_path = app_data_dir.join(&filename);
    
    save_document(
        save_path.to_string_lossy().to_string(),
        content,
        metadata
    ).await
}

#[command]
pub async fn create_backup(path: String) -> Result<BackupInfo, ClarezaError> {
    let safe_path = FileUtils::safe_canonicalize(&path)?;
    
    if !safe_path.exists() {
        return Err(ClarezaError::FileNotFound(path));
    }
    
    let backup_path = FileUtils::create_backup_path(&safe_path)?;
    
    // Copy file to backup location
    tokio::fs::copy(&safe_path, &backup_path).await?;
    
    let metadata = tokio::fs::metadata(&backup_path).await?;
    
    Ok(BackupInfo {
        id: uuid::Uuid::new_v4().to_string(),
        original_path: safe_path.to_string_lossy().to_string(),
        backup_path: backup_path.to_string_lossy().to_string(),
        created_at: Utc::now(),
        size_bytes: metadata.len(),
    })
}

#[command]
pub async fn list_backups(original_path: String) -> Result<Vec<BackupInfo>, ClarezaError> {
    let safe_path = FileUtils::safe_canonicalize(&original_path)?;
    let parent = safe_path.parent()
        .ok_or_else(|| ClarezaError::Path("Cannot determine parent directory".to_string()))?;
    
    let file_stem = safe_path.file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| ClarezaError::Path("Invalid file name".to_string()))?;
    
    let mut backups = Vec::new();
    let mut entries = tokio::fs::read_dir(parent).await?;
    
    while let Some(entry) = entries.next_entry().await? {
        let entry_name = entry.file_name();
        let name_str = entry_name.to_string_lossy();
        
        if name_str.starts_with(&format!("{}.backup.", file_stem)) {
            let metadata = entry.metadata().await?;
            
            backups.push(BackupInfo {
                id: uuid::Uuid::new_v4().to_string(),
                original_path: original_path.clone(),
                backup_path: entry.path().to_string_lossy().to_string(),
                created_at: metadata.created()
                    .map(|time| time.into())
                    .unwrap_or_else(|_| Utc::now()),
                size_bytes: metadata.len(),
            });
        }
    }
    
    // Sort by creation time, newest first
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(backups)
}

#[command]
pub async fn restore_backup(backup_path: String, target_path: String) -> Result<FileOperation, ClarezaError> {
    let safe_backup_path = FileUtils::safe_canonicalize(&backup_path)?;
    let safe_target_path = FileUtils::safe_canonicalize(&target_path)?;
    
    if !safe_backup_path.exists() {
        return Err(ClarezaError::FileNotFound(backup_path));
    }
    
    // Create backup of current file before restoring
    if safe_target_path.exists() {
        let current_backup = FileUtils::create_backup_path(&safe_target_path)?;
        tokio::fs::copy(&safe_target_path, current_backup).await?;
    }
    
    // Restore from backup
    tokio::fs::copy(&safe_backup_path, &safe_target_path).await?;
    
    Ok(FileOperation {
        success: true,
        message: format!("Backup restored to: {}", safe_target_path.display()),
        path: Some(safe_target_path.to_string_lossy().to_string()),
        content: None,
        metadata: None,
    })
}

#[command]
pub async fn export_document(
    content: String,
    options: ExportOptions,
    output_path: String
) -> Result<FileOperation, ClarezaError> {
    let safe_path = PathBuf::from(&output_path);
    
    match options.format.as_str() {
        "html" => {
            let html_content = format!(
                r#"<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clareza Document</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }}
        h1, h2, h3 {{ color: #333; }}
        p {{ margin-bottom: 1em; }}
    </style>
</head>
<body>
    {}
</body>
</html>"#, content
            );
            FileUtils::atomic_write(&safe_path, &html_content).await?;
        },
        "md" => {
            // Convert HTML to Markdown (basic conversion)
            let md_content = content
                .replace("<p>", "")
                .replace("</p>", "\n\n")
                .replace("<br>", "\n")
                .replace("<strong>", "**")
                .replace("</strong>", "**")
                .replace("<em>", "_")
                .replace("</em>", "_");
            
            FileUtils::atomic_write(&safe_path, &md_content).await?;
        },
        _ => {
            return Err(ClarezaError::Export(format!("Unsupported format: {}", options.format)));
        }
    }
    
    Ok(FileOperation {
        success: true,
        message: format!("Document exported to: {}", safe_path.display()),
        path: Some(safe_path.to_string_lossy().to_string()),
        content: None,
        metadata: None,
    })
}

#[command]
pub async fn get_recent_files() -> Result<Vec<RecentFile>, ClarezaError> {
    // In a real implementation, you'd store recent files in app data
    // For now, return empty list
    Ok(Vec::new())
}

#[command]
pub async fn validate_path(path: String) -> Result<bool, ClarezaError> {
    match FileUtils::safe_canonicalize(&path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}