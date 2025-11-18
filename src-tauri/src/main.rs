// src-tauri/src/main.rs
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod checks;
mod commands;
mod errors;
mod gemini;
mod models;
mod utils;

#[tauri::command]
fn ping() -> String {
    "pong".into()
}

use checks::{check_gemini, check_node, check_npm};

use commands::{
    create_backup, create_document, debug_get_path, get_document_version, get_document_versions,
    get_recent_files, list_backups, open_document, open_terminal, restore_backup, save_document,
    save_document_as, show_open_dialog, validate_path,
};

use gemini::{get_gemini_model, send_prompt_to_gemini, set_gemini_model};

fn main() {
    let _ = fix_path_env::fix();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Checks
            check_node,
            check_npm,
            check_gemini,
            // Document commands
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
            open_terminal,
            show_open_dialog,
            debug_get_path,
            // Gemini CLI commands
            send_prompt_to_gemini,
            set_gemini_model,
            get_gemini_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
