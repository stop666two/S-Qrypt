#!/usr/bin/env node
// Temporary, disposable local instance of the S-Qrypt worker.
// State goes to .wrangler/temp-<timestamp> and is deleted when wrangler exits.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const keepState = flag('--keep');
const openBrowser = flag('--open');
const wantedPort = Number(value('--port', '8787'));
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const stateDir = join(root, '.wrangler', `temp-${stamp}`);


function sweepStale(olderThanMs) {
  const base = join(root, '.wrangler');
  if (!existsSync(base)) return 0;
  let removed = 0;
  for (const name of readdirSync(base)) {
    if (!name.startsWith('temp-')) continue;
    const dir = join(base, name);
    try {
      if (Date.now() - statSync(dir).mtimeMs > olderThanMs) {
        rmSync(dir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      /* locked by a still-running instance */
    }
  }
  return removed;
}

const portFree = (port) =>
  new Promise((done) => {
    const srv = createServer();
    srv.once('error', () => done(false));
    srv.once('listening', () => srv.close(() => done(true)));
    srv.listen(port, '127.0.0.1');
  });

async function pickPort(start) {
  for (let port = start; port < start + 30; port++) {
    if (await portFree(port)) return port;
  }
  throw new Error(`端口 ${start}–${start + 29} 都被占用，请用 --port 指定其他端口`);
}

async function waitReady(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

function launchBrowser(url) {
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* opening a browser is best-effort */
  }
}

function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

let child = null;
let cleaned = false;

function cleanup() {
  if (cleaned) return;
  cleaned = true;
  if (child) killTree(child.pid);
  if (keepState) {
    console.log(`\n▸ 临时数据保留在 ${stateDir}`);
    return;
  }
  try {
    rmSync(stateDir, { recursive: true, force: true });
    console.log('\n▸ 临时数据已删除（想保留就加 --keep）');
  } catch (e) {
    console.log(`\n▸ 删除临时数据失败：${e.message}（可手工删除 ${stateDir}）`);
  }
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    cleanup();
    process.exit(0);
  });
}
process.on('exit', cleanup);

const swept = sweepStale(60 * 60 * 1000);
// 每次启动都换一个一次性初始化口令，不从 .dev.vars 复用。
const token = randomBytes(24).toString('hex');
const port = await pickPort(wantedPort);
const base = `http://127.0.0.1:${port}`;
mkdirSync(stateDir, { recursive: true });

console.log('S-Qrypt 临时实例');
console.log(`  目录      ${root}`);
console.log(`  数据      ${stateDir}${keepState ? '（结束后保留）' : '（结束后删除）'}`);
console.log(`  SETUP_TOKEN  ${token}`);
console.log('               （本次运行随机生成，退出即失效；初始化保险箱时粘贴这个）');
console.log(`  地址      ${base}`);
console.log('');
if (swept) console.log(`  已清理 ${swept} 个残留的临时数据目录（超过 1 小时）`);
console.log('  启动中…首次启动要等 wrangler 拉起 workerd。按 Ctrl+C 结束。');
console.log('  （不会自动开浏览器；加 --open 让脚本开。）');
console.log('  注意：本窗口被强制关闭（不是 Ctrl+C）时，临时数据要等下次启动才自动清理。');
console.log('');

const devCmd = `npx wrangler dev --port ${port} --ip 127.0.0.1 --persist-to "${stateDir}" --var SETUP_TOKEN:${token}`;
child = spawn(devCmd, { cwd: root, stdio: 'inherit', shell: true, env: process.env });

const ready = await waitReady(`${base}/api/init-check`, 120000);
if (ready) {
  console.log(`\n▸ 就绪：${base}`);
  console.log(`▸ 初始化时 SETUP_TOKEN 填：${token}`);
  if (openBrowser) launchBrowser(base);
  else console.log('▸ 未自动打开浏览器（需要的话加 --open，或手工访问上面的地址）');
} else {
  console.log('\n▸ 等待就绪超时（120s），请查看上面的 wrangler 输出。');
}

child.on('exit', (code) => {
  console.log(`\n▸ wrangler dev 退出（code ${code ?? 0}）`);
  cleanup();
  process.exit(typeof code === 'number' ? code : 0);
});
