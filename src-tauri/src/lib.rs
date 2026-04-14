pub mod adapters;
mod cache;
mod commands;
pub mod error;
mod menu;
mod storage;
pub mod types;

use tauri::Manager;

/// Main Tauri application entry point.
/// Registers all Tauri commands, sets up the native menu, and shows the window.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Config
            commands::get_configs,
            commands::update_configs,
            // Connections
            commands::get_connections,
            commands::set_connections,
            commands::create_connection,
            commands::update_connection,
            commands::delete_connection,
            commands::get_connection,
            commands::test_connection,
            commands::execute_query,
            commands::connect_connection,
            commands::get_databases,
            commands::get_tables,
            commands::get_columns,
            commands::get_cached_schema,
            commands::refresh_connection,
            commands::refresh_database,
            commands::refresh_table,
            // Queries
            commands::get_queries,
            commands::create_query,
            commands::update_query,
            commands::delete_query,
            // Sessions
            commands::get_sessions,
            commands::get_session,
            commands::create_session,
            commands::update_session,
            commands::clone_session,
            commands::delete_session,
            // Folder items
            commands::get_folder_items,
            commands::add_folder_item,
            commands::update_folder_item,
            commands::delete_folder_item,
            // Data snapshots
            commands::get_data_snapshots,
            commands::get_data_snapshot,
            commands::create_data_snapshot,
            commands::delete_data_snapshot,
            // Managed metadata
            commands::get_managed_databases,
            commands::get_managed_database,
            commands::create_managed_database,
            commands::update_managed_database,
            commands::delete_managed_database,
            commands::get_managed_tables,
            commands::get_managed_table,
            commands::create_managed_table,
            commands::update_managed_table,
            commands::delete_managed_table,
            // Schema search
            commands::search_schema,
            // Query version history
            commands::get_query_version_history,
            commands::add_query_version_history,
            commands::delete_query_version_history_entry,
            commands::clear_query_version_history,
            // Session ping
            commands::ping_session,
            commands::get_opened_sessions,
            // Backup
            commands::backup_database,
            // Menu (from sidecar era, kept for compatibility)
            toggle_menus,
        ])
        .setup(move |app| {
            // Set up the native menu
            menu::setup_menu(app.handle())?;

            // Show the main window
            if let Some(window) = app.get_webview_window("main") {
                window.show().unwrap_or_default();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Tauri command to toggle menu item enabled state from the frontend.
#[tauri::command]
fn toggle_menus(_visible: bool, _menu_ids: Vec<String>) {
    // No-op placeholder — menu items remain always enabled.
}
