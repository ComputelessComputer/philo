#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

use std::path::PathBuf;
use std::{env, fs};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_fs::FsExt;
#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
fn set_window_opacity(_app: AppHandle, _opacity: f64) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let window = _app.get_webview_window("main").ok_or("Window not found")?;
        let ns_win = window.ns_window().map_err(|e| e.to_string())?;
        unsafe {
            let _: () =
                objc::msg_send![ns_win as *mut objc::runtime::Object, setAlphaValue: _opacity];
        }
    }
    Ok(())
}

fn should_skip_dir(name: &str) -> bool {
    if name.starts_with('.') && name != ".obsidian" {
        return true;
    }
    matches!(
        name,
        "Library"
            | "Applications"
            | "Movies"
            | "Pictures"
            | "Music"
            | "node_modules"
            | "target"
            | "dist"
            | "build"
    )
}

#[tauri::command]
fn find_obsidian_vaults() -> Result<Vec<String>, String> {
    let home = env::var("HOME").map_err(|_| "Could not resolve HOME directory".to_string())?;
    let mut vaults: Vec<String> = Vec::new();
    let mut stack: Vec<(PathBuf, usize)> = vec![(PathBuf::from(home), 0)];
    let max_depth = 5usize;
    let max_vaults = 25usize;

    while let Some((dir, depth)) = stack.pop() {
        if depth > max_depth {
            continue;
        }

        let entries = match fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        let mut has_obsidian = false;
        let mut children: Vec<PathBuf> = Vec::new();

        for entry_result in entries {
            let entry = match entry_result {
                Ok(entry) => entry,
                Err(_) => continue,
            };
            let file_type = match entry.file_type() {
                Ok(file_type) => file_type,
                Err(_) => continue,
            };
            if !file_type.is_dir() {
                continue;
            }

            let name = entry.file_name().to_string_lossy().to_string();
            if name == ".obsidian" {
                has_obsidian = true;
                break;
            }
            if should_skip_dir(&name) {
                continue;
            }
            children.push(entry.path());
        }

        if has_obsidian {
            vaults.push(dir.to_string_lossy().to_string());
            if vaults.len() >= max_vaults {
                break;
            }
            continue;
        }

        if depth < max_depth {
            for child in children {
                stack.push((child, depth + 1));
            }
        }
    }

    vaults.sort();
    vaults.dedup();
    Ok(vaults)
}

#[tauri::command]
fn extend_fs_scope(app: AppHandle, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    // Extend fs plugin scope
    app.fs_scope()
        .allow_directory(&p, true)
        .map_err(|e| e.to_string())?;
    // Extend asset protocol scope
    app.asset_protocol_scope()
        .allow_directory(&p, true)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            extend_fs_scope,
            find_obsidian_vaults,
            set_window_opacity
        ])
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            let settings = MenuItemBuilder::with_id("settings", "Settings...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?;

            let library = MenuItemBuilder::with_id("library", "Widget Library")
                .accelerator("CmdOrCtrl+J")
                .build(app)?;

            let check_updates =
                MenuItemBuilder::with_id("check-updates", "Check for Updates...").build(app)?;

            let app_menu = SubmenuBuilder::new(app, "Philo")
                .item(&PredefinedMenuItem::about(app, Some("About Philo"), None)?)
                .item(&check_updates)
                .separator()
                .item(&settings)
                .item(&library)
                .separator()
                .item(&PredefinedMenuItem::hide(app, None)?)
                .item(&PredefinedMenuItem::hide_others(app, None)?)
                .item(&PredefinedMenuItem::show_all(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::quit(app, None)?)
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .build()?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .close_window()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&edit_menu)
                .item(&window_menu)
                .build()?;

            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                if event.id() == "settings" {
                    let _ = app_handle.emit("open-settings", ());
                } else if event.id() == "library" {
                    let _ = app_handle.emit("toggle-library", ());
                } else if event.id() == "check-updates" {
                    let handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        match handle.updater() {
                            Ok(updater) => match updater.check().await {
                                Ok(Some(_)) => {
                                    let _ = handle.emit("update-available", ());
                                }
                                Ok(None) => {
                                    handle
                                        .dialog()
                                        .message("You're running the latest version.")
                                        .title("No Updates Available")
                                        .kind(MessageDialogKind::Info)
                                        .blocking_show();
                                }
                                Err(e) => {
                                    handle
                                        .dialog()
                                        .message(format!("Could not check for updates: {}", e))
                                        .title("Update Error")
                                        .kind(MessageDialogKind::Error)
                                        .blocking_show();
                                }
                            },
                            Err(e) => {
                                handle
                                    .dialog()
                                    .message(format!("Updater not available: {}", e))
                                    .title("Update Error")
                                    .kind(MessageDialogKind::Error)
                                    .blocking_show();
                            }
                        }
                    });
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
