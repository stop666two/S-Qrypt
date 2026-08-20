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
| **三异构笔记密钥** | KA/KB/KC 三种不同派生方式，单一算法被攻破不影响其他密钥 |
| **AES-256-GCM 认证加密** | 每次加密生成随机 IV，认证标签防篡改 |
| **沙箱 iframe 隔离** | 密码学操作在独立 sandbox iframe 中执行，密钥不进入主页面 JS 作用域 |
| **Argon2id 混合增强** | 自动使用 Argon2id WASM 混合主密钥派生，浏览器不支持时自动降级 |
| **操作授权令牌** | 所有写操作需携带 HKDF 派生一次性令牌，防越权操作 |
| **多级频率限制** | 写操作 40 次/5 分钟，读操作 100 次/5 分钟，超限锁定 10 分钟 |
| **抗侧信道** | 恒定时间比较 + 随机延迟填充 + CSP/COOP/COEP + img-src + CORP 头 |
| **随机盐值验证令牌** | 每次初始化生成 16 字节随机盐，防御彩虹表攻击 |

### 功能特性
| 特性 | 说明 |
|------|------|
| **笔记 CRUD** | 创建、编辑、查看、软删除/硬删除 |
| **回收站** | 恢复或永久删除已软删除的笔记 |
| **实时搜索** | 按标题实时过滤，200ms 防抖 |
| **服务端分页** | LIMIT/OFFSET 分页，避免大数据量性能问题 |
| **自动锁定** | 60 秒无操作自动擦除内存密钥（操作中自动延后） |
| **PWA 支持** | Service Worker + Web Manifest + 应用图标 |
| **安全审计面板** | 本地签名链日志 + 远程 RSA 加密日志下载与离线解密指引 |
| **审计密钥管理** | 初始化后可随时配置/更换 RSA 公钥，更换时旧日志自动清除 |
| **一键明文备份** | 解密所有笔记并导出 JSON 文件，实时进度显示，失败笔记自动跳过 |
| **键盘快捷键** | Esc 关闭面板、Ctrl+N 新建、Ctrl+F 搜索 |
| **编辑器未保存提示** | 离开编辑器时检测未保存更改 |

---

## 安全架构

```
用户密码
    │
    ├── 随机盐(16B) + SHA-256(SHA-224(pw)) → verification_token
    │
    └── 强化多阶 KDF ──→ MK（主密钥，256 字节，仅在浏览器内存）
         │ 预混合 (128 轮 HMAC-SHA512)
         │ 内存硬混淆 (自适应 32/24/16 MB)
         │ Argon2id 混合 (WASM，自动降级纯软件)
         │ HKDF 淬炼
         │
         ├── HKDF-Expand(MK, "s-qrypt-op-auth") → operation_token
         ├── deriveKA(MK, id) → 2048-bit KA（元数据密钥）
         ├── deriveKB(MK, id) → 2048-bit KB（正文密钥）
         └── deriveKC(MK, id) → 2048-bit KC（完整性密钥）
```

### 沙箱隔离架构

```
┌──────────────────────────┐       postMessage        ┌──────────────────────┐
│   主页面 (Main SPA)      │ ◄──────────────────────► │ 沙箱 iframe          │
│   - UI 渲染              │     {id, cmd, args}       │  sandbox="allow-sc-  │
│   - API 调用             │     {id, result, error}   │  ripts"              │
│   - 审计日志             │                           │  - 密钥派生 KA/KB/KC │
│   - 密钥不可直接访问      │                           │  - AES-GCM 加解密    │
│                          │                           │  - Argon2id (WASM)   │
│                          │                           │  - 密钥仅在线性内存  │
└──────────────────────────┘                           └──────────────────────┘
```

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

### ⚡ GitHub Actions 自动部署

顶部徽章 → GitHub **Actions** → **Run workflow** 触发部署。

> 可选：在 Settings → Secrets → Actions 添加 `CLOUDFLARE_API_TOKEN` 后自动部署。

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

Schema 由 Worker 启动时自动创建，无需手动迁移。

---

## 本地开发

```bash
npm run dev        # 启动开发服务器 (http://127.0.0.1:8787)
npm test           # 运行测试
npm run deploy       # 生产部署（包含 JS 混淆）
npm run deploy:quick # dev-only：跳过混淆与测试，仅本地快速验证，勿用于生产
npm run setup        # 一键 D1 创建 + 部署
```

**注意事项：** 前端 SPA 嵌入在 `src/homeHtml.ts` 模板字符串中；沙箱页面在 `src/cryptoSandboxHtml.ts` 中。修改后需重启 `npm run dev`。

---

## 技术细节

### 密码学架构

```
密码输入
  │
  ├→ SHA-224 ──→ 加 16B 随机盐 ──→ SHA-256 ──→ verification_token (服务端仅存 SHA-256 哈希)
  │                                              ↑ 用于 API 认证、频率限制、审计鉴权
  │
  └→ HMAC-SHA512 预混合 (128 轮)
      │
      ├→ AES-CTR 内存填充 (自适应 16-64MB)
      ├→ SHA-512/SHA-256/HMAC 混合混淆 (60-200 轮)
      ├→ Merkle 树摘要 (256 片)
      ├→ Argon2id WASM 混合 (可选，自动降级)
      └→ HKDF-Expand ──→ MK (256 字节主密钥)
           │
           ├→ HKDF-Expand(MK, "op-auth") → operation_token (写操作授权)
           │
           ├→ deriveKA(MK, id) → 2048-bit KA (元数据 AES-GCM 密钥)
           │     └─ 128 轮 HMAC-SHA512 反馈链
           │
           ├→ deriveKB(MK, id) → 2048-bit KB (正文 AES-GCM 密钥)
           │     └─ AES-CBC 自加密链 (64 轮)
           │
           └→ deriveKC(MK, id) → 2048-bit KC (完整性密钥)
                 └─ Merkle 树 + SHA-512 + HKDF
```

### 安全机制

| 层次 | 机制 | 说明 |
|------|------|------|
| **传输** | HTTPS + CSP + COOP + COEP | 防 XSS、防 Spectre、防中间人 |
| **存储** | AES-256-GCM 认证加密 | 每次加密随机 IV，认证标签防篡改 |
| **密钥** | 沙箱 iframe 隔离 | 密钥仅在线性内存中，主页面不可直接访问 |
| **令牌** | HKDF 派生 operation_token | 每次写操作需携带，防 CSRF/越权 |
| **频率** | 写操作 + 读操作分离 Rate Limit | 写 40 次/5 分钟，读 100 次/5 分钟，超限锁定 10 分钟 |
| **认证** | 随机盐值 verification_token | 防御彩虹表攻击；服务端仅存 SHA-256 哈希，旧库明文 token 首次校验后自动迁移为哈希 |
| **审计** | HMAC 签名链 + RSA-OAEP 加密 | 防篡改审计日志，私钥离线解密 |
| **侧信道** | 恒定时间比较 + 随机延迟填充 | 防御时序攻击 |

### 沙箱隔离详解

密码学沙箱 iframe 使用 `sandbox="allow-scripts"` 属性，不包含 `allow-same-origin`：
- **origin 为 null**：主页面无法通过 `postMessage` 目标 origin 泄露数据
- **密钥仅在线性内存**：沙箱页面关闭后密钥自动消失
- **操作隔离**：所有密码学操作（密钥派生、加解密）在沙箱内完成，主页面只能获得结果
- **Argon2id 自托管**：WASM 二进制通过 Worker 路由 `/argon2.wasm` 同源加载，无外部 CDN 依赖
- **12 秒超时**：沙箱无响应时自动降级为纯软件模式，不影响可用性

### 数据流

```
浏览器 (加密操作)                  Cloudflare Worker              D1 Database
      │                                  │                          │
      │── POST /api/init ────────────────→│── INSERT config ────────→│
      │   {setup_token, verification_token,   │  存 SHA-256 哈希         │
      │    salt, operation_token_hash}         │  而非明文               │
      │                                  │                          │
      │── PUT /api/note/:id ─────────────→│── UPDATE notes ─────────→│
      │   {operation_token, encrypted_*}  │  密文存储               │
      │                                  │                          │
      │── POST /api/audit/log ───────────→│── INSERT audit_logs ────→│
      │   {encrypted_entry,               │  加密存储               │
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

### 初始化与认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/api/init-check` | 无 | 返回 `{initialized, db_bound, kdf_version}` |
| `GET` | `/api/token` | 频率限制 | 返回 `{salt?, audit_public_key?}`（不再返回 verification_token）。salt 仅新保险箱有；audit_public_key 仅在已配置时返回。响应带 `Cache-Control: no-store`。频率: 100次/5分钟 |
| `POST` | `/api/init` | setup_token | 初始化保险箱。请求体: `{setup_token, verification_token, salt, operation_token_hash, kdf_version, audit_public_key?}`。setup_token 必须与环境变量 `SETUP_TOKEN` 一致（未配置时返回 503） |

### 笔记操作

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/api/notes?offset=0&limit=50&deleted=1` | X-Verification-Token | 笔记列表，`deleted=1` 查看回收站 |
| `POST` | `/api/note` | operation_token | 创建空白笔记，返回 `{id}` |
| `GET` | `/api/note/:id` | X-Verification-Token | 获取单条笔记（含加密元数据和正文） |
| `PUT` | `/api/note/:id` | operation_token | 更新笔记。body ≤2MB，meta ≤10KB |
| `PATCH` | `/api/note/:id/soft-delete` | operation_token | 软删除（deleted=1） |
| `PATCH` | `/api/note/:id/restore` | operation_token | 恢复软删除（deleted=0） |
| `DELETE` | `/api/note/:id` | operation_token | 硬删除 |

### 审计日志

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `POST` | `/api/audit/log` | X-Verification-Token | 提交 RSA 加密的日志条目。body: `{encrypted_entry (≤5KB), fingerprint_hash}` |
| `GET` | `/api/audit/logs?limit=50` | X-Verification-Token | 获取加密日志列表。返回 `{entries: [{id, encrypted_entry, created_at}], total}` |
| `PUT` | `/api/audit/key` | operation_token | 更新审计公钥。body: `{operation_token, audit_public_key}`。已配置时自动清除旧日志 |
| `DELETE` | `/api/audit/logs` | operation_token | 清空所有审计日志。body: `{operation_token}`。更换公钥时自动调用 |

### 静态路由（无需认证）

| 路径 | Content-Type | 说明 |
|------|-------------|------|
| `/` | text/html | 主页面 SPA |
| `/deploy` | text/html | 部署指南页 |
| `/crypto-sandbox` | text/html | 密码学沙箱 iframe |
| `/argon2.js` | application/javascript | argon2 WASM 加载器（自托管） |
| `/argon2.wasm` | application/wasm | argon2 WASM 二进制 |
| `/manifest.webmanifest` | application/json | PWA 清单 |
| `/sw.js` | application/javascript | Service Worker |
| `/app-icon.svg` | image/svg+xml | 应用图标 |

### 错误码

| 状态码 | error 字段 | 说明 |
|--------|-----------|------|
| 400 | `invalid_json`, `invalid_token`, `invalid_body`, `invalid_id`, `invalid_meta`, `invalid_is_test`, `invalid_key`, `invalid_entry`, `invalid_fingerprint`, `missing_verification_token`, `missing_operation_token_hash` | 请求格式或字段校验失败 |
| 401 | `unauthorized` | X-Verification-Token 无效，或保险箱未初始化 |
| 403 | `forbidden`, `forbidden_origin`, `invalid_setup_token`, `missing_operation_token` | operation_token 无效 / CSRF 拦截 / setup_token 错误或缺失 |
| 404 | `not_found`, `not_initialized` | 资源不存在或未初始化 |
| 409 | `already_initialized` | 保险箱已初始化 |
| 429 | `rate_limited` | 频率限制（含 `retry_after` 秒数） |
| 503 | `setup_token_not_configured` | 服务端未配置 SETUP_TOKEN，初始化被拒绝 |

---

## 项目结构

```
s-qrypt/
├── src/
│   ├── index.ts                # Cloudflare Worker 入口 (API + CSP + 路由)
│   ├── homeHtml.ts             # 主页面 SPA (CSS + HTML + JS 模板字符串)
│   ├── cryptoSandboxHtml.ts    # 沙箱 iframe (密码学操作)
│   ├── deployHtml.ts           # 部署指南页模板
│   └── argon2Files.ts          # Argon2 WASM/JS 内嵌 (自托管)
├── public/
│   └── deploy.html             # 静态部署指南页
├── scripts/
│   ├── setup.mjs               # 一键部署脚本 (D1 + Worker)
│   ├── obfuscate.mjs           # JS 控制流混淆
│   └── crypto-kat.mjs          # 密码学已知答案测试 (FIPS 180-4 KAT，npm test 自动执行)
├── migrations/
│   └── 0001_init.sql           # D1 数据库初始模式 (参考)
├── test/
│   ├── index.spec.ts           # Vitest 集成测试
│   └── env.d.ts                # 测试环境类型
├── vitest.config.ts            # Vitest 配置 (workers pool + SETUP_TOKEN)
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions 自动部署
├── wrangler.jsonc              # Cloudflare Workers 配置
├── worker-configuration.d.ts   # Worker 类型声明
├── tsconfig.json
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
| **密码学** | Web Crypto API + argon2-browser WASM |
| **沙箱** | iframe sandbox + postMessage |
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
