const fs = require( 'fs');
import { Sqlui } from '../../typings';

// this section of the api is caches in memory
interface ConnectionStore{
   [index: string]: Sqlui.ConnectionProps
}

const storeFilePath = './connections.json';
function getData(): ConnectionStore{
  try{
    return JSON.parse(fs.readFileSync(storeFilePath, { encoding: 'utf8', flag: 'r' }).trim());
  } catch(err){
    return {};
  }
}

function setData(toSave: ConnectionStore){
  fs.writeFileSync(storeFilePath, JSON.stringify(toSave, null, 2))
}

const ConnectionUtils = {
  addConnection(connection: Sqlui.CoreConnectionProps): Sqlui.ConnectionProps {
    const newId = `connection.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;

    const caches = getData();
    caches[newId] = {
      id: newId,
      name: connection.name,
      connection: connection.connection,
    };

    setData(caches);

    return caches[newId];
  },

  updateConnection(connection: Sqlui.ConnectionProps): Sqlui.ConnectionProps {
    const caches = getData();
    caches[connection.id] = {
      ...caches[connection.id],
      ...connection,
    };

    setData(caches);

    return caches[connection.id];
  },

  getConnections(): Sqlui.ConnectionProps[] {
    const caches = getData();
    return Object.values(caches);
  },

  getConnection(id: string): Sqlui.ConnectionProps {
    const caches = getData();
    return caches[id];
  },

  deleteConnection(id: string) {
    const caches = getData();
    delete caches[id];
    setData(caches);
  },
};

export default ConnectionUtils;
