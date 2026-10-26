/** Restricts local-file adapter access to server binds limited to the current machine. */

const LOCAL_FILE_ACCESS_ENV = "SQLUI_LOCAL_FILE_ADAPTER_ENABLED";

/**
 * Enables local document reads only when the server binds to a loopback address.
 * @param host - Host address selected by the server runtime.
 * @returns Whether local-file access was enabled.
 */
export function configureLocalFileAccess(host: string): boolean {
  const enabled = isLoopbackBindHost(host);
  process.env[LOCAL_FILE_ACCESS_ENV] = String(enabled);
  return enabled;
}

/** Recognizes localhost and valid IPv4/IPv6 loopback bind addresses. */
function isLoopbackBindHost(host: string): boolean {
  if (["localhost", "::1", "[::1]"].includes(host.toLowerCase())) return true;

  const octets = host.split(".");
  if (octets.length !== 4 || octets[0] !== "127") return false;
  return octets.every((octet) => /^\d+$/.test(octet) && Number(octet) <= 255);
}
