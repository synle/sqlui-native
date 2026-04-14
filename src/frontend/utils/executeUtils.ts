/**
 * Executes a shell command via Tauri invoke.
 * Returns an empty string in browser/non-Tauri environments.
 * @param shellToRun - The shell command to execute.
 * @param _delay - Unused, kept for backward compatibility.
 * @returns The stdout output of the command.
 */
export async function execute(shellToRun: string, _delay = 25): Promise<string> {
  if (!(window as any).isTauri) {
    return "";
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("execute_shell", { command: shellToRun });
  } catch (err) {
    console.error("executeUtils.ts:execute", err);
    return "";
  }
}
