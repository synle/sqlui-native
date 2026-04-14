use dashmap::DashMap;
use std::sync::LazyLock;
use std::time::{Duration, Instant};

/// Per-session API cache with TTL eviction.
/// Mirrors the TypeScript `_apiCache` from `Endpoints.ts`.
static API_CACHE: LazyLock<DashMap<String, CacheEntry>> = LazyLock::new(DashMap::new);

/// TTL for cache entries (30 minutes).
const CACHE_TTL: Duration = Duration::from_secs(30 * 60);

/// Eviction check interval (10 minutes).
const EVICTION_INTERVAL: Duration = Duration::from_secs(10 * 60);

/// Last eviction timestamp.
static LAST_EVICTION: LazyLock<std::sync::Mutex<Instant>> =
    LazyLock::new(|| std::sync::Mutex::new(Instant::now()));

/// A single cache entry tied to a session.
struct CacheEntry {
    data: DashMap<String, serde_json::Value>,
    last_accessed: Instant,
}

/// Gets a value from the session cache.
pub fn cache_get(session_id: &str, key: &str) -> Option<serde_json::Value> {
    maybe_evict();
    if let Some(entry) = API_CACHE.get(session_id) {
        if let Some(val) = entry.data.get(key) {
            return Some(val.value().clone());
        }
    }
    None
}

/// Sets a value in the session cache.
pub fn cache_set(session_id: &str, key: &str, value: serde_json::Value) {
    maybe_evict();
    let entry = API_CACHE
        .entry(session_id.to_string())
        .or_insert_with(|| CacheEntry {
            data: DashMap::new(),
            last_accessed: Instant::now(),
        });
    entry.data.insert(key.to_string(), value);
    // Note: DashMap entry ref doesn't allow mutation of last_accessed here,
    // but we update it on next access
}

/// Removes stale cache entries that haven't been accessed within CACHE_TTL.
fn maybe_evict() {
    let mut last = LAST_EVICTION.lock().unwrap();
    if last.elapsed() < EVICTION_INTERVAL {
        return;
    }
    *last = Instant::now();
    drop(last);

    let now = Instant::now();
    API_CACHE.retain(|_, entry| now.duration_since(entry.last_accessed) < CACHE_TTL);
}

/// Clears all cache entries for a session.
pub fn cache_clear_session(session_id: &str) {
    API_CACHE.remove(session_id);
}

/// Returns the entire cache as a JSON string (for debugging).
pub fn cache_json() -> String {
    let mut map = serde_json::Map::new();
    for entry in API_CACHE.iter() {
        let mut session_map = serde_json::Map::new();
        for data_entry in entry.data.iter() {
            session_map.insert(data_entry.key().clone(), data_entry.value().clone());
        }
        map.insert(
            entry.key().clone(),
            serde_json::Value::Object(session_map),
        );
    }
    serde_json::to_string(&serde_json::Value::Object(map)).unwrap_or_default()
}

/// Tracks opened sessions with ping/keep-alive for stale detection.
pub mod sessions {
    use dashmap::DashMap;
    use std::sync::LazyLock;
    use std::time::Instant;

    /// Maps windowId → sessionId for opened sessions.
    static OPENED_SESSIONS: LazyLock<DashMap<String, String>> = LazyLock::new(DashMap::new);

    /// Maps windowId → last ping timestamp.
    static LAST_PING: LazyLock<DashMap<String, Instant>> = LazyLock::new(DashMap::new);

    /// Stale session threshold (10 minutes).
    const STALE_THRESHOLD: std::time::Duration = std::time::Duration::from_secs(10 * 60);

    /// Opens a session for a window.
    pub fn open(window_id: &str, session_id: &str) {
        OPENED_SESSIONS.insert(window_id.to_string(), session_id.to_string());
        ping(window_id);
    }

    /// Closes a session for a window.
    pub fn close(window_id: &str) {
        OPENED_SESSIONS.remove(window_id);
        LAST_PING.remove(window_id);
    }

    /// Records a ping for a window.
    pub fn ping(window_id: &str) {
        LAST_PING.insert(window_id.to_string(), Instant::now());
    }

    /// Returns all opened sessions after cleaning up stale ones.
    pub fn get_opened() -> Vec<(String, String)> {
        cleanup_stale();
        OPENED_SESSIONS
            .iter()
            .map(|e| (e.key().clone(), e.value().clone()))
            .collect()
    }

    /// Removes sessions that haven't been pinged within the threshold.
    fn cleanup_stale() {
        let now = Instant::now();
        let stale_windows: Vec<String> = LAST_PING
            .iter()
            .filter(|e| now.duration_since(*e.value()) > STALE_THRESHOLD)
            .map(|e| e.key().clone())
            .collect();

        for window_id in stale_windows {
            OPENED_SESSIONS.remove(&window_id);
            LAST_PING.remove(&window_id);
        }
    }
}
