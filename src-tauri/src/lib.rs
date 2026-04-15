// Prevents additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::io::BufRead;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager};

/// Holds the sidecar Node.js child process and the port it is listening on.
struct SidecarState {
    child: Mutex<Option<Child>>,
    port: u16,
}

/// Platform information returned to the frontend.
#[derive(Serialize)]
struct PlatformInfo {
    platform: String,
    arch: String,
}

/// Returns the port the sidecar Express server is listening on.
#[tauri::command]
fn get_sidecar_port(state: tauri::State<SidecarState>) -> u16 {
    state.port
}

/// Returns the current platform and architecture.
#[tauri::command]
fn get_platform_info() -> PlatformInfo {
    PlatformInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
    }
}

/// Opens the given path in the native file explorer.
#[tauri::command]
fn open_in_file_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Reads file content at the given path and returns it as a UTF-8 string.
#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// Spawns the Node.js sidecar Express server and waits for it to report its port.
fn spawn_sidecar(app: &tauri::App) -> Result<SidecarState, Box<dyn std::error::Error>> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to resolve resource dir: {}", e))?;

    let server_js = resource_dir.join("resources").join("mocked-server.js");
    let node_modules = resource_dir.join("resources").join("node_modules");

    // Resolve the bundled Node.js binary (Tauri externalBin with target triple suffix)
    let node_bin_dir = resource_dir.join("binaries");
    let node_bin = if cfg!(target_os = "windows") {
        node_bin_dir.join("node.exe")
    } else {
        node_bin_dir.join("node")
    };

    // In development, fall back to system Node.js
    let node_cmd = if node_bin.exists() {
        node_bin.to_string_lossy().to_string()
    } else {
        "node".to_string()
    };

    println!("Sidecar: spawning {} {}", node_cmd, server_js.display());

    let mut child = Command::new(&node_cmd)
        .arg(&server_js)
        .env("NODE_PATH", &node_modules)
        .stdin(Stdio::piped()) // Keep stdin open so sidecar can detect parent death
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    // Read stdout lines until we find the port marker
    let stdout = child
        .stdout
        .take()
        .ok_or("Failed to capture sidecar stdout")?;
    let reader = std::io::BufReader::new(stdout);
    let start = Instant::now();
    let timeout = Duration::from_secs(15);
    let mut port: u16 = 0;

    for line in reader.lines() {
        if start.elapsed() > timeout {
            let _ = child.kill();
            return Err("Sidecar startup timed out (15s)".into());
        }
        match line {
            Ok(text) => {
                println!("Sidecar: {}", text);
                if let Some(port_str) = text.strip_prefix("__SIDECAR_PORT__=") {
                    port = port_str
                        .trim()
                        .parse()
                        .map_err(|_| format!("Invalid port: {}", port_str))?;
                    break;
                }
            }
            Err(e) => {
                let _ = child.kill();
                return Err(format!("Failed to read sidecar stdout: {}", e).into());
            }
        }
    }

    if port == 0 {
        let _ = child.kill();
        return Err("Sidecar did not report a port".into());
    }

    println!("Sidecar: ready on port {}", port);

    Ok(SidecarState {
        child: Mutex::new(Some(child)),
        port,
    })
}

/// Kills the sidecar process gracefully: drops stdin, waits up to 3s, then force-kills.
fn kill_sidecar(state: &SidecarState) {
    if let Ok(mut guard) = state.child.lock() {
        if let Some(mut child) = guard.take() {
            // Drop stdin to signal the sidecar to shut down
            drop(child.stdin.take());

            let start = Instant::now();
            let timeout = Duration::from_secs(3);
            loop {
                match child.try_wait() {
                    Ok(Some(_)) => {
                        println!("Sidecar: exited gracefully");
                        return;
                    }
                    Ok(None) if start.elapsed() > timeout => {
                        println!("Sidecar: force killing after 3s timeout");
                        let _ = child.kill();
                        return;
                    }
                    _ => std::thread::sleep(Duration::from_millis(100)),
                }
            }
        }
    }
}

/// Builds the native application menu, emitting "menu-command" events on click.
fn setup_menu(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // File submenu
    let file_new_connection =
        MenuItemBuilder::new("New Connection").id("file-new-connection").build(app)?;
    let file_import = MenuItemBuilder::new("Import").id("file-import").build(app)?;
    let file_export = MenuItemBuilder::new("Export").id("file-export").build(app)?;
    let file_settings = MenuItemBuilder::new("Settings").id("file-settings").build(app)?;

    let file_submenu = SubmenuBuilder::new(app, "File")
        .item(&file_new_connection)
        .separator()
        .item(&file_import)
        .item(&file_export)
        .separator()
        .item(&file_settings)
        .separator()
        .quit()
        .build()?;

    // Query submenu
    let query_new = MenuItemBuilder::new("New Query").id("query-new").build(app)?;
    let query_rename = MenuItemBuilder::new("Rename Query").id("query-rename").build(app)?;
    let query_help = MenuItemBuilder::new("Query Help").id("query-help").build(app)?;
    let query_prev = MenuItemBuilder::new("Prev Query").id("query-prev").build(app)?;
    let query_next = MenuItemBuilder::new("Next Query").id("query-next").build(app)?;
    let query_close = MenuItemBuilder::new("Close Query").id("query-close").build(app)?;

    let query_submenu = SubmenuBuilder::new(app, "Query")
        .item(&query_new)
        .item(&query_rename)
        .item(&query_help)
        .separator()
        .item(&query_prev)
        .item(&query_next)
        .separator()
        .item(&query_close)
        .build()?;

    // Session submenu
    let session_new = MenuItemBuilder::new("New Session").id("session-new").build(app)?;
    let session_rename =
        MenuItemBuilder::new("Rename Session").id("session-rename").build(app)?;
    let session_switch =
        MenuItemBuilder::new("Switch Session").id("session-switch").build(app)?;
    let session_delete =
        MenuItemBuilder::new("Delete Session").id("session-delete").build(app)?;

    let session_submenu = SubmenuBuilder::new(app, "Session")
        .item(&session_new)
        .item(&session_rename)
        .item(&session_switch)
        .separator()
        .item(&session_delete)
        .build()?;

    // Edit submenu
    let toggle_sidebar =
        MenuItemBuilder::new("Toggle Sidebar").id("edit-toggle-sidebar").build(app)?;
    let schema_search =
        MenuItemBuilder::new("Search Schema").id("edit-schema-search").build(app)?;
    let command_palette =
        MenuItemBuilder::new("Command Palette").id("edit-command-palette").build(app)?;

    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .separator()
        .item(&toggle_sidebar)
        .item(&schema_search)
        .item(&command_palette)
        .build()?;

    // Help submenu
    let help_bug = MenuItemBuilder::new("File a bug").id("help-file-bug").build(app)?;
    let help_about = MenuItemBuilder::new("About sqlui-native (Check for update)")
        .id("help-about")
        .build(app)?;

    let help_submenu = SubmenuBuilder::new(app, "Help")
        .item(&help_bug)
        .item(&help_about)
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&file_submenu)
        .item(&query_submenu)
        .item(&session_submenu)
        .item(&edit_submenu)
        .item(&help_submenu)
        .build()?;

    app.set_menu(menu)?;

    // Handle menu events by emitting a "menu-command" event to the webview
    app.on_menu_event(move |app_handle, event| {
        let id = event.id().0.as_str();
        let command = match id {
            "file-new-connection" => "clientEvent/connection/new",
            "file-import" => "clientEvent/import",
            "file-export" => "clientEvent/exportAll",
            "file-settings" => "clientEvent/showSettings",
            "query-new" => "clientEvent/query/new",
            "query-rename" => "clientEvent/query/rename",
            "query-help" => "clientEvent/showQueryHelp",
            "query-prev" => "clientEvent/query/showPrev",
            "query-next" => "clientEvent/query/showNext",
            "query-close" => "clientEvent/query/closeCurrentlySelected",
            "session-new" => "clientEvent/session/new",
            "session-rename" => "clientEvent/session/rename",
            "session-switch" => "clientEvent/session/switch",
            "session-delete" => "clientEvent/session/delete",
            "edit-toggle-sidebar" => "clientEvent/toggleSidebar",
            "edit-schema-search" => "clientEvent/schema/search",
            "edit-command-palette" => "clientEvent/showCommandPalette",
            "help-file-bug" => "clientEvent/openBugReport",
            "help-about" => "clientEvent/checkForUpdate",
            _ => return,
        };
        let _ = app_handle.emit("menu-command", command);
    });

    Ok(())
}

/// Tauri application entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // In debug/dev builds (`tauri dev`), the mocked Express server is already
            // started by the `beforeDevCommand` (`npm run dev`) on port 3001.
            // Skip spawning a duplicate sidecar process; port 0 signals the frontend
            // to use relative URLs so the Vite proxy routes /api calls to port 3001.
            #[cfg(debug_assertions)]
            let state = SidecarState {
                child: Mutex::new(None),
                port: 0,
            };

            // In release/production builds, spawn the bundled Node.js sidecar.
            #[cfg(not(debug_assertions))]
            let state = spawn_sidecar(app).expect("Failed to start sidecar");

            app.manage(state);
            setup_menu(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_sidecar_port,
            get_platform_info,
            open_in_file_explorer,
            read_file_content,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
            if let Some(state) = app_handle.try_state::<SidecarState>() {
                kill_sidecar(&state);
            }
        }
        _ => {}
    });
}
