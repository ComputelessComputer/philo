use std::path::PathBuf;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_fs::FsExt;
#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

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
        .invoke_handler(tauri::generate_handler![extend_fs_scope])
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
                .select_all()
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
                                Ok(Some(update)) => {
                                    let confirmed = handle
                                        .dialog()
                                        .message(format!(
                                            "Version {} is available. Would you like to update now?",
                                            update.version
                                        ))
                                        .title("Update Available")
                                        .kind(MessageDialogKind::Info)
                                        .buttons(MessageDialogButtons::OkCancelCustom(
                                            "Update".into(),
                                            "Later".into(),
                                        ))
                                        .blocking_show();
                                    if confirmed {
                                        if let Err(e) =
                                            update.download_and_install(|_, _| {}, || {}).await
                                        {
                                            handle
                                                .dialog()
                                                .message(format!(
                                                    "Failed to install update: {}",
                                                    e
                                                ))
                                                .title("Update Error")
                                                .kind(MessageDialogKind::Error)
                                                .blocking_show();
                                        }
                                    }
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
                                        .message(format!(
                                            "Could not check for updates: {}",
                                            e
                                        ))
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
