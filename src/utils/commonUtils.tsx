import { SqluiCore } from 'typings';
import { SqluiFrontend } from 'typings';
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
export function getUpdatedOrdersForList(items: any[], from: number, to: number) {
  // ordering will move the tab from the old index to the new index
  // and push everything from that point out
  const targetItem = items[from];
  let leftHalf: SqluiFrontend.ConnectionQuery[];
  let rightHalf: SqluiFrontend.ConnectionQuery[];

  if (from > to) {
    leftHalf = items.filter((q, idx) => idx < to && idx !== from);
    rightHalf = items.filter((q, idx) => idx >= to && idx !== from);
  } else {
    leftHalf = items.filter((q, idx) => idx <= to && idx !== from);
    rightHalf = items.filter((q, idx) => idx > to && idx !== from);
  }

  return [...leftHalf, targetItem, ...rightHalf];
}

export function getGeneratedRandomId(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;
}

export async function createSystemNotification(message: string){
  try{
    await Notification.requestPermission();
    new Notification(message);
  } catch(err){}
}
