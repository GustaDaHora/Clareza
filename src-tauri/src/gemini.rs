// src-tauri/src/gemini.rs

use once_cell::sync::Lazy;
use std::env;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tokio::sync::Mutex;

// The payload for our frontend event
#[derive(Clone, serde::Serialize)]
struct TerminalOutput {
    message: String,
    stream: String, // "stdout", "stderr", or "system"
}

// Global state to hold the running child process
static GEMINI_PROCESS: Lazy<Mutex<Option<CommandChild>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
pub async fn send_prompt_to_gemini(prompt: String) -> Result<(), String> {
    let mut process_guard = GEMINI_PROCESS.lock().await;
    if let Some(child) = process_guard.as_mut() {
        // Write to stdin with newline
        let formatted_prompt = format!("{}\n", prompt);
        child
            .write(formatted_prompt.as_bytes())
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Gemini CLI is not running.".to_string())
    }
}

// Helper function to find gemini.cmd in PATH
fn find_gemini_in_path() -> Option<String> {
    if let Ok(path_var) = env::var("PATH") {
        println!("[DEBUG] Searching for gemini in PATH: {}", path_var);
        
        for path in path_var.split(';') {
            let gemini_cmd = std::path::Path::new(path).join("gemini.cmd");
            let gemini_exe = std::path::Path::new(path).join("gemini.exe");
            let gemini_bat = std::path::Path::new(path).join("gemini.bat");
            
            if gemini_cmd.exists() {
                println!("[DEBUG] Found gemini at: {}", gemini_cmd.display());
                return Some(gemini_cmd.to_string_lossy().to_string());
            }
            if gemini_exe.exists() {
                println!("[DEBUG] Found gemini at: {}", gemini_exe.display());
                return Some(gemini_exe.to_string_lossy().to_string());
            }
            if gemini_bat.exists() {
                println!("[DEBUG] Found gemini at: {}", gemini_bat.display());
                return Some(gemini_bat.to_string_lossy().to_string());
            }
        }
    }
    
    println!("[DEBUG] gemini not found in PATH");
    None
}

pub async fn start_gemini(app_handle: AppHandle) -> Result<(), String> {
    println!("[DEBUG] start_gemini called");
    
    let mut process_guard = GEMINI_PROCESS.lock().await;
    println!("[DEBUG] Acquired process lock");

    if process_guard.is_some() {
        println!("[DEBUG] Process already running, returning error");
        return Err("Gemini process is already running.".to_string());
    }

    // Try to find gemini in PATH
    let gemini_path = find_gemini_in_path()
        .ok_or_else(|| "Could not find gemini.cmd in PATH. Please ensure Gemini CLI is installed.".to_string())?;

    println!("[DEBUG] Using gemini path: {}", gemini_path);

    // Launch gemini in interactive mode using cmd.exe to handle .cmd files
    // We need to keep stdin open, so we'll launch it without --prompt-interactive
    // and just call it bare, which should start interactive mode
    let shell = app_handle.shell();
    
    println!("[DEBUG] About to spawn: cmd.exe /c {} (bare interactive mode)", gemini_path);
    
    let spawn_result = shell
        .command("cmd.exe")
        .args(&["/c", &gemini_path])
        .spawn();

    println!("[DEBUG] Spawn result: {:?}", spawn_result.is_ok());

    let (mut rx, child) = spawn_result
        .map_err(|e| {
            let err_msg = format!("Failed to spawn gemini process: {}", e);
            println!("[DEBUG] Spawn error: {}", err_msg);
            err_msg
        })?;

    println!("[DEBUG] Process spawned successfully");

    // Store the child process in the global state
    *process_guard = Some(child);
    println!("[DEBUG] Child process stored in global state");

    // CRITICAL: Write to stdin IMMEDIATELY to prevent the CLI from exiting
    // The Gemini CLI checks for stdin on startup and exits if nothing is there
    if let Some(child) = process_guard.as_mut() {
        println!("[DEBUG] Writing initial newline to stdin to keep process alive");
        // Write a newline to signal that stdin is active and will provide input
        let write_result = child.write(b"\n");
        println!("[DEBUG] Initial write result: {:?}", write_result.is_ok());
    }

    // Drop the lock so other functions can access the process
    drop(process_guard);
    println!("[DEBUG] Lock dropped");

    // Emit a success message immediately after spawning
    if let Some(window) = app_handle.get_webview_window("main") {
        println!("[DEBUG] Found main window, emitting startup message");
        let emit_result = window.emit(
            "terminal-output",
            TerminalOutput {
                message: "Gemini CLI started successfully. Ready for input.".to_string(),
                stream: "system".to_string(),
            },
        );
        println!("[DEBUG] Emit result: {:?}", emit_result.is_ok());
    } else {
        println!("[DEBUG] WARNING: Could not find main window!");
    }

    // Spawn a tokio task to handle events from the command
    println!("[DEBUG] Spawning event listener task");
    tauri::async_runtime::spawn(async move {
        println!("[DEBUG] Event listener task started");
        let mut event_count = 0;
        
        while let Some(event) = rx.recv().await {
            event_count += 1;
            println!("[DEBUG] Received event #{}: {:?}", event_count, 
                match &event {
                    CommandEvent::Stdout(_) => "Stdout",
                    CommandEvent::Stderr(_) => "Stderr",
                    CommandEvent::Terminated(_) => "Terminated",
                    CommandEvent::Error(_) => "Error",
                    _ => "Other"
                }
            );

            if let Some(window) = app_handle.get_webview_window("main") {
                let is_terminated = matches!(event, CommandEvent::Terminated(_));

                let (message, stream) = match event {
                    CommandEvent::Stdout(line) => {
                        let msg = String::from_utf8_lossy(&line).to_string();
                        println!("[DEBUG] Stdout: {}", msg);
                        (msg, "stdout")
                    }
                    CommandEvent::Stderr(line) => {
                        let msg = String::from_utf8_lossy(&line).to_string();
                        println!("[DEBUG] Stderr: {}", msg);
                        (msg, "stderr")
                    }
                    CommandEvent::Terminated(payload) => {
                        let msg = format!(
                            "Process terminated with code: {}",
                            payload.code.unwrap_or(-1)
                        );
                        println!("[DEBUG] Terminated: {}", msg);
                        (msg, "system")
                    }
                    CommandEvent::Error(msg) => {
                        let err_msg = format!("Process error: {}", msg);
                        println!("[DEBUG] Error: {}", err_msg);
                        (err_msg, "system")
                    }
                    _ => {
                        println!("[DEBUG] Ignoring other event type");
                        continue;
                    }
                };

                let emit_result = window.emit(
                    "terminal-output",
                    TerminalOutput {
                        message,
                        stream: stream.to_string(),
                    },
                );
                println!("[DEBUG] Event emit result: {:?}", emit_result.is_ok());

                // If the process terminated, break the loop
                if is_terminated {
                    println!("[DEBUG] Process terminated, breaking event loop");
                    break;
                }
            } else {
                println!("[DEBUG] WARNING: Lost reference to main window in event loop");
            }
        }

        println!("[DEBUG] Event loop ended, clearing global state");
        // Process has terminated, clear the global state
        let mut process_guard = GEMINI_PROCESS.lock().await;
        *process_guard = None;
        println!("[DEBUG] Global state cleared");
    });

    println!("[DEBUG] start_gemini returning Ok");
    Ok(())
}

pub async fn stop_gemini() -> Result<(), String> {
    let mut process_guard = GEMINI_PROCESS.lock().await;
    if let Some(child) = process_guard.take() {
        child
            .kill()
            .map_err(|e| format!("Failed to kill Gemini process: {}", e))?;
    }
    Ok(())
}