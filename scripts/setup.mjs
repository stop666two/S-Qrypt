/**
 * S-Qrypt 一键部署 setup 脚本
 * 自动创建 D1 数据库 → 更新 wrangler.jsonc → 部署 Worker → 恢复占位符
 *
 * 本地使用: npx wrangler login → npm run setup  (无需 API Token)
 * CI 使用:  设置 CLOUDFLARE_API_TOKEN 环境变量  (GitHub Actions 等)
 *
 * Usage: node scripts/setup.mjs
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = resolve(__dirname, '../wrangler.jsonc');
const DB_NAME = 's-qrypt-db';

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', shell: true, ...opts });
}

function parseDatabaseId(output) {
  const m = output.match(/"database_id":\s*"([^"]+)"/)
    || output.match(/database_id\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

async function getOrCreateDatabase() {
  console.log('1. 创建/获取 D1 数据库...');

  // Try creating new database
  try {
    const out = run(`npx wrangler d1 create ${DB_NAME}`);
    const dbId = parseDatabaseId(out);
    if (dbId) {
      console.log(`   ✅ 新数据库已创建: ${DB_NAME} (ID: ${dbId})`);
      return dbId;
    }
  } catch (e) {
    // DB already exists — continue to list
    if (e.stdout && e.stdout.includes('already exists')) {
      console.log('   ℹ️  数据库已存在，尝试获取 ID...');
    } else {
      const msg = e.stderr || e.message || '';
      if (msg.includes('Authentication error') || msg.includes('10000')) {
        throw new Error('Cloudflare 认证失败，请先运行: npx wrangler login');
      }
      throw e;
    }
  }

  // List existing databases
  try {
    const listJson = run(`npx wrangler d1 list --json`);
    const dbs = JSON.parse(listJson);
    const match = dbs.find(d => d.name === DB_NAME || d.database_name === DB_NAME);
    if (match) {
      const dbId = match.uuid || match.database_id;
      console.log(`   ✅ 使用已有数据库: ${DB_NAME} (ID: ${dbId})`);
      return dbId;
    }
  } catch (e) {
    const msg = e.stderr || e.message || '';
    if (msg.includes('Authentication error') || msg.includes('10000')) {
      throw new Error('Cloudflare 认证失败，请先运行: npx wrangler login');
    }
    // Fallback: text parse
    const listOut = run(`npx wrangler d1 list`);
    for (const line of listOut.split('\n').filter(l => l.includes(DB_NAME))) {
      const id = line.trim().split(/\s+/).find(p => /^[0-9a-f]{8}-/.test(p));
      if (id) {
        console.log(`   ✅ 使用已有数据库: ${DB_NAME} (ID: ${id})`);
        return id;
      }
    }
  }

  throw new Error(`无法获取数据库 "${DB_NAME}" 的信息`);
}

async function updateConfig(dbId) {
  console.log('\n2. 更新 wrangler.jsonc...');
  let config = readFileSync(wranglerPath, 'utf8');
  config = config.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${dbId}"`);
  writeFileSync(wranglerPath, config, 'utf8');
  console.log('   ✅ database_id 已写入');
}

async function deployWorker() {
  console.log('\n3. 部署 Worker...');
  run('npx wrangler deploy', { stdio: 'inherit' });
  console.log('\n   ✅ Worker 部署完成');
}

function restorePlaceholder() {
  try {
    let config = readFileSync(wranglerPath, 'utf8');
    config = config.replace(/"database_id":\s*"[^"]*"/,
      '"database_id": "00000000-0000-0000-0000-000000000000"');
    writeFileSync(wranglerPath, config, 'utf8');
  } catch { }
}

async function main() {
  const isCI = process.env.CI === 'true';

  console.log('╔════════════════════════════════════╗');
  console.log('║   S-Qrypt 一键部署 Setup           ║');
  console.log('╚════════════════════════════════════╝\n');

  if (isCI && !process.env.CLOUDFLARE_API_TOKEN) {
    console.error('❌ CI 环境需要设置 CLOUDFLARE_API_TOKEN');
    console.error('   请前往 Settings → Secrets → Actions 添加');
    process.exit(1);
  }

  try {
    const dbId = await getOrCreateDatabase();
    await updateConfig(dbId);
    await deployWorker();
  } catch (e) {
    restorePlaceholder();
    console.error(`\n❌ 部署失败: ${e.message}`);
    process.exit(1);
  }

  if (!isCI) {
    restorePlaceholder();
    console.log('\n⚠️  已恢复 wrangler.jsonc 占位符');
  }

  console.log('\n🎉 部署成功!');
}

main();
