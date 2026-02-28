import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const killPort = (port) => {
  const result = spawnSync('lsof', ['-ti', `tcp:${port}`], {
    encoding: 'utf8'
  });
  if (result.status !== 0) return;
  const pids = result.stdout.split(/\s+/).filter(Boolean);
  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGTERM');
    } catch {
      // Ignore processes that already exited.
    }
  }
};

killPort(5173);

const server = await createServer({
  configFile: path.join(rootDir, 'vite.config.js')
});

await server.listen();
const url = server.resolvedUrls?.local?.[0];

if (!url) {
  console.error('Vite dev server did not provide a local URL.');
  await server.close();
  process.exit(1);
}

const require = createRequire(import.meta.url);
const electronPath = require('electron');

const electronProcess = spawn(electronPath, [path.join(rootDir, 'src/main/index.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: url
  }
});

const shutdown = async (code = 0) => {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill('SIGINT');
  }
  await server.close();
  process.exit(code);
};

process.on('SIGINT', () => {
  shutdown(0);
});

process.on('SIGTERM', () => {
  shutdown(0);
});

electronProcess.on('exit', (code) => {
  shutdown(code ?? 0);
});
