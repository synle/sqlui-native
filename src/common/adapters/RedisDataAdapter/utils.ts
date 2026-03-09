import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";

/**
 * Parses a Redis connection string into client options.
 * @param connectionOption - The connection string (e.g., `redis://localhost:6379`).
 * @returns Parsed client options including URL and optional password.
 */
export function getClientOptions(connectionOption: string) {
  const options = BaseDataAdapter.getConnectionParameters(connectionOption) as any;

  const { host, port } = options?.hosts[0];
  const { scheme, password } = options;

  const clientOptions: any = {
    url: `${scheme}://${host}:${port || 6379}`,
  };

  if (password) {
    clientOptions.password = password;
  }

  return clientOptions;
}
