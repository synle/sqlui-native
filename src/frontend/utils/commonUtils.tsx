import { SqluiCore, SqluiFrontend } from 'typings';
// for exporting
export function getExportedConnection(connectionProps: SqluiCore.ConnectionProps) {
  const { id, connection, name } = connectionProps;
  return { _type: 'connection', ...{ id, connection, name } };
}

export function getExportedQuery(query: SqluiFrontend.ConnectionQuery) {
  const { id, name, sql, connectionId, databaseId } = query;
  return { _type: 'query', ...{ id, name, sql, connectionId, databaseId } };
}
// misc utils
const TO_BE_DELETED_LIST_ITEM = Symbol('to_be_deleted_list_item');
export function getUpdatedOrdersForList(items: any[], from: number, to: number) {
  if(from === to){
    return items;
  }

  const targetItem = items[from];
  items[from] = TO_BE_DELETED_LIST_ITEM;

  // from > to : this is where we insert before `to`
  // from < to : this is where we insert after `to`
  items.splice(
    from > to
     ? to
     : to + 1,
     0,
     targetItem
   );

  return items.filter(item => item !== TO_BE_DELETED_LIST_ITEM)
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
