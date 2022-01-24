type Connection = {
  id: string,
  [index: string]: any,
};


// this section of the api is caches in memory
const caches: {[index: string]: Connection} = {};
let id  = 0;

export default {
  addConnection(connection: Connection) : Connection{
    const newId = `${++id}.${Date.now()}`;

    caches[newId] = {
      ...connection,
      id: newId,
    }

    return caches[newId];
  },

  updateConnection(connection: Connection): Connection{
    caches[connection.id] = {
      ...caches[connection.id],
      ...connection,
    }

    return caches[connection.id];
  },

  getConnections(): Connection[]{
    return Object.values(caches);
  },

  getConnection(id: string): Connection{
    return caches[id];
  },

  deleteConnection(id: string){
    delete caches[id];
  }
}
