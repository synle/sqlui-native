import { RelationalDatabaseEngine } from 'sqlui-core';

type ConnectionProps = {
  id: string;
  connection: string;
  engine: RelationalDatabaseEngine;
  [index: string]: any;
};

// this section of the api is caches in memory
const caches: { [index: string]: ConnectionProps } = {};
let id = 0;

const ConnectionUtils = {
  addConnection(connectionString: string): ConnectionProps {
    const newId = `${++id}.${Date.now()}`;

    caches[newId] = {
      id: newId,
      connection: connectionString,
      engine: new RelationalDatabaseEngine(connectionString),
    };

    return caches[newId];
  },

  updateConnection(connection: ConnectionProps): ConnectionProps {
    caches[connection.id] = {
      ...caches[connection.id],
      ...connection,
    };

    return caches[connection.id];
  },

  getConnections(): ConnectionProps[] {
    return Object.values(caches);
  },

  getConnection(id: string): ConnectionProps {
    return caches[id];
  },

  deleteConnection(id: string) {
    delete caches[id];
  },
};

// const engine = new RelationalDatabaseEngine('mssql://sa:password123!@localhost:1433');

ConnectionUtils.addConnection(`mysql://root:password@localhost:3306`);
ConnectionUtils.addConnection(`mssql://sa:password123!@localhost:1433`);
ConnectionUtils.addConnection(`mariadb://root:password@localhost:33061`);
ConnectionUtils.addConnection(`postgres://postgres:password@localhost:5432`);
ConnectionUtils.addConnection(`sqlite://test.db`);

export default ConnectionUtils;
