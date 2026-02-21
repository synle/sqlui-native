import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";

const QUERY_KEY_SERVER_CONFIGS = "server_configs";

export function useGetServerConfigs() {
  return useQuery([QUERY_KEY_SERVER_CONFIGS], dataApi.getConfigs, {
    notifyOnChangeProps: ["data", "error"],
  });
}

export function useUpdateServerConfigs() {
  const queryClient = useQueryClient();
  return useMutation(dataApi.updateConfigs, {
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEY_SERVER_CONFIGS]);
    },
  });
}
