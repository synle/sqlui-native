import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';

type ClientOptions = {
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

  const clientOptions: ClientOptions = {
    contactPoints: [`${connectionHosts[0].host}:${connectionHosts[0].port || 9042}`],
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
