import BaseDataScript, { buildJavaGradleSnippet, getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { getClientOptions } from "src/common/adapters/RedisDataAdapter/utils";
import { SqlAction } from "typings";

export const REDIS_ADAPTER_PREFIX = "db";

const formatter = "js";

// for redis
export function getSetValue(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set Value`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.set("key", "value123")`,
  };
}

export function getGet(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Get Value by Key`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.get("key")`,
  };
}

export function getScan(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Scan for keys`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.keys("*")`,
  };
}

export function getHset(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Set Value`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hSet("hash_key1", "field1", "value1")`,
  };
}

export function getHget(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Get Value By Key`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hGetAll("hash_key1")`,
  };
}

export function getHvals(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Values`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hVals("hash_key1")`,
  };
}

export function getHexist(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Hashset > Check if key exists`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.hExists("hash_key1", "field1")`,
  };
}

export function getListLPush(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Push item to the front`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.lPush("list_key1", "value")`,
  };
}

export function getListRPush(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Push item to the back`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.rPush("list_key1", "value")`,
  };
}

export function getListLPop(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Delete item from the front`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.lPop("list_key1")`,
  };
}

export function getListRPop(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Delete item from the back`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.rPop("list_key1")`,
  };
}

export function getListGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `List > Get Items`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.lRange("list_key1", 0, -1)`,
  };
}

export function getSetGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Get Items`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sMembers("set_key1")`,
  };
}

export function getSetAddItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Add Item`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sAdd("set_key1", "value1")`,
  };
}

export function getSetIsMember(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Is a member of set`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sIsMember("set_key1", "value1")`,
  };
}

export function getSetCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Total Size`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sCard("set_key1")`,
  };
}

export function getSetRemoveLastItem(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Set > Remove last item`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.sPop("set_key1")`,
  };
}

export function getSortedSetGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Sorted Set > Get Items`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.zRange("sorted_set_key1", 0, -1)`,
  };
}

export function getSortedSetAddItem(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Sorted Set > Add Item`;

  return {
    label,
    formatter,
    query: `${REDIS_ADAPTER_PREFIX}.zAdd("sorted_set_key1", [{score: 1, value: "some_value"}])`,
  };
}

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

  getDialectIcon(dialect) {
    return `${process.env.PUBLIC_URL}/assets/redis.png`;
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

  getSampleSelectQuery(tableActionInput) {
    return undefined;
  }

  getCodeSnippet(connection, query, language) {
    const clientOptions = getClientOptions(connection.connection);
    const sql = query.sql;
    const database = query.databaseId;

    switch (language) {
      case "javascript":
        return `
// npm install --save redis
const { createClient, RedisClientType } = require('redis');

async function _doWork(){
  try {
    const db = await new Promise((resolve, reject) => {
      const client = createClient(${JSON.stringify(clientOptions)});
      client.connect();
      client.on('ready', () => resolve(client));
      client.on('error', (err) => reject(err));
    });

    const res = await ${sql};
    console.log(res);
  } catch(err){
    console.log('Failed to connect', err);
  }
}

_doWork();
        `.trim();
      case "python":
        return `
# python3 -m venv ./ # setting up virtual environment
# source bin/activate # activate the venv profile
# pip install redis
import redis

def _do_work():
    try:
        client = redis.Redis.from_url('${clientOptions.url}'${clientOptions.password ? `, password='${clientOptions.password}'` : ""})
        res = client.${_pythonRedisCommand(sql)}
        print(res)
    except Exception as err:
        print('Failed to connect', err)

_do_work()
        `.trim();
      case "java":
        return buildJavaGradleSnippet({
          gradleDep: `    implementation 'redis.clients:jedis:5.1.0'`,
          mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Run:
 * ./gradlew run
 */`,
          mainJavaCode: `import redis.clients.jedis.Jedis;

public class Main {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("${clientOptions.url}")) {
            ${clientOptions.password ? `jedis.auth("${clientOptions.password}");` : "// jedis.auth(\"password\");"}

            // Example: get a key
            String res = jedis.get("key");
            System.out.println(res);
        } catch (Exception e) {
            System.out.println("Failed to connect: " + e.getMessage());
        }
    }
}`,
        });
      default:
        return ``;
    }
  }
}

export default new ConcreteDataScripts();
