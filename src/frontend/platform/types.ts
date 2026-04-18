/** Platform abstraction interface for desktop shell integration.
 * Implementations exist for Electron, Tauri, and browser environments.
 */
export interface PlatformBridge {
  /** True when running inside a desktop shell (Electron or Tauri). */
  readonly isDesktop: boolean;

  /** True when running inside Tauri with a sidecar backend. */
  readonly isTauri?: boolean;

  /** Base URL for the sidecar HTTP server. Empty string when not in Tauri mode. */
  readonly sidecarBaseUrl: string;

  /** Opens a URL in the system's default browser. */
  openExternalUrl(url: string): void;

  /** Opens a new app window navigated to the given hash route. */
  openAppWindow(hashLink: string): void;

  /** Toggles native menu items by ID. No-op in browser mode. */
  toggleMenuItems(visible: boolean, menuIds: string[]): void;

  /** Reads the text content of a File object. */
  readFileContent(file: File): Promise<string>;

  /** Executes a shell command and returns stdout. No-op in browser mode. */
  executeShellCommand(command: string): Promise<string>;

  /** Returns the filesystem path for a File object, or null if unavailable. */
  getFilePath(file: File): string | null;

  /** Subscribes to native menu command events. Returns an unsubscribe function. */
  onAppCommand(callback: (event: string) => void): () => void;
}
