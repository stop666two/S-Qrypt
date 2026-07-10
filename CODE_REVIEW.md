# S-Qrypt v1.0.1 全面代码审查报告

> 审查日期: 2026-07-11 | 应用类型: Cloudflare Workers + D1 边缘加密笔记

---

## 目录

1. [严重安全问题](#1-严重安全问题)
2. [密码学问题](#2-密码学问题)
3. [性能问题](#3-性能问题)
4. [代码质量问题](#4-代码质量问题)
5. [数据一致性问题](#5-数据一致性问题)
6. [逻辑缺陷](#6-逻辑缺陷)
7. [UI/UX 问题](#7-uiux-问题)
8. [构建/部署问题](#8-构建部署问题)
9. [测试问题](#9-测试问题)
10. [总结与建议优先级](#10-总结与建议优先级)

---

## 1. 严重安全问题

### 1.1 CSP 使用 `unsafe-inline` — XSS 风险

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:37`, `:217`, `:230` |
| **代码** | `script-src 'self' 'unsafe-inline'` + `style-src 'self' 'unsafe-inline'` |
| **风险** | 允许任意内联脚本执行，一旦存在 XSS 漏洞即被利用 |
| **建议** | 对 `<script>` 使用 nonce 或 SRI hash 策略，对 `<style>` 同上 |

```diff
- "script-src 'self' 'unsafe-inline'"
+ "script-src 'self' 'nonce-{random}'"
```

### 1.2 Sandbox iframe postMessage 使用 `'*'` targetOrigin

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:276` |
| **代码** | `cryptoFrame.contentWindow.postMessage({id,cmd,args},'*')` |
| **风险** | 任何恶意页面都可接收包含密钥材料的加密操作消息 |
| **建议** | 使用具体的 origin |

```diff
- postMessage({id,cmd,args}, '*')
+ postMessage({id,cmd,args}, location.origin)
```

### 1.3 验证令牌是密码的无盐 SHA-224 哈希

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:399` |
| **代码** | `ph = hex(sha224(pw))` → 存入 DB |
| **风险** | 攻击者获取 D1 数据库后可离线暴力破解密码（无盐、快速哈希、确定性输出） |
| **建议** | 使用 Argon2id(password, salt) 的输出作为验证令牌 |

### 1.4 RSA 私钥在浏览器端解密 — 致命设计缺陷

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:230` (输入框) + `:405` (解密远程审计日志) |
| **代码** | 用户粘贴 RSA 私钥 PEM 到 `<textarea>` → 浏览器内存 → Web Crypto `decrypt()` |
| **风险** | 任何 XSS 或浏览器扩展可窃取私钥。私钥不应出现在客户端。 |
| **建议** | 审计日志解密应在安全后端或本地工具中执行，**永远不要在浏览器中输入私钥** |

### 1.5 无 CSRF 保护

| 属性 | 值 |
|------|-----|
| **位置** | 所有 API 路由（`src/index.ts`） |
| **风险** | 如果用户访问恶意网站，该网站可向 S-Qrypt Worker 发起跨站请求 |
| **建议** | 验证 `Origin`/`Referer` 头部 |

### 1.6 审计日志 RSA 私钥在 JS 堆中明文

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:329-334`, `:405` |
| **风险** | 私钥明文在 JS 堆中可被读取（堆快照、调试器） |
| **建议** | 完全移除客户端私钥解密功能 |

### 1.7 D1 写入无大小限制 — 存储耗尽攻击

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:372-384` (PUT /api/note/:id) |
| **代码** | `encrypted_meta_packet` 和 `encrypted_body` 无最大长度检查 |
| **风险** | 攻击者可写入 GB 级数据耗尽 D1 存储配额 |
| **建议** | 添加长度校验 |

```diff
+ const MAX_META = 10000;
+ const MAX_BODY = 2097152;
+ if (body.encrypted_meta_packet?.length > MAX_META) return errorResponse('meta_too_large', 413);
+ if (body.encrypted_body?.length > MAX_BODY) return errorResponse('body_too_large', 413);
```

---

## 2. 密码学问题

### 2.1 主密钥派生使用自定义内存硬函数

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:287` |
| **代码** | `deriveMK()` — 约 100 行自定义内存硬密钥派生 |
| **风险** | 非标准算法未经密码学专家审计，可能存在未知弱点 |
| **建议** | 完全依赖 Argon2id（已有 WASM 版本），移除自定义 `deriveMK` |

### 2.2 deriveKA 含非标准 128 轮 HMAC 反馈循环

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:289`, `src/cryptoSandboxHtml.ts:16` |
| **风险** | HMAC-SHA-512 128 次迭代的反馈循环，密码学安全性未经严格证明 |
| **建议** | 使用标准 HKDF-Expand 派生 |

### 2.3 deriveKB 使用 AES-CBC 加密零作为 KDF

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:290` |
| **代码** | 64 轮 AES-CBC 加密全零数据，然后 XOR 256 字节块 |
| **风险** | AES-CBC 非 PRF，用作 KDF 不符合标准 |
| **建议** | 使用 HKDF-Expand(info='body', L=256) 替代 |

### 2.4 deriveKC 使用自定义 Merkle 树构造

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:291` |
| **风险** | 自创 Merkle 树 + SHA-512 + HKDF 组合未经审查 |
| **建议** | 使用 `HKDF-Expand(info='integrity', L=256)` |

### 2.5 前端自定义 SHA-256 / BLAKE2b 实现

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:254-268`, `src/cryptoSandboxHtml.ts:8-12` |
| **风险** | 侧信道攻击风险；实现错误导致不一致 |
| **建议** | 优先使用 `crypto.subtle.digest()` |

### 2.6 Argon2 fallback 后完全不使用 Argon2

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:287` |
| **风险** | 用户不知不觉使用弱得多的 KDF |
| **建议** | 显式警告用户，或在纯软件模式中也提供轻量 Argon2 |

---

## 3. 性能问题

### 3.1 主线程分配 64MB 内存 + 计算阻塞 UI

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:287` `new Uint8Array(MS)` |
| **风险** | UI 冻结数秒 |
| **建议** | 将 `deriveMK` 移至 Web Worker |

### 3.2 列表刷新时并行解密所有笔记

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:397` |
| **风险** | 50 条笔记每次都全部派生密钥 + AES-GCM 解密 |
| **建议** | 缓存已解密的元数据；增量同步 |

### 3.3 deriveKB 循环内重复 importKey

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:290` |
| **代码** | 64 次 `crypto.subtle.importKey` 在循环内 |
| **建议** | 将 `importKey` 移出循环 |

### 3.4 Argon2 WASM 内联 Base64 到源代码

| 属性 | 值 |
|------|-----|
| **位置** | `src/argon2Files.ts:1` |
| **问题** | 约 200KB+ Base64 WASM 作为字符串，增加冷启动时间 |
| **建议** | WASM 作为单独资产文件部署 |

### 3.5 缺少复合索引

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:322-325` |
| **代码** | `WHERE is_test != 1 AND deleted != 1 ORDER BY id` 无有效索引 |
| **建议** | `CREATE INDEX idx_notes_active ON notes(is_test, deleted, id)` |

### 3.6 回收站加载全部笔记后客户端过滤

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:408` |
| **建议** | 服务端添加 `deleted=1` 的查询参数过滤器 |

---

## 4. 代码质量问题

### 4.1 `any` 类型广泛使用

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:330,331,363,390,406,420,435,437` |
| **建议** | 为每种 API 请求创建接口 |

### 4.2 Element.prototype 被 monkey-patch

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:243` |
| **代码** | `Object.defineProperty(Element.prototype,'html',{set(v){...}})` |
| **建议** | 移除 prototype 修改，仅用 `setHTML()` 辅助函数 |

### 4.3 Trusted Types 策略形同虚设

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:242-244` |
| **代码** | `createHTML: s => s` — 允许所有 HTML |
| **建议** | 使用 `textContent` + DOM API 替代 innerHTML |

### 4.4 魔术数字无命名常量

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:287-291` |
| **代码** | 128, 64, 256, 32, 8, 200 等数字直接出现 |
| **建议** | 使用命名常量 |

### 4.5 Schema 迁移逻辑内嵌在运行时代码

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:64-78` |
| **代码** | 使用裸 try/catch 执行 ALTER TABLE |
| **建议** | 使用 Wrangler D1 迁移文件 |

### 4.6 HTML 模板作为超长字符串嵌入 TS

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts` (415 行), `src/deployHtml.ts` (152 行) |
| **建议** | 使用单独 HTML 文件 + Wrangler assets |

### 4.7 getDeviceFP 过度收集指纹信息

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:300-310` |
| **建议** | 遵循 GDPR 要求，添加用户同意机制 |

---

## 5. 数据一致性问题

### 5.1 PUT 中 test note 和非 test note 的 updated_at 更新不一致

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:372-384` |
| **代码** | test note 用两条 SQL，第二句可能失败 |
| **建议** | 统一处理，不使用 test note 特殊分支 |

### 5.2 初始化非原子性 — 孤儿测试笔记

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:401` |
| **代码** | 创建测试笔记 → 调用 `/api/init`。如果 init 失败则测试笔记成孤儿 |
| **建议** | 将测试笔记创建纳入 init 接口内部 |

### 5.3 损坏笔记 id=0 导致多损坏条目冲突

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:397` |
| **代码** | 解密失败时 `{id:0, damaged:true}` |
| **建议** | 保留原始 id |

### 5.4 并发初始化竞争条件

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:274-313` |
| **建议** | 使用 `INSERT ... WHERE NOT EXISTS` 或 D1 事务 |

---

## 6. 逻辑缺陷

### 6.1 复制按钮文本提取缺陷

| 属性 | 值 |
|------|-----|
| **位置** | `src/deployHtml.ts:144` |
| **代码** | `el.textContent.replace('复制', '').trim()` |
| **风险** | 按钮文字"已复制!"状态切换后提取残留；如果命令含"复制"关键词被误删 |
| **建议** | 用 `<code>` 元素单独包裹待复制文本 |

### 6.2 初始化前任何人都可创建笔记

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:120-130` |
| **代码** | `checkOperationToken` 在未初始化时返回 null (允许) |
| **建议** | 限制 pre-init 创建的笔记数量 |

### 6.3 自动锁定仅监听部分事件

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:370` |
| **代码** | 缺少 `wheel`, `focus`, `visibilitychange` |
| **建议** | 增加更多事件类型 |

### 6.4 notesTotal 变量跨会话持久化

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:396` |
| **代码** | 模块级变量不清零 |
| **建议** | 在 `clearMem()` 或 `handleLogin()` 中重置 |

---

## 7. UI/UX 问题

### 7.1 RSA 私钥输入框始终可见且带生成教程

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:230` |
| **建议** | 默认隐藏，添加安全警告 |

### 7.2 回收站无加载指示器

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:408` |
| **建议** | 添加 spinner |

### 7.3 新建笔记无聚焦/高亮反馈

| 属性 | 值 |
|------|-----|
| **位置** | `src/homeHtml.ts:412` |
| **建议** | 刷新后定位新笔记 |

### 7.4 无键盘快捷键

| 属性 | 值 |
|------|-----|
| **位置** | 整个前端 |
| **建议** | Esc 关闭对话框, Ctrl+N 新建, Ctrl+F 搜索 |

### 7.5 错误消息中英文混杂

| 属性 | 值 |
|------|-----|
| **位置** | 全应用 |
| **建议** | 统一语言策略 |

---

## 8. 构建/部署问题

### 8.1 混淆脚本原地修改源文件

| 属性 | 值 |
|------|-----|
| **位置** | `scripts/obfuscate.mjs:72` + `package.json:7` |
| **代码** | 混淆写入源文件，部署后用 `git checkout -- src/` 恢复 |
| **风险** | 部署中途失败则源文件被损坏 |
| **建议** | 混淆输出到 `dist/` 目录 |

### 8.2 Setup 脚本使用 `shell: true`

| 属性 | 值 |
|------|-----|
| **位置** | `scripts/setup.mjs:20` |
| **建议** | 使用 `shell: false` + 参数数组 |

### 8.3 Service Worker 无缓存策略

| 属性 | 值 |
|------|-----|
| **位置** | `src/index.ts:174-178` |
| **代码** | 离线返回 503 |
| **建议** | 实现 Cache First 策略 |

### 8.4 D1 占位符 ID 提交到 Git

| 属性 | 值 |
|------|-----|
| **位置** | `wrangler.jsonc:12` |
| **建议** | 使用环境覆盖配置 |

---

## 9. 测试问题

### 9.1 前端加密逻辑无测试

| 属性 | 值 |
|------|-----|
| **缺失** | deriveMK, deriveKA/KB/KC, GCM 等无单元测试 |
| **建议** | 使用 vitest + happy-dom |

### 9.2 缺少集成测试覆盖

| 属性 | 值 |
|------|-----|
| **缺失** | 速率限制、审计日志、回收站、大分页 |
| **建议** | 补充相关测试用例 |

### 9.3 测试使用硬编码哈希值

| 属性 | 值 |
|------|-----|
| **位置** | `test/index.spec.ts:5` |
| **代码** | `TEST_TOKEN_HASH = '6ca13d...'` |
| **建议** | 运行时计算期望值 |

---

## 10. 总结与建议优先级

### 🚨 立即修复 (P0) — 安全漏洞

| # | 问题 | 严重性 | 预估工时 |
|---|------|--------|---------|
| 1.2 | postMessage `'*'` targetOrigin | 高危 | 5min |
| 1.4 | RSA 私钥在浏览器端解密 | 高危 | 1-2h |
| 1.3 | 无盐 SHA-224 验证令牌 | 高危 | 1-2h |
| 1.7 | D1 写入无大小限制 | 中危 | 15min |

### ⚠️ 尽快修复 (P1) — 重要

| # | 问题 | 影响 | 预估工时 |
|---|------|------|---------|
| 2.1-2.5 | 自定义 KDF 替换为 HKDF | 密码学强度 | 1天 |
| 6.1 | 复制按钮文字提取缺陷 | 功能正确性 | 15min |
| 5.1 | PUT 的 updated_at 不一致 | 数据一致性 | 15min |

### 🔧 建议修复 (P2) — 代码质量

| # | 问题 | 预估工时 |
|---|------|---------|
| 4.1 | `any` 类型替换 | 1h |
| 4.2 | 移除 Element.prototype monkey-patch | 30min |
| 4.4 | 魔术数字命名常量 | 30min |
| 8.1 | 混淆脚本不修改源文件 | 30min |

### 💡 优化建议 (P3) — 性能/体验

| # | 问题 | 预估工时 |
|---|------|---------|
| 3.1 | deriveMK 移至 Web Worker | 2-4h |
| 3.2 | 缓存已解密笔记元数据 | 1h |
| 3.5 | 添加 D1 复合索引 | 5min |
| 7.4 | 键盘快捷键 | 30min |

---

## 最终建议

**最核心的三个修复按优先级:**

1. **修复 postMessage targetOrigin** — 5 分钟，消除主密钥泄露风险
2. **移除浏览器端 RSA 私钥解密** — 重新设计审计日志流程
3. **验证令牌加盐** — 使用 Argon2id 输出替代 `sha224(password)`

**密码学重构建议:**

```
MK = Argon2id(password, salt)     // 保留现有 Argon2id

KA = HKDF-Expand(MK, info='meta', L=256)
KB = HKDF-Expand(MK, info='body', L=256)
KC = HKDF-Expand(MK, info='integrity', L=256)
OpToken = HKDF-Expand(MK, info='operation-token', L=256)
VerificationToken = HKDF-Expand(MK, info='verification', L=128)
```

这将消除所有自定义的 deriveKA/KB/KC 实现，使用经过验证的标准构造 HKDF。

---

*审查基于 S-Qrypt v1.0.1，2026-07-11 的代码库。包含文件: src/index.ts, src/homeHtml.ts, src/cryptoSandboxHtml.ts, src/deployHtml.ts, src/argon2Files.ts, scripts/, migrations/, test/, .github/workflows/*`
