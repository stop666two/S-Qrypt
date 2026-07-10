# S-Qrypt v1.0.0

**后量子安全加密笔记 · Zero-Trust Encrypted Notes on Cloudflare Workers**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/s-qrypt)

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
| **三异构笔记密钥** | KA（回旋哈希链）、KB（AES-CBC 自加密链）、KC（Merkle 树）三种完全不同的派生方式 |
| **AES-256-GCM 认证加密** | 每次加密生成随机 IV，认证标签防篡改 |
| **沙箱 iframe 隔离** | 密码学操作在独立 iframe（`sandbox="allow-scripts"`）中执行，密钥不进入主页面 JS 作用域 |
| **Argon2id 混合增强** | 浏览器支持时自动使用 Argon2id WASM 混合主密钥派生 |
| **操作授权令牌** | 所有写操作需携带 HKDF 派生令牌，防越权删除 |
| **认证频率限制** | 同一 IP 8 次/5 分钟失败后锁定 10 分钟 |
| **抗侧信道** | 恒定时间比较 + 随机延迟填充 + CSP/COOP/COEP 头 |
| **审计日志** | HMAC 签名链日志 + 可选 RSA 公钥加密远程存储 |

### 功能特性
| 特性 | 说明 |
|------|------|
| **笔记 CRUD** | 创建、编辑、查看、软删除/硬删除 |
| **回收站** | 恢复或永久删除已软删除的笔记 |
| **实时搜索** | 按标题实时过滤，200ms 防抖 |
| **服务端分页** | LIMIT/OFFSET 分页，避免大数据量性能问题 |
| **自动锁定** | 60 秒无操作自动擦除内存密钥 |
| **PWA 支持** | Service Worker + Web Manifest + 应用图标 |
| **安全审计面板** | 本地签名日志 + 远程加密日志查看与私钥解密 |
| **加载状态指示器** | 异步操作 spinner |
| **编辑器未保存提示** | 离开编辑器时检测未保存更改 |

---

## 安全架构

```
用户密码
    │
    ├── SHA-224 ──────→ verification_token（服务器存储，仅用于验证）
    │
    └── 强化多阶 KDF ──→ MK（主密钥，256 字节，仅在浏览器内存）
         │ 预混合 (128 轮 HMAC-SHA512)
         │ 内存硬混淆 (自适应 32/24/16 MB, 128/80/60 轮)
         │ Argon2id 混合 (可选，WASM)
         │ HKDF 淬炼
         │
         ├── HKDF-Expand(MK, "s-qrypt-op-auth", 32) → operation_token
         │
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

### 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/s-qrypt)

点击上方按钮，授权 Cloudflare 后自动完成：
1. 创建 Worker 脚本
2. 创建 D1 数据库
3. 执行数据库模式迁移

### 手动部署

#### 前置要求
- [Node.js](https://nodejs.org/) 18+
- [Cloudflare 账户](https://dash.cloudflare.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)（已含在 devDependencies）

#### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-username/s-qrypt.git
cd s-qrypt

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 创建 D1 数据库
npx wrangler d1 create s-qrypt-db

# 5. 将输出的 database_id 填入 wrangler.jsonc
#   编辑 wrangler.jsonc，将 d1_databases[0].database_id 替换为实际 ID

# 6. 执行数据库迁移
npx wrangler d1 migrations apply DB --remote

# 7. 部署
npm run deploy
```

部署完成后访问输出的 Worker URL 即可开始使用。

---

## 本地开发

```bash
# 启动开发服务器（默认 http://127.0.0.1:8787）
npm run dev

# 运行测试
npm test

# TypeScript 类型检查
npx tsc --noEmit

# 生产部署（包含 JS 混淆）
npm run deploy

# 仅混淆（部署前步骤）
node scripts/obfuscate.mjs
```

### 开发注意事项

- 前端 SPA 嵌入在 `src/homeHtml.ts` 的模板字符串中
- 沙箱 iframe 页面在 `src/cryptoSandboxHtml.ts` 中
- 修改后需重启 `npm run dev` 才能生效
- 第一次访问时 MK 派生约 1-3 秒（取决于设备性能）

---

## API 文档

所有端点前缀为 `/api`，请求和响应均为 `application/json`。

### 验证与初始化

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/init-check` | 检查是否已初始化 |
| `GET` | `/api/token` | 获取密码验证令牌（有频率限制） |
| `POST` | `/api/init` | 初始化保险箱 |

### 笔记操作

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/notes?offset=0&limit=50` | 获取笔记列表（分页） |
| `POST` | `/api/note` | 创建占位笔记（需 operation_token） |
| `GET` | `/api/note/:id` | 获取指定笔记 |
| `PUT` | `/api/note/:id` | 更新笔记（需 operation_token） |
| `PATCH` | `/api/note/:id/soft-delete` | 软删除（需 operation_token） |
| `PATCH` | `/api/note/:id/restore` | 恢复软删除（需 operation_token） |
| `DELETE` | `/api/note/:id` | 硬删除（需 operation_token） |

### 审计日志

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/audit/log` | 提交加密日志条目 |
| `GET` | `/api/audit/logs?limit=50&offset=0` | 获取加密日志（需验证令牌） |

### PWA

| 路径 | 说明 |
|------|------|
| `/manifest.webmanifest` | PWA 清单 |
| `/sw.js` | Service Worker |
| `/app-icon.svg` | 应用图标 |
| `/crypto-sandbox` | 密码学沙箱 iframe |

---

## 项目结构

```
s-qrypt/
├── src/
│   ├── index.ts                # Cloudflare Worker 入口（API 路由 + CSP 头）
│   ├── homeHtml.ts             # 主页面 SPA（CSS + HTML + JavaScript）
│   └── cryptoSandboxHtml.ts    # 沙箱 iframe（密码学操作）
├── migrations/
│   └── 0001_init.sql           # D1 数据库初始模式
├── scripts/
│   └── obfuscate.mjs           # JavaScript 混淆脚本（控制流平坦化）
├── test/
│   └── index.spec.ts           # Vitest 集成测试
├── public/                     # 静态资源目录
├── wrangler.jsonc              # Cloudflare Workers 配置
├── package.json
├── tsconfig.json
└── worker-configuration.d.ts   # Worker 类型声明
```

---

## 技术栈

| 组件 | 技术 |
|------|------|
| **运行时** | Cloudflare Workers (ES2024) |
| **数据库** | D1 (SQLite 兼容) |
| **语言** | TypeScript (strict mode) |
| **前端** | 单页应用（无框架，纯 JS） |
| **密码学** | Web Crypto API + 自定义实现 |
| **Argon2id** | argon2-browser (WASM) |
| **沙箱** | iframe + postMessage |
| **测试** | Vitest + @cloudflare/vitest-pool-workers |
| **部署** | Wrangler CLI |
| **混淆** | javascript-obfuscator |

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
