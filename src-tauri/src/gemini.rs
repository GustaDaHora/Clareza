// src-tauri/src/gemini.rs

use once_cell::sync::Lazy;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::RwLock;
use tokio::time::timeout;

#[derive(Clone, serde::Serialize)]
struct TerminalOutput {
    message: String,
    stream: String,
}

#[derive(Clone, serde::Serialize)]
struct GeminiComplete {
    content: String,
}

#[derive(Clone)]
struct GeminiState {
    current_model: Arc<RwLock<String>>,
}

static GEMINI_STATE: Lazy<GeminiState> = Lazy::new(|| GeminiState {
    current_model: Arc::new(RwLock::new("gemini-2.5-flash".to_string())),
});

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

fn is_batch_file(path: &str) -> bool {
    let path_lower = path.to_lowercase();
    path_lower.ends_with(".cmd") || path_lower.ends_with(".bat")
}

async fn execute_gemini_command_streaming(
    gemini_path: &str,
    prompt: &str,
    model: Option<&str>,
    app_handle: AppHandle,
    timeout_secs: u64,
) -> Result<String, String> {
    println!("[GEMINI] Executing command with streaming (timeout: {}s)", timeout_secs);
    println!("[GEMINI] Gemini path: {}", gemini_path);
    println!("[GEMINI] Prompt length: {}", prompt.len());
    
    // Build the command arguments
    let mut args = Vec::new();
    
    if let Some(m) = model {
        args.push("-m".to_string());
        args.push(m.to_string());
    }
    
    args.push("--output-format".to_string());
    args.push("stream-json".to_string());
    
    // On Windows, if it's a batch file, we need to use cmd.exe /C
    let mut cmd = if cfg!(target_os = "windows") && is_batch_file(gemini_path) {
        println!("[GEMINI] Detected batch file, using cmd.exe wrapper");
        let mut c = tokio::process::Command::new("cmd");
        c.arg("/C");
        c.arg(gemini_path);
        c
    } else {
        tokio::process::Command::new(gemini_path)
    };
    
    // Add all arguments
    cmd.args(&args);
    
    // Use stdin for the prompt to avoid command line length limits
    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());
    
    println!("[GEMINI] Spawning process with stdin...");
    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn gemini process: {}", e))?;
    
    // Write prompt to stdin
    if let Some(mut stdin) = child.stdin.take() {
        println!("[GEMINI] Writing prompt to stdin ({} bytes)...", prompt.as_bytes().len());
        stdin.write_all(prompt.as_bytes()).await
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        stdin.flush().await
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;
        drop(stdin); // Close stdin to signal end of input
        println!("[GEMINI] Stdin written and closed");
    }
    
    let stdout = child.stdout.take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;
    
    let stderr = child.stderr.take()
        .ok_or_else(|| "Failed to capture stderr".to_string())?;
    
    let stdout_reader = BufReader::new(stdout);
    let stderr_reader = BufReader::new(stderr);
    
    let app_handle_stdout = app_handle.clone();
    let app_handle_stderr = app_handle.clone();
    
    let accumulated_content = Arc::new(RwLock::new(String::new()));
    let accumulated_content_clone = accumulated_content.clone();
    
    let stdout_handle = tokio::spawn(async move {
        let mut lines = stdout_reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                if let Some(msg_type) = json.get("type").and_then(|v| v.as_str()) {
                    if msg_type == "message" {
                        if let Some(role) = json.get("role").and_then(|v| v.as_str()) {
                            if role == "assistant" {
                                if let Some(content) = json.get("content").and_then(|v| v.as_str()) {
                                    accumulated_content_clone.write().await.push_str(content);
                                    
                                    if let Some(window) = app_handle_stdout.get_webview_window("main") {
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
                }
                
                if let Some(error) = json.get("error").and_then(|v| v.as_str()) {
                    if let Some(window) = app_handle_stdout.get_webview_window("main") {
                        let _ = window.emit(
                            "terminal-output",
                            TerminalOutput {
                                message: format!("Error: {}", error),
                                stream: "stderr".to_string(),
                            },
                        );
                    }
                }
            } else {
                if let Some(window) = app_handle_stdout.get_webview_window("main") {
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
    });
    
    let stderr_handle = tokio::spawn(async move {
        let mut lines = stderr_reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
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
    });
    
    let wait_result = timeout(Duration::from_secs(timeout_secs), child.wait()).await;
    
    tokio::join!(stdout_handle, stderr_handle);
    
    match wait_result {
        Ok(Ok(status)) => {
            if !status.success() {
                return Err(format!("Gemini CLI exited with status: {}", status));
            }
            
            let content = accumulated_content.read().await.clone();
            println!("[GEMINI] Process completed successfully, accumulated {} chars", content.len());
            Ok(content)
        }
        Ok(Err(e)) => Err(format!("Failed to wait for process: {}", e)),
        Err(_) => {
            let _ = child.kill().await;
            Err(format!("Command timed out after {} seconds", timeout_secs))
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
    println!("[GEMINI] Prompt length: {}", prompt.len());
    
    let gemini_path = find_gemini_executable()?;
    
    let full_prompt = if let Some(content) = &file_content {
        println!("[GEMINI] File content length: {}", content.len());
        if prompt.contains("@file_reference") {
            prompt.replace("@file_reference", &format!("\n\nConteúdo do arquivo:\n```\n{}\n```\n", content))
        } else {
            format!("{}\n\nConteúdo do arquivo atual:\n```\n{}\n```", prompt, content)
        }
    } else {
        println!("[GEMINI] No file content provided");
        prompt.clone()
    };
    
    println!("[GEMINI] Full prompt length: {}", full_prompt.len());
    println!("[GEMINI] Full prompt preview (first 200 chars): {}", &full_prompt[..full_prompt.len().min(200)]);
    
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
    
    let app_handle_clone = app_handle.clone();
    let model = GEMINI_STATE.current_model.read().await.clone();
    
    tokio::spawn(async move {
        println!("[GEMINI] Background task started");
        match execute_gemini_command_streaming(&gemini_path, &full_prompt, Some(&model), app_handle_clone.clone(), 120).await {
            Ok(complete_content) => {
                println!("[GEMINI] Got complete content: {} chars", complete_content.len());
                println!("[GEMINI] Content preview: {}", &complete_content[..complete_content.len().min(100)]);
                
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
                    
                    println!("[GEMINI] About to emit gemini-complete event");
                    let payload = GeminiComplete {
                        content: complete_content.clone(),
                    };
                    println!("[GEMINI] Payload content length: {}", payload.content.len());
                    
                    match app_handle_clone.emit("gemini-complete", payload) {
                        Ok(_) => println!("[GEMINI] Event emitted successfully"),
                        Err(e) => println!("[GEMINI] Failed to emit event: {:?}", e),
                    }
                }
            }
            Err(e) => {
                println!("[GEMINI] Error in background task: {}", e);
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
        println!("[GEMINI] Background task completed");
    });
    
    Ok(())
}

#[tauri::command]
pub async fn set_gemini_model(model: String) -> Result<(), String> {
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