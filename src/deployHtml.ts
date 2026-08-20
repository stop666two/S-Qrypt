export const deployHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>部署 S-Qrypt - Cloudflare Workers</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #08080e;
    color: #c8c8d8;
    line-height: 1.6;
  }
  .container { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
  h1 { font-size: 1.8rem; color: #e0e0f0; margin-bottom: 0.5rem; }
  h1 span { color: #6c6cff; }
  .subtitle { color: #8888aa; margin-bottom: 2.5rem; font-size: 0.95rem; }
  .card {
    background: #0e0e16; border: 1px solid #1e1e2e; border-radius: 12px;
    padding: 1.5rem; margin-bottom: 1.5rem;
  }
  .card h2 {
    font-size: 1.15rem; color: #e0e0f0; margin-bottom: 0.75rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .card h2 .badge {
    font-size: 0.7rem; background: #6c6cff; color: #fff;
    padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600;
  }
  .card p, .card li { font-size: 0.92rem; color: #b0b0c8; }
  .card ol, .card ul { padding-left: 1.25rem; margin: 0.5rem 0; }
  .card li { margin-bottom: 0.35rem; }
  code, .cmd {
    background: #12121a; border: 1px solid #1e1e2e; border-radius: 6px;
    padding: 0.15rem 0.45rem; font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.85rem; color: #b4b4ff; word-break: break-all;
  }
  .cmd-block {
    background: #0a0a12; border: 1px solid #1e1e2e; border-radius: 8px;
    padding: 0.9rem 1rem; margin: 0.75rem 0;
    font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.85rem;
    color: #b4b4ff; overflow-x: auto; white-space: pre-wrap;
    word-break: break-all; position: relative;
  }
  .cmd-block .copy-btn {
    position: absolute; top: 0.4rem; right: 0.5rem;
    background: #1e1e2e; border: 1px solid #2e2e40; color: #8888aa;
    padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem;
    cursor: pointer; transition: all 0.2s;
  }
  .cmd-block .copy-btn:hover { background: #2e2e40; color: #c8c8d8; }
  .btn {
    display: inline-block; padding: 0.75rem 1.5rem; border-radius: 8px;
    font-size: 0.95rem; font-weight: 600; text-decoration: none;
    transition: all 0.2s; border: none; cursor: pointer;
  }
  .btn-primary { background: #6c6cff; color: #fff; }
  .btn-primary:hover { background: #5858e0; }
  .btn-secondary {
    background: #1e1e2e; color: #c8c8d8; border: 1px solid #2e2e40;
  }
  .btn-secondary:hover { background: #2e2e40; }
  .btn-group { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem; }
  .check { color: #4ade80; }
  .arrow { color: #6c6cff; }
  .hr { border: none; border-top: 1px solid #1e1e2e; margin: 1.5rem 0; }
  .footer { text-align: center; color: #555; font-size: 0.8rem; margin-top: 2rem; }
  @media (max-width: 600px) {
    .container { padding: 1.25rem 1rem; }
    h1 { font-size: 1.4rem; }
    .btn-group { flex-direction: column; }
    .btn { text-align: center; }
  }
</style>
</head>
<body>
<div class="container">

<h1><span>S-Qrypt</span> 一键部署</h1>
<p class="subtitle">部署到 Cloudflare Workers + D1 边缘数据库 | 无需 API Token</p>

<div class="card">
  <h2><span class="check">&#10003;</span> 前置准备</h2>
  <ol>
    <li><a href="https://github.com/stop666two/S-Qrypt/fork" style="color:#6c6cff">Fork 本仓库</a> 到你的 GitHub</li>
    <li>安装 <a href="https://nodejs.org/" style="color:#6c6cff">Node.js 18+</a></li>
    <li>注册 <a href="https://dash.cloudflare.com/" style="color:#6c6cff">Cloudflare 账户</a></li>
  </ol>
</div>

<div class="card">
  <h2><span class="arrow">&#9654;</span> 方式一：本地一键部署 <span class="badge">推荐 · 无需 Token</span></h2>
  <p>使用 <code>wrangler login</code> OAuth 登录，<strong>无需创建 API Token</strong>。</p>
  <div class="cmd-block" id="cmd1">git clone https://github.com/YOUR_USERNAME/S-Qrypt.git
cd S-Qrypt
npm install
npx wrangler login
npm run setup</div>
  <p style="margin-top:0.5rem;font-size:0.85rem;color:#8888aa">
    <span class="check">&#10003;</span> 自动创建 D1 数据库 + 绑定 + 部署 Worker
  </p>
</div>

<div class="card">
  <h2><span class="arrow">&#9654;</span> 方式二：GitHub Actions 自动部署</h2>
  <p>推送代码到 <code>main</code> 分支时自动部署。</p>
  <ol>
    <li>Fork 本仓库到你 GitHub</li>
    <li>前往 Settings → Secrets → <code>New repository secret</code></li>
    <li>Name: <code>CLOUDFLARE_API_TOKEN</code> → Value: 你的 API Token</li>
    <li>推送 <code>main</code> 分支 → 自动部署</li>
  </ol>
  <div class="btn-group">
    <a href="https://dash.cloudflare.com/profile/api-tokens" class="btn btn-secondary" target="_blank">创建 API Token</a>
  </div>
</div>

<div class="card">
  <h2><span class="arrow">&#9654;</span> 方式三：Cloudflare Dashboard</h2>
  <p>通过控制面板直接导入 GitHub 仓库。</p>
  <ol>
    <li><a href="https://dash.cloudflare.com/" style="color:#6c6cff">Cloudflare Dashboard</a> → Workers & Pages</li>
    <li>Create → Workers → Upload from GitHub</li>
    <li>授权 Cloudflare → 选择 fork 的仓库 → 分支 <code>main</code></li>
    <li>构建命令: <code>npm ci</code></li>
    <li>部署后手动创建 D1 数据库 <code>s-qrypt-db</code> 并绑定 <code>DB</code></li>
  </ol>
</div>

<hr class="hr">

<div class="card" style="text-align:center;border-color:#2e2e40;">
  <p style="margin-bottom:0.75rem">访问 Worker URL 开始使用。</p>
  <a href="/" class="btn btn-primary">打开 S-Qrypt</a>
</div>

<div class="footer">S-Qrypt &mdash; AGPL-3.0</div>

</div>
<script>
function copyCmd(id) {
  const el = document.getElementById(id);
  const clone = el.cloneNode(true);
  const btn = clone.querySelector('.copy-btn');
  if (btn) btn.remove();
  const text = clone.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const b = el.querySelector('.copy-btn');
    if (b) { b.textContent = '已复制!'; setTimeout(() => { b.textContent = '复制'; }, 2000); }
  }).catch(() => {
    const b = el.querySelector('.copy-btn');
    if (b) { b.textContent = '复制失败'; setTimeout(() => { b.textContent = '复制'; }, 2000); }
  });
}
</script>
</body>
</html>`;
