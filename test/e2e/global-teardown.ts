import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function globalTeardown() {
  const isWindows = process.platform === 'win32';
  const scriptName = isWindows ? 'kill_chrome.bat' : 'kill_chrome.sh';
  const scriptPath = path.resolve(process.cwd(), scriptName);

  if (fs.existsSync(scriptPath)) {
    console.log(`Running teardown script: ${scriptName}`);
    try {
      if (!isWindows) {
        // Ensure the script is executable on Unix-like systems
        execSync(`chmod +x "${scriptPath}"`);
      }
      const output = execSync(isWindows ? `"${scriptPath}"` : `./${scriptName}`, { stdio: 'inherit' });
    } catch (error) {
      console.error(`Error executing ${scriptName}:`, error);
    }
  } else {
    console.warn(`Teardown script not found: ${scriptPath}`);
  }
}

export default globalTeardown;
