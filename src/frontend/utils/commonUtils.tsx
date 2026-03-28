import { useCallback } from "react";
import { useNavigate as useReactRouterNavigate, NavigateFunction } from "react-router-dom";
import { SqluiCore, SqluiFrontend } from "typings";
/**
 * Converts a connection to an exportable format with a type marker.
 * @param connectionProps - The connection properties to export.
 * @returns An object with `_type: "connection"` and key connection fields.
 */
export function getExportedConnection(
  connectionProps: SqluiCore.ConnectionProps,
  managedMetadata?: { databases: SqluiCore.ManagedDatabase[]; tables: SqluiCore.ManagedTable[] },
) {
  const { id, connection, name } = connectionProps;
  const result: Record<string, any> = { _type: "connection", id, connection, name };
  if (managedMetadata) {
    result.managedMetadata = {
      databases: managedMetadata.databases.map(({ name, props }) => ({ name, ...(props ? { props } : {}) })),
      tables: managedMetadata.tables.map(({ name, databaseId, props }) => ({ name, databaseId, ...(props ? { props } : {}) })),
    };
  }
  return result;
}

/**
 * Converts a query to an exportable format with a type marker.
 * @param query - The connection query to export.
 * @returns An object with `_type: "query"` and key query fields.
 */
export function getExportedQuery(query: SqluiFrontend.ConnectionQuery) {
  const { id, name, sql, connectionId, databaseId, tableId } = query;
  return { _type: "query", ...{ id, name, sql, connectionId, databaseId, tableId } };
}

/**
 * Converts a bookmark (folder item) to an exportable format with a type marker.
 * Only includes essential fields: id, name, and cleaned data (connectionId, databaseId, tableId, sql).
 * @param bookmark - The bookmark folder item to export.
 * @returns An object with `_type: "bookmark"` and key bookmark fields.
 */
export function getExportedBookmark(bookmark: SqluiCore.FolderItem) {
  const { id, name, data } = bookmark;
  const { connectionId, databaseId, tableId, sql } = data as any;
  return { _type: "bookmark", id, name, data: { connectionId, databaseId, tableId, sql } };
}

// misc utils
const TO_BE_DELETED_LIST_ITEM = Symbol("to_be_deleted_list_item");

/**
 * Reorders items in a list by moving an element from one index to another.
 * @param items - The array to reorder (mutated in place).
 * @param from - The source index.
 * @param to - The destination index.
 * @returns The reordered array.
 */
export function getUpdatedOrdersForList(items: any[], from: number, to: number) {
  if (from === to) {
    return items;
  }

  const targetItem = items[from];
  items[from] = TO_BE_DELETED_LIST_ITEM;

  // from > to : this is where we insert before `to`
  // from < to : this is where we insert after `to`
  items.splice(from > to ? to : to + 1, 0, targetItem);

  return items.filter((item) => item !== TO_BE_DELETED_LIST_ITEM);
}

/**
 * Generates a random unique ID string with the given prefix.
 * @param prefix - The prefix for the generated ID.
 * @returns A string in the format `{prefix}.{timestamp}.{random}`.
 */
export function getGeneratedRandomId(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;
}

/**
 * Shows a system notification with the given message. Silently fails if permissions are denied.
 * @param message - The notification message to display.
 */
export async function createSystemNotification(message: string) {
  try {
    await Notification.requestPermission();
    new Notification(message);
  } catch (err) {
    console.error("commonUtils.tsx:Notification", err);
  }
}

/**
 * Formats a date as a short locale string without seconds and with 2-digit year.
 * @param date - The date to format (defaults to now).
 * @returns A short date string like "3/21/26, 12:22 PM".
 */
export function formatShortDate(date: Date = new Date()): string {
  return date
    .toLocaleString(undefined, {
      year: "2-digit",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(",", "");
}

/**
 * Wraps react-router's useNavigate with setTimeout(0) to defer navigation,
 * preventing "state update on unmounted component" warnings in React 17.
 * @returns A deferred NavigateFunction.
 */
export function useNavigate() {
  const navigate = useReactRouterNavigate();
  return useCallback(
    (...args: Parameters<NavigateFunction>) => {
      setTimeout(() => (navigate as Function)(...args), 0);
    },
    [navigate],
  ) as NavigateFunction;
}

/**
 * Strips the protocol, username, password, and query params from a connection URL,
 * returning just the host/path portion for display.
 * @param connectionString - The raw connection string.
 * @returns The sanitized URL string, or empty string if parsing fails.
 */
export function getSanitizedConnectionUrl(connectionString: string): string {
  if (!connectionString) return "";

  const input = connectionString;

  // Special handling for REST API connection strings (JSON format with HOST field).
  // e.g. rest://{"HOST":"https://httpbin.org","variables":[...]} (also accepts legacy restapi://)
  if (input.startsWith("rest://") || input.startsWith("restapi://")) {
    try {
      const json = JSON.parse(input.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, ""));
      if (json.HOST) return json.HOST;
    } catch (_err) {
      // fall through to default handling
    }
  }

  // Special handling for CosmosDB and Azure Table Storage connection strings,
  // which use a key=value;key=value format instead of standard URLs.
  // e.g. cosmosdb://AccountEndpoint=https://host:port;AccountKey=...
  // e.g. aztable://DefaultEndpointsProtocol=https;AccountName=...;EndpointSuffix=core.windows.net
  if (input.startsWith("cosmosdb://") || input.startsWith("aztable://")) {
    // Try to extract the domain (with optional port) from an embedded https:// URL
    const urlMatch = input.match(/https?:\/\/([a-zA-Z0-9.-]+(?::\d+)?)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // No embedded URL found — fall back to EndpointSuffix param (e.g. core.windows.net)
    const endpointSuffix = input.match(/EndpointSuffix=([^;]+)/i)?.[1];
    if (endpointSuffix) return endpointSuffix;
  }

  // Strip protocol (e.g. mysql://, mssql://, sqlite://, redis://)
  let result = input.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");

  // Strip credentials — use lastIndexOf to handle passwords containing @ characters
  if (result.includes("@")) {
    result = result.substring(result.lastIndexOf("@") + 1);
  }

  // Strip query string params
  if (result.includes("?")) {
    result = result.substring(0, result.indexOf("?"));
  }

  // Strip leading/trailing slashes
  result = result.replace(/^\/+|\/+$/g, "");

  return result;
}

/**
 * Sorts column names with common primary key names first, then ID-suffix columns, then alphabetically.
 * @param colNames - The array of column names to sort.
 * @returns The sorted array.
 */
export function sortColumnNamesForUnknownData(colNames: string[]) {
  return colNames.sort((a, b) => {
    // do sorting on columnname
    // attempt to show common column names (primary keys) first then sort other column names alphabetically
    const SPECIAL_COLUMN_NAMES = ["_id", "id", "rowKey", "partitionKey", "etag"];

    // here keep track of its position with respect to special column name
    let posa = SPECIAL_COLUMN_NAMES.indexOf(a);
    let posb = SPECIAL_COLUMN_NAMES.indexOf(b);
    posa = posa === -1 ? 100000 : posa;
    posb = posb === -1 ? 100000 : posb;

    // here keep track of its position if it has an id in name
    const ida = a.toLowerCase().endsWith("id") ? 0 : 1;
    const idb = b.toLowerCase().endsWith("id") ? 0 : 1;

    const sa = `${posa.toString().padStart(6, "0")}.${ida}.${a}`;
    const sb = `${posb.toString().padStart(6, "0")}.${idb}.${b}`;

    return sa.localeCompare(sb);
  });
}
