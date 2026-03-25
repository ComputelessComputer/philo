use std::env;
use std::path::PathBuf;

pub const DEFAULT_FILENAME_PATTERN: &str = "{YYYY}-{MM}-{DD}";

pub fn default_settings_path() -> Result<PathBuf, String> {
    if let Ok(path) = env::var("PHILO_SETTINGS_PATH") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(PathBuf::from(trimmed));
        }
    }

    let home = env::var("HOME").map_err(|_| "Could not resolve HOME directory".to_string())?;
    let base_dir = if cfg!(debug_assertions) {
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("com.philo.dev")
    } else {
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("philo")
    };

    Ok(base_dir.join("settings.json"))
}

pub fn normalize_folder(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed == "/" || trimmed == "./" || trimmed == "." {
        return ".".to_string();
    }

    let without_prefix = trimmed.trim_start_matches("./").trim_start_matches('/');
    without_prefix.trim_end_matches('/').to_string()
}

pub fn normalize_filename_pattern(raw: &str) -> String {
    if raw.trim().is_empty() {
        DEFAULT_FILENAME_PATTERN.to_string()
    } else {
        raw.trim().to_string()
    }
}

pub fn resolve_journal_dir(
    journal_dir: &str,
    vault_dir: &str,
    daily_logs_folder: &str,
) -> Option<PathBuf> {
    if !journal_dir.trim().is_empty() {
        return Some(PathBuf::from(journal_dir.trim()));
    }

    if vault_dir.trim().is_empty() {
        return None;
    }

    let normalized_daily_logs_folder = normalize_folder(daily_logs_folder);
    let root = PathBuf::from(vault_dir.trim());
    Some(
        if normalized_daily_logs_folder.is_empty() || normalized_daily_logs_folder == "." {
            root
        } else {
            root.join(normalized_daily_logs_folder)
        },
    )
}
