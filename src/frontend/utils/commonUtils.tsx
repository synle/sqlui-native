import { SqluiCore, SqluiFrontend } from 'typings';
// for exporting
export function getExportedConnection(connectionProps: SqluiCore.ConnectionProps) {
  const { id, connection, name } = connectionProps;
  return { _type: 'connection', ...{ id, connection, name } };
}

export function getExportedQuery(query: SqluiFrontend.ConnectionQuery) {
  const { id, name, sql, connectionId, databaseId, tableId } = query;
  return { _type: 'query', ...{ id, name, sql, connectionId, databaseId, tableId } };
}

// misc utils
const TO_BE_DELETED_LIST_ITEM = Symbol('to_be_deleted_list_item');

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

export function getGeneratedRandomId(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;
}

export async function createSystemNotification(message: string) {
  try {
    await Notification.requestPermission();
    new Notification(message);
  } catch (err) {}
}

export function sortColumnNamesForUnknownData(colNames: string[]) {
  return colNames.sort((a, b) => {
    // do sorting on columnname
    // attempt to show common column names (primary keys) first then sort other column names alphabetically
    const SPECIAL_COLUMN_NAMES = ['_id', 'id', 'rowKey', 'partitionKey', 'etag'];

    // here keep track of its position with respect to special column name
    let posa = SPECIAL_COLUMN_NAMES.indexOf(a);
    let posb = SPECIAL_COLUMN_NAMES.indexOf(b);
    posa = posa === -1 ? 100000 : posa;
    posb = posb === -1 ? 100000 : posb;

    // here keep track of its position if it has an id in name
    let ida = a.toLowerCase().endsWith('id') ? 0 : 1;
    let idb = b.toLowerCase().endsWith('id') ? 0 : 1;

    const sa = `${posa.toString().padStart(6, '0')}.${ida}.${a}`;
    const sb = `${posb.toString().padStart(6, '0')}.${idb}.${b}`;

    return sa.localeCompare(sb);
  });
}
