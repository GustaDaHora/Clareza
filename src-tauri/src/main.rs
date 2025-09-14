// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod utils;
mod errors;
mod checks;

use commands::{
    create_document, open_document, save_document, save_document_as, 
    create_backup, list_backups, restore_backup, export_document,
    get_recent_files, validate_path
};

#[tauri::command]
fn ping() -> String {
    "pong".into()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            create_document,
            open_document,
            save_document,
            save_document_as,
            create_backup,
            list_backups,
            restore_backup,
            export_document,
            get_recent_files,
            validate_path,
            ping,
            checks::check_node,
            checks::check_npm,
            checks::check_gemini
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
