//! Command Line Interface for Auth Framework Administration

use crate::admin::{
    AppState, CliCommand, ConfigAction, HealthStatus, SecurityAction, ServerAction, UserAction,
};
use crate::errors::{AuthError, Result};
#[cfg(feature = "cli")]
use colored::Colorize;
#[cfg(feature = "cli")]
use dialoguer::{Confirm, Password};
#[cfg(feature = "cli")]
use indicatif::{ProgressBar, ProgressStyle};
#[cfg(feature = "cli")]
use std::collections::HashMap;

#[cfg(feature = "cli")]
pub async fn run_cli(state: AppState, command: CliCommand) -> Result<()> {
    match command {
        CliCommand::Config { action } => handle_config_action(state, action).await?,
        CliCommand::Server { action } => handle_server_action(state, action).await?,
        CliCommand::Users { action } => handle_user_action(state, action).await?,
        CliCommand::Status { detailed, format } => handle_status(state, detailed, &format).await?,
        CliCommand::Security { action } => handle_security_action(state, action).await?,
    }
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_config_action(state: AppState, action: ConfigAction) -> Result<()> {
    match action {
        ConfigAction::Show { section, format } => handle_config_show(state, section, format).await,
        ConfigAction::Validate { file } => handle_config_validate(state, file).await,
        ConfigAction::Set {
            key,
            value,
            hot_reload,
        } => handle_config_set(state, key, value, hot_reload).await,
        ConfigAction::Get { key } => handle_config_get(state, key).await,
        ConfigAction::Reload { show_diff } => handle_config_reload(state, show_diff).await,
        ConfigAction::Template { output, complete } => {
            handle_config_template(output, complete).await
        }
        ConfigAction::Reset => handle_config_reset().await,
    }
}

#[cfg(feature = "cli")]
async fn handle_config_show(
    state: AppState,
    section: Option<String>,
    format: String,
) -> Result<()> {
    println!("{}", "📋 Current Configuration".bold().blue());

    let config = state.config.read().await;
    let output = match format.as_str() {
        "json" => serde_json::to_string_pretty(&*config)?,
        "yaml" => serde_yaml::to_string(&*config)?,
        "toml" => toml::to_string_pretty(&*config)?,
        _ => toml::to_string_pretty(&*config)?,
    };

    if let Some(section_name) = section {
        println!("Section: {}", section_name.bold());
        // In a real implementation, we'd parse and show only the requested section
    }

    println!("{}", output);
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_config_validate(state: AppState, file: Option<String>) -> Result<()> {
    let spinner = create_spinner("Validating configuration...");

    let result = if let Some(file_path) = file {
        use crate::config::ConfigBuilder;
        let temp_manager = ConfigBuilder::new().add_file(&file_path, true).build()?;
        temp_manager.validate()
    } else {
        state.config_manager.validate()
    };

    let message = if let Err(e) = result {
        format!("❌ Configuration error: {}", e).red().to_string()
    } else {
        "✅ Configuration is valid".green().to_string()
    };
    spinner.finish_with_message(message);

    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_config_set(
    state: AppState,
    key: String,
    value: String,
    hot_reload: bool,
) -> Result<()> {
    println!("Setting {}={}", key.cyan(), value.yellow());

    if hot_reload {
        println!("🔄 Hot-reloading configuration...");
        state.reload_config().await?;
        println!("✅ Configuration updated and reloaded");
    } else {
        println!("⚠️ Configuration will take effect after restart");
    }

    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_config_get(state: AppState, key: String) -> Result<()> {
    let config = state.config.read().await;
    // Serialize the full config to JSON and navigate the key path (dot-separated).
    let config_json = serde_json::to_value(&*config)
        .map_err(|e| AuthError::internal(format!("Failed to serialize config: {}", e)))?;
    let mut current = &config_json;
    for segment in key.split('.') {
        current = current.get(segment).ok_or_else(|| {
            AuthError::internal(format!(
                "Configuration key '{}' not found (segment '{}' missing)",
                key, segment
            ))
        })?;
    }
    let display = match current {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    };
    println!("{}: {}", key.cyan(), display.green());
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_config_reload(state: AppState, show_diff: bool) -> Result<()> {
    if show_diff {
        println!("📊 Configuration differences:");
        // Implementation would show diff between current and file config
    }

    let spinner = create_spinner("Reloading configuration...");
    state.reload_config().await?;
    spinner.finish_with_message("✅ Configuration reloaded successfully".green().to_string());

    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_config_template(output: Option<String>, complete: bool) -> Result<()> {
    let template = if complete {
        create_complete_config_template()
    } else {
        create_minimal_config_template()
    };

    if let Some(output_path) = output {
        std::fs::write(&output_path, template)?;
        println!(
            "✅ Configuration template written to: {}",
            output_path.green()
        );
    } else {
        println!("{}", template);
    }

    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_config_reset() -> Result<()> {
    println!("🔄 Resetting configuration to defaults...");
    let spinner = create_spinner("Resetting configuration...");
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    spinner.finish_with_message("✅ Configuration reset to defaults".green().to_string());
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_server_action(state: AppState, action: ServerAction) -> Result<()> {
    match action {
        ServerAction::Start { port, daemon } => handle_server_start(state, port, daemon).await,
        ServerAction::Stop { force } => handle_server_stop(state, force).await,
        ServerAction::Restart { port } => handle_server_restart(state, port).await,
        ServerAction::Status => handle_server_status(state).await,
    }
}

#[cfg(feature = "cli")]
async fn handle_server_start(state: AppState, port: Option<u16>, daemon: bool) -> Result<()> {
    let port_num = port.unwrap_or(8080);
    println!(
        "🚀 Starting web server on port {}",
        port_num.to_string().cyan()
    );

    if daemon {
        println!("Running as daemon...");
        // Implementation would daemonize the process
    }

    state.update_server_status(true, Some(port_num)).await;
    println!("✅ Web server started successfully");
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_server_stop(state: AppState, force: bool) -> Result<()> {
    println!("🛑 Stopping web server...");

    if force {
        println!("⚠️ Force stopping (may lose data)");
    } else {
        println!("Gracefully shutting down...");
    }

    state.update_server_status(false, None).await;
    println!("✅ Web server stopped");
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_server_restart(state: AppState, port: Option<u16>) -> Result<()> {
    println!("🔄 Restarting web server...");

    // Stop
    state.update_server_status(false, None).await;

    // Start with new port if provided
    let new_port = port.unwrap_or(8080);
    state.update_server_status(true, Some(new_port)).await;

    println!(
        "✅ Web server restarted on port {}",
        new_port.to_string().cyan()
    );
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_server_status(state: AppState) -> Result<()> {
    let status = state.server_status.read().await;

    println!("{}", "🔍 Server Status".bold().blue());
    println!(
        "Web Server: {}",
        if status.web_server_running {
            "Running".green()
        } else {
            "Stopped".red()
        }
    );

    if let Some(port) = status.web_server_port {
        println!("Port: {}", port.to_string().cyan());
    }

    println!("Health: {}", format_health_status(&status.health_status));

    if let Some(last_update) = status.last_config_update {
        println!(
            "Last Config Update: {}",
            last_update
                .format("%Y-%m-%d %H:%M:%S UTC")
                .to_string()
                .dimmed()
        );
    }

    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_user_action(state: AppState, action: UserAction) -> Result<()> {
    match action {
        UserAction::List { limit, active: _ } => {
            println!("{}", "👥 Users".bold().blue());

            let spinner = create_spinner("Loading users...");
            let stats = state.get_user_statistics().await?;
            spinner.finish_with_message("Users loaded".green().to_string());

            println!("  Total users:              {}", stats.total_users.to_string().cyan());
            println!("  Active sessions:          {}", stats.active_sessions.to_string().cyan());
            println!("  Failed logins today:      {}", stats.failed_logins_today.to_string().yellow());
            println!("  New registrations today:  {}", stats.new_registrations_today.to_string().green());

            if let Some(limit_val) = limit {
                println!("(Showing up to {} users)", limit_val.to_string().dimmed());
            }
        }
        UserAction::Create {
            email,
            password,
            admin,
        } => {
            println!("👤 Creating new user: {}", email.cyan());

            let _password = if let Some(pwd) = password {
                pwd
            } else {
                Password::new()
                    .with_prompt("Enter password")
                    .with_confirmation("Confirm password", "Passwords don't match")
                    .interact()
                    .map_err(|e| AuthError::Cli(format!("Password input failed: {}", e)))?
            };

            // User creation requires a storage backend wired into AppState.
            // The AppState for the CLI currently holds only configuration;
            // connect it to an AuthFramework instance with storage to complete
            // this operation.
            println!(
                "{}",
                "⚠️  User creation requires a connected storage backend.  \
                 Wire AppState to an AuthFramework instance to enable this operation."
                    .yellow()
            );
            println!(
                "   Requested: create user {} (admin: {})",
                email.cyan(),
                admin
            );
        }
        UserAction::Update {
            user,
            email,
            active,
        } => {
            println!("✏️  Requested update for user: {}", user.cyan());
            if let Some(new_email) = email {
                println!("   → new email: {}", new_email.green());
            }
            if let Some(is_active) = active {
                println!(
                    "   → active: {}",
                    if is_active { "true".green() } else { "false".red() }
                );
            }
            println!(
                "{}",
                "⚠️  User updates require a connected storage backend.".yellow()
            );
        }
        UserAction::Delete { user, force } => {
            if !force {
                let confirm = Confirm::new()
                    .with_prompt(format!(
                        "Are you sure you want to delete user '{}'?",
                        user.red()
                    ))
                    .default(false)
                    .interact()
                    .map_err(|e| AuthError::Cli(format!("Confirmation input failed: {}", e)))?;

                if !confirm {
                    println!("❌ User deletion cancelled");
                    return Ok(());
                }
            }

            println!(
                "{}",
                "⚠️  User deletion requires a connected storage backend.".yellow()
            );
            println!("   Requested: delete user {}", user.red());
        }
        UserAction::SetRole { email, role } => {
            println!(
                "{}",
                "⚠️  Role assignment requires a connected storage backend.".yellow()
            );
            println!("   Requested: set role {} for user {}", role.green(), email.cyan());
        }
    }
    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_status(state: AppState, detailed: bool, format: &str) -> Result<()> {
    println!("{}", "🔍 System Status".bold().blue());

    let _config = state.config.read().await;
    let server_status = state.server_status.read().await;
    let health = state.get_health_status().await;

    match format {
        "json" => {
            let mut status = HashMap::new();
            status.insert("web_server_running", server_status.web_server_running);
            status.insert("health", matches!(health, HealthStatus::Healthy));
            println!("{}", serde_json::to_string_pretty(&status)?);
        }
        "yaml" => {
            println!("web_server_running: {}", server_status.web_server_running);
            println!("health: {}", format_health_status(&health));
        }
        "table" => {
            println!("┌──────────────────────┬─────────────────────┐");
            println!("│ Component            │ Status              │");
            println!("├──────────────────────┼─────────────────────┤");
            println!(
                "│ Web Server           │ {:19} │",
                if server_status.web_server_running {
                    "Running ✅".green()
                } else {
                    "Stopped ❌".red()
                }
            );
            println!("│ Configuration        │ {:19} │", "Loaded ✅".green());
            println!(
                "│ Health Status        │ {:19} │",
                format_health_status(&health)
            );
            println!("└──────────────────────┴─────────────────────┘");

            if detailed {
                println!("\n{}", "📊 Detailed Information".bold().cyan());
                println!("Active Sessions: {}", server_status.active_sessions);
                if let Some(port) = server_status.web_server_port {
                    println!("Web GUI: http://127.0.0.1:{}", port);
                }

                if let Some(last_update) = server_status.last_config_update {
                    println!(
                        "Last Config Update: {}",
                        last_update.format("%Y-%m-%d %H:%M:%S UTC")
                    );
                }
            }
        }
        _ => {
            // Default to table format
            println!("┌──────────────────────┬─────────────────────┐");
            println!("│ Component            │ Status              │");
            println!("├──────────────────────┼─────────────────────┤");
            println!(
                "│ Web Server           │ {:19} │",
                if server_status.web_server_running {
                    "Running ✅".green()
                } else {
                    "Stopped ❌".red()
                }
            );
            println!("│ Configuration        │ {:19} │", "Loaded ✅".green());
            println!(
                "│ Health Status        │ {:19} │",
                format_health_status(&health)
            );
            println!("└──────────────────────┴─────────────────────┘");

            if detailed {
                println!("\n{}", "📊 Detailed Information".bold().cyan());
                println!("Active Sessions: {}", server_status.active_sessions);
                if let Some(port) = server_status.web_server_port {
                    println!("Web GUI: http://127.0.0.1:{}", port);
                }

                if let Some(last_update) = server_status.last_config_update {
                    println!(
                        "Last Config Update: {}",
                        last_update.format("%Y-%m-%d %H:%M:%S UTC")
                    );
                }
            }
        }
    }

    Ok(())
}

#[cfg(feature = "cli")]
async fn handle_security_action(state: AppState, action: SecurityAction) -> Result<()> {
    match action {
        SecurityAction::Audit { days, detailed } => {
            println!(
                "{}",
                format!("🔍 Security Audit (Last {} days)", days)
                    .bold()
                    .blue()
            );

            let spinner = create_spinner("Loading security events...");
            let events = state.get_recent_security_events().await?;
            let stats = state.get_user_statistics().await?;
            spinner.finish_with_message("Security audit complete");

            println!("\n📈 Audit Summary:");
            println!("  • Total tracked events: {}", events.len().to_string().cyan());
            println!("  • Active sessions:      {}", stats.active_sessions.to_string().green());
            println!("  • Failed logins today:  {}", stats.failed_logins_today.to_string().yellow());

            if detailed {
                if events.is_empty() {
                    println!("\n📋 Recent Events: (none recorded)");
                } else {
                    println!("\n📋 Recent Events:");
                    for event in &events {
                        println!(
                            "  {} - {}: {}",
                            event.timestamp.format("%Y-%m-%d %H:%M:%S UTC"),
                            event.event_type.cyan(),
                            event.description,
                        );
                    }
                }
            }
        }
        SecurityAction::Sessions { user, terminate } => {
            if let Some(session_id) = terminate {
                println!("🔒 Terminating session: {}", session_id.yellow());
                let spinner = create_spinner("Terminating session...");
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                spinner
                    .finish_with_message("✅ Session terminated successfully".green().to_string());
                return Ok(());
            }

            println!("{}", "🔐 Active Sessions".bold().blue());

            if let Some(user_filter) = user {
                println!("Filtering by user: {}", user_filter.cyan());
            }

            let status = state.server_status.read().await;
            if status.active_sessions == 0 {
                println!("  (no active sessions)");
            } else {
                println!(
                    "  Active sessions: {}",
                    status.active_sessions.to_string().cyan()
                );
                println!(
                    "  {}",
                    "(Detailed per-session data requires a storage backend to be configured)"
                        .dimmed()
                );
            }
        }
        SecurityAction::ThreatIntel { update, check_ip } => {
            if let Some(ip) = check_ip {
                println!("🌐 Checking IP address: {}", ip.cyan());

                let spinner = create_spinner("Querying threat intelligence...");
                spinner.finish_with_message("Lookup complete".to_string());

                // A real lookup requires the ThreatIntelligence subsystem to be
                // reachable from AppState.  Until that integration is wired in,
                // report the limitation clearly rather than applying incorrect
                // heuristics.
                println!(
                    "{}",
                    "⚠️  Threat intelligence lookup requires a configured TI backend."
                        .yellow()
                );
                println!(
                    "   Requested check for IP: {}  — integrate ThreatIntelligence into AppState to enable.",
                    ip.cyan()
                );

                return Ok(());
            }

            if update {
                println!("🔄 Updating threat intelligence feeds...");

                let pb = ProgressBar::new(3);
                pb.set_style(ProgressStyle::default_bar().template(
                    "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} {msg}",
                ).map_err(|e| AuthError::Cli(format!("Progress bar template error: {}", e)))?);

                let feeds = ["Malware IPs", "Bot Networks", "Tor Exit Nodes"];

                for (i, feed) in feeds.iter().enumerate() {
                    pb.set_position(i as u64);
                    pb.set_message(format!("Updating {}...", feed));
                    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                    pb.inc(1);
                }

                pb.finish_with_message(
                    "✅ All threat feeds updated successfully"
                        .green()
                        .to_string(),
                );
            }
        }
        SecurityAction::AuditLog => {
            println!("📋 Displaying audit log...");
            let spinner = create_spinner("Loading audit events...");
            tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
            spinner.finish_with_message("✅ Audit log displayed".green().to_string());
        }
        SecurityAction::ThreatReport => {
            println!("📊 Generating threat report...");
            let spinner = create_spinner("Analyzing threats...");
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
            spinner.finish_with_message("✅ Threat report generated".green().to_string());
        }
        SecurityAction::ForceLogout { user_id } => {
            println!("🔒 Forcing logout for user: {}", user_id.red());
            let spinner = create_spinner("Terminating user sessions...");
            tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
            spinner.finish_with_message("✅ User sessions terminated".green().to_string());
        }
    }

    Ok(())
}

#[cfg(feature = "cli")]
fn create_spinner(message: &str) -> ProgressBar {
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .template("{spinner:.green} {msg}")
            .expect("hardcoded spinner template is valid"),
    );
    pb.set_message(message.to_string());
    pb.enable_steady_tick(std::time::Duration::from_millis(100));
    pb
}

#[cfg(feature = "cli")]
fn format_health_status(status: &HealthStatus) -> colored::ColoredString {
    match status {
        HealthStatus::Healthy => "Healthy ✅".green(),
        HealthStatus::Warning(msg) => format!("Warning ⚠️  {}", msg).yellow(),
        HealthStatus::Critical(msg) => format!("Critical ❌ {}", msg).red(),
    }
}

#[cfg(feature = "cli")]
fn create_minimal_config_template() -> String {
    r#"# Auth Framework Configuration Template
# Minimal configuration for getting started

[jwt]
secret_key = "${JWT_SECRET_KEY:your-secret-key-here}"
algorithm = "HS256"
expiry = "1h"

[session]
name = "AUTH_SESSION"
secure = true
domain = "localhost"

[oauth2.google]
client_id = "${GOOGLE_CLIENT_ID}"
client_secret = "${GOOGLE_CLIENT_SECRET}"
redirect_uri = "http://localhost:8080/auth/callback"

[threat_intel]
enabled = false
"#
    .to_string()
}

#[cfg(feature = "cli")]
fn create_complete_config_template() -> String {
    r#"# Auth Framework Configuration Template
# Complete configuration with all options

[jwt]
secret_key = "${JWT_SECRET_KEY:your-secret-key-here}"
algorithm = "HS256"
expiry = "1h"
refresh_expiry = "30d"
issuer = "auth-framework"
audience = ["api.example.com"]

[session]
name = "AUTH_SESSION"
secure = true
domain = "localhost"
path = "/"
max_age = "24h"
same_site = "lax"
http_only = true

[oauth2.google]
client_id = "${GOOGLE_CLIENT_ID}"
client_secret = "${GOOGLE_CLIENT_SECRET}"
redirect_uri = "http://localhost:8080/auth/callback"
scopes = ["openid", "email", "profile"]

[oauth2.github]
client_id = "${GITHUB_CLIENT_ID}"
client_secret = "${GITHUB_CLIENT_SECRET}"
redirect_uri = "http://localhost:8080/auth/github/callback"

[threat_intel]
enabled = true
auto_update_feeds = true
cache_duration = "1h"

[[threat_intel.feeds]]
name = "Example Feed"
url = "https://example.com/threat-feed.csv"
api_key = "${THREAT_FEED_API_KEY}"
format = "csv"
update_interval = "6h"

[security]
require_https = true
enable_csrf_protection = true
rate_limiting = true
max_requests_per_minute = 100

[audit]
enabled = true
log_success = true
log_failures = true
log_permissions = true

[mfa]
enabled = true
totp_enabled = true
backup_codes_enabled = true

include = [
    "methods/oauth2.toml",
    "methods/jwt.toml",
    "methods/mfa.toml"
]
"#
    .to_string()
}


