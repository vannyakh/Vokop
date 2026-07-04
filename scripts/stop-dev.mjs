import { execSync } from 'node:child_process';

/** Keep in sync with `packages/shared/src/config/ports.ts` → DEV_PORT_LIST */
const DEV_PORT_LIST = [3000, 3001, 4000, 4001, 4002, 4003, 4004, 4005];

for (const port of DEV_PORT_LIST) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
  } catch {
    // no process bound to this port
  }
}

console.log(`Stopped dev servers (ports ${DEV_PORT_LIST.join(', ')})`);
