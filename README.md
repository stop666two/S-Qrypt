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
| **多级频率限制** | 登录 + 写操作双重频率限制，同一 IP 限制后锁定 |
| **抗侧信道** | 恒定时间比较 + 随机延迟填充 + CSP/COOP/COEP 头 |
| **随机盐值验证令牌** | 每次初始化生成 16 字节随机盐，防御彩虹表攻击 |

### 功能特性
| 特性 | 说明 |
|------|------|
| **笔记 CRUD** | 创建、编辑、查看、软删除/硬删除 |
| **回收站** | 恢复或永久删除已软删除的笔记 |
| **实时搜索** | 按标题实时过滤，200ms 防抖 |
| **服务端分页** | LIMIT/OFFSET 分页，避免大数据量性能问题 |
| **自动锁定** | 60 秒无操作自动擦除内存密钥 |
| **PWA 支持** | Service Worker + Web Manifest + 应用图标 |
| **安全审计面板** | 本地签名链日志 + 远程 RSA 加密日志下载与离线解密指引 |
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

`npm run setup` 自动完成：创建 D1 数据库 → 更新配置 → 部署 Worker → 恢复占位符。

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
npm run deploy     # 生产部署（包含 JS 混淆）
npm run setup      # 一键 D1 创建 + 部署
```

**注意事项：** 前端 SPA 嵌入在 `src/homeHtml.ts` 模板字符串中；沙箱页面在 `src/cryptoSandboxHtml.ts` 中。修改后需重启 `npm run dev`。

---

## API 文档

所有端点前缀为 `/api`，请求和响应均为 `application/json`。

### 初始化与认证
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/init-check` | 检查初始化状态 |
| `GET` | `/api/token` | 获取验证令牌（含盐值，频率限制） |
| `POST` | `/api/init` | 保险箱初始化（含盐值） |

### 笔记操作
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/notes?offset=0&limit=50&deleted=1` | 笔记列表（可选 `deleted=1` 回收站） |
| `POST` | `/api/note` | 创建笔记（需 `operation_token`） |
| `GET` | `/api/note/:id` | 获取笔记 |
| `PUT` | `/api/note/:id` | 更新笔记（需 `operation_token`，大小限制 2MB） |
| `PATCH` | `/api/note/:id/soft-delete` | 软删除（需 `operation_token`） |
| `PATCH` | `/api/note/:id/restore` | 恢复（需 `operation_token`） |
| `DELETE` | `/api/note/:id` | 硬删除（需 `operation_token`） |

### 审计日志
| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/audit/log` | 提交加密日志条目 |
| `GET` | `/api/audit/logs?limit=50` | 获取加密日志（需验证令牌） |

### PWA / 其他
| 路径 | 说明 |
|------|------|
| `/manifest.webmanifest` | PWA 清单 |
| `/sw.js` | Service Worker |
| `/app-icon.svg` | 应用图标 |
| `/crypto-sandbox` | 密码学沙箱 iframe |
| `/deploy` | 部署指南页 |
| `/argon2.js` | 自托管 argon2 WASM 加载器 |
| `/argon2.wasm` | 自托管 argon2 WASM 二进制 |

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
│   └── obfuscate.mjs           # JS 控制流混淆
├── migrations/
│   └── 0001_init.sql           # D1 数据库初始模式 (参考)
├── test/
│   └── index.spec.ts           # Vitest 集成测试
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
