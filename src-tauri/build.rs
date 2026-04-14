use std::path::PathBuf;

fn main() {
    expose_app_version();
    tauri_build::build();
}

/// Read the version from tauri.conf.json (the single source of truth) and
/// expose it as the compile-time env var `APP_VERSION` so Rust code can use
/// `env!("APP_VERSION")` instead of `env!("CARGO_PKG_VERSION")`.
fn expose_app_version() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let conf_path = manifest_dir.join("tauri.conf.json");
    let conf: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(&conf_path).expect("failed to read tauri.conf.json"),
    )
    .expect("failed to parse tauri.conf.json");
    let version = conf["version"]
        .as_str()
        .expect("version missing in tauri.conf.json");
    println!("cargo:rustc-env=APP_VERSION={version}");
    println!("cargo:rerun-if-changed=tauri.conf.json");
}
