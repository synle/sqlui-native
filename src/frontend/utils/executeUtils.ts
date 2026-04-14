import { platform } from "src/frontend/platform";

/**
 * Executes a shell command in desktop mode using the platform bridge.
 * Returns an empty string in non-desktop environments.
 * @param shellToRun - The shell command to execute.
 * @param _delay - Deprecated. Kept for backward compatibility.
 * @returns The stdout output of the command.
 */
export function execute(shellToRun: string, _delay = 25): Promise<string> {
  return platform.executeShellCommand(shellToRun);
}
