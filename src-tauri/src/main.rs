// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod utils;
mod errors;
mod checks;
mod gemini;

use commands::{create_document, open_document, save_document, save_document_as, create_backup, list_backups, restore_backup, get_recent_files, validate_path, get_document_versions, get_document_version};

#[tauri::command]
fn ping() -> String {
    "pong".into()
}

fn main() {
    let _ = fix_path_env::fix();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            create_document,
            open_document,
            save_document,
            save_document_as,
            create_backup,
            list_backups,
            restore_backup,
            get_document_versions,
            get_document_version,
            get_recent_files,
            validate_path,
            ping,
            gemini::send_prompt_to_gemini,
            commands::start_gemini_cli,
            commands::stop_gemini_cli,
            commands::open_terminal,
            checks::check_node,
            checks::check_npm,
            checks::check_gemini,
            commands::debug_get_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
