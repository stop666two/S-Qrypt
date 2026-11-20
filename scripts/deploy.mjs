/**
 * Deploy pipeline with guaranteed restore.
 *
 * obfuscate.mjs rewrites src/homeHtml.ts in place, so the source must be
 * restored no matter how the rest of the pipeline ends — otherwise obfuscated
 * output stays on disk and can be committed by accident.
 */
import { spawnSync } from 'child_process';

const SOURCES = ['src/homeHtml.ts'];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
}

let failed = false;
try {
  run('node', ['scripts/check-clean.mjs']);
  run('npx', ['tsc', '--noEmit']);
  run('node', ['scripts/obfuscate.mjs']);
  run('npx', ['wrangler', 'deploy']);
} catch (e) {
  failed = true;
  console.error(`\n❌ 部署失败: ${e.message}`);
} finally {
  const r = spawnSync('git', ['checkout', '--', ...SOURCES], { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error('❌ 还原源码失败：请手工执行 git checkout -- ' + SOURCES.join(' '));
    failed = true;
  } else {
    console.log('✅ 源码已还原');
  }
}

process.exit(failed ? 1 : 0);
