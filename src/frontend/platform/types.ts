/** Platform abstraction interface for desktop shell integration.
 * Implementations exist for Electron and browser environments.
 */
export interface PlatformBridge {
  /** True when running inside a desktop shell (Electron). */
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

  /** Opens a native file picker dialog and returns the selected absolute path,
   * or null if the user cancelled or this platform doesn't support a native picker
   * (browser mode). When null is returned, callers should fall back to an HTML
   * `<input type="file">` element.
   */
  pickFile(options?: { title?: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null>;

  /** Subscribes to native menu command events. Returns an unsubscribe function. */
  onAppCommand(callback: (event: string) => void): () => void;
}
