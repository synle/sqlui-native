import { Sqlui } from 'typings';

// this section of the api is caches in memory
const caches: { [index: string]: Sqlui.ConnectionProps } = {};
let id = 0;

const ConnectionUtils = {
  addConnection(connection: Sqlui.CoreConnectionProps): Sqlui.ConnectionProps {
    const newId = `connection.${++id}`;

    caches[newId] = {
      id: newId,
      name: connection.name,
      connection: connection.connection,
    };

    return caches[newId];
  },

  updateConnection(connection: Sqlui.ConnectionProps): Sqlui.ConnectionProps {
    caches[connection.id] = {
      ...caches[connection.id],
      ...connection,
    };

    return caches[connection.id];
  },

  getConnections(): Sqlui.ConnectionProps[] {
    return Object.values(caches);
  },

  getConnection(id: string): Sqlui.ConnectionProps {
    return caches[id];
  },

  deleteConnection(id: string) {
    delete caches[id];
  },
};

ConnectionUtils.addConnection({
  connection: `mysql://root:password@localhost:3306`,
  name: 'sqlui_test_mysql',
});
ConnectionUtils.addConnection({
  connection: `mssql://sa:password123!@localhost:1433`,
  name: 'sqlui_test_mssql',
});
ConnectionUtils.addConnection({
  connection: `mariadb://root:password@localhost:33061`,
  name: 'sqlui_test_mariadb',
});
ConnectionUtils.addConnection({
  connection: `postgres://postgres:password@localhost:5432`,
  name: 'sqlui_test_postgres',
});
// ConnectionUtils.addConnection({ connection: `sqlite://test.db`, name: 'sqlui_test_sqlite' });

export default ConnectionUtils;
