import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import redisIcon from "src/common/adapters/RedisDataAdapter/redis.png";
import { getClientOptions } from "src/common/adapters/RedisDataAdapter/utils";
import { SqlAction } from "typings";

/** Prefix used for Redis query syntax in sqlui-native. */
export const REDIS_ADAPTER_PREFIX = "db";

const formatter = "js";

/**
 * Generates a Redis SET command script.
 * @param input - Table input (unused for Redis but required by interface).
 * @returns Script output with the SET command.
 */
export function getSetValue(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set Value`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.set("key", "value123")`,
  };
}

/**
 * Generates a Redis GET command script.
 * @param input - Table input.
 * @returns Script output with the GET command.
 */
export function getGet(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Get Value by Key`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.get("key")`,
  };
}

/**
 * Generates a Redis KEYS command script to scan for keys matching a pattern.
 * @param input - Table input.
 * @returns Script output with the KEYS command.
 */
export function getScan(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Scan for keys`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.keys("*")`,
  };
}

/**
 * Generates a Redis HSET command script for hash sets.
 * @param input - Table input.
 * @returns Script output with the HSET command.
 */
export function getHset(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Set Value`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hSet("hash_key1", "field1", "value1")`,
  };
}

/**
 * Generates a Redis HGETALL command script for hash sets.
 * @param input - Table input.
 * @returns Script output with the HGETALL command.
 */
export function getHget(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Get Value By Key`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hGetAll("hash_key1")`,
  };
}

/**
 * Generates a Redis HVALS command script for hash set values.
 * @param input - Table input.
 * @returns Script output with the HVALS command.
 */
export function getHvals(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Values`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hVals("hash_key1")`,
  };
}

/**
 * Generates a Redis HEXISTS command script to check if a hash field exists.
 * @param input - Table input.
 * @returns Script output with the HEXISTS command.
 */
export function getHexist(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Check if key exists`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hExists("hash_key1", "field1")`,
  };
}

/**
 * Generates a Redis LPUSH command script to push an item to the front of a list.
 * @param input - Table input.
 * @returns Script output with the LPUSH command.
 */
export function getListLPush(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Push item to the front`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.lPush("list_key1", "value")`,
  };
}

/**
 * Generates a Redis RPUSH command script to push an item to the back of a list.
 * @param input - Table input.
 * @returns Script output with the RPUSH command.
 */
export function getListRPush(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Push item to the back`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.rPush("list_key1", "value")`,
  };
}

/**
 * Generates a Redis LPOP command script to remove an item from the front of a list.
 * @param input - Table input.
 * @returns Script output with the LPOP command.
 */
export function getListLPop(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Delete item from the front`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.lPop("list_key1")`,
  };
}

/**
 * Generates a Redis RPOP command script to remove an item from the back of a list.
 * @param input - Table input.
 * @returns Script output with the RPOP command.
 */
export function getListRPop(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Delete item from the back`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.rPop("list_key1")`,
  };
}

/**
 * Generates a Redis LRANGE command script to get all items in a list.
 * @param input - Table input.
 * @returns Script output with the LRANGE command.
 */
export function getListGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Get Items`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.lRange("list_key1", 0, -1)`,
  };
}

/**
 * Generates a Redis SMEMBERS command script to get all members of a set.
 * @param input - Table input.
 * @returns Script output with the SMEMBERS command.
 */
export function getSetGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Get Items`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sMembers("set_key1")`,
  };
}

/**
 * Generates a Redis SADD command script to add an item to a set.
 * @param input - Table input.
 * @returns Script output with the SADD command.
 */
export function getSetAddItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Add Item`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sAdd("set_key1", "value1")`,
  };
}

/**
 * Generates a Redis SISMEMBER command script to check set membership.
 * @param input - Table input.
 * @returns Script output with the SISMEMBER command.
 */
export function getSetIsMember(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Is a member of set`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sIsMember("set_key1", "value1")`,
  };
}

/**
 * Generates a Redis SCARD command script to get the total size of a set.
 * @param input - Table input.
 * @returns Script output with the SCARD command.
 */
export function getSetCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Total Size`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sCard("set_key1")`,
  };
}

/**
 * Generates a Redis SPOP command script to remove and return a random set member.
 * @param input - Table input.
 * @returns Script output with the SPOP command.
 */
export function getSetRemoveLastItem(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Remove last item`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sPop("set_key1")`,
  };
}

/**
 * Generates a Redis ZRANGE command script to get items from a sorted set.
 * @param input - Table input.
 * @returns Script output with the ZRANGE command.
 */
export function getSortedSetGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Sorted Set > Get Items`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.zRange("sorted_set_key1", 0, -1)`,
  };
}

/**
 * Generates a Redis ZADD command script to add an item to a sorted set.
 * @param input - Table input.
 * @returns Script output with the ZADD command.
 */
export function getSortedSetAddItem(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Sorted Set > Add Item`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.zAdd("sorted_set_key1", [{score: 1, value: "some_value"}])`,
  };
}

/**
 * Generates a Redis PUBLISH command script to publish a message to a channel.
 * @param input - Table input.
 * @returns Script output with the PUBLISH command.
 */
export function getPublishMessage(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Publish a message`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.publish("pubsub_channel_key1", "some_message")`,
  };
}

/**
 * Converts a JS redis command like `db.get("key")` to a Python-style redis call like `get("key")`.
 * This is a best-effort conversion since the query uses JS client syntax.
 */
function _pythonRedisCommand(sql: string): string {
  // strip the "db." prefix to get the method call
  return sql.replace(/^db\./, "");
}

/** Script generator for Redis and Redis with SSL (rediss) dialects. */
export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["redis", "rediss"];

  getIsTableIdRequiredForQuery() {
    return false;
  }

  getSyntaxMode() {
    return "javascript";
  }

  supportMigration() {
    return false;
  }

  supportCreateRecordForm() {
    return false;
  }

  supportEditRecordForm() {
    return false;
  }

  // dialect definitions
  getDialectName(dialect) {
    switch (dialect) {
      case "rediss":
        return `Redis with SSL`;
      case "redis":
      default:
        return `Redis`;
    }
  }

  getDialectIcon() {
    return redisIcon;
  }

  // core methods
  getTableScripts() {
    return [
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
      getDivider,
      getSortedSetGetItems,
      getSortedSetAddItem,
      getDivider,
      getPublishMessage,
    ];
  }

  getDatabaseScripts() {
    return [];
  }

  getConnectionScripts() {
    return [];
  }

  getSampleConnectionString(dialect) {
    switch (dialect) {
      case "rediss":
        return `rediss://username:password@localhost:6379`;
      case "redis":
      default:
        return `redis://localhost:6379`;
    }
  }

  getSampleSelectQuery() {
    return undefined;
  }

  getCodeSnippet(connection, query, language) {
    const clientOptions = getClientOptions(connection.connection);
    const sql = query.sql;

    switch (language) {
      case "javascript":
        return renderCodeSnippet("javascript", "redis", {
          clientOptionsJson: JSON.stringify(clientOptions),
          sql,
        });
      case "python":
        return renderCodeSnippet("python", "redis", {
          url: clientOptions.url,
          passwordArg: clientOptions.password ? `, password='${clientOptions.password}'` : "",
          pythonCommand: _pythonRedisCommand(sql),
        });
      case "java": {
        const authLine = clientOptions.password ? `jedis.auth("${clientOptions.password}");` : `// jedis.auth("password");`;

        return renderCodeSnippet(
          "java",
          "redis",
          { url: clientOptions.url, authLine },
          {
            gradleDep: `    implementation 'redis.clients:jedis:5.1.0'`,
            mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Run:
 * ./gradlew run
 */`,
          },
        );
      }
      default:
        return ``;
    }
  }
}

export default new ConcreteDataScripts();
