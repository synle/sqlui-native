/** Platform abstraction interface for desktop shell integration.
 * Implementations exist for Tauri, Electron, and browser environments.
 * This seam enables swapping the backend from HTTP to Tauri invoke in a single file change.
 */
export interface PlatformBridge {
  /** True when running inside a desktop shell (Tauri or Electron). */
  readonly isDesktop: boolean;

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

  /** Calls the backend via Tauri invoke or HTTP fetch. Returns undefined to fall through to HTTP. */
  backendFetch?(method: string, url: string, body?: any, sessionId?: string): Promise<any>;
}
