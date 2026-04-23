/**
 * Cross-window session ownership registry.
 *
 * Tracks which browser window owns which session using localStorage (persistence)
 * and BroadcastChannel (real-time cross-window messaging). Enforces the rule that
 * only one window can activate a given session at a time.
 *
 * Uses a ping/pong protocol to verify that claimed windows are actually alive,
 * handling cases where the app closes without firing beforeunload.
 */

/** localStorage key for the window-session registry. */
const REGISTRY_KEY = "sqlui-native.windowSessionRegistry";

/** sessionStorage key for this window's unique ID. */
const WINDOW_ID_KEY = "sqlui-native.windowId";

/** BroadcastChannel name for cross-window session messages. */
const CHANNEL_NAME = "sqlui-native-session";

/** Entries older than this (ms) are considered stale and cleaned up. */
const STALE_THRESHOLD_MS = 30_000;

/** Heartbeat interval (ms) to refresh the current window's timestamp. */
const HEARTBEAT_INTERVAL_MS = 10_000;

/** How long to wait for pong responses during validation (ms). */
const PING_TIMEOUT_MS = 300;

/** Registry entry representing a window's session claim. */
type RegistryEntry = {
  sessionId: string;
  timestamp: number;
};

/** Full registry mapping windowId to its entry. */
type Registry = Record<string, RegistryEntry>;

/** Message types sent over BroadcastChannel between windows. */
export type SessionMessage =
  | { type: "session-deleted"; sessionId: string }
  | { type: "focus-and-close"; targetWindowId: string; sourceWindowId: string }
  | { type: "ping"; sourceWindowId: string }
  | { type: "pong"; windowId: string };

/** Singleton BroadcastChannel instance. */
let _channel: BroadcastChannel | null = null;

/** Heartbeat interval handle. */
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/** The session ID this window has claimed (for heartbeat re-claim). */
let _claimedSessionId: string | null = null;

/** Whether the ping responder is active (set when heartbeat starts). */
let _pingResponderActive = false;

/**
 * Returns the lazily-created BroadcastChannel for session messages.
 * @returns The shared BroadcastChannel instance.
 */
function getChannel(): BroadcastChannel {
  if (!_channel) {
    _channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return _channel;
}

/**
 * Reads the registry from localStorage.
 * @returns The current registry, or an empty object if unreadable.
 */
function readRegistry(): Registry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_err) {
    return {};
  }
}

/**
 * Writes the registry to localStorage.
 * @param registry - The registry to persist.
 */
function writeRegistry(registry: Registry): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

/**
 * Removes entries whose timestamps are older than the stale threshold.
 * @param registry - The registry to clean.
 * @returns A new registry with stale entries removed.
 */
function cleanStaleEntries(registry: Registry): Registry {
  const now = Date.now();
  const cleaned: Registry = {};
  for (const [windowId, entry] of Object.entries(registry)) {
    if (now - entry.timestamp < STALE_THRESHOLD_MS) {
      cleaned[windowId] = entry;
    }
  }
  return cleaned;
}

/**
 * Gets or creates a unique ID for this browser window, stored in sessionStorage.
 * @returns The unique window ID.
 */
export function getWindowId(): string {
  let id = sessionStorage.getItem(WINDOW_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(WINDOW_ID_KEY, id);
  }
  return id;
}

/**
 * Claims a session for the current window in the registry.
 * @param sessionId - The session ID to claim.
 */
export function claimSession(sessionId: string): void {
  const windowId = getWindowId();
  const registry = cleanStaleEntries(readRegistry());
  registry[windowId] = { sessionId, timestamp: Date.now() };
  writeRegistry(registry);
  _claimedSessionId = sessionId;
}

/**
 * Releases the current window's session claim from the registry.
 */
export function releaseSession(): void {
  const windowId = getWindowId();
  const registry = readRegistry();
  delete registry[windowId];
  writeRegistry(registry);
  _claimedSessionId = null;
}

/**
 * Heartbeat: re-claims the session to keep the entry fresh.
 * Also re-creates the entry if it was removed externally (e.g., by another window's validation).
 */
function heartbeat(): void {
  if (_claimedSessionId) {
    claimSession(_claimedSessionId);
  }
}

/**
 * Handles incoming ping messages by responding with a pong.
 */
function handlePingResponder(event: MessageEvent<SessionMessage>): void {
  const message = event.data;
  if (message.type === "ping" && message.sourceWindowId !== getWindowId()) {
    getChannel().postMessage({ type: "pong", windowId: getWindowId() } satisfies SessionMessage);
  }
}

/**
 * Starts the heartbeat interval to keep this window's registry entry fresh.
 * Also sets up the ping responder so other windows can verify this window is alive,
 * and registers a beforeunload handler to clean up on window close.
 */
export function startHeartbeat(): void {
  stopHeartbeat();
  _heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  window.addEventListener("beforeunload", onBeforeUnload);

  // Set up ping responder so other windows can verify we're alive
  if (!_pingResponderActive) {
    getChannel().addEventListener("message", handlePingResponder);
    _pingResponderActive = true;
  }
}

/**
 * Stops the heartbeat interval and removes the beforeunload handler.
 */
export function stopHeartbeat(): void {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
  window.removeEventListener("beforeunload", onBeforeUnload);

  if (_pingResponderActive) {
    getChannel().removeEventListener("message", handlePingResponder);
    _pingResponderActive = false;
  }
}

/**
 * Handler for the beforeunload event — releases the session and stops heartbeat.
 */
function onBeforeUnload(): void {
  releaseSession();
  stopHeartbeat();
}

/**
 * Returns the window ID that owns the given session (excluding the current window),
 * or null if no other window owns it.
 * @param sessionId - The session ID to look up.
 * @returns The owning window ID, or null.
 */
export function getSessionOwner(sessionId: string): string | null {
  const windowId = getWindowId();
  const registry = cleanStaleEntries(readRegistry());
  for (const [wId, entry] of Object.entries(registry)) {
    if (entry.sessionId === sessionId && wId !== windowId) {
      return wId;
    }
  }
  return null;
}

/**
 * Validates the registry by pinging all claimed windows and removing entries
 * from windows that don't respond. Call this before displaying session ownership
 * to avoid stale entries from crashed/closed windows blocking selection.
 * @returns A promise that resolves once validation is complete.
 */
export async function validateRegistry(): Promise<void> {
  const windowId = getWindowId();
  const registry = readRegistry();

  // If only our own entry (or empty), nothing to validate
  const otherEntries = Object.keys(registry).filter((wId) => wId !== windowId);
  if (otherEntries.length === 0) {
    return;
  }

  // Collect pong responses
  const alive = new Set<string>();
  const channel = getChannel();
  const handler = (event: MessageEvent<SessionMessage>) => {
    if (event.data.type === "pong") {
      alive.add(event.data.windowId);
    }
  };
  channel.addEventListener("message", handler);

  // Send ping
  channel.postMessage({ type: "ping", sourceWindowId: windowId } satisfies SessionMessage);

  // Wait for responses
  await new Promise((resolve) => setTimeout(resolve, PING_TIMEOUT_MS));
  channel.removeEventListener("message", handler);

  // Remove entries from windows that didn't respond
  const updatedRegistry = readRegistry();
  let changed = false;
  for (const wId of Object.keys(updatedRegistry)) {
    if (wId !== windowId && !alive.has(wId)) {
      delete updatedRegistry[wId];
      changed = true;
    }
  }
  if (changed) {
    writeRegistry(updatedRegistry);
  }
}

/**
 * Broadcasts a session-deleted message so all windows using that session can react.
 * @param sessionId - The session ID that was deleted.
 */
export function broadcastSessionDeleted(sessionId: string): void {
  getChannel().postMessage({ type: "session-deleted", sessionId } satisfies SessionMessage);
}

/**
 * Sends a focus-and-close message: tells the target window to focus itself,
 * and includes the source window ID so the source can be closed.
 * @param targetWindowId - The window that should gain focus.
 */
export function broadcastFocusAndClose(targetWindowId: string): void {
  const sourceWindowId = getWindowId();
  getChannel().postMessage({ type: "focus-and-close", targetWindowId, sourceWindowId } satisfies SessionMessage);
}

/**
 * Subscribes to cross-window session messages. Returns an unsubscribe function.
 * @param callback - Handler called with each received message.
 * @returns A function to unsubscribe.
 */
export function onSessionMessage(callback: (message: SessionMessage) => void): () => void {
  const channel = getChannel();
  const handler = (event: MessageEvent<SessionMessage>) => callback(event.data);
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}
