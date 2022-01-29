const fs = require('fs');
import { SqluiCore } from '../../typings';

// this section of the api is caches in memory
interface ConnectionStore {
  [index: string]: SqluiCore.ConnectionProps;
}

export class ConnectionUtils {
  instanceId: string;

  constructor(instanceId: string) {
    this.instanceId = instanceId;
  }

  private getData(): ConnectionStore {
    try {
      const storeFilePath = `./connections-${this.instanceId}.json`;
      return JSON.parse(fs.readFileSync(storeFilePath, { encoding: 'utf8', flag: 'r' }).trim());
    } catch (err) {
      return {};
    }
  }

  private setData(toSave: ConnectionStore) {
    const storeFilePath = `./connections-${this.instanceId}.json`;
    fs.writeFileSync(storeFilePath, JSON.stringify(toSave, null, 2));
  }

  addConnection(connection: SqluiCore.CoreConnectionProps): SqluiCore.ConnectionProps {
    const newId = `connection.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;

    const caches = this.getData();
    caches[newId] = {
      id: newId,
      name: connection.name,
      connection: connection.connection,
    };

    this.setData(caches);

    return caches[newId];
  }

  updateConnection(connection: SqluiCore.ConnectionProps): SqluiCore.ConnectionProps {
    const caches = this.getData();
    caches[connection.id] = {
      ...caches[connection.id],
      ...connection,
    };

    this.setData(caches);

    return caches[connection.id];
  }

  getConnections(): SqluiCore.ConnectionProps[] {
    const caches = this.getData();
    return Object.values(caches);
  }

  getConnection(id: string): SqluiCore.ConnectionProps {
    const caches = this.getData();
    return caches[id];
  }

  deleteConnection(id: string) {
    const caches = this.getData();
    delete caches[id];
    this.setData(caches);
  }
}

export default ConnectionUtils;
