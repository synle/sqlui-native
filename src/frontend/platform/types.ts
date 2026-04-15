/** Platform abstraction interface for desktop shell integration.
 * Implementations exist for Tauri (sidecar) and browser environments.
 */
export interface PlatformBridge {
  /** True when running inside a desktop shell (Tauri). */
  readonly isDesktop: boolean;

  /** True when running inside Tauri. */
  readonly isTauri: boolean;

  /** Base URL for backend API calls. Empty string for relative URLs (dev proxy). */
  readonly sidecarBaseUrl: string;

  /** Opens a URL in the system's default browser. */
  openExternalUrl(url: string): void;

  /** Opens a new app window navigated to the given hash route. */
  openAppWindow(hashLink: string): void;

  /** Toggles native menu items by ID. No-op in browser mode. */
  toggleMenuItems(visible: boolean, menuIds: string[]): void;

  /** Subscribes to native menu command events. Returns an unsubscribe function. */
  onAppCommand(callback: (event: string) => void): () => void;

  /** Executes a shell command and returns stdout. No-op in browser mode. */
  executeShellCommand(command: string): Promise<string>;
}
