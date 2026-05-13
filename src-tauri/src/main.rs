// Prevents an extra console window from appearing on Windows in release builds.
// The `windows_subsystem` attribute only takes effect on the binary's root
// (`main.rs`) — placing it in `lib.rs` is silently ignored, which would build
// the app as a console-subsystem program and pop a black terminal window
// alongside the Tauri window (and any spawned child processes).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    sqlui_native_lib::run();
}
