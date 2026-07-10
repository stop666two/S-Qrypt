/**
 * S-Qrypt 一键部署 setup 脚本
 * 自动创建 D1 数据库并更新 wrangler.jsonc
 * Usage: node scripts/setup.mjs
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wranglerPath = resolve(__dirname, '../wrangler.jsonc');

async function main() {
  console.log('🚀 S-Qrypt 一键部署 Setup\n');

  // Step 1: 创建 D1 数据库
  console.log('1. 创建 D1 数据库...');
  let dbId, dbName;
  try {
    const out = execSync('npx wrangler d1 create s-qrypt-db', { encoding: 'utf8', shell: true });
    // Parse: ⛅ "database_id": "xxxx-xxxx-xxxx"
    const match = out.match(/"database_id":\s*"([^"]+)"/);
    if (match) {
      dbId = match[1];
      dbName = 's-qrypt-db';
      console.log(`   ✅ 数据库已创建: ${dbName} (ID: ${dbId})`);
    } else {
      // Might already exist
      const list = execSync('npx wrangler d1 list', { encoding: 'utf8', shell: true });
      const listMatch = list.match(/(\S+)\s+(\S{8}-\S{4}-\S{4}-\S{4}-\S{12})\s+/);
      if (listMatch) {
        dbName = listMatch[1];
        dbId = listMatch[2];
        console.log(`   ✅ 使用已有数据库: ${dbName} (ID: ${dbId})`);
      } else {
        throw new Error('无法获取 D1 数据库 ID');
      }
    }
  } catch (e) {
    console.error('   ❌ 创建失败:', e.message);
    process.exit(1);
  }

  // Step 2: 更新 wrangler.jsonc
  console.log('\n2. 更新 wrangler.jsonc...');
  try {
    let config = readFileSync(wranglerPath, 'utf8');
    config = config.replace(/"database_id":\s*"[^"]*"/, `"database_id": "${dbId}"`);
    writeFileSync(wranglerPath, config, 'utf8');
    console.log(`   ✅ database_id 已更新`);
  } catch (e) {
    console.error('   ❌ 更新失败:', e.message);
    process.exit(1);
  }

  // Step 3: 部署
  console.log('\n3. 部署 Worker...');
  try {
    execSync('npx wrangler deploy', { stdio: 'inherit', shell: true });
    console.log('\n   ✅ 部署完成!');
  } catch (e) {
    console.error('   ❌ 部署失败:', e.message);
    process.exit(1);
  }

  // Step 4: 恢复 wrangler.jsonc（去掉真实 ID 防止泄漏）
  try {
    let config = readFileSync(wranglerPath, 'utf8');
    config = config.replace(/"database_id":\s*"[^"]*"/, '"database_id": "00000000-0000-0000-0000-000000000000"');
    writeFileSync(wranglerPath, config, 'utf8');
  } catch (_) {}

  console.log('\n🎉 部署成功! 访问 Cloudflare Dashboard 查看 Worker URL');
}

main();
