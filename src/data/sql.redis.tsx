import { SqluiCore, SqlAction } from 'typings';
import { getDivider } from 'src/data/sql';

const REDIS_ADAPTER_PREFIX = 'db';

// for redis
export function getSetValue(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set Value`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.set("key", "value123")`,
      };
  }
}

export function getGet(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Get Value by Key`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.get("key")`,
      };
  }
}

export function getScan(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Scan for keys`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.keys("*")`,
      };
  }
}

export function getHset(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Set Value`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.hSet("key", "field", "value")`,
      };
  }
}

export function getHget(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Get Value By Key`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.hGetAll("key")`,
      };
  }
}

export function getHvals(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Values`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.hVals("key")`,
      };
  }
}

export function getHexist(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Check if key exists`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.hExists("key", "field1")`,
      };
  }
}

export function getListLPush(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Push item to the front`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.lPush("key", "value")`,
      };
  }
}

export function getListRPush(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Push item to the back`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.rPush("key", "value")`,
      };
  }
}

export function getListLPop(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Delete item from the front`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.lPop("key")`,
      };
  }
}

export function getListRPop(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Delete item from the back`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.rPop("key")`,
      };
  }
}

export function getListGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Get Items`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.lRange("key", 0, -1)`,
      };
  }
}

export function getSetGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Get Items`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.sMembers("key")`,
      };
  }
}

export function getSetAddItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Add Item`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.sAdd("key", "value1")`,
      };
  }
}

export function getSetIsMember(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Is a member of set`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.sIsMember("key", "value1")`,
      };
  }
}

export function getSetCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Total Size`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.sCard("key")`,
      };
  }
}

export function getSetRemoveLastItem(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Remove last item`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    default:
      return undefined;
    case 'redis':
      return {
        label,
        formatter: 'js',
        query: `${REDIS_ADAPTER_PREFIX}.sPop("key")`,
      };
  }
}

export const scripts = [
  getSetValue,
  getGet,
  getScan,
  getDivider,
  getHset,
  getHget,
  getHvals,
  getHexist,
  getDivider,
  getListGetItems,
  getListLPush,
  getListRPush,
  getListLPop,
  getListRPop,
  getDivider,
  getSetGetItems,
  getSetAddItems,
  getSetIsMember,
  getSetCount,
  getSetRemoveLastItem,
];
