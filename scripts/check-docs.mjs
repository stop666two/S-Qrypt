import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const readme = read('README.md');
const index = read('src/index.ts');
const pkg = JSON.parse(read('package.json'));
const fails = [];
const stats = { scripts: 0, endpoints: 0, files: 0, errors: 0, anchors: 0, links: 0 };

for (const m of readme.matchAll(/npm run ([a-z:]+)/g)) {
  stats.scripts++;
  if (!pkg.scripts[m[1]]) fails.push(`README 提到 npm run ${m[1]}，但 package.json 没有该脚本`);
}

const routes = new Set([...index.matchAll(/path === `?\$\{API_PREFIX\}([a-z/:-]*)/g)].map((m) => '/api' + m[1]));
for (const m of readme.matchAll(/`(\/api\/[a-z:/-]+)/g)) {
  const path = m[1].replace(/:id/g, '').replace(/\/$/, '');
  const hit = [...routes].some((r) => r.startsWith(path) || path.startsWith(r));
  stats.endpoints++;
  if (!hit) fails.push(`README 写了接口 ${m[1]}，src/index.ts 里找不到对应路由`);
}

const tree = readme.split('## 项目结构')[1]?.split('```')[1] ?? '';
for (const line of tree.split('\n')) {
  const m = line.match(/[│├└─\s]*([\w.@-]+(?:\/[\w.@-]+)*)\s{2,}#/);
  if (!m) continue;
  const isDir = /\/\s{2,}#/.test(line) || line.trim().endsWith('/');
  const raw = m[1].replace(/\/$/, '');
  if (!/^[\w.-]+(\/[\w.-]+)*$/.test(raw) || raw === 's-qrypt') continue;
  stats.files++;
  if (!existsSync(join(root, isDir ? raw : raw))) {
    const candidates = ['', 'src/', 'scripts/', 'test/', 'migrations/', 'public/', '.github/workflows/', 'docs/', 'docs/review/'].map((pre) => pre + raw);
    if (!candidates.some((c) => existsSync(join(root, c)))) fails.push(`项目结构里列出 ${raw}，磁盘上不存在`);
  }
}

const errSection = readme.split('### 错误码')[1]?.split('\n---')[0] ?? '';
for (const line of errSection.split('\n')) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|');
  if (cells.length < 3 || !/^\s*4\d\d|\s*5\d\d/.test(cells[1])) continue;
  for (const m of cells[2].matchAll(/`([a-z_]+(?:_[a-z]+)*)`/g)) {
    stats.errors++;
    if (!index.includes(`'${m[1]}'`)) fails.push(`README 错误码表写了 ${m[1]}，src/index.ts 里不存在`);
  }
}

const slug = (s) => s.toLowerCase().replace(/[`*]/g, '').replace(/[^\w\u4e00-\u9fa5\s-]/g, '').replace(/\s+/g, '-');
const headings = new Set([...readme.matchAll(/^#{2,3} (.+)$/gm)].map((m) => slug(m[1])));
for (const m of readme.matchAll(/\]\(#([^)]+)\)/g)) {
  stats.anchors++;
  if (!headings.has(m[1])) fails.push(`目录锚点 #${m[1]} 找不到对应标题`);
}

for (const m of readme.matchAll(/\]\((?!https?:|#)([^)]+\.(?:md|sql|json|ts))\)/g)) {
  stats.links++;
  if (!existsSync(join(root, m[1]))) fails.push(`README 引用的 ${m[1]} 不存在`);
}

console.log(`检查项：脚本 ${stats.scripts} · 接口 ${stats.endpoints} · 文件 ${stats.files} · 错误码 ${stats.errors} · 锚点 ${stats.anchors} · 内部链接 ${stats.links}`);
if (fails.length) {
  console.log(`\n发现 ${fails.length} 处不一致：`);
  for (const f of fails) console.log(' - ' + f);
  process.exit(1);
}
console.log('全部一致');
