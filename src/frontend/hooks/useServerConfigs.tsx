import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";

/** React Query cache key for server configuration. */
const QUERY_KEY_SERVER_CONFIGS = "server_configs";

/**
 * Hook to fetch server configuration. Stale time is 30 minutes since configs rarely change.
 * @returns React Query result containing the server config object.
 */
export function useGetServerConfigs() {
  return useQuery({
    queryKey: [QUERY_KEY_SERVER_CONFIGS],
    queryFn: dataApi.getConfigs,
    staleTime: 1800000, // 30 minutes - configs rarely change
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to update server configuration. Invalidates the config cache on success.
 * @returns Mutation that accepts updated config values.
 */
export function useUpdateServerConfigs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dataApi.updateConfigs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SERVER_CONFIGS] });
    },
  });
}
