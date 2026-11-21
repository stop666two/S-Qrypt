# S-Qrypt

**后量子安全加密笔记 · Zero-Trust Encrypted Notes on Cloudflare Workers**

[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Workers-f38020?logo=cloudflare&logoColor=white&style=for-the-badge)](https://github.com/stop666two/S-Qrypt/blob/main/public/deploy.html)

S-Qrypt 是一个严格零信任、后量子安全的加密笔记保险箱，专为 Cloudflare Workers 无服务器平台与 D1 边缘数据库设计。

**核心原则：所有密码学计算在用户浏览器中执行，服务器与数据库仅作为密文的中转站，绝不接触任何明文、密钥材料、盐值或签名。**

---

## 目录

- [特性概览](#特性概览)
- [安全架构](#安全架构)
- [快速部署](#快速部署)
- [本地开发](#本地开发)
- [临时启动（一键试用）](#临时启动一键试用)
- [API 文档](#api-文档)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [许可证](#许可证)

---

## 特性概览

### 密码学安全
| 特性 | 说明 |
|------|------|
| **零信任架构** | 密码、主密钥、明文永不出浏览器 |
| **后量子安全** | 2048 位对称密钥，Grover 算法下等效 1024 位安全强度 |
| **双异构笔记密钥** | KA/KB 两种不同派生方式，单一算法被攻破不影响另一种密钥 |
| **AES-256-GCM 认证加密** | 每次加密生成随机 IV，认证标签防篡改 |
| **沙箱 iframe 隔离** | 密码学在主页面内执行，密钥与明文均不出浏览器（无 iframe 隔离层，见「密钥生命周期」） |
| **Argon2id 混合增强** | 主密钥派生包含 Argon2id（自托管 WASM，参数 t=3/m=32MiB/p=4）；浏览器不支持 WebAssembly 时无法解锁已启用该阶段的保险箱 |
| **操作授权令牌** | 所有写操作需携带 HKDF 派生的一次性令牌，防越权操作 |
| **频率限制** | 写操作连续失败 40 次/5 分钟、认证失败 100 次/5 分钟，超限锁定 10 分钟；成功请求不计入 |
| **抗侧信道** | 恒定时间比较 + 随机延迟填充 + CSP/COOP/COEP + img-src + CORP + frame-ancestors 头 |
| **主密钥派生验证令牌** | verification_token = HKDF(MK)；MK 的派生包含 per-vault 随机盐与**服务端绑定的成本参数**（`kdf_mb/kdf_ro`），离线校验既要做完整 KDF，也无法跨部署复用预计算表；换设备仍派生出同一把钥匙 |

### 功能特性
| 特性 | 说明 |
|------|------|
| **笔记 CRUD** | 创建、编辑、查看、软删除/硬删除 |
| **回收站** | 恢复或永久删除已软删除的笔记 |
| **实时搜索** | 按标题实时过滤，200ms 防抖 |
| **服务端分页** | LIMIT/OFFSET 分页，避免大数据量性能问题 |
| **自动锁定** | 60 秒无操作自动擦除内存密钥（操作中自动延后） |
| **PWA 支持** | Web Manifest + 应用图标（未注册 Service Worker，无离线缓存） |
| **安全审计面板** | 本地签名链日志 + 远程 RSA 加密日志下载与离线解密指引 |
| **审计密钥管理** | 初始化后可随时配置/更换 RSA 公钥，更换时旧日志自动清除 |
| **一键明文备份** | 解密所有笔记并导出 JSON 文件，实时进度显示，失败笔记自动跳过 |
| **备份导入** | 读取备份 JSON 追加合并导入（保留原创建/修改时间），逐条重新加密，进度与失败统计 |
| **键盘快捷键** | Esc 关闭面板、Ctrl+N 新建、Ctrl+F 搜索 |
| **编辑器未保存提示** | 离开编辑器时检测未保存更改 |

---

## 安全架构

```
用户密码
    │
    └── 强化多阶 KDF ──→ MK（主密钥，256 字节，仅在浏览器内存）
         │ 预混合 (128 轮 HMAC-SHA512)
         │ 内存硬混淆 (自适应 32/24/16 MB)
         │ Argon2id 混合 (WASM，t=3 / 32MiB / p=4)
         │ HKDF 淬炼
         │
         ├── HKDF-Expand(MK, "s-qrypt-verify") → verification_token（服务端仅存 SHA-256 哈希）
         ├── HKDF-Expand(MK, "s-qrypt-op-auth") → operation_token
         ├── deriveKA(MK, id) → 2048-bit KA（元数据密钥）
         └── deriveKB(MK, id) → 2048-bit KB（正文密钥）
```

### 密钥生命周期

```
密码输入 ──► deriveMK ──► MK (256B, 仅内存)
                            │
                  ┌─────────┼─────────────┬───────────────┐
                  ▼         ▼             ▼               ▼
          verification  operation      KA(note)        KB(note)
             token        token      元数据 AES-GCM   正文 AES-GCM
                  │         │             │               │
                  ▼         ▼             ▼               ▼
           GET /api/notes 写操作鉴权   加密/解密       加密/解密
```

- MK、KA、KB、operation_token 只存在于当前页面内存；60 秒无操作或点击「锁定」即清零，并清空详情/编辑器/列表 DOM。
- 页面内没有 iframe 隔离层：主页面直接调用 Web Crypto 与自托管的 `/argon2.js`（同源 WASM）。威胁模型为「本地不可信扩展/物理接触」，XSS 一旦成立即可读取内存中的密钥——README 不再声称密钥位于独立执行域。
- 笔记正文的完整性由 AES-256-GCM 认证标签保证；不存在额外的「完整性密钥」。

---

## 快速部署

> 点击顶部 **Deploy to Cloudflare Workers** 徽章查看完整部署指南。

### 💻 一键部署（CLI，推荐 · 无需 API Token）

```bash
git clone https://github.com/stop666two/S-Qrypt.git
cd S-Qrypt
npm install
npx wrangler login
npm run setup
```

`npx wrangler login` 需要提前登录cloudflare，然后执行后会自动打开默认浏览器进行授权，如果不是这个浏览器请回到命令行会出现网站，复制粘贴即可。如果提示LocalHost无法连接就是动作太慢，要重新运行命令。

`npm run setup` 自动完成：创建 D1 数据库 → 更新配置 → 部署 Worker → 恢复占位符。

> ⚠️ **初始化保护**：`POST /api/init` 受环境变量 `SETUP_TOKEN` 保护。部署后必须执行 `npx wrangler secret put SETUP_TOKEN`（或在 Cloudflare Dashboard → Workers → 对应 Worker → Settings → Variables 中添加 secret），否则初始化接口将返回 503 `setup_token_not_configured`，无法完成初始化。

### ⚡ GitHub Actions

- **push 到 main**：跑门禁 `npm ci → check:docs → tsc --noEmit → vitest run`（不部署）
- **部署**：GitHub **Actions** → 左侧 `CI` → **Run workflow** 显式触发；需要 `CLOUDFLARE_API_TOKEN`（可选 `CLOUDFLARE_ACCOUNT_ID`、`CF_SETUP_TOKEN`），未配置时部署步骤跳过并打印提示

> 为什么 push 不自动部署：GitHub 不允许在 `if:` 里引用 `secrets`（解析期即报 `Unrecognized named-value`，整个 workflow 不创建任何 job）。需要「有 token 就自动部署」时，把 `deploy` 作业的 `if` 改成 `github.event_name == 'push'` 并接受 push 即发布。

### 手动部署

```bash
git clone https://github.com/stop666two/S-Qrypt.git
cd s-qrypt
npm install
npx wrangler login
npx wrangler d1 create s-qrypt-db
# 将输出的 database_id 填入 wrangler.jsonc 的 d1_databases[0].database_id
npm run deploy
```

Schema 由 Worker 首次请求时自动创建；`migrations/0001_init.sql` 与运行时 DDL 保持一致，可用 `wrangler d1 migrations apply` 预建同构库（含 `auth_limits`、`audit_logs`、`notes.created_at/updated_at`）。

---

## 升级说明（从 v1.0.1 或旧派生版本）

完整步骤、故障对照表、跨设备问题与回滚边界见 **[docs/MIGRATION.md](docs/MIGRATION.md)**。这里只留要点。

旧版 `verification_token = SHA-256(salt ‖ SHA-224(password))`，只凭公开的 salt 就能离线穷举口令、绕过整套 KDF；当前版本改为 `HKDF(MK)`，MK 的派生含 per-vault 随机盐（`kdf_version=3`），并把成本参数 `kdf_mb/kdf_ro` 绑定在服务端——同一保险箱在任何设备上都派生出同一把钥匙。

### 1. 先拿到一份旧版能读的明文备份

用**旧客户端**导出备份（明文 JSON），核对条目数并离线保存。v3 升级不可逆：升级后旧客户端读不了新数据，回滚代码也救不回来。

```bash
# 可选：同时留一份密文快照（回滚整库用，但需要当时的盐+参数+密码）
npx wrangler d1 export s-qrypt-db --remote --output d1-backup-$(date +%Y%m%d).sql
```

### 2. 令牌哈希对不上，必须重置一次验证配置

旧保险箱直接登录会一直提示「密码错误」（服务端存的是旧格式哈希）。

```bash
npx wrangler d1 execute s-qrypt-db --remote \
  --command "DELETE FROM config WHERE id = 'app_config'"
```

初始化时服务端要求 `SETUP_TOKEN`（线上 `wrangler secret put SETUP_TOKEN`，本地 `.dev.vars`）；未配置返回 503，输错返回 403。

### 3. 重置时勾选「旧版本保险箱」才能读回旧笔记

打开站点 → 初始化页 → **勾选「旧版本保险箱（v1/v2）」** → 用**旧程序的密码**初始化。

这样派生的是无盐 MK（与 v1/v2 一致），历史笔记仍可解密；登录后页面会自动询问是否升级到 v3，确认后客户端用新旧两把 MK 把全部笔记重新加密到 v3。

### 4. 密码与旧版不一致时会显式报错

若重置时用了不同的密码（或忘了勾「旧版本保险箱」），**登录本身会成功**（令牌只校验当前保险箱），但旧笔记解不开：列表显示 `[无法解密]`，页面顶部出现常驻横幅「有 N 条笔记用当前密码解不开」，正文给出两条出路——用旧密码重来，或重置数据库后用明文备份导入——并附可直接复制的重置命令。全部解密成功后横幅自动消失。

### 5. 换设备解锁报「密码错误」

早期版本的派生参数按设备估算（`hardwareConcurrency`/`deviceMemory`）并会在连续失败后"加强"，参数一变钥匙就变。当前版已改为服务端绑定参数；没有绑定参数的旧库，登录会自动尝试 `硬件估算值 → 32/128 → 24/80 → 16/60`，命中后继续并在审计日志记录 `kdf_params_recovered`。

### 6. 重加密中途关闭页面不会丢数据

`finish` 之前配置仍是 v2：下次登录会同时派生新旧两把 MK，`kdf_version=3` 的行用新 MK、其余用旧 MK，升级可以续做。

### 7. 其他行为变化

- 读令牌有效期 90 天，过期时登录流程会用 operation_token 自动续期（`/api/vault/rotate`）
- 初始化密码强度：≥12 位；或 ≥10 位且含大小写/数字/符号中的 3 类；拒绝常见口令与全同字符
- 源校验：缺少 Origin/Referer 时按 `Sec-Fetch-Site` 判断，cross-site 直接 403
- 脚本 CSP 不再需要 `'unsafe-inline'`；补 `base-uri 'none'`、`form-action 'none'`

---

## 本地开发

```bash
npm run dev        # 启动开发服务器 (http://127.0.0.1:8787)
npm test           # 监听模式跑单测；CI 用 npx vitest run
npm run deploy       # 生产部署（check-clean + tsc + 混淆 + deploy，失败也会还原源码）
npm run deploy:quick # dev-only：跳过混淆与测试，仅本地快速验证，勿用于生产
npm run setup        # 一键 D1 创建 + 部署（结束后把 database_id 还原为运行前的值）
npm run check:docs   # 校验 README 里的脚本名/接口/文件/错误码/锚点与代码一致
```

`npm run dev`（等价 `npx wrangler dev`）使用仓库里 `.wrangler/` 的**持久**本地数据，适合连续开发；
只想试一把、不想留下任何数据时用下面的临时启动。

## 临时启动（一键试用）

双击 `dev-temp.bat`，或在终端执行：

```bat
dev-temp.bat                      :: 默认 8787，自动挑空闲端口；不开浏览器
dev-temp.bat --open               :: 就绪后自动打开浏览器
dev-temp.bat --port 8790          :: 指定起始端口
dev-temp.bat --keep               :: 结束后保留临时数据
```

它做的事：

| 步骤 | 行为 |
|---|---|
| 前置检查 | 没有 Node.js 会直接报错退出（`dev-temp.bat` 只做这一步的包围，逻辑全在 `scripts/dev-temp.mjs`） |
| 取初始化口令 | **每次启动随机生成**（48 位 hex），用 `--var SETUP_TOKEN=…` 注入并打印；`.dev.vars` 里的固定值在本实例中不生效 |
| 数据隔离 | 状态写进 `.wrangler/temp-<时间戳>/`，**不碰**已存在的本地库；启动时顺手清理超过 1 小时的残留目录 |
| 端口 | 从 8787 起探测到第一个空闲端口，被占也不会失败 |
| 就绪检测 | 轮询 `/api/init-check` 直到 200（上限 120 秒），打印地址；默认**不**开浏览器（`--open` 才开） |
| 退出 | `Ctrl+C` 或 wrangler 退出即删除临时数据；窗口被强制关闭时，下次启动会清扫 |

首次打开是空保险箱：把窗口里打印的 `SETUP_TOKEN` 粘进初始化表单即可。该口令只属于这次运行，进程退出后不再有效。

**注意事项：** 主页面外壳在 `src/homeHtml.ts`，SPA 脚本在 `src/app.client.txt`（部署时混淆、以 `/app.js` 供出），Argon2 WASM 由 `<script src="/argon2.js">` 同源加载。修改后需重启 `npm run dev`。

---

## 技术细节

### 密码学架构

```
密码输入
  │
  └→ HMAC-SHA512 预混合 (128 轮)
      │
      ├→ AES-CTR 内存填充 (自适应 16-64MB)
      ├→ SHA-512/SHA-256/HMAC 混合混淆 (60-200 轮)
      ├→ Merkle 树摘要 (256 片)
      ├→ Argon2id WASM 混合 (t=3 / 32MiB / p=4；无 WASM 时无法解锁 v2 保险箱)
      └→ HKDF-Expand ──→ MK (256 字节主密钥)
           │
           ├→ HKDF-Expand(MK, "s-qrypt-verify") → verification_token (API 认证)
           │     └─ 服务端仅存其 SHA-256 哈希；离线校验必须完整跑完上面的 KDF
           │
           ├→ HKDF-Expand(MK, "op-auth") → operation_token (写操作授权)
           │
           ├→ deriveKA(MK, id) → 2048-bit KA (元数据 AES-GCM 密钥)
           │     └─ 128 轮 HMAC-SHA512 反馈链
           │
           └→ deriveKB(MK, id) → 2048-bit KB (正文 AES-GCM 密钥)
                 └─ AES-CBC 自加密链 (64 轮)
```

### 安全机制

| 层次 | 机制 | 说明 |
|------|------|------|
| **传输** | HTTPS + CSP + COOP + COEP + frame-ancestors | 防 XSS、防 Spectre、防中间人、防点击劫持 |
| **脚本来源** | 脚本外链 + script-src 无 unsafe-inline | SPA 与 Argon2 均为同源独立脚本，注入的内联脚本无法执行 |
| **存储** | AES-256-GCM 认证加密 | 每次加密随机 IV，认证标签防篡改 |
| **密钥** | 仅驻留页面内存 | 60 秒无操作自动清零，锁定同时清空 DOM 中的明文 |
| **令牌** | HKDF 派生 operation_token | 每次写操作需携带，防 CSRF/越权 |
| **频率** | 失败计数限流 | 写操作连续失败 40 次/5 分钟、认证失败 100 次/5 分钟后锁定 10 分钟；成功请求清零 |
| **认证** | MK 派生 verification_token | MK 含随机盐（kdf_version=3）；服务端仅存令牌的 SHA-256 哈希 |
| **令牌寿命** | token_issued_at + 90 天有效期 | 过期返回 token_expired；续期需 operation_token（MK 派生），仅窃取读令牌无法自行续命 |
| **源校验** | Origin/Referer 严格同源 | 非本站源的 `/api/*` 请求返回 `forbidden_origin` |
| **审计** | 本地哈希链 + RSA-OAEP 加密 | 本地链可对账；远程条目需私钥离线解密 |
| **侧信道** | 恒定时间比较 + 随机延迟填充 | 防御时序攻击 |

### Argon2id 与浏览器能力

- WASM 由 Worker 路由 `/argon2.js` 与 `/argon2.wasm` 同源自托管，无外部 CDN 依赖。
- `deriveMK` 只有一条实现路径：`kdf_version=2` 的保险箱在任何环境都走 Argon2id；若浏览器禁用 WebAssembly（或 WASM 加载超时 10 秒），会明确报错而不是降级成另一把密钥——降级会得到与库内 `kdf_version` 不匹配的 MK，只会把保险箱锁死。
- `kdf_version=3`（当前默认）：Argon2id 的盐与预混合输入都含 16 字节 per-vault 随机盐，同一口令在不同部署上派生出不同的 MK；
- `kdf_version=2`（旧保险箱）：不含盐，登录后可一键升级到 v3，客户端会用新旧两把 MK 重加密全部笔记；
- `kdf_version=1`（最早保险箱）：按 v1 路径派生（不含 Argon2id），可正常解锁并有同样的一键升级入口。

### 数据流

```
浏览器 (加密操作)                  Cloudflare Worker              D1 Database
      │                                  │                          │
      │── POST /api/init ────────────────→│── INSERT config ────────→│
      │   {setup_token, verification_token,   │  存 SHA-256 哈希         │
      │    operation_token_hash, kdf_version}  │  而非明文               │
      │                                  │                          │
      │── PUT /api/note/:id ─────────────→│── UPDATE notes ─────────→│
      │   {operation_token, encrypted_*}  │  密文存储               │
      │                                  │                          │
      │── POST /api/audit/log ───────────→│── INSERT audit_logs ────→│
      │   {operation_token,               │  加密存储               │
      │    encrypted_entry,               │                          │
      │    fingerprint_hash}              │                          │
      │                                  │                          │
      │── GET /api/note/:id ←────────────│── SELECT ────────────────│
      │   密文返回                        │  返回密文               │
      │→ 浏览器 AES-256-GCM 解密          │                          │
```

### 审计日志详解

审计日志使用 RSA-OAEP（SHA-256）加密：
1. 浏览器收集事件 `{ts, type, detail, fp}` → JSON 序列化
2. 用 RSA 公钥 `crypto.subtle.encrypt({name:'RSA-OAEP', hash:'SHA-256'})` 加密
3. Base64 编码 → POST 到 `/api/audit/log`
4. 服务端存储密文，不接触明文
5. 导出 JSON 后，客户端用 openssl 离线解密：

```bash
echo "BASE64_ENTRY" | openssl base64 -d | openssl pkeyutl -decrypt \
  -inkey private.pem \
  -pkeyopt rsa_padding_mode:oaep \
  -pkeyopt oaep_hash:sha256
```

每条日志包含浏览器指纹：UA、平台、屏幕分辨率×色深、时区、硬件并发数、内存、触摸支持。

---

## API 文档

所有端点前缀为 `/api`，请求和响应均为 `application/json`。所有写操作需携带 `operation_token`（HKDF 派生）和 `X-Verification-Token` 请求头。读操作需携带 `X-Verification-Token` 请求头。保险箱未初始化时，引导阶段的写操作（POST /api/note、PUT /api/note/:id）还需在请求体中携带 `setup_token`（与 SETUP_TOKEN 一致）。频率限制基于 IP 地址，写操作与读操作分离计数。

### 认证头

```
X-Verification-Token: <hex_token>    # 所有已认证请求（除 /api/init-check、/api/token）
operation_token: <hex_token>          # 所有 POST/PUT/PATCH/DELETE 请求体字段
```

`verification_token` 由客户端以 `HKDF(MK, "s-qrypt-verify")` 计算后上送，服务端只存其 SHA-256 哈希；它无法在不知道主密码的情况下离线推算。

### 初始化与认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/api/init-check` | 无 | 返回 `{initialized, db_bound, kdf_version}` |
| `GET` | `/api/token` | 频率限制 | 返回 `{salt?, audit_public_key?, token_issued_at?, kdf_mb?, kdf_ro?}`。salt 与成本参数都是公开的 KDF 输入（不含它们就无法按 v3 派生，但知道它们也跳不过 KDF）；`kdf_mb/kdf_ro` 是**保险箱绑定的派生成本**，保证换设备派生出同一把钥匙。响应带 `Cache-Control: no-store`。频率：100 次/5 分钟 |
| `POST` | `/api/init` | setup_token | 初始化保险箱。请求体: `{setup_token, verification_token, operation_token_hash, kdf_version?, salt?, audit_public_key?, kdf_mb?, kdf_ro?}`。`kdf_version=3` 时 `salt` 必须是 32 位十六进制（否则 400 `invalid_salt`）；其余字段须为 ≤128 位十六进制，`audit_public_key` ≤10000 字符。`kdf_mb/kdf_ro` 必须成对出现且在 8–512 MB / 16–8192 轮内（否则 400 `invalid_kdf_params`），它们决定主密钥，服务端存储后由 `/api/token` 下发。有笔记但无配置时返回 409 `orphan_notes`（需 `force: true` 才允许覆盖）。setup_token 必须与环境变量 `SETUP_TOKEN` 一致（未配置时返回 503） |
| `POST` | `/api/vault/upgrade` | operation_token | 把旧保险箱升级到 v3。`mode=begin` 先落 salt（`{mode, operation_token, salt}`），`mode=finish` 再用新令牌与哈希翻转版本（`{mode, operation_token, verification_token, operation_token_hash, kdf_mb?, kdf_ro?}`，参数同样必须成对且越界返回 400 `invalid_kdf_params`） |
| `POST` | `/api/vault/rotate` | operation_token | 续期读令牌（重置 `token_issued_at`），返回新的 `token_issued_at` |

### 笔记操作

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/api/notes?offset=0&limit=50&deleted=1` | X-Verification-Token | 笔记列表，`deleted=1` 查看回收站，`is_test` 行永不返回 |
| `POST` | `/api/note` | operation_token | 创建空白笔记，返回 `{id}`。未初始化时仅允许创建 1 条占位笔记（第 2 次返回 409 `placeholder_exists`） |
| `GET` | `/api/note/:id` | X-Verification-Token | 获取单条笔记（含加密元数据、正文与 `kdf_version`）；`is_test` 行返回 404；`?deleted=1` 允许读取软删除行（仅升级脚本使用） |
| `PUT` | `/api/note/:id` | operation_token | 更新笔记。body ≤2MB，meta ≤10KB。省略 `updated_at` 时写库内时间戳；显式传入则原样保存（≤64 字符）。可选 `kdf_version`（0–3）标记该行加密所用派生版本 |
| `PATCH` | `/api/note/:id/soft-delete` | operation_token | 软删除（deleted=1） |
| `PATCH` | `/api/note/:id/restore` | operation_token | 恢复软删除（deleted=0） |
| `DELETE` | `/api/note/:id` | operation_token | 硬删除 |

### 审计日志

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `POST` | `/api/audit/log` | X-Verification-Token + operation_token | 提交 RSA 加密的日志条目。body: `{operation_token, encrypted_entry (≤5KB), fingerprint_hash}` |
| `GET` | `/api/audit/logs?limit=50` | X-Verification-Token | 获取加密日志列表。返回 `{entries: [{id, encrypted_entry, created_at}], total}` |
| `PUT` | `/api/audit/key` | operation_token | 更新审计公钥。body: `{operation_token, audit_public_key}`。已配置时自动清除旧日志 |
| `DELETE` | `/api/audit/logs` | operation_token | 清空所有审计日志。body: `{operation_token}`。更换公钥时自动调用 |

### 静态路由（无需认证）

| 路径 | Content-Type | 说明 |
|------|-------------|------|
| `/` | text/html | 主页面 SPA |
| `/deploy` | text/html | 部署指南页 |
| `/app.js` | application/javascript | SPA 脚本（`src/app.client.txt`，部署时混淆） |
| `/argon2.js` | application/javascript | argon2 WASM 加载器（自托管，主页直接加载） |
| `/argon2.wasm` | application/wasm | argon2 WASM 二进制 |
| `/manifest.webmanifest` | application/json | PWA 清单 |
| `/app-icon.svg` | image/svg+xml | 应用图标 |

### 错误码

| 状态码 | error 字段 | 说明 |
|--------|-----------|------|
| 400 | `invalid_json`, `invalid_token`, `invalid_body`, `invalid_id`, `invalid_meta`, `invalid_is_test`, `invalid_key`, `invalid_entry`, `invalid_fingerprint`, `invalid_salt`, `invalid_verification_token`, `invalid_operation_token_hash`, `invalid_kdf_version`, `invalid_created_at`, `invalid_updated_at`, `invalid_kdf_params`, `missing_verification_token`, `missing_operation_token_hash` | 请求格式或字段校验失败（`invalid_kdf_params`：`kdf_mb/kdf_ro` 未成对或越界） |
| 401 | `unauthorized`, `token_expired` | 令牌无效/保险箱未初始化；或读令牌超过 90 天有效期（用 `/api/vault/rotate` 续期） |
| 403 | `forbidden`, `forbidden_origin`, `forbidden_referer`, `invalid_setup_token`, `missing_operation_token` | operation_token 无效 / 源校验拦截 / setup_token 错误或缺失 |
| 404 | `not_found`, `not_initialized` | 资源不存在或未初始化 |
| 409 | `already_initialized`, `placeholder_exists`, `already_upgraded`, `salt_not_staged`, `orphan_notes` | 已初始化 / 引导阶段已有占位笔记 / 已是 v3 / 未先落 salt 就 finish / 有笔记但无配置（疑似误把库读空，需 `force`） |
| 429 | `rate_limited` | 频率限制（含 `retry_after` 秒数） |
| 503 | `setup_token_not_configured`, `db_unavailable` | 服务端未配置 SETUP_TOKEN，初始化被拒绝 / D1 读取失败（客户端会阻止把「读不到」当「空库」） |

---

## 项目结构

```
s-qrypt/
├── src/
│   ├── index.ts                # Cloudflare Worker 入口 (API + CSP + 路由)
│   ├── homeHtml.ts             # 主页面外壳 (CSS + HTML)
│   ├── app.client.txt          # SPA 脚本（纯 JS 文本资源，CSP 外链，部署时混淆）
│   ├── deployHtml.ts           # 部署指南页模板
│   └── argon2Files.ts          # Argon2 WASM/JS 内嵌 (自托管)
├── public/
│   └── deploy.html             # 静态部署指南页
├── scripts/
│   ├── setup.mjs               # 一键部署脚本 (D1 + Worker)
│   ├── deploy.mjs              # 部署流水线 (混淆 → deploy → 必定还原源码)
│   ├── check-clean.mjs         # 部署前确认 src/app.client.txt 无未提交改动
│   ├── obfuscate.mjs           # JS 控制流混淆
│   ├── dev-temp.mjs            # 临时实例启动逻辑 (被 dev-temp.bat 调用)
│   └── crypto-kat.mjs          # 密码学已知答案测试 (FIPS 180-4 KAT，npm test 自动执行)
├── docs/
│   ├── README.md               # 文档索引
│   ├── MIGRATION.md            # 旧版 → 当前的迁移手册（升级/重置/换设备/故障对照）
│   └── review/                 # 审查报告（含修复状态与未验证项）
├── migrations/
│   └── 0001_init.sql           # D1 数据库初始模式 (与 ensureSchema 一致)
├── test/
│   ├── index.spec.ts           # Vitest 集成测试
│   └── env.d.ts                # 测试环境类型
├── vitest.config.ts            # Vitest 配置 (workers pool + SETUP_TOKEN)
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions（push 跑门禁；部署需 Run workflow）
├── dev-temp.bat                # 一键临时启动（薄壳，逻辑在 scripts/dev-temp.mjs）
├── wrangler.jsonc              # Cloudflare Workers 配置
├── worker-configuration.d.ts   # Worker 类型声明
├── tsconfig.json
├── .gitattributes              # 强制 *.bat 为 CRLF
├── .dev.vars.example           # 本地环境变量模板（逐字段注释）
├── CHANGELOG.md                # 变更日志与升级注意
└── package.json
```

---

## 技术栈

| 组件 | 技术 |
|------|------|
| **运行时** | Cloudflare Workers (ES2024) |
| **数据库** | D1 (SQLite 兼容) |
| **语言** | TypeScript (strict mode) |
| **前端** | 纯 JS SPA（无框架） |
| **密码学** | Web Crypto API + argon2-browser WASM（同源自托管） |
| **外部依赖** | 无（Argon2 WASM/JS 内嵌于 Worker） |
| **测试** | Vitest + @cloudflare/vitest-pool-workers |
| **部署** | Wrangler CLI / GitHub Actions |

---

## 许可证

**GNU Affero General Public License v3.0 (AGPL-3.0)**

任何以网络服务形式部署的修改版本必须公开完整源代码。

---

## 常见问题

**Q: 密码丢了能找回吗？**
A: 不能。零信任设计不存在后门，密码是唯一凭证。

**Q: 数据会丢失吗？**
A: 不会。所有数据存储在 Cloudflare D1 数据库中，即使重新部署也不会丢失。

**Q: 支持多设备同步吗？**
A: 支持。只要使用同一密码，在任何设备上访问同一 Worker URL 即可看到所有笔记。

**Q: 部署需要付费吗？**
A: Cloudflare Workers 免费套餐（每日 10 万请求）和 D1 免费套餐（5GB 存储）足够个人使用。

**Q: 审计日志的公钥/私钥怎么生成？**
A: 可使用 OpenSSL 生成 RSA 密钥对：
```bash
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:4096
openssl pkey -in private.pem -pubout -out public.pem
```
在初始化时粘贴公钥 PEM，查看远程日志时粘贴私钥 PEM。
