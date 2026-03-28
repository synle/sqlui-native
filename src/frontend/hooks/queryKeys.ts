/**
 * Centralized React Query key factories for all connection and schema queries.
 * Every hook, invalidation, and setQueryData call should import keys from here
 * to ensure consistency and prevent silent breakage from mismatched strings.
 */
export const queryKeys = {
  /** Keys for connection CRUD queries. */
  connections: {
    /** Key for the list of all connections. */
    all: ["connections"] as const,
    /** Key for a single connection by ID. */
    byId: (connectionId: string) => [connectionId] as const,
  },

  /** Keys for database schema queries. */
  databases: {
    /** Key for the list of databases within a connection. */
    list: (connectionId: string) => [connectionId, "databases"] as const,
  },

  /** Keys for table schema queries. */
  tables: {
    /** Key for the list of tables within a database. */
    list: (connectionId: string, databaseId: string) => [connectionId, databaseId, "tables"] as const,
  },

  /** Keys for column schema queries. */
  columns: {
    /** Key for columns of a specific table. */
    list: (connectionId: string, databaseId: string, tableId: string) => [connectionId, databaseId, tableId, "columns"] as const,
    /** Key for all columns across all tables in a database (bulk fetch). */
    allForDatabase: (connectionId: string, databaseId: string) => [connectionId, databaseId, "allTableColumns"] as const,
  },

  /** Keys for cached schema queries (backend disk cache). */
  schema: {
    /** Key for consolidated cached schema (databases + tables + columns). */
    cached: (connectionId: string, databaseId: string) => [connectionId, databaseId, "cachedSchema"] as const,
  },
} as const;
