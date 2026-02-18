import { useQuery } from '@tanstack/react-query';
import dataApi from 'src/frontend/data/api';

const QUERY_KEY_SERVER_CONFIGS = 'server_configs';

export function useGetServerConfigs() {
  return useQuery([QUERY_KEY_SERVER_CONFIGS], dataApi.getConfigs, {
    notifyOnChangeProps: ['data', 'error'],
  });
}
