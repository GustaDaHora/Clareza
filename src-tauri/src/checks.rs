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
pub async fn check_gemini() -> DependencyResult {
    check_gemini_internal()
}

#[tauri::command]
pub async fn check_bun() -> DependencyResult {
    check_command_with_fallbacks("bun", &["--version"], "Bun")
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
    // Determine the home directory and potential bun path
    let home_dir = if cfg!(target_os = "windows") {
        env::var("USERPROFILE").ok()
    } else {
        env::var("HOME").ok()
    };

    let mut command_path = command.to_string();
    let mut env_path_update = None;

    if let Some(home) = &home_dir {
        let bun_join = std::path::Path::new(home).join(".bun").join("bin");
        let bun_bin_str = bun_join.to_string_lossy().to_string();

        // Check if the command exists in bun bin dir
        let potential_cmd = if cfg!(target_os = "windows") {
            if command.ends_with(".exe") || command.ends_with(".cmd") {
                bun_join.join(command)
            } else {
                bun_join.join(format!("{}.exe", command))
            }
        } else {
            bun_join.join(command)
        };

        if potential_cmd.exists() {
            command_path = potential_cmd.to_string_lossy().to_string();
        }

        // Prepare PATH update
        if let Ok(current_path) = env::var("PATH") {
            if !current_path.contains(&bun_bin_str) {
                let separator = if cfg!(target_os = "windows") {
                    ";"
                } else {
                    ":"
                };
                env_path_update = Some(format!("{}{}{}", bun_bin_str, separator, current_path));
            }
        }
    }

    let mut cmd = Command::new(&command_path);
    cmd.args(args);

    if let Some(new_path) = env_path_update {
        cmd.env("PATH", new_path);
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

#[tauri::command]
pub async fn install_bun() -> Result<(), String> {
    let (shell, shell_arg, install_cmd) = if cfg!(target_os = "windows") {
        ("powershell", "-c", "irm bun.sh/install.ps1 | iex")
    } else {
        ("bash", "-c", "curl -fsSL https://bun.sh/install | bash")
    };

    println!(
        "Installing Bun via: {} {} {}",
        shell, shell_arg, install_cmd
    );

    let output = std::process::Command::new(shell)
        .arg(shell_arg)
        .arg(install_cmd)
        .output()
        .map_err(|e| format!("Failed to execute installation command: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        Err(format!(
            "Bun installation failed. Stdout: {}, Stderr: {}",
            stdout, stderr
        ))
    }
}

#[tauri::command]
pub async fn install_gemini() -> Result<crate::models::FileOperation, String> {
    let (shell, shell_arg) = if cfg!(target_os = "windows") {
        ("cmd", "/C")
    } else {
        ("sh", "-c")
    };

    // Need to find bun first because it might not be in PATH yet if just installed
    let bun_path = if cfg!(target_os = "windows") {
        let user_profile = env::var("USERPROFILE").unwrap_or_default();
        let path = std::path::Path::new(&user_profile).join(".bun/bin/bun.exe");
        if path.exists() {
            path.to_string_lossy().to_string()
        } else {
            "bun".to_string()
        }
    } else {
        let home = env::var("HOME").unwrap_or_default();
        let path = std::path::Path::new(&home).join(".bun/bin/bun");
        if path.exists() {
            path.to_string_lossy().to_string()
        } else {
            "bun".to_string()
        }
    };

    println!("Installing Gemini CLI using: {}", bun_path);

    let output = std::process::Command::new(shell)
        .arg(shell_arg)
        .arg(format!("{} add -g @google/gemini-cli", bun_path))
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(crate::models::FileOperation {
            success: true,
            message: "Gemini CLI installed successfully".to_string(),
            path: None,
            content: None,
            metadata: None,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Failed to install Gemini CLI: {}", stderr))
    }
}
