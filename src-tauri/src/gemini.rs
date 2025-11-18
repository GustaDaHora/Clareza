// src-tauri/src/gemini.rs

use once_cell::sync::Lazy;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::RwLock;
use tokio::time::timeout;

#[derive(Clone, serde::Serialize)]
struct TerminalOutput {
    message: String,
    stream: String,
}

#[derive(Clone)]
struct GeminiState {
    current_model: Arc<RwLock<String>>,
}

static GEMINI_STATE: Lazy<GeminiState> = Lazy::new(|| GeminiState {
    current_model: Arc::new(RwLock::new("gemini-2.5-flash".to_string())),
});

/// Find the gemini executable in PATH
fn find_gemini_executable() -> Result<String, String> {
    let path_var = env::var("PATH")
        .map_err(|_| "PATH environment variable not found".to_string())?;
    
    let separator = if cfg!(target_os = "windows") { ';' } else { ':' };
    let extensions = if cfg!(target_os = "windows") {
        vec!["gemini.cmd", "gemini.exe", "gemini.bat", "gemini"]
    } else {
        vec!["gemini"]
    };
    
    for path in path_var.split(separator) {
        for ext in &extensions {
            let gemini_path = std::path::Path::new(path).join(ext);
            if gemini_path.exists() && gemini_path.is_file() {
                return Ok(gemini_path.to_string_lossy().to_string());
            }
        }
    }
    
    Err("Gemini CLI not found in PATH".to_string())
}

/// Execute a Gemini command with streaming output capture
async fn execute_gemini_command_streaming(
    gemini_path: &str,
    prompt: &str,
    model: Option<&str>,
    app_handle: AppHandle,
    timeout_secs: u64,
) -> Result<(), String> {
    println!("[GEMINI] Executing command with streaming (timeout: {}s)", timeout_secs);
    println!("[GEMINI] Model: {:?}", model);
    println!("[GEMINI] Prompt length: {} chars", prompt.len());
    println!("[GEMINI] Gemini path: {}", gemini_path);
    
    // On Windows, execute .cmd files directly without cmd.exe wrapper
    // This prevents cmd.exe from interpreting special characters in arguments
    println!("[GEMINI] Executing directly: {}", gemini_path);
    let mut cmd = tokio::process::Command::new(gemini_path);
    
    // Add model flag if specified
    if let Some(m) = model {
        println!("[GEMINI] Adding model flag: -m {}", m);
        cmd.arg("-m").arg(m);
    }
    
    // Use streaming JSON output format for real-time events
    println!("[GEMINI] Adding output format: stream-json");
    cmd.arg("--output-format").arg("stream-json");
    
    // Use non-interactive mode with -p flag for single prompt
    // The key fix: pass the prompt as a single argument without manual escaping
    println!("[GEMINI] Adding prompt flag with {} chars", prompt.len());
    cmd.arg("-p");
    cmd.arg(prompt);  // Tokio will handle the escaping automatically
    
    // Capture stdout and stderr separately
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    
    println!("[GEMINI] About to spawn process...");
    println!("[GEMINI] Command: {:?}", cmd);
    
    // Spawn the process
    let mut child = cmd.spawn()
        .map_err(|e| {
            println!("[GEMINI] Failed to spawn: {}", e);
            format!("Failed to spawn gemini process: {}", e)
        })?;
    
    println!("[GEMINI] Process spawned successfully");
    
    println!("[GEMINI] Attempting to take stdout handle...");
    let stdout = child.stdout.take()
        .ok_or_else(|| {
            println!("[GEMINI] Failed to take stdout handle");
            "Failed to capture stdout".to_string()
        })?;
    
    println!("[GEMINI] Attempting to take stderr handle...");
    let stderr = child.stderr.take()
        .ok_or_else(|| {
            println!("[GEMINI] Failed to take stderr handle");
            "Failed to capture stderr".to_string()
        })?;
    
    println!("[GEMINI] Creating buffered readers...");
    let stdout_reader = BufReader::new(stdout);
    let stderr_reader = BufReader::new(stderr);
    
    let app_handle_stdout = app_handle.clone();
    let app_handle_stderr = app_handle.clone();
    
    println!("[GEMINI] Spawning stdout reader task...");
    // Spawn tasks to read stdout and stderr concurrently
    let stdout_handle = tokio::spawn(async move {
        println!("[GEMINI STDOUT TASK] Started");
        let mut lines = stdout_reader.lines();
        let mut line_count = 0;
        while let Ok(Some(line)) = lines.next_line().await {
            line_count += 1;
            println!("[GEMINI STDOUT] Line {}: {}", line_count, line);
            
            if let Some(window) = app_handle_stdout.get_webview_window("main") {
                // Try to parse as JSON first (stream-json format)
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    // Extract content from message events
                    if let Some(msg_type) = json.get("type").and_then(|v| v.as_str()) {
                        if msg_type == "message" {
                            if let Some(role) = json.get("role").and_then(|v| v.as_str()) {
                                if role == "assistant" {
                                    if let Some(content) = json.get("content").and_then(|v| v.as_str()) {
                                        let _ = window.emit(
                                            "terminal-output",
                                            TerminalOutput {
                                                message: content.to_string(),
                                                stream: "stdout".to_string(),
                                            },
                                        );
                                    }
                                }
                            }
                        }
                    }
                    
                    // Handle error events
                    if let Some(error) = json.get("error").and_then(|v| v.as_str()) {
                        let _ = window.emit(
                            "terminal-output",
                            TerminalOutput {
                                message: format!("Error: {}", error),
                                stream: "stderr".to_string(),
                            },
                        );
                    }
                } else {
                    // Fallback to plain text output
                    let _ = window.emit(
                        "terminal-output",
                        TerminalOutput {
                            message: line,
                            stream: "stdout".to_string(),
                        },
                    );
                }
            }
        }
        println!("[GEMINI STDOUT TASK] Finished reading {} lines", line_count);
    });
    
    println!("[GEMINI] Spawning stderr reader task...");
    let stderr_handle = tokio::spawn(async move {
        println!("[GEMINI STDERR TASK] Started");
        let mut lines = stderr_reader.lines();
        let mut line_count = 0;
        while let Ok(Some(line)) = lines.next_line().await {
            line_count += 1;
            println!("[GEMINI STDERR] Line {}: {}", line_count, line);
            
            if let Some(window) = app_handle_stderr.get_webview_window("main") {
                let _ = window.emit(
                    "terminal-output",
                    TerminalOutput {
                        message: line,
                        stream: "stderr".to_string(),
                    },
                );
            }
        }
        println!("[GEMINI STDERR TASK] Finished reading {} lines", line_count);
    });
    
    println!("[GEMINI] Starting to wait for process with timeout...");
    // Wait for the process with timeout
    let wait_result = timeout(Duration::from_secs(timeout_secs), child.wait()).await;
    
    println!("[GEMINI] Process wait completed, result: {:?}", wait_result.as_ref().map(|r| r.as_ref().map(|s| s.code())));
    
    // Wait for output tasks to complete
    println!("[GEMINI] Waiting for output reader tasks to complete...");
    let (stdout_result, stderr_result) = tokio::join!(stdout_handle, stderr_handle);
    println!("[GEMINI] Output tasks completed - stdout: {:?}, stderr: {:?}", 
        stdout_result.is_ok(), stderr_result.is_ok());
    
    match wait_result {
        Ok(Ok(status)) => {
            println!("[GEMINI] Process exited with status: {} (code: {:?})", status, status.code());
            
            if !status.success() {
                let error_msg = format!("Gemini CLI exited with status: {}", status);
                println!("[GEMINI] Error: {}", error_msg);
                return Err(error_msg);
            }
            
            println!("[GEMINI] Process completed successfully");
            Ok(())
        }
        Ok(Err(e)) => {
            let error_msg = format!("Failed to wait for process: {}", e);
            println!("[GEMINI] Error: {}", error_msg);
            Err(error_msg)
        }
        Err(_) => {
            println!("[GEMINI] Process timed out, attempting to kill...");
            // Kill the process on timeout
            match child.kill().await {
                Ok(_) => println!("[GEMINI] Process killed successfully"),
                Err(e) => println!("[GEMINI] Failed to kill process: {}", e),
            }
            let error_msg = format!("Command timed out after {} seconds", timeout_secs);
            println!("[GEMINI] Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn send_prompt_to_gemini(
    app_handle: AppHandle,
    prompt: String,
    file_content: Option<String>,
) -> Result<(), String> {
    println!("[GEMINI] Received prompt request");
    
    // Find gemini executable
    let gemini_path = find_gemini_executable()?;
    
    // Build full prompt with file context if provided
    let full_prompt = if let Some(content) = file_content {
        // Replace @file_reference with the actual content
        // The prompt should have instruction first, then the content to process
        if prompt.contains("@file_reference") {
            prompt.replace("@file_reference", &format!("Arquivo: {}", content))
        } else {
            // Fallback: append content at the end
            format!("{} Conteúdo do arquivo: {}", prompt, content)
        }
    } else {
        prompt.clone()
    };
    
    // Emit user prompt to UI (show shortened version)
    if let Some(window) = app_handle.get_webview_window("main") {
        let display_prompt = if prompt.len() > 100 {
            format!("{}...", &prompt[..100])
        } else {
            prompt.clone()
        };
        
        let _ = window.emit(
            "terminal-output",
            TerminalOutput {
                message: format!("❯ {}", display_prompt),
                stream: "system".to_string(),
            },
        );
        
        let _ = window.emit(
            "terminal-output",
            TerminalOutput {
                message: "⏳ Processando...".to_string(),
                stream: "system".to_string(),
            },
        );
    }
    
    // Execute in background
    let app_handle_clone = app_handle.clone();
    let model = GEMINI_STATE.current_model.read().await.clone();
    
    tokio::spawn(async move {
        match execute_gemini_command_streaming(&gemini_path, &full_prompt, Some(&model), app_handle_clone.clone(), 120).await {
            Ok(_) => {
                if let Some(window) = app_handle_clone.get_webview_window("main") {
                    let _ = window.emit(
                        "terminal-output",
                        TerminalOutput {
                            message: "─────────────────────────────────".to_string(),
                            stream: "system".to_string(),
                        },
                    );
                    
                    let _ = window.emit(
                        "terminal-output",
                        TerminalOutput {
                            message: "✅ Concluído".to_string(),
                            stream: "system".to_string(),
                        },
                    );
                }
            }
            Err(e) => {
                if let Some(window) = app_handle_clone.get_webview_window("main") {
                    let _ = window.emit(
                        "terminal-output",
                        TerminalOutput {
                            message: format!("❌ Erro: {}", e),
                            stream: "stderr".to_string(),
                        },
                    );
                }
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
pub async fn set_gemini_model(model: String) -> Result<(), String> {
    // Validate model name
    let valid_models = vec![
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
    ];
    
    if !valid_models.contains(&model.as_str()) {
        return Err(format!(
            "Invalid model '{}'. Valid models: {}",
            model,
            valid_models.join(", ")
        ));
    }
    
    *GEMINI_STATE.current_model.write().await = model.clone();
    println!("[GEMINI] Model changed to: {}", model);
    Ok(())
}

#[tauri::command]
pub async fn get_gemini_model() -> Result<String, String> {
    Ok(GEMINI_STATE.current_model.read().await.clone())
}