// Prevents console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder, window::{Effect, EffectState, EffectsBuilder}};
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
fn check_for_updates(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        match app.updater_builder().build() {
            Ok(updater) => {
                if let Ok(Some(update)) = updater.check().await {
                    let mut downloaded = 0;
                    
                    // Download and install the update
                    update
                        .download_and_install(
                            |chunk_length, content_length| {
                                downloaded += chunk_length;
                                println!("Downloaded {} of {:?}", downloaded, content_length);
                            },
                            || {
                                println!("Download finished");
                            },
                        )
                        .await
                        .ok();
                }
            }
            Err(e) => {
                eprintln!("Failed to build updater: {}", e);
            }
        }
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Create main window programmatically for proper macOS transparency
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("")
                .inner_size(1280.0, 800.0)
                .min_inner_size(300.0, 300.0)
                .resizable(true)
                .fullscreen(false)
                .transparent(true)
                .decorations(true)
                .center()
                .visible(false)
                .devtools(true);

            // Set transparent titlebar for macOS
            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);

            let window = win_builder.build().unwrap();

            // Set custom background color for macOS transparent titlebar
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil};
                use objc::{msg_send, sel, sel_impl};

                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    // Set background color to match your cream color #f6f5f3
                    let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                        nil,
                        246.0 / 255.0,  // #F6F5F3 red component
                        245.0 / 255.0,  // #F6F5F3 green component
                        243.0 / 255.0,  // #F6F5F3 blue component
                        1.0,            // Fully opaque
                    );
                    ns_window.setBackgroundColor_(bg_color);

                    // Ensure window has shadow
                    let _: () = msg_send![ns_window, setHasShadow: true];
                }
            }

            // Show window after setup to avoid flash
            window.show().unwrap();

            // Apply native blur effects to the window
            #[cfg(target_os = "windows")]
            {
                if let Err(e) = window.set_effects(
                    EffectsBuilder::new()
                        .effect(Effect::Mica)
                        .state(EffectState::Active)
                        .build(),
                ) {
                    eprintln!("Failed to set window effects: {}", e);
                }
            }

            #[cfg(target_os = "macos")]
            {
                if let Err(e) = window.set_effects(
                    EffectsBuilder::new()
                        .effect(Effect::Tooltip)
                        .state(EffectState::Active)
                        .build(),
                ) {
                    eprintln!("Failed to set window effects: {}", e);
                }
            }
            
            // Check for updates on startup (silent check)
            #[cfg(not(debug_assertions))]
            {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    check_for_updates(app_handle);
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![check_for_updates])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

