use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter,
};

/// Event name used to send menu commands to the webview.
const COMMAND_EVENT: &str = "app://command";

/// Builds and sets the native application menu, mirroring the Electron menu structure.
/// Menu item clicks emit events to the focused webview via the `app://command` channel.
pub fn setup_menu(app: &AppHandle) -> tauri::Result<()> {
    let is_mac = cfg!(target_os = "macos");

    // File menu
    let file_menu = {
        let mut builder = SubmenuBuilder::new(app, "File")
            .item(&menu_command_item(
                app,
                "menu-connection-new",
                "New Connection",
                "clientEvent/connection/new",
                if is_mac { "Cmd+N" } else { "Ctrl+N" },
            )?)
            .separator()
            .item(&menu_command_item(
                app,
                "menu-import",
                "Import",
                "clientEvent/import",
                if is_mac { "Cmd+O" } else { "Ctrl+O" },
            )?)
            .item(&menu_command_item(
                app,
                "menu-export",
                "Export",
                "clientEvent/exportAll",
                if is_mac { "Cmd+S" } else { "Ctrl+S" },
            )?)
            .separator()
            .item(&menu_command_item(
                app,
                "menu-settings",
                "Settings",
                "clientEvent/showSettings",
                "",
            )?);

        builder = builder.separator();

        if is_mac {
            builder = builder.close_window();
        } else {
            builder = builder.quit();
        }

        builder.build()?
    };

    // Query menu
    let query_menu = SubmenuBuilder::new(app, "Query")
        .item(&menu_command_item(
            app,
            "menu-query-new",
            "New Query",
            "clientEvent/query/new",
            if is_mac { "Cmd+T" } else { "Ctrl+T" },
        )?)
        .item(&menu_command_item(
            app,
            "menu-query-rename",
            "Rename Query",
            "clientEvent/query/rename",
            "F2",
        )?)
        .item(&menu_command_item(
            app,
            "menu-query-help",
            "Query Help",
            "clientEvent/showQueryHelp",
            "",
        )?)
        .separator()
        .item(&menu_command_item(
            app,
            "menu-query-prev",
            "Prev Query",
            "clientEvent/query/showPrev",
            if is_mac {
                "Cmd+Shift+["
            } else {
                "Alt+Shift+["
            },
        )?)
        .item(&menu_command_item(
            app,
            "menu-query-next",
            "Next Query",
            "clientEvent/query/showNext",
            if is_mac {
                "Cmd+Shift+]"
            } else {
                "Alt+Shift+]"
            },
        )?)
        .separator()
        .item(&menu_command_item(
            app,
            "menu-query-close",
            "Close Query",
            "clientEvent/query/closeCurrentlySelected",
            if is_mac { "Cmd+W" } else { "Ctrl+W" },
        )?)
        .build()?;

    // Session menu
    let session_menu = SubmenuBuilder::new(app, "Session")
        .item(&menu_command_item(
            app,
            "menu-session-new",
            "New Session",
            "clientEvent/session/new",
            "",
        )?)
        .item(&menu_command_item(
            app,
            "menu-session-rename",
            "Rename Session",
            "clientEvent/session/rename",
            "",
        )?)
        .item(&menu_command_item(
            app,
            "menu-session-switch",
            "Switch Session",
            "clientEvent/session/switch",
            "",
        )?)
        .separator()
        .item(&menu_command_item(
            app,
            "menu-session-delete",
            "Delete Session",
            "clientEvent/session/delete",
            "",
        )?)
        .build()?;

    // Edit menu
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .separator()
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&menu_command_item(
            app,
            "menu-toggle-sidebar",
            "Toggle Sidebar",
            "clientEvent/toggleSidebar",
            if is_mac { "Cmd+\\" } else { "Alt+\\" },
        )?)
        .item(&menu_command_item(
            app,
            "menu-schema-search",
            "Search Schema",
            "clientEvent/schema/search",
            if is_mac {
                "Cmd+Shift+F"
            } else {
                "Ctrl+Shift+F"
            },
        )?)
        .build()?;

    // Help menu
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&menu_command_item(
            app,
            "menu-file-bug",
            "File a bug",
            "clientEvent/fileBug",
            "",
        )?)
        .item(&menu_command_item(
            app,
            "menu-check-update",
            "About sqlui-native (Check for update)",
            "clientEvent/checkForUpdate",
            "",
        )?)
        .build()?;

    let menu = Menu::with_items(
        app,
        &[
            &file_menu,
            &query_menu,
            &session_menu,
            &edit_menu,
            &help_menu,
        ],
    )?;

    app.set_menu(menu)?;

    // Handle menu events — emit the command to all webviews
    app.on_menu_event(move |app_handle, event| {
        let id = event.id().0.as_str();
        // Menu item IDs are formatted as "cmd:{eventKey}"
        if let Some(command) = id.strip_prefix("cmd:") {
            let _ = app_handle.emit(COMMAND_EVENT, command.to_string());
        }
    });

    Ok(())
}

/// Creates a menu item that emits a command event when clicked.
/// The menu item ID is prefixed with "cmd:" for identification in the event handler.
fn menu_command_item(
    app: &AppHandle,
    _menu_id: &str,
    label: &str,
    command: &str,
    accelerator: &str,
) -> tauri::Result<tauri::menu::MenuItem<tauri::Wry>> {
    let id = format!("cmd:{}", command);
    let mut builder = MenuItemBuilder::with_id(&id, label);
    if !accelerator.is_empty() {
        builder = builder.accelerator(accelerator);
    }
    builder.build(app)
}

#[cfg(test)]
mod tests {
    /// Verifies that the menu module compiles and the constant is defined correctly.
    #[test]
    fn test_command_event_constant() {
        assert_eq!(super::COMMAND_EVENT, "app://command");
    }
}
