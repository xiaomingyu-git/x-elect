import { spawn } from 'node:child_process';
import { mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const run = (cmd, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`));
    });
  });

await rm(distDir, { recursive: true, force: true });
await run('pnpm', ['vite', 'build'], { cwd: rootDir });
await mkdir(distDir, { recursive: true });
await cp(path.join(rootDir, 'src/main'), path.join(distDir, 'main'), { recursive: true });
await cp(path.join(rootDir, 'src/preload'), path.join(distDir, 'preload'), { recursive: true });
