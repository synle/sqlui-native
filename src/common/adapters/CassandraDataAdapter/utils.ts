import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';

type ClientOptions = {
  host: string;
  port: number;
  contactPoints: string[];
  keyspace?: string;
  authProvider?: {
    username: string;
    password: string;
  };
};

export function getClientOptions(connectionOption: string, database?: string): ClientOptions {
  const connectionParameters = BaseDataAdapter.getConnectionParameters(connectionOption);

  const connectionHosts = connectionParameters?.hosts || [];
  if (connectionHosts.length === 0) {
    // we need a host in the connection string
    throw 'Invalid connection. Host and Port not found';
  }

  const host = connectionHosts[0].host;
  const port = connectionHosts[0].port || 9042;

  const clientOptions: ClientOptions = {
    host,
    port,
    contactPoints: [`${host}:${port}`],
  };

  if (database) {
    clientOptions.keyspace = database;
  }

  // client authentication
  if (connectionParameters?.username && connectionParameters?.password) {
    clientOptions.authProvider = {
      username: connectionParameters?.username,
      password: connectionParameters?.password,
    };
  }

  return clientOptions;
}