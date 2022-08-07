import { createClient, RedisClientType } from 'redis';
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';

export function getClientOptions(connectionOption: string){
  const options = BaseDataAdapter.getConnectionParameters(connectionOption) as any;

  const { host, port } = options?.hosts[0];
  const { scheme, username, password } = options;

  const clientOptions: any = {
    url: `${scheme}://${host}:${port || 6379}`,
  };

  if (password) {
    clientOptions.password = password;
  }

  return clientOptions;
}
