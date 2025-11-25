// src-tauri/src/commands.rs
use std::env;
use std::path::PathBuf;

use chrono::Utc;
use tauri::command;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::oneshot;

use crate::errors::ClarezaError;
use crate::models::{BackupInfo, ClarezaDocument, DocumentMetadata, FileOperation, RecentFile};
use crate::utils::{create_document_metadata, update_content_stats, FileUtils};

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
pub async fn show_open_dialog(window: tauri::Window) -> Result<FileOperation, ClarezaError> {
    let (tx, rx) = oneshot::channel();

    window
        .dialog()
        .file()
        .add_filter("Markdown Document", &["md"])
        .add_filter("All Files", &["*"])
        .set_title("Open Document")
        .pick_file(move |path_opt| {
            let _ = tx.send(path_opt);
        });

    let path_opt = rx
        .await
        .map_err(|_| ClarezaError::Path("Dialog failed to respond".to_string()))?;

    let Some(file_path) = path_opt else {
        return Ok(FileOperation {
            success: false,
            message: "Open cancelled".to_string(),
            path: None,
            content: None,
            metadata: None,
        });
    };

    // Convert to PathBuf
    let final_path: PathBuf = file_path
        .into_path()
        .map_err(|e| ClarezaError::Path(format!("Invalid file path: {}", e)))?;

    Ok(FileOperation {
        success: true,
        message: "File selected successfully".to_string(),
        path: Some(final_path.to_string_lossy().to_string()),
        content: None,
        metadata: None,
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
    let (document_content, metadata) =
        if safe_path.extension().and_then(|ext| ext.to_str()) == Some("clareza") {
            let document: ClarezaDocument = serde_json::from_str(&content)?;
            (document.content, Some(document.metadata))
        } else {
            // Plain text file
            let mut metadata = create_document_metadata(
                &safe_path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled"),
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
    metadata: Option<DocumentMetadata>,
) -> Result<FileOperation, ClarezaError> {
    let safe_path = PathBuf::from(&path);

    let mut doc_metadata = metadata.unwrap_or_else(|| {
        create_document_metadata(
            &safe_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Untitled"),
        )
    });

    update_content_stats(&mut doc_metadata, &content);

    let final_content = if safe_path.extension().and_then(|ext| ext.to_str()) == Some("clareza") {
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

    // Create a new version
    let versions_dir = FileUtils::get_versions_dir(&safe_path)?;
    tokio::fs::create_dir_all(&versions_dir).await?;
    let timestamp = Utc::now().to_rfc3339().replace(":", "-");
    let version_path = versions_dir.join(timestamp);
    tokio::fs::write(version_path, &final_content).await?;

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
    window: tauri::Window,
    content: String,
    suggested_name: Option<String>,
    metadata: Option<DocumentMetadata>,
) -> Result<FileOperation, ClarezaError> {
    let mut dialog = window
        .dialog()
        .file()
        .add_filter("Markdown Document", &["md"]) // Updated filter for .md
        .set_title("Save Document As");

    if let Some(suggested) = &suggested_name {
        dialog = dialog.set_file_name(suggested);
    }

    let (tx, rx) = oneshot::channel();

    dialog.save_file(move |path_opt| {
        let _ = tx.send(path_opt);
    });

    let path_opt = rx
        .await
        .map_err(|_| ClarezaError::Path("Dialog failed to respond".to_string()))?;

    let Some(save_path) = path_opt else {
        return Err(ClarezaError::Path("Save operation canceled".to_string()));
    };

    // Convert to PathBuf (handles Path variant; attempts Url conversion)
    let mut final_path: PathBuf = save_path
        .into_path()
        .map_err(|e| ClarezaError::Path(format!("Invalid file path: {}", e)))?;

    // Append .md if missing (using OsStr for precision)
    if final_path
        .extension()
        .map_or(true, |ext| ext != std::ffi::OsStr::new("md"))
    {
        final_path = final_path.with_extension("md");
    }

    // Reuse save logic (will save as plain content since extension is .md)
    save_document(final_path.to_string_lossy().to_string(), content, metadata).await
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
    let parent = safe_path
        .parent()
        .ok_or_else(|| ClarezaError::Path("Cannot determine parent directory".to_string()))?;

    let file_stem = safe_path
        .file_stem()
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
                created_at: metadata
                    .created()
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
pub async fn restore_backup(
    backup_path: String,
    target_path: String,
) -> Result<FileOperation, ClarezaError> {
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
pub async fn open_terminal() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/K", "start"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(&["-a", "Terminal", "."])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("gnome-terminal")
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[command]
pub async fn get_document_versions(path: String) -> Result<Vec<String>, ClarezaError> {
    let safe_path = PathBuf::from(&path);
    let versions_dir = FileUtils::get_versions_dir(&safe_path)?;
    if !versions_dir.exists() {
        return Ok(Vec::new());
    }

    let mut versions = Vec::new();
    let mut entries = tokio::fs::read_dir(versions_dir).await?;
    while let Some(entry) = entries.next_entry().await? {
        versions.push(entry.file_name().to_string_lossy().to_string());
    }
    versions.sort();
    Ok(versions)
}

#[command]
pub async fn get_document_version(
    path: String,
    version: String,
) -> Result<FileOperation, ClarezaError> {
    let safe_path = PathBuf::from(&path);
    let versions_dir = FileUtils::get_versions_dir(&safe_path)?;
    let version_path = versions_dir.join(version);

    if !version_path.exists() {
        return Err(ClarezaError::FileNotFound(
            version_path.to_string_lossy().to_string(),
        ));
    }

    let content = FileUtils::read_with_encoding(&version_path).await?;

    let mut metadata = create_document_metadata(
        &safe_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled"),
    );
    update_content_stats(&mut metadata, &content);

    Ok(FileOperation {
        success: true,
        message: "Version loaded".to_string(),
        path: Some(safe_path.to_string_lossy().to_string()),
        content: Some(content),
        metadata: Some(metadata),
    })
}

#[command]
pub async fn get_recent_files() -> Result<Vec<RecentFile>, ClarezaError> {
    Ok(Vec::new())
}

#[command]
pub async fn validate_path(path: String) -> Result<(), ClarezaError> {
    FileUtils::safe_canonicalize(&path)?;
    Ok(())
}

#[command]
pub fn debug_get_path() -> Result<String, String> {
    env::var("PATH").map_err(|e| e.to_string())
}
#[command]
pub async fn install_bun() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", "https://bun.sh/"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("https://bun.sh/")
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg("https://bun.sh/")
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[command]
pub async fn install_gemini() -> Result<FileOperation, String> {
    let (shell, shell_arg) = if cfg!(target_os = "windows") {
        ("cmd", "/C")
    } else {
        ("sh", "-c")
    };

    // Check if Bun is installed
    let bun_check = std::process::Command::new(shell)
        .arg(shell_arg)
        .arg("bun --version")
        .output();

    let use_bun = match bun_check {
        Ok(output) => output.status.success(),
        Err(_) => false,
    };

    let install_cmd = if use_bun {
        "bun install -g @google/gemini-cli"
    } else {
        "npm install -g @google/gemini-cli"
    };

    let output = std::process::Command::new(shell)
        .arg(shell_arg)
        .arg(install_cmd)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(FileOperation {
            success: true,
            message: format!(
                "Gemini CLI installed successfully using {}",
                if use_bun { "Bun" } else { "npm" }
            ),
            path: None,
            content: None,
            metadata: None,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Failed to install Gemini CLI: {}", stderr))
    }
}
