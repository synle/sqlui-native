/**
 * Executes a shell command in Electron mode using child_process.exec.
 * Returns an empty string in non-Electron environments.
 * @param shellToRun - The shell command to execute.
 * @param delay - Delay in milliseconds before execution (default: 25).
 * @returns The stdout output of the command.
 */
export function execute(shellToRun: string, delay = 25): Promise<string> {
  if (!window.isElectron) {
    return Promise.resolve("");
  }

  // @ts-ignore
  const { exec } = window.requireElectron("child_process");

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      exec(shellToRun, (error, stdout, stderr) => {
        if (error) {
          return reject(stderr);
        }

        resolve(stdout);
      });
    }, delay);
  });
}
