// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    clareza_lib::run();
}
