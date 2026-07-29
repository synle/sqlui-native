/** Handles migration from JSON file storage to SQLite storage on app startup. */

import fs from "node:fs";
import path from "node:path";
import { writeDebugLog } from "src/common/utils/debugLogger";
import { getStorageDir } from "src/common/PersistentStorageJsonFile";
import { PersistentStorageSqlite, DB_FILE_NAME } from "src/common/PersistentStorageSqlite";

/** Current storage version. Increment when schema changes require a new migration. */
export const CURRENT_STORAGE_VERSION = 1;

/** ID for the storage version entry in the setting table. */
export const STORAGE_VERSION_ID = "database_storage_version";

/** Backup subdirectory name inside storageDir. */
const BACKUP_DIR_NAME = "backup";

/**
 * File pattern to SQLite table mapping for migration.
 * Each entry defines a regex pattern and the target table name.
 */
const MIGRATION_MAPPINGS: { pattern: RegExp; table: string }[] = [
  { pattern: /^(.+)\.connection\.json$/, table: "connection" },
  { pattern: /^(.+)\.query\.json$/, table: "query" },
  { pattern: /^sessions\.json$/, table: "session" },
  { pattern: /^folders\.(.+)\.json$/, table: "folder_item" },
  { pattern: /^dataSnapshots\.json$/, table: "data_snapshot" },
  { pattern: /^settings\.json$/, table: "setting" },
  { pattern: /^managedDatabases\.(.+)\.json$/, table: "managed_database" },
  { pattern: /^managedTables\.(.+)\.json$/, table: "managed_table" },
  { pattern: /^cache\.databases\.json$/, table: "cached_database" },
  { pattern: /^cache\.tables\.json$/, table: "cached_table" },
  { pattern: /^cache\.columns\.json$/, table: "cached_column" },
  { pattern: /^cache\.code-snippets\.json$/, table: "cached_code_snippet" },
];

/**
 * Returns the absolute path to the SQLite database file.
 * @returns The full path to the database file.
 */
export function getDbFilePath(): string {
  return path.join(getStorageDir(), DB_FILE_NAME);
}

/**
 * Checks whether the SQLite database file exists on disk.
 * @returns True if the database file exists.
 */
export function dbFileExists(): boolean {
  return fs.existsSync(getDbFilePath());
}

/**
 * Returns the current database storage version from the setting table.
 * Returns 0 if the DB file doesn't exist or has no version entry (legacy JSON).
 * @returns The version number, or 0 if not yet migrated.
 */
export function getStorageVersion(): number {
  if (!dbFileExists()) return 0;

  try {
    const settingStorage = new PersistentStorageSqlite<any>("setting", "settings", "settings", "settings");
    const entry = settingStorage.get(STORAGE_VERSION_ID);
    if (!entry) return 0;
    return entry.version || 0;
  } catch (_err) {
    return 0;
  }
}

/**
 * Sets the database storage version in the setting table.
 * @param version - The version number to write.
 */
function setStorageVersion(version: number): void {
  const settingStorage = new PersistentStorageSqlite<any>("setting", "settings", "settings", "settings");
  const existing = settingStorage.get(STORAGE_VERSION_ID);
  if (existing) {
    settingStorage.update({ id: STORAGE_VERSION_ID, version });
  } else {
    settingStorage.add({ id: STORAGE_VERSION_ID, version });
  }
}

/**
 * Reads a JSON storage file and returns its entries as an array.
 * @param filePath - Absolute path to the JSON file.
 * @returns Array of entries from the file.
 */
function readJsonStorageFile(filePath: string): Array<{ id: string; [key: string]: any }> {
  try {
    const raw = fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).trim();
    const data = JSON.parse(raw);
    return Object.values(data);
  } catch (err) {
    console.error("PersistentStorageMigration.ts:readJsonStorageFile", err);
    return [];
  }
}

/**
 * Writes already-parsed entries into the corresponding SQLite table.
 *
 * @remarks Reading is deliberately a separate step (see {@link runMigration}) so that file I/O stays
 * outside the write transaction.
 * @param table - The target SQLite table name.
 * @param entries - Entries previously read from a legacy JSON file.
 * @returns The number of entries seen (entries without an `id` are skipped but still counted, matching
 * the original per-file tally).
 */
function writeMigrationEntries(table: string, entries: Array<{ id: string; [key: string]: any }>): number {
  if (entries.length === 0) return 0;

  const storage = new PersistentStorageSqlite<any>(table, "migration", "migration");
  for (const entry of entries) {
    if (!entry.id) continue;
    const { id, ...data } = entry;
    storage.add({ id, ...data });
  }
  return entries.length;
}

/**
 * Moves a file to the backup directory.
 * @param filePath - Absolute path to the file to back up.
 * @param backupDir - Absolute path to the backup directory.
 */
function backupFile(filePath: string, backupDir: string): void {
  const fileName = path.basename(filePath);
  const destPath = path.join(backupDir, fileName);
  fs.renameSync(filePath, destPath);
}

/**
 * Scans storageDir for JSON files that match known storage file patterns.
 * @returns Array of matching file names.
 */
function findJsonStorageFiles(): string[] {
  try {
    return fs.readdirSync(getStorageDir()).filter((f) => f.endsWith(".json"));
  } catch (err) {
    console.error("PersistentStorageMigration.ts:findJsonStorageFiles", err);
    return [];
  }
}

/**
 * Runs the migration from JSON file storage to SQLite on app startup.
 * This function is idempotent — safe to call multiple times.
 *
 * @remarks
 * Decision tree:
 * 1. If the SQLite DB file exists and has version >= CURRENT_STORAGE_VERSION → no-op
 * 2. If the SQLite DB file does NOT exist:
 *    a. Check for legacy JSON files in storageDir
 *    b. If JSON files found → migrate them into SQLite, move to backup/, set version
 *    c. If no JSON files → fresh install, create DB, set version
 * 3. If the SQLite DB file exists but version is 0 (no version entry) → same as 2b/2c
 *
 * On failure: JSON files remain in place, version not updated. Users can restore
 * by moving files from `{storageDir}/backup/` back to `{storageDir}/`.
 */
export function runMigration(): void {
  // Fast path: DB exists and already at current version
  if (dbFileExists()) {
    const version = getStorageVersion();
    if (version >= CURRENT_STORAGE_VERSION) {
      return;
    }
  }

  // Check for legacy JSON files
  const jsonFiles = findJsonStorageFiles();
  const matchingFiles = jsonFiles.filter((f) => MIGRATION_MAPPINGS.some((m) => m.pattern.test(f)));

  if (matchingFiles.length === 0) {
    // Fresh install or already cleaned up — just set the version
    setStorageVersion(CURRENT_STORAGE_VERSION);
    return;
  }

  // Create backup directory
  const backupDir = path.join(getStorageDir(), BACKUP_DIR_NAME);
  fs.mkdirSync(backupDir, { recursive: true });

  let totalMigrated = 0;

  // Read and parse every file before opening the transaction — doing file I/O inside a write
  // transaction would hold the database lock (and grow the WAL) for the entire scan.
  const pending = matchingFiles.map((fileName) => {
    const filePath = path.join(getStorageDir(), fileName);
    const mapping = MIGRATION_MAPPINGS.find((m) => m.pattern.test(fileName))!;
    return { filePath, table: mapping.table, entries: readJsonStorageFile(filePath) };
  });

  // One transaction for every file: without it each row is its own implicit transaction (a disk sync
  // per entry), and a mid-way failure would leave the database half-populated. On throw everything
  // rolls back and this function exits before the backup moves or the version bump below, so the JSON
  // files stay put and the next launch retries cleanly.
  PersistentStorageSqlite.transaction(() => {
    for (const { table, entries } of pending) {
      totalMigrated += writeMigrationEntries(table, entries);
    }
  });

  // Only reached once the writes are committed, so nothing is backed up for a migration that failed.
  const migratedFilePaths = pending.map((p) => p.filePath);

  // Move migrated files to backup
  for (const filePath of migratedFilePaths) {
    try {
      backupFile(filePath, backupDir);
    } catch (err) {
      console.error("PersistentStorageMigration.ts:runMigration:backup", err);
    }
  }

  // Mark migration complete
  setStorageVersion(CURRENT_STORAGE_VERSION);

  const msg = `PersistentStorageMigration: migrated ${totalMigrated} entries from ${migratedFilePaths.length} files`;
  console.log(msg);
  writeDebugLog(msg);
}
