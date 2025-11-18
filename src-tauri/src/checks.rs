// src-tauri/src/checks.rs
use serde::{Deserialize, Serialize};
use std::env;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DependencyResult {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn check_node() -> DependencyResult {
    check_command_with_fallbacks("node", &["-v"], "Node.js")
}

#[tauri::command]
pub async fn check_npm() -> DependencyResult {
    check_npm_internal()
}

#[tauri::command]
pub async fn check_gemini() -> DependencyResult {
    check_gemini_internal()
}

fn check_npm_internal() -> DependencyResult {
    // Try different approaches for npm on Windows
    let npm_commands = vec![
        ("npm", vec!["-v"]),
        ("npm.cmd", vec!["-v"]),
        ("npm.exe", vec!["-v"]),
    ];

    for (cmd, args) in npm_commands {
        let result = check_command_internal(cmd, &args, "NPM");
        if result.installed {
            return result;
        }
    }

    // If all direct approaches fail, try through cmd
    check_command_through_cmd("npm -v", "NPM")
}

fn check_gemini_internal() -> DependencyResult {
    // Try different approaches for gemini CLI
    let gemini_commands = vec![
        ("gemini", vec!["--version"]),
        ("gemini.exe", vec!["--version"]),
        ("gemini", vec!["-v"]),
        ("gemini.exe", vec!["-v"]),
    ];

    for (cmd, args) in gemini_commands {
        let result = check_command_internal(cmd, &args, "Gemini CLI");
        if result.installed {
            return result;
        }
    }

    // If all direct approaches fail, try through cmd
    let cmd_result = check_command_through_cmd("gemini --version", "Gemini CLI");
    if !cmd_result.installed {
        // Try alternative version flag
        check_command_through_cmd("gemini -v", "Gemini CLI")
    } else {
        cmd_result
    }
}

fn check_command_with_fallbacks(command: &str, args: &[&str], name: &str) -> DependencyResult {
    // First try the direct command
    let result = check_command_internal(command, args, name);
    if result.installed {
        return result;
    }

    // On Windows, try with .exe extension
    if cfg!(target_os = "windows") {
        let exe_command = format!("{}.exe", command);
        let exe_result = check_command_internal(&exe_command, args, name);
        if exe_result.installed {
            return exe_result;
        }

        // Try with .cmd extension (common for npm)
        let cmd_command = format!("{}.cmd", command);
        let cmd_result = check_command_internal(&cmd_command, args, name);
        if cmd_result.installed {
            return cmd_result;
        }
    }

    // Last resort: try through system shell
    let shell_cmd = format!("{} {}", command, args.join(" "));
    check_command_through_cmd(&shell_cmd, name)
}

fn check_command_through_cmd(full_command: &str, name: &str) -> DependencyResult {
    let (shell, shell_arg) = if cfg!(target_os = "windows") {
        ("cmd", "/C")
    } else {
        ("sh", "-c")
    };

    match Command::new(shell)
        .arg(shell_arg)
        .arg(full_command)
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let stdout_clone = stdout.clone();
            let stderr_clone = stderr.clone();

            println!(
                "checks: {} (via shell) exit status: {}",
                name, output.status
            );
            println!(
                "checks: {} (via shell) stdout='{}' stderr='{}'",
                name, stdout, stderr
            );

            // Check both stdout and stderr for version info
            let version_output = if !stdout.is_empty() {
                stdout
            } else if !stderr.is_empty() && output.status.success() {
                stderr
            } else {
                String::new()
            };

            if output.status.success() && !version_output.is_empty() {
                let version = extract_version(&version_output);
                DependencyResult {
                    name: name.to_string(),
                    installed: true,
                    version: Some(version),
                    error: None,
                }
            } else {
                DependencyResult {
                    name: name.to_string(),
                    installed: false,
                    version: None,
                    error: Some(format!(
                        "Command failed. stdout: '{}', stderr: '{}'",
                        stdout_clone, stderr_clone
                    )),
                }
            }
        }
        Err(e) => {
            println!("checks: {} (via shell) command failed: {}", name, e);
            DependencyResult {
                name: name.to_string(),
                installed: false,
                version: None,
                error: Some(format!("Shell execution failed: {}", e)),
            }
        }
    }
}

fn check_command_internal(command: &str, args: &[&str], name: &str) -> DependencyResult {
    // Set up environment to include common paths
    let mut cmd = Command::new(command);
    cmd.args(args);

    // On Windows, ensure we have the right environment
    if cfg!(target_os = "windows") {
        // Add common Node.js installation paths to PATH if not already present
        if let Ok(current_path) = env::var("PATH") {
            let additional_paths = vec![
                r"C:\Program Files\nodejs",
                r"C:\Program Files (x86)\nodejs",
                r"C:\Users\%USERNAME%\AppData\Roaming\npm",
            ];

            let mut new_path = current_path.clone();
            for path in additional_paths {
                if !current_path.to_lowercase().contains(&path.to_lowercase()) {
                    new_path.push(';');
                    new_path.push_str(path);
                }
            }
            cmd.env("PATH", new_path);
        }
    }

    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let stdout_clone = stdout.clone();
            let stderr_clone = stderr.clone();

            println!("checks: {} exit status: {}", name, output.status);
            println!("checks: {} stdout='{}' stderr='{}'", name, stdout, stderr);

            // Some tools output version to stderr instead of stdout
            let version_output = if !stdout.is_empty() {
                stdout
            } else if !stderr.is_empty() && output.status.success() {
                stderr
            } else {
                String::new()
            };

            if output.status.success() && !version_output.is_empty() {
                let version = extract_version(&version_output);
                DependencyResult {
                    name: name.to_string(),
                    installed: true,
                    version: Some(version),
                    error: None,
                }
            } else {
                DependencyResult {
                    name: name.to_string(),
                    installed: false,
                    version: None,
                    error: Some(if stderr_clone.is_empty() {
                        if stdout_clone.is_empty() {
                            "No output received".to_string()
                        } else {
                            stdout_clone
                        }
                    } else {
                        stderr_clone
                    }),
                }
            }
        }
        Err(e) => {
            println!("checks: {} command failed: {}", name, e);
            DependencyResult {
                name: name.to_string(),
                installed: false,
                version: None,
                error: Some(e.to_string()),
            }
        }
    }
}

fn extract_version(output: &str) -> String {
    // Clean up version string - handle various formats
    let cleaned = output.trim();

    // Remove common prefixes
    let version = cleaned
        .strip_prefix('v')
        .or_else(|| cleaned.strip_prefix("version "))
        .or_else(|| cleaned.strip_prefix("Version "))
        .unwrap_or(cleaned);

    // Take only the first line if multi-line output
    let first_line = version.lines().next().unwrap_or(version);

    // Extract just the version number if there's additional text
    if let Some(space_pos) = first_line.find(' ') {
        first_line[..space_pos].to_string()
    } else {
        first_line.to_string()
    }
}
