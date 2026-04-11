/** Shared types and interface for persistent storage backends. */

/** Shape of entries stored in persistent storage — must have an `id` field. */
export type StorageEntry = {
  id: string;
  [index: string]: any;
};

/** Internal dictionary mapping entry IDs to their data. */
export type StorageContent = {
  [index: string]: any;
};

/**
 * Interface for persistent storage backends.
 * Both JSON file and SQLite implementations conform to this contract.
 * @template T - The entry type, must have an `id` string property.
 */
export interface IPersistentStorage<T extends StorageEntry> {
  /** The SQLite table name for this storage instance (ignored by JSON backend). */
  table: string;

  /** Identifier for the storage instance (e.g., session ID, "cache"). */
  instanceId: string;

  /** Name of the data type being stored (e.g., "connection", "query"). */
  name: string;

  /** Full file path to the JSON storage file (used by JSON backend, vestigial in SQLite). */
  storageLocation: string;

  /**
   * Generates a random unique ID prefixed with this storage's name.
   * @returns A unique string ID.
   */
  getGeneratedRandomId(): string;

  /**
   * Adds a new entry to storage, auto-generating an ID if not provided.
   * Automatically sets `createdAt` and `updatedAt` timestamps.
   * @param entry - The entry data to add.
   * @returns The saved entry with its assigned ID.
   */
  add<K>(entry: K): T;

  /**
   * Updates an existing entry by merging new values with the stored entry.
   * Automatically sets `updatedAt` timestamp.
   * @param entry - The entry with updated fields; must include `id`.
   * @returns The merged and saved entry.
   */
  update(entry: T): T;

  /**
   * Replaces all entries in storage with the provided array.
   * @param entries - The complete list of entries to store.
   * @returns The stored entries.
   */
  set(entries: T[]): T[];

  /**
   * Returns all entries in storage as an array.
   * @returns Array of all stored entries.
   */
  list(): T[];

  /**
   * Retrieves a single entry by its ID.
   * @param id - The entry ID to look up.
   * @returns The matching entry, or undefined if not found.
   */
  get(id: string): T;

  /**
   * Deletes an entry by its ID.
   * @param id - The entry ID to remove.
   */
  delete(id: string): void;

  /**
   * Writes arbitrary data to a JSON file in the storage directory.
   * @param fileName - The file name (without directory path).
   * @param content - The data to serialize and write.
   * @returns The full path to the written file.
   */
  writeDataFile(fileName: string, content: any): string;

  /**
   * Reads and parses a JSON data file from disk.
   * @param filePath - The absolute path to the file.
   * @returns The parsed JSON content.
   */
  readDataFile(filePath: string): any;
}
