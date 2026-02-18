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
