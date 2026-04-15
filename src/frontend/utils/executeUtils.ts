import { platform } from "src/frontend/platform";

/**
 * Executes a shell command via the platform bridge.
 * Returns an empty string in browser/non-Tauri environments.
 * @param shellToRun - The shell command to execute.
 * @param _delay - Unused, kept for backward compatibility.
 * @returns The stdout output of the command.
 */
export async function execute(shellToRun: string, _delay = 25): Promise<string> {
  return platform.executeShellCommand(shellToRun);
}
