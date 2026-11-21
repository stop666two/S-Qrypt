# S-Qrypt 全面审查报告

- 审查对象：`D:/administrator/Documents/project/S-Qrypt`（Cloudflare Worker + D1，单页 SPA 内联密码学实现）
- 审查日期：2026-11-21
- 审查级别：**全面审查**（`§8.3.1`，依据见 §2.1）
- 基线提交：`17620c0 chore(ai): gitignore 排除安全扫描/诊断产物`
- 报告性质：只读审查，产品代码一行未改（工作区仅新增本文件；临时复现件已删除）

---

## 1. 结论

1. 项目**可运行**：`npx tsc --noEmit` 退出码 0，`npx vitest run` 26/26 全绿——但这些绿灯完全不覆盖本报告的 24 条发现。
2. **1 项阻断（CRITICAL）**：验证令牌 `sha256(salt‖hex(sha224(pw)))` 可由公开 `salt` 离线计算，实测 5,527 次/秒（单线程 JS），而一次合法解锁需 31.4 秒——口令爆破成本降到 **1/173,577**，自研 32MB 内存硬 KDF 被整体绕过。
3. **6 项高危（HIGH）**：`npm ci` 必然失败导致 CI 部署作业永久红（R-06）；无沙箱环境下 v2 保险箱**永久无法解锁**（R-07）；`updated_at` 落库为 SQL 字面量字符串（R-02）；导入第 20 条起写锁 600 秒（R-03）；认证失败读路径零限流且 README 宣称的读限流只实现了 1/多（R-04）；源校验对任意 https 域放行（R-05）。
4. **3 项一般（MEDIUM）进主表**：D1「强制主库读」是无效注释且结论误导（R-10）；`npm run setup` 必然把真实 `database_id` 还原成全零占位符（R-12）；部署链无 finally，混淆产物可能残留（R-13）。
5. 其余 14 项（MEDIUM×4 / LOW×5 / INFO×1 + 一项因限量移入附录的 MEDIUM）见附录 A，其中 **R-16 解密失败笔记被静默隐藏 + id 映射错位** 建议按 MEDIUM 优先处理。
6. 现有测试网（26 个用例）与类型检查对本报告全部缺陷**零覆盖**：R-02 这类缺陷 `tsc` 通过、接口返回 200、UI 只表现为「· 修改 」空缺。
7. 规范性轴：**不通过**（§3 安全底线、§3.8 认证、§3.11 浏览器侧、§6.3 提交前验证多处违规）。规格性轴：**不通过**（README 的 5 处安全/可用性宣称与实现不符，见 §2.3）。

---

## 2. 审查范围与方法

### 2.1 级别与依据（`§8.3.1`）

| 判定项 | 证据 | 结论 |
|---|---|---|
| 触及 API 契约 | 13 个 `/api/*` 路由（`src/index.ts:330-608`） | 重大 |
| 触及密钥派生/密码学 | `deriveMK`/`deriveKA/KB/KC`/`encGCM`（`src/homeHtml.ts:317-330`） | 重大 |
| 触及部署流水线 | `package.json:7`、`.github/workflows/deploy.yml`、`scripts/setup.mjs` | 重大 |
| 触及数据 schema | `ensureSchema`（`src/index.ts:70-88`）vs `migrations/0001_init.sql` | 重大 |

四个维度均为「重大」，边界不模糊 → 取**全面审查**，必须覆盖 `§8.1.1` a–h 全部八角度。

### 2.2 八角度覆盖（`§8.1.1`，每角度结论）

| 角度 | 结论 | 承载发现 |
|---|---|---|
| a 逐行扫描 | 发现问题 | R-01、R-02、R-05、R-14、R-17、R-18、R-19、R-20 |
| b 删除行为审计 | 发现问题 | R-10（删除/替换了「陈旧读」问题但未重建不变量：D1 一致性仍无保障）、R-16（`filter(n=>!n.damaged)` 删掉了损坏行渲染，却没补「告知用户哪条损坏」） |
| c 跨文件追踪 | 发现问题 | R-01（`/api/token` 泄 salt ↔ 客户端令牌公式）、R-04（README ↔ 路由）、R-06（lockfile ↔ workflow）、R-11（迁移 ↔ 运行时 DDL）、R-24（两份 SHA 实现 ↔ 一份 KAT） |
| d 复用 | 发现问题 | R-24：`sha256/sha224` 在 `src/homeHtml.ts:298-299` 与 `src/cryptoSandboxHtml.ts` 各存一份，KAT 只校验后者 |
| e 简化 | 发现问题 | R-08：沙箱协议实现了 10 个 cmd，主页面只调用 1 个（`argon2id`），隔离承诺被架空的复杂度纯属负债 |
| f 效率 | 发现问题 | R-22：每条笔记 3 次 128 轮 HMAC-SHA512 派生，实测 20 ms/条 → 50 条 1.0 s 主线程 |
| g 抽象层级 | 发现问题 | R-10：用 SQL 注释表达「读主库」——层级错配，D1 语义在会话层（Sessions API），不在 SQL 文本层 |
| h 惯例 | 发现问题 | R-09（缺 `frame-ancestors`/`X-Frame-Options`）、R-12（脚本改写已提交配置后不还原真实值）、R-13（构建链无 finally） |

### 2.3 双轴结论（`§8.3.2`）

**规范性轴（是否符合 `agents-rules`）→ 不通过**

| 规则 | 违反点 |
|---|---|
| `§3.1.1` 密钥不入库/不硬编码 | 无硬编码密钥（R-23 已排除），但 R-01 使口令等价可离线破——口令凭证实际上以「可枚举哈希」形式入库 |
| `§3.8` 认证与会话 | R-01：长期静态明文凭据逐请求携带；R-04：认证失败路径无限流；R-05：源校验退化为「任意 https」 |
| `§3.9` 登录与密码策略 | 仅前端 `pw.length<10`（`src/homeHtml.ts:436`），服务端无任何口令强度/枚举防护（R-01/R-18） |
| `§3.11` 传输与浏览器侧 | R-09 缺 framing 保护；R-15 锁屏后明文仍在 DOM |
| `§6.3.1` 提交前必须验证 | R-06：CI 不跑 `tsc` 也不跑测试；`npm ci` 本身就是红的 |
| `§15.1` 迁移 | R-11：迁移文件与真实 schema 不一致，schema 由运行时 `ensureSchema` 隐式创建 |

**规格性轴（是否忠实实现原始需求，据 `README.md`）→ 不通过**

| README 宣称 | 位置 | 实现事实 | 判定 |
|---|---|---|---|
| 「沙箱 iframe 隔离，密钥不进入主页面 JS 作用域」「所有密码学操作在沙箱内完成」 | `README.md:35,187,196-199` | 主页面内完整实现并执行 KA/KB/KC 派生 + AES-GCM（`src/homeHtml.ts:320-330`），沙箱仅承担 1 次 `argon2id`（`src/homeHtml.ts:318`，全仓唯一 `frameCall` 调用点） | 不符（R-08） |
| 「自动降级不影响可用性」 | `README.md:36,70,166,201` | 降级 ⇒ `kdfV=1`，与库内 `kdf_version=2` 不等即抛错（`src/homeHtml.ts:434`），v2 保险箱永久不可解锁 | 不符（R-07） |
| 「读操作 100 次/5 分钟」 | `README.md:38,189,246` | 仅 `/api/token` 有限流（实测 105 次 → 98×200 + 7×429）；`/api/notes`、`/api/note/:id`、`/api/audit/logs` 无限流（实测 200 次错误令牌 → 200×401，零 429） | 不符（R-04） |
| 「所有写操作需携带 operation_token」 | `README.md:246` | `POST /api/audit/log` 只校验可读凭据 `X-Verification-Token`（`src/index.ts:549-564`） | 不符（R-17） |
| 「随机盐值验证令牌防御彩虹表」 | `README.md:40,158` | 每部署一个固定 salt，彩虹表换成「一次针对性枚举」即可，且枚举成本 = 2 次哈希（R-01） | 不符（R-01） |
| 「防御复制副本陈旧读」 | `CHANGELOG`（提交 `ffb0aaf`） | `/* d1_primary */ ` 是普通 SQL 注释，D1 无该语义（R-10） | 不符 |

### 2.4 覆盖率扫描（`§8.1.2`，第二轮新增，均不在上述清单内）

以全新视角重审后追加 4 条，按 `§8.2.3` 记入附录 A（编号顺延）：

| ID | 位置 | 新发现 | 判定 |
|---|---|---|---|
| R-25 | `src/index.ts:426-438` | `GET /api/notes` 的 `total` 与 `notes` 分两次查询、无事务，写并发时两者不一致；分页 `offset` 基于不稳定的 `ORDER BY id ASC`（新建笔记会插入列表尾部，删除会移动偏移），前端 `displayedCount` 累加会漏行/重行 | PLAUSIBLE |
| R-26 | `src/homeHtml.ts:432` + `src/index.ts:426` | 前端把服务端 `limit` 上限 100 与自身 `limit=50` 混用：`btn-load-more` 传 `offset=displayedCount&limit=20`，但 `displayedCount` 是「已渲染条数」而非「已跳过行数」，一旦有 damaged 行被过滤，offset 与真实行位置错位 → 加载更多会重复/跳过 | PLAUSIBLE |
| R-27 | `src/index.ts:404-413` | 未初始化时 `POST /api/note` 用 `setup_token` 即可无限创建空笔记（每次写消耗限流但成功不重置），没有任何「仅供 bootstrap 一条测试笔记」的约束，属接口能力过剩 | CONFIRMED |
| R-28 | `src/index.ts:241-253` | `/sw.js` 用 `fetch(e.request).catch(...)` 直接透传：对 `/` 的缓存策略是 `no-store`，**Service Worker 未提供任何离线能力**，却注册了 SW（`src/homeHtml.ts:443`），README 的「PWA 支持」名不副实 | CONFIRMED |

（`§8.1.2` 要求两轮记录均在：第一轮 = R-01…R-24，第二轮 = R-25…R-28，无重复项。）

---

## 3. 主表：阻断/高危 10 项（`§8.4.1`）

排序：阻断 → 高危 → 一般。每条含「输入/状态 → 触发路径 → 错误结果」三要素与一句话可执行修复。

| ID | 严重度 | 位置（文件:行） | 失效场景（输入/状态 → 路径 → 错误结果） | 判定 | 修复建议 |
|---|---|---|---|---|---|
| R-01 | 阻断 | `src/index.ts:330-343`、`src/homeHtml.ts:434`、`src/index.ts:118-140` | 攻击者 `GET /api/token` 拿到公开 `salt`（无认证，实测返回 1 MiB salt 也照样返回）→ 本地循环 `hex(sha256(salt+hex(sha224(guess))))` 并与库内 `verification_token_hash` 比对（或直接拿候选令牌打 `GET /api/notes`，200/401 即判据）→ 得到主密码；实测 5,527 次/秒（单线程 JS，GPU/原生实现高数个量级），而一次合法解锁 `deriveMK` 需 31.4 s，即**每条口令的验证成本被降低 173,577 倍**，128 轮 HMAC + 32MB 内存填充 + Argon2id（32MiB/t=3/p=4）全部作废；此外该令牌是长期静态凭据，逐请求明文携带 | CONFIRMED | 改存慢哈希口令校验值（服务端 Argon2id/scrypt，或至少 PBKDF2-HMAC-SHA256 ≥ 600k 迭代），或改为「服务端存 MK 承诺值 + 每次登录随机 challenge 的挑战-响应」，并同步废弃 `salt`-only 令牌 |
| R-07 | 高危 | `src/homeHtml.ts:318`、`src/homeHtml.ts:434` | 状态：浏览器禁用 WASM / 沙箱 iframe 被拦 / `frameCall` 12 s 超时 / 隐私模式 → `useSandbox=false` → `deriveMK` 走 `kdfV=1`（实测输出 `kdfV=1`）→ 库内 `kdf_version=2` → `handleLogin` 抛「此浏览器无法以保险箱的密钥派生强度解锁」→ **v2 保险箱在该类环境永久不可解锁**（v1/v2 的 MK 本就不同，不是「降级」而是「另一把钥匙」） | CONFIRMED | 要么去掉 `if(useSandbox)` 分支、Argon2id 失败即纯软件 Argon2id（同参数 JS 实现），要么把 `kdf_version` 改为「能力标记」并保留 v1 兼容解密路径 |
| R-06 | 高危 | `package-lock.json`（devDependencies）、`.github/workflows/deploy.yml:24,28`、`scripts/setup.mjs:114-118` | 任何人/CI 执行 `npm ci` → lockfile 缺 `javascript-obfuscator` 等 120 个包 → `EUSAGE` 退出 1 → `deploy` 作业第 24 行即失败，永久红；即便修好，该作业只跑 `node scripts/setup.mjs`（`deploy.yml:28`），既不 `tsc` 也不 `vitest`，且 `setup.mjs:114-118` 直接 `npx wrangler deploy`，**绕过 `scripts/obfuscate.mjs`**，生产产物与 `npm run deploy` 的产物不一致 | CONFIRMED | 提交同步后的 `package-lock.json`；CI 增加 `tsc --noEmit` + `vitest run` 两步；`deploy.yml:28` 改调 `npm run deploy`（或 `setup.mjs` 内部先跑混淆） |
| R-02 | 高危 | `src/index.ts:476-483`（绑定字面量在 481） | 输入：`PUT /api/note/:id` 不带 `updated_at` 字段（`saveN` 编辑旧笔记时确实不带，见 `src/homeHtml.ts:429`）→ 绑定值是字符串 `"datetime('now')"` 而 SQL 是 `updated_at = ?` → 列被写成该字面量 → `GET /api/notes` 返回 `updated_at:"datetime('now')"`（实测）→ `new Date("datetime('now')")` 非法 → 列表渲染出空的「· 修改 」；排序函数 `compareByCreatedAt` 与 `fmtTime` 均受影响 | CONFIRMED | 改为 `updated_at = COALESCE(?, datetime('now'))` 并把 `null` 传进去（或用 `datetime(?)` 包裹已校验的时间戳），并补一条「PUT 不带 updated_at 后值必须可被 `Date.parse` 解析」的回归断言 |
| R-03 | 高危 | `src/index.ts:177`、`src/index.ts:186-204`、`src/homeHtml.ts:449` | 输入：备份导入 20 条以上笔记（每条 = POST 占位 + PUT 内容 = 2 次写）→ `writeRateLimit` 按「请求」计数且成功后不重置（`attempts+1` 无条件）→ 第 40 次写返回 `429 {retry_after:600}`（实测：`first 429 at write #40`）→ 导入中断、`pendingOps` 内的后续操作全部 429，10 分钟内不能新建/编辑/删除任何笔记 | CONFIRMED | 改为「成功后归零」的滑动窗口（成功路径 `SET attempts=0`），或将导入批量化（单一 `POST /api/notes/bulk`）并把计数维度从「请求」改为「条数」 |
| R-05 | 高危 | `src/index.ts:143-160` | 输入：`POST /api/init`（或任意 `/api/*`）带 `Origin: https://evil.example` → `allowed()` 对**任意 https** 返回 true、且从不与 `url.origin` 比对 → 请求继续进入路由（实测返回 `invalid_token` 而非 `forbidden_origin`）→ 源校验形同不存在，只剩令牌防护；对 `/api/init`、`/api/init-check` 等不需要自定义头的端点，第三方页面可直接跨站触发。（缓解：写操作还需 body 内 `operation_token`、读操作需自定义头 `X-Verification-Token`，浏览器不会自动附带，故未定为阻断） | CONFIRMED | `allowed()` 改为与 `new URL(request.url).origin` 严格相等（外加显式白名单），并补 `Origin` 缺省时的 `Sec-Fetch-Site` 校验 |
| R-04 | 高危 | `src/index.ts:118-140`、`src/index.ts:330`、`README.md:38,189,246` | 输入：200 次 `GET /api/notes` 携带错误 `X-Verification-Token` → `requireVerificationToken` 只做常量时间比对、**不调用任何限流** → 实测 200×401、零 429 → 令牌可无限次在线枚举（配合 R-01 的离线路径更廉价）；README 宣称的「读 100 次/5 分钟」只对 `/api/token` 成立（实测 105 次 → 98×200 + 7×429），文档与实现不符 | CONFIRMED | 在 `requireVerificationToken` 内部失败分支接入 `writeRateLimit(db,'auth:'+ip, RATE_MAX_READ)`，成功分支归零；并同步 README |
| R-10 | 一般 | `src/index.ts:184`、全仓（无 `withSession`） | 状态：D1 开启全球读复制后客户端登录命中主库、随后列表查询命中陈旧副本 → 期望 `PRIMARY_READ` 前缀把读强制到主库 → 实际它是**普通 SQL 注释**，D1 对 SQL 文本无语义；官方文档明确「必须使用 D1 Sessions API，否则所有查询仍只在主库执行」（`https://developers.cloudflare.com/d1/best-practices/read-replication/`）→ 该「修复」（提交 `ffb0aaf`）无任何效果，且**原始症状至今未定位**（若未启用 Sessions API，则本不该出现副本陈旧读，说明真实根因另有其因） | 作为修复 REFUTED；作为误导性结论 CONFIRMED | 回滚 `PRIMARY_READ` 常量与其十八处调用，改用 `env.DB.withSession('first-primary')` + `x-d1-bookmark` 传递；并重新复现「登录后列表为空」以定位真实根因 |
| R-12 | 一般 | `scripts/setup.mjs:120-132`、`wrangler.jsonc:11`、`package.json:11` | 输入：开发者按 README 执行 `npm run setup` → 脚本末尾无条件 `restorePlaceholder()` 把 `database_id` 写回 `00000000-0000-0000-0000-000000000000`（第 128 行）→ 而已提交的 `wrangler.jsonc:11` 是真实 ID `f453bd2a-…` → 工作区变脏（用户既有 `M .gitignore` 之外多出 `M wrangler.jsonc`），此后任何 `npm run deploy`/`wrangler deploy` 都带着全零 ID 部署 → 绑定失败或指向错误库 | CONFIRMED | 记录「进入时的原始值」并在 `finally` 中还原为该原始值（而非固定占位符）；或干脆不还原，改由 `.gitignore` 忽略 `wrangler.jsonc` 并提供 `.example` |
| R-13 | 一般 | `package.json:7`、`scripts/obfuscate.mjs:86` | 输入：`npm run deploy`，混淆成功但 `wrangler deploy` 失败（网络/鉴权/配额）→ 命令链 `... && node scripts/obfuscate.mjs && wrangler deploy && git checkout -- ...` 无 `finally` → `git checkout` 不执行 → `src/homeHtml.ts` / `src/cryptoSandboxHtml.ts` 里留下混淆后的产物（`obfuscate.mjs:86` 是原地写回），下一次提交会把混淆代码当源码入库 | CONFIRMED | 改为 `node scripts/deploy.mjs`：`try { obfuscate(); wranglerDeploy() } finally { git checkout -- src/homeHtml.ts src/cryptoSandboxHtml.ts }`，失败也要还原；或让混淆写到 `dist/` 并只 `wrangler deploy dist/` |

---

## 附录 A：其余发现（14 + 4 项，不设上限，`§8.4.2`）

| ID | 严重度 | 位置（文件:行） | 问题 / 为什么危险 | 修复建议 | 判定 |
|---|---|---|---|---|---|
| R-08 | MEDIUM | `src/homeHtml.ts:307,318`、`src/cryptoSandboxHtml.ts`（`onmessage` 支持 10 个 cmd） | 主页面只调用一次 `frameCall('argon2id', pw)`（全仓唯一调用点）；`deriveKA/KB/KC`、`encGCM/decGCM`、`deriveOp` 全在主页面执行，沙箱里同名实现成为死代码。README:35/187/196-199 的「密钥不进入主页面 JS 作用域」是假的，用户据此高估威胁模型（XSS ⇒ 直接拿 MK/明文） | 要么真正把全部密码学迁进沙箱（主页面只持有不透明句柄），要么删掉这层隔离并在 README 如实降级宣称 | CONFIRMED |
| R-09 | MEDIUM | `src/index.ts:32-45`；同类响应 `/crypto-sandbox`（`279`）、`/deploy`（`294`） | 三个 HTML 响应均无 `frame-ancestors`、无 `X-Frame-Options`（实测 `XFO=null`、`frame-ancestors=false`）→ 任意站点可 iframe 套壳本站做点击劫持（解锁框、删除确认框均可被覆盖） | CSP 增加 `frame-ancestors 'none'`，并补 `X-Frame-Options: DENY`（保留 `/crypto-sandbox` 例外需用 `frame-ancestors 'self'`） | CONFIRMED |
| R-11 | MEDIUM | `migrations/0001_init.sql` vs `src/index.ts:70-88` | 迁移文件缺 `config.salt`、`config.audit_public_key`、`notes.created_at`、`notes.updated_at`、`auth_limits`、`audit_logs`、`idx_audit_created`；真实 schema 只由运行时 `ensureSchema` 隐式创建 → 用 `wrangler d1 migrations apply` 建库会得到残缺库，且 `ensureColumn` 的 `ALTER` 只在首次请求时补列，任何非 Worker 通道建库都缺列 | 用运行时 DDL 重新生成 `0001_init.sql`（与新库对齐），并增加一条 CI 断言：迁移后的 `pragma_table_info` 集合 = `ensureSchema` 期望集合 | CONFIRMED |
| R-14 | MEDIUM | `src/homeHtml.ts:282`、`src/index.ts:36` | Trusted Types 策略 `createHTML:s=>s` 等价于关闭 TT；CSP 同时含 `script-src 'unsafe-inline'` → TT + CSP 两层 XSS 缓解均为零。当前无注入点（用户数据都过 `esc()`，`src/homeHtml.ts:415`），属未来改动的定时炸弹 | 策略改为返回 `TrustedHTML` 前做白名单清洗，或移除 TT 策略并把 CSP 收紧到 `script-src 'self'`（内联脚本改外链 `/app.js`） | PLAUSIBLE |
| R-15 | MEDIUM | `src/homeHtml.ts:408` | `lockScr()` 只 `clearMem()` + 切 class，不清 `#detail-body.textContent`、不清 `#editor-note-title/#editor-note-body` 的 `value`、不清列表 DOM → 锁定后明文仍在 DOM 中，任何人打开 DevTools/截图/页面放大镜即可读取；与「60 秒无操作自动擦除内存密钥」宣称的会话卫生不符 | `lockScr` 末尾清空 `detail-body`/`detail-time`/`detail-title` 文本、编辑器 `value`、`note-list` HTML，并把 `appState.notes` 置空（`clearMem` 已置空数据，但 DOM 未同步） | CONFIRMED |
| R-16 | MEDIUM | `src/homeHtml.ts:420`（`filter(n=>!n.damaged)`）、`src/homeHtml.ts:432`（`rows[notes.length].id`） | ① 解密失败的笔记被 `renderL` 过滤，用户完全看不到哪条损坏（尽管 CSS `.note-item.damaged` 与 `'[数据损坏]'` 文案都写好了，代码路径不可达）；② `notes.push({id:rows[notes.length].id,...})` 用「已 push 数量」当下标索引服务端行，一旦前面有失败项就指向错误行 → 损坏占位行与真实 id 错位，后续编辑/删除会作用到错误笔记 | `f = appState.notes`（保留 damaged 行并渲染 `[数据损坏]`）＋ `notes.push({id:rows[i].id,...})`（用 `results` 的索引 `i`） | CONFIRMED |
| R-17 | LOW | `src/index.ts:549-564` vs `README.md:246` | `POST /api/audit/log` 是写接口，却只要求可读凭据 `X-Verification-Token`，与「所有写操作需 operation_token」矛盾；只读凭据泄露即可污染审计日志（伪造 `fingerprint_hash`/`encrypted_entry`） | 改为校验 `operation_token`（与 `/api/audit/key` 一致），或明确把该端点降级为「只读凭据可写」并同步文档与威胁模型 | CONFIRMED |
| R-18 | LOW | `src/index.ts:345-399` | `/api/init` 对 `verification_token`/`operation_token_hash`/`salt`/`audit_public_key` 无长度与格式上限（对照 `/api/audit/key` 的 10000 上限）→ 实测 1 MiB `salt` 返回 201 并原样存库、原样由 `/api/token` 回吐（`salt length = 1048576`）→ 可写入超长垃圾撑大行/响应，且前端 `hex(sha256(td.salt+…))` 对大 salt 计算退化 | 统一走 `validateString`：`salt` 限 hex 且长度 = 32，`operation_token_hash`/`verification_token` 限 64-64 hex，`audit_public_key` 复用 10000 上限 | CONFIRMED |
| R-19 | LOW | `src/index.ts:90-92`、`src/index.ts:186-204` | `auth_limits` 只增不删（无 TTL 清理，`key` 为 `prefix:ip`）→ 按 IP 无限增长；`getClientIp` 在无 `CF-Connecting-IP` 时回退 `X-Forwarded-For`，自建/代理场景下可被伪造以规避或注满限流表 | 增加定期清理（或 `window_start` 过期行 UPSERT 复用），回退链只信 `CF-Connecting-IP`，缺失时用固定桶而非 header | CONFIRMED |
| R-20 | LOW | `src/homeHtml.ts:394`、`src/homeHtml.ts:422` | `intSign(KC, body)` 算出 HMAC-SHA512 后只 `sig.slice(0,8)` 写进本地审计日志，**从未用于任何校验**；`deriveKC` 因此只产生「好看的数字」，README:76,177 的「完整性密钥」宣称落空（完整性实际由 AES-GCM tag 提供，KC 属冗余） | 要么真用 KC 做笔记完整性校验（解密后重算并与服务端/本地存储的签名比对），要么删掉 KC 并从 README 移除该宣称 | CONFIRMED |
| R-21 | LOW | `src/index.ts:441-457` | `GET /api/note/:id` 只过滤 `deleted`、不过滤 `is_test` → 初始化测试笔记（`__SQRYPT_TEST__` 密文）在初始化后仍可读（实测 `GET /api/note/2 → 200`，而 `GET /api/notes` 列表里不可见）→ 列表/单条口径不一致，测试数据可被当成真实笔记操作（编辑/删除） | 单条读取增加 `AND is_test != 1`，或初始化完成后硬删测试笔记 | CONFIRMED |
| R-22 | LOW | `src/homeHtml.ts:398`（`getNK` 三键派生）、`src/homeHtml.ts:432`（50 条一次全派生）、`src/index.ts:32-45`（响应内联 73,442 B HTML） | 登录后 `refreshNL` 对最多 50 条笔记派发 `Promise.allSettled`，每条 3 次派生；实测 KA+KB+KC = **20 ms/条**（单线程 JS）→ 50 条 ≈ **1.0 s** 主线程饱和（`Promise.allSettled` 不换线程，`deriveKA` 的 128 轮 HMAC 全在同一线程）→ 登录后首次渲染卡顿；首页 HTML 内联 73 KB 且 `Cache-Control: no-store` | 首屏只派生可见 20 条的 KA（KB/KC 懒派生），把派生移进 Worker/沙箱分批；首页拆出外链 `app.js` 以便缓存 | CONFIRMED |
| R-23 | INFO | 仓库 | 未发现密钥入库：`git ls-files` 无 `.dev.vars`/`.env*`；`.gitignore:33-34,68` 已覆盖；`.dev.vars` 未跟踪 | 保持现状；建议加一条 CI 检查 `git ls-files` 不含 `dev.vars`/`.env*` | CONFIRMED（无问题） |
| R-24 | MEDIUM | `scripts/crypto-kat.mjs:7` vs `src/homeHtml.ts:298-299` | KAT 只对 `src/cryptoSandboxHtml.ts` 的内联副本做 FIPS 180-4 校验；主页面有**另一份** `sha256/sha224` 实现且无任何门禁 → 两副本可静默漂移（CHANGELOG 记录过「旧实现派生密钥不兼容」同类事故）；本次审查实测主页面副本 4 条 KAT 全过（当前一致），风险在漂移而非现状错误 | 抽取单一实现（构建期从一处生成两份，或让 KAT 同时对两个文件跑），并在 CI 中强制 | CONFIRMED（机制）/ 当前实现正确 |
| R-25 | LOW | `src/index.ts:414-419` | `total` 与 `notes` 两次独立查询无事务；`ORDER BY id ASC` + `OFFSET` 在并发写入/软删除下不稳定 → 分页会漏行/重行，`total` 与实际条数不一致 | 用单条窗口函数查询同时返回 total；分页改用 `(created_at,id)` 游标而非 offset | PLAUSIBLE |
| R-26 | LOW | `src/homeHtml.ts:432`（`btn-load-more` 的 offset）、`src/index.ts:401-421` | 「加载更多」用 `offset=displayedCount`，但 `displayedCount` 是已渲染条数（`Math.min(20,notes.length)`），不是已跳过行数；叠加 R-16 的 damaged 过滤后两者必然错位 → 重复加载或跳过笔记 | 服务端行位置单独记录 `nextOffset`（= 已消费的服务端行数），与渲染条数解耦 | PLAUSIBLE |
| R-27 | LOW | `src/index.ts:423-438` | 未初始化时 `POST /api/note` 凭 `setup_token` 可无限创建空笔记（每次写消耗同一限流桶），无「仅允许 1 条 bootstrap 笔记」约束 → 攻击者持 SETUP_TOKEN 可灌入任意多空行；接口能力过剩 | 未初始化分支把「已存在占位笔记」视作冲突（`409`），或直接由 `POST /api/init` 内部创建测试笔记 | CONFIRMED |
| R-28 | LOW | `src/index.ts:237-245`、`src/homeHtml.ts:451` | `sw.js` 只是 `fetch(e.request)` 透传 + 失败回 503；首页 `Cache-Control: no-store` → 离线打开为空，README「PWA 支持」名不副实；同时注册 SW 让后续缓存策略改动更复杂 | 要么实现真正的离线壳（预缓存 HTML/JS，`no-store` 仅用于 API），要么移除 SW 注册与 `/sw.js` 路由 | CONFIRMED |

---

## 附录 B：证据输出（`§1.6.5` 可触达）

### B.1 基线（步骤 1）

```
$ npm ci
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync...
npm error Missing: javascript-obfuscator@5.10.1 from lock file
npm error Missing: @javascript-obfuscator/escodegen@2.4.2 from lock file
... （共 120 条 Missing，完整输出见 artifact://1）
EXIT=1
```

```
$ node -e "…lock vs package devDependencies…"
lock.devDeps: @cloudflare/vitest-pool-workers,@types/node,typescript,vitest,wrangler
pkg.devDeps : @cloudflare/vitest-pool-workers,@types/node,typescript,vitest,wrangler,javascript-obfuscator
missing in lock: javascript-obfuscator
```

```
$ npx tsc --noEmit ; echo TSC_EXIT=$?
TSC_EXIT=0
$ grep -c "  it(" test/index.spec.ts
26
$ npx vitest run
 Test Files  1 passed (1)
      Tests  26 passed (26)
VITEST_EXIT=0
```

> 说明：`tsc --noEmit` 为 0 而 R-02 成立 —— 该缺陷（SQL 字面量当数据绑定）在类型层面完全合法，类型检查不可能抓到。

```
$ npm install --no-audit --no-fund     # 仅为准备复现环境
added 124 packages in 3m
$ git checkout -- package-lock.json    # 立刻还原，审查不残留工作区变更
```

### B.2 R-01 离线爆破（`_tmp_review/offline-guess.mjs`，已删）

```
[R-01] KAT OK: 4 vectors passed against homeHtml.ts implementation
[R-01] sample token = 8d9120c5f8bd74f11cbb3ba5fff63de495b3bc2d8f6e446882dc21181f66065a
[R-01] 100000 guesses in 18397 ms -> 5436 guesses/sec (single thread)
```

### B.3 R-01 对照组：合法解锁成本 vs 离线猜解（`_tmp_review/kdf-cost.mjs`，已删）

```
[R-01-cost] deriveMK (32MB memory-hard + 128-round HMAC + 128 loops) = 31403 ms, kdfV=1, mk=256 bytes
[R-01-cost] offline token guesses: 20000 in 3618 ms -> 5527 guesses/sec
[R-01-cost] ratio: one legitimate unlock (31403 ms) costs as much as 173577 offline guesses
```

> `kdfV=1` 同时构成 R-07 的可执行证据：沙箱不可用时 `deriveMK` 返回 1。

### B.4 R-02 / R-03 / R-04 / R-05 / R-18 / R-21（`test/__review/api-repro.spec.ts`，已删）

```
$ npx vitest run test/__review
[R-18] POST /api/init (1MiB salt) -> 201 {"status":"ok"}
[R-18] GET /api/token salt length = 1048576
[R-05] evil https Origin -> 400 {"error":"invalid_token"}
[R-05b] Origin: null -> 403 {"error":"forbidden_origin"}
[R-02] note row = {"id":1,"encrypted_meta_packet":"AAAA","is_test":0,"deleted":0,"created_at":"2026-11-20 23:33:34","updated_at":"datetime('now')"}
[R-21] GET /api/notes ids = [1] (is_test 行不可见)
[R-21] GET /api/note/2 -> 200 {"id":2,"encrypted_meta_packet":"dGVzdF9tZXRh","encrypted_body":"dGVzdF9ib2R5"}
[R-04] 200 wrong-token GET /api/notes status histogram = {"401":200}
[R-03] first 429 at write #40 {"error":"rate_limited","retry_after":600}
[R-03] => 2 writes/note: the 20th imported note locks writes for 600s
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

（另有一次单独运行：`[R-04b] 105 GET /api/token status histogram = {"200":98,"429":7}` —— 证明读限流只存在于 `/api/token`。）

> 复现方式缺陷说明：初版把 6 条复现拆成 6 个 spec 文件，因 `vitest.config.ts` 使用 `isolatedStorage: false`，D1 状态**跨文件共享**，第二个文件起 `POST /api/init` 返回 409 导致断言失效。已合并为单个有序 spec（一次 `init` 后顺序验证 R-18→R-05→R-02→R-21→R-04→R-03），6/6 通过。

### B.5 R-09 响应头（`test/__review/headers.spec.ts`，已删）

```
[R-09] / status=200 XFO=null frame-ancestors=false
[R-09] /crypto-sandbox status=200 XFO=null frame-ancestors=false
[R-09] /deploy status=200 XFO=null frame-ancestors=false
 Test Files  1 passed (1)   Tests  3 passed (3)
```

### B.6 R-22 派生成本（`_tmp_review/key-derive-cost.mjs`，已删）

```
[R-22] KA+KB+KC per note = 20 ms (JS, single thread)
[R-22] 50 notes sequentially    = 1.0 s
```

### B.7 静态取证命令

```
$ grep -c "frameCall(" src/homeHtml.ts   →  唯一调用点 318（argon2id）
$ grep -rn "withSession" src/ scripts/   →  (none)
$ git ls-files | grep -E 'dev\.vars|\.env'  →  (none tracked)
$ wc -c src/homeHtml.ts src/index.ts src/cryptoSandboxHtml.ts
 73442 src/homeHtml.ts   29326 src/index.ts   9334 src/cryptoSandboxHtml.ts
$ grep -n "run:" .github/workflows/deploy.yml
24:  - run: npm ci
28:  run: node scripts/setup.mjs
34 / 41 / 48: 仅 secret 设置与提示，无 tsc/vitest
```

### B.8 R-10 官方语义（原文引用）

> "To use read replication, you must use the [D1 Sessions API](https://developers.cloudflare.com/d1/worker-api/d1-database/#withsession), otherwise all queries will continue to be executed only by the primary database."
> —— `https://developers.cloudflare.com/d1/best-practices/read-replication/`

---

## 附录 C：未验证项（缺什么条件）

| 项 | 为什么未验证 | 需要什么条件 |
|---|---|---|
| R-07 的浏览器侧完整路径 | 只验证了 `deriveMK` 在「沙箱不可用」时返回 `kdfV=1`（B.3）与 `handleLogin` 的比较抛错（`src/homeHtml.ts:434` 静态）；未在真实浏览器跑通「v2 保险箱 + 禁 WASM」端到端 | Chromium + `--blink-settings=scriptEnabled` / CDP 注入 `WebAssembly=undefined`，本地 `wrangler dev` 起站，预先构造一个 `kdf_version=2` 的库 |
| R-15 的 DOM 残留实测 | 未用浏览器读锁定后的 DOM 节点 | 同上环境；锁屏后 `document.getElementById('detail-body').textContent` |
| R-14 的 XSS 可用性 | 当前无注入点，仅评估缓解措施失效 | 需要一个真实注入 sink，或用 DOMPurify bypass 语料做负向测试 |
| R-16 的端到端表现 | 静态已确认机制；未构造「一条损坏 + 多条正常」的服务端数据在浏览器里观察列表与 id 错位 | 需向 D1 写入 `encrypted_meta_packet=''` 的行（= 解密必失败）后走登录流程 |
| R-12 的实跑 | 未执行 `npm run setup`（会改写已提交的 `wrangler.jsonc` 并尝试真实部署，属破坏性外部操作，`§1.4` 需显式授权） | 用户授权 + 一次可回滚的部署窗口；或把 `wrangler` 替换为记录参数的空壳再跑 |
| R-13 的失败注入 | 未真的让 `wrangler deploy` 失败 | 用临时 `wrangler` shim（`PATH` 前面放一个 `exit 1` 的脚本）跑 `npm run deploy` 观察残留 |
| R-25/R-26 的并发错位 | 机制清楚但需要并发/交错时序 | 多请求并发 + 人为制造 damaged 行 |
| 生产 D1 是否开启读复制 | 无凭据，未查询账号设置 | `GET /v4/accounts/{id}/d1/database/{id}` 或 Dashboard Settings |

---

## 附录 D：核对清单（自检结论）

| 规则 | 要求 | 本报告执行情况 |
|---|---|---|
| `§8.2.1` 失效场景必附 | 每条发现含「输入/状态 → 触发路径 → 错误结果」 | 主表 10 条三要素齐备；附录 A 每条写明「问题/为何危险/怎么改」；R-14/R-25/R-26 无完整触发路径 → 按 §8.2.3 标 PLAUSIBLE 并给出机制 |
| `§8.2.2` 可疑即标注 | 空值/边界、类型转换、外部输入、并发、资源释放、异常吞没之一出现即标注 | 边界值（R-18 长度上限）、类型转换（R-02 SQL 字面量、R-16 索引）、外部输入（R-05 Origin、R-19 XFF）、并发（R-03 计数、R-25 分页）、资源释放（R-19 `auth_limits` 无清理、R-13 无 finally）、异常吞没（`src/index.ts:118-141` 无 log；`submitAuditLog` 空 catch）均有对应条目 |
| `§8.2.3` 三态验证 | 每条返回 CONFIRMED/PLAUSIBLE/REFUTED 且附依据 | 28 条中 CONFIRMED 23、PLAUSIBLE 5（R-14、R-25、R-26 + R-10 的双重标注）；REFUTED 1 条即 R-10 的「作为修复」——均附依据 |
| `§8.4.1` 排序与限量 | 按四級排序、主表 ≤10 项、超限入附录并注明总数、每条带 `file:line` | 主表 10 项（阻断 1 / 高危 6 / 一般 3），附录 A 18 项已注明总数；每条均有 `文件:行` |
| `§8.4.2` 子代理穷尽报告 | 派子代理时不设上限、五项齐备 | 本次未派子代理（单执行者顺序复核），仍按「不设上限」输出全部 28 项，附录 A 每项含文件/行/问题/危险/修复 |
| `§8.1.1` 八角度 | a–h 全部有结论 | 见 §2.2，8/8 均「发现问题」并绑定具体发现 |
| `§8.1.2` 覆盖率扫描 | 第二轮只找一轮清单外的新缺陷类型 | 见 §2.4（R-25…R-28），与 R-01…R-24 无重复 |
| `§8.3.1` 分级 | 标注级别与依据 | 见 §2.1（四维均为重大 → 全面审查） |
| `§8.3.2` 双轴 | 双轴独立列示，不得互相抵消 | 见 §2.3：两轴均记「不通过」，无抵消 |
| `§1.6.5` 证据可触达 | 输出/响应体/行号，记忆不算 | 附录 B 给出命令与原始输出（含 artifact 编号）；每条发现带行号 |
| 工作区卫生 | 审查不残留改动 | `git status --short` 仅 `M .gitignore`（用户既有改动）+ 本报告文件；`_tmp_review/`、`test/__review/` 已删除；`package-lock.json` 已 `git checkout` 还原 |

---

## 附录 E：修复状态（2026-11-21 当日跟进）

本报告的发现已按用户确认的口径落地，`npx tsc --noEmit` = 0、`npx vitest run` = 34/34、`npm ci` 退出 0、`node scripts/crypto-kat.mjs` 6 向量通过。

| ID | 状态 | 落地方式 |
|---|---|---|
| R-01 | 已修 | `verification_token = HKDF(MK,"s-qrypt-verify")`，`/api/token` 不再下发 salt；旧保险箱需一次性重置 config（见 README「升级说明」） |
| R-02 | 已修 | `updated_at = COALESCE(?, datetime('now'))`，回归用例断言可被 `Date.parse` 解析 |
| R-03 | 已修 | 写操作成功后 `clearRateLimit`，限流改为「连续失败」语义；20 条导入（40 次写）零 429 |
| R-04 | 已修 | `requireVerificationToken` 失败路径接入限流（100 次/5 分钟）；回归用例 120 次错误令牌出现 429 |
| R-05 | 已修 | `csrfCheck(request, url)` 严格比对 protocol+hostname；异源 Origin 返回 `forbidden_origin` |
| R-06 | 已修 | `package-lock.json` 同步（`npm ci` = 0）；CI 增加 `tsc --noEmit` 与 `vitest run`；`setup.mjs` 部署路径改走混淆 |
| R-07 | 已修 | 派生只有一条路径（`kdf_version` 决定是否走 Argon2id），无 WASM 时明确报错而非换钥匙 |
| R-08 | 已修 | 删除 `src/cryptoSandboxHtml.ts`、`/crypto-sandbox` 路由与 iframe IPC；README 改为实况 |
| R-09 | 已修 | 三个 HTML 响应加 `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| R-10 | 已修 | 删除 `PRIMARY_READ` 全部调用，注释改为「读复制需 Sessions API」的事实陈述 |
| R-11 | 已修 | `migrations/0001_init.sql` 按运行时 DDL 重写 |
| R-12 | 已修 | `setup.mjs` 记录运行前的 `database_id` 并在结束时还原该值 |
| R-13 | 已修 | 新增 `scripts/deploy.mjs`（try/finally 还原源码），`setup.mjs` 部署亦加 finally |
| R-14 | 已修 | 删除恒等 Trusted Types 策略；SPA 脚本外链为 `/app.js`（`src/app.client.txt`），`script-src` 去掉 `'unsafe-inline'`；浏览器实测 DOM 内联脚本数为 0、控制台零 CSP 违规 |
| R-15 | 已修 | `lockScr` 清空详情/编辑器/列表 DOM |
| R-16 | 已修 | 损坏行渲染为 `[数据损坏]`；失败项按 `rows[i]` 对应真实 id |
| R-17 | 已修 | `/api/audit/log` 要求 `operation_token`，前端已同步 |
| R-18 | 已修 | `/api/init` 校验 hex 格式与长度上限（salt ≤128、公钥 ≤10000、kdf_version ∈ {1,2}） |
| R-19 | 已修 | 移除 `X-Forwarded-For` 回退；限流表按窗口过期清理 |
| R-20 | 已修 | 删除 `deriveKC`/`intSign` 与 `[KC:...]` 日志；本地审计不再显示无法校验的 ✓ |
| R-21 | 已修 | 单条读加 `AND is_test != 1` |
| R-22 | 已修 | 列表只派生 KA（KB 懒派生）；审查阶段实测三键合计 20 ms/条，本次未重测只派生 KA 的耗时 |
| R-25 | 已修 | `/api/notes` 用 `COUNT(*) OVER()` 与分页同一语句返回 total，越界页回退为单独 COUNT；新增总数一致性断言 |
| R-26 | 已修 | 新增 `appState.srvOffset`，「加载更多」与服务端行位置解耦 |
| R-27 | 已修 | 未初始化时仅允许 1 条占位笔记，第 2 次返回 409 `placeholder_exists` |
| R-28 | 已修 | 删除 `/sw.js` 路由与 `serviceWorker.register`；README 的 PWA 宣称改为仅 Manifest |
| R-23/R-24 | 已修 | KAT 改为校验唯一实现（`src/homeHtml.ts`），两副本问题随沙箱页删除消失 |

---

## 附录 F：安全强化round（P1–P9，用户确认后实施）

在附录 E 的 28 条之外，按用户选择追加的实施项：

| 编号 | 问题 | 落地方式 | 验证 |
|---|---|---|---|
| P1 | KDF 无 per-vault salt ⇒ 令牌哈希可预计算并跨部署复用 | `deriveMK(pw,onP,boost,needArgon2,saltHex)`：盐进入预混合与 Argon2id 输入，`kdf_version=3`；`notes.kdf_version` 标记每行派生版本；`POST /api/vault/upgrade`（begin 落盐 / finish 翻转）与客户端一键升级（双 MK 重加密，可中断续做）；初始化页新增「旧版本保险箱」选项以读回 v2 笔记 | 浏览器实测：`init-check` 返回 `kdf_version:3`，D1 中 `config` 与两条笔记均 `kdf_version=3`、salt 32 hex；API 用例覆盖 begin/finish/翻转后旧令牌失效 |
| P2 | 源校验 fail-open（无 Origin/Referer 直接放行） | 缺头时按 `Sec-Fetch-Site` 判定，`cross-site` → 403 | 用例：`cross-site` 403 `forbidden_origin`，`same-origin` 正常创建 |
| P3 | 仅 per-IP 限流，换 IP 可绕过 | 增加全局失败桶（500/5 分钟） | 由 R-04 用例（120 次失败）间接覆盖；全局桶命中未被单独断言（见「未验证」） |
| P4 | 读令牌永不过期 | `config.token_issued_at` + 90 天 TTL，超期返回 401 `token_expired`；`POST /api/vault/rotate` 需 operation_token 才能续期；登录流程自动续期并重试 | 用例：置旧 issued_at → 401 `token_expired` → 无 op token 续期 403 → 续期 200 → 令牌恢复可用 |
| P5 | `/argon2.wasm` 仍带 `Access-Control-Allow-Origin: *` | 删除该头与多余 CORP | 浏览器冒烟（Argon2 仍正常加载、登录成功） |
| P6 | 密码策略仅 ≥10 位 | ≥12 位，或 ≥10 位且含 3 类字符；拒绝常见口令与全同字符 | 浏览器实测：`aaaaaaaaaa` 被拒并给出强度提示 |
| P7 | CSP 缺 `base-uri`/`form-action` | 主页面与 `/deploy` 均补 | 头部断言（现有 CSP 断言） |
| P8 | 本地审计链加载时不校验 | 加载时逐条重算，断裂条目标记 `⚠ 链断裂` | 仅静态与代码路径；未构造篡改样本实测 |
| P9 | 明文 `verification_token` 比较分支残留 | 删除该分支，`requireVerificationToken` 只比对哈希 | 现有 39 条用例全绿 |

### 未验证 / 已知缺口

1. **客户端 v2→v3 迁移循环未在浏览器里端到端跑过**：需要一个真正的 v2 保险箱（旧版客户端产生）。已验证其组成件——双 MK 读取路径（`mkFor`）、`kdf_version` 行标记、`begin/finish` 翻转、API 层加密重写——但「重加密 N 条笔记」这段循环本身只有代码审查。
2. **P3 全局桶命中**未单独断言（测试只验证了 per-IP 桶的 429）。
3. **P8 断裂提示**未用篡改样本验证。
4. 令牌 TTL 的 90 天边界用「把 issued_at 改到 1」模拟，未做真实时间推进。

---

## 附录 G：迁移核验轮新增发现（R-29–R-32）

在撰写 `docs/MIGRATION.md` 与跑迁移路径时新发现并修复的四项。R-29 为阻断级：它让「正确密码 + 正确设备以外的任何设备」都打不开保险箱。

| 编号 | 严重度 | 发现 | 失效场景（输入/状态 → 路径 → 结果） | 状态 | 证据 |
|---|---|---|---|---|---|
| R-29 | 阻断 | 主密钥派生的内存硬参数取自 `navigator.hardwareConcurrency`/`deviceMemory`，且 `failCount>=5` 后切到「加强」参数（mb 32→64、ro 128→200） | 在 8 核/8GB 机创建保险箱 → 换到 4 核/4GB 手机输入**正确**密码 → 参数不同 ⇒ MK 不同 → 401「密码错误」，数据永久打不开；同机连续失败 5 次后同理会把正确密码判错 | 已修 | `config` 新增 `kdf_mb/kdf_ro`，`/api/token` 下发，`/api/init` 与 `/api/vault/upgrade` 成对校验存储；客户端新建固定 32/128，旧库按 `硬件估算 → 32/128 → 24/80 → 16/60` 阶梯恢复。浏览器实测：把 `hardwareConcurrency/deviceMemory` 覆盖为 2/2（预设 16/60）后，绑定 32/128 的库 **1.8s 单候选**登录成功；无绑定参数的旧库在 4/4（预设 24/80）下经**第 2 候选**命中并继续（`usedMb=32, usedRo=128`）；`/api/token` 返回 `kdf_mb:32, kdf_ro:128`；单测覆盖成对性与越界拒绝 |
| R-30 | 高危 | `apiF` 无超时；`pendingOps` 只在成功路径递减 | D1/网络挂起 → 请求永不返回 → `pendingOps` 永不为 0 → `lockScr` 被 `rstLT` 挡住 ⇒ 离开后页面锁不上；保存按钮永久「保存中」 | 已修 | `AbortController` 12s 超时、GET 重试一次、`finally` 释放。浏览器实测（stub fetch 永不 resolve 且响应 abort）：GET → `timeout` 24.6s；保存 → `timeout` 12.0s，`pendingOps` 0→0、按钮复原、`lockScr` 正常锁屏并清空 DOM |
| R-31 | 高危 | 服务端返回 0 条就渲染「保险箱是空的」 | 读副本滞后/抖动 → 列表清空 → 用户误以为数据丢失并可能去"重置" | 已修 | 浏览器实测：本地有 2 条时让 `/api/notes?offset=0` 返回空 → 保留 2 条、`emptyMode=suspect`、空态不叠加显示、1.2s 后静默重试 |
| R-32 | 一般 | 重置后用不同密码初始化，旧笔记只显示「数据损坏」 | 重置 → 新密码初始化 → 解锁成功但旧笔记全废，界面无任何处置指引 | 已修 | 浏览器实测：破坏 1 条密文 → 顶部横幅「有 1 条笔记用当前密码解不开」+ 用旧密码重来/重置命令两条出路；删除该行后横幅自动隐藏；行标签改为「无法解密」 |

### 本轮仍未验证

5. R-29 的「旧库阶梯恢复」是在同一台机器上**覆盖 `navigator` 属性**模拟的，未在真实低配设备/真实手机浏览器上复现。
6. 附录 F 第 1 条（真实 v2 保险箱的 v2→v3 重加密循环）仍未端到端跑过；本次只验证了参数绑定与阶梯，未触达重加密循环本身。
