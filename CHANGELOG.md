# Changelog

本项目的所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.5.0] - 2026-11-21

首个正式版本号：整合 v1.0.1 之后的安全修复、KDF 参数绑定、迁移流程与界面重做。


### Security

- 验证令牌改为 `HKDF(MK, "s-qrypt-verify")`，服务端只存其 SHA-256 哈希。旧方案 `SHA-256(salt ‖ SHA-224(pw))` 可凭公开 salt 离线穷举口令，绕过整套 KDF
- 主密钥派生引入 per-vault 随机盐（`kdf_version=3`）：盐同时进入预混合与 Argon2id 输入，同一口令在不同部署上派生出不同 MK，预计算表无法跨部署复用
- 新增 `POST /api/vault/upgrade`（`begin` 落盐 / `finish` 翻转）与客户端一键升级；升级期间用新旧两把 MK 逐条重加密，中断可续做
- 新增 `POST /api/vault/rotate`：读令牌 90 天有效期，续期必须持有 MK 派生的 operation_token
- 源校验改为严格同源；缺少 `Origin`/`Referer` 时按 `Sec-Fetch-Site` 判定，`cross-site` 一律 403
- 限流补全局失败桶（500 次/5 分钟），改为「失败才计数、成功即清零」；移除可伪造的 `X-Forwarded-For` 回落
- `/api/init` 增加长度与格式上限（salt 32 位 hex、令牌 ≤128 位 hex、公钥 ≤10000）；`/api/note/:id` 单条读取过滤 `is_test`；引导阶段仅允许 1 条占位笔记
- HTML 响应补 `frame-ancestors 'none'`、`X-Frame-Options: DENY`、`base-uri 'none'`、`form-action 'none'`
- 删除只承担一次 argon2id 的 iframe 沙箱层，Argon2 由主页面同源加载，派生只有一条路径；`script-src` 因此不再需要 `'unsafe-inline'`
- 移除 `/argon2.wasm` 上已无用的 `Access-Control-Allow-Origin: *`；删除服务端明文 `verification_token` 比较分支
- 主密钥派生的成本参数（`kdf_mb`/`kdf_ro`）改为**服务端绑定并随 `/api/token` 下发**。此前按 `navigator.hardwareConcurrency`/`deviceMemory` 估算，参数进了密钥配方，换设备即派生出不同 MK：正确密码被判「密码错误」、保险箱在新设备上永久打不开
- 连续失败不再切换 Argon2 参数（那会让正确密码永远失败），改为固定延迟；早期无绑定参数的保险箱登录时依次尝试 `硬件估算 → 32/128 → 24/80 → 16/60`，命中后审计日志记录 `kdf_params_recovered`

- 修复验证令牌明文存储（改为 SHA-256 哈希）与 GET /api/token 凭证泄露
- 修复初始化接口无认证抢注（SETUP_TOKEN + 限流双重防护）
- 修复 CSRF 来源校验前缀绕过、写操作 fail-open、沙箱隔离失效等缺陷
- 全部修复经安全扫描复查：12 HIGH + 34 MEDIUM + 18 LOW 全部关闭

### Added

- 初始化保护：POST /api/init 新增 `setup_token` 校验（环境变量 `SETUP_TOKEN`）与按 IP 限流；未配置时返回 503 `setup_token_not_configured`
- 服务端新增 verification_token_hash 存储列（CREATE + ALTER 双路径，旧库自动迁移）
- `scripts/crypto-kat.mjs`：FIPS 180-4 已知答案测试（6 个 SHA-256/SHA-224 向量），通过 npm `pretest` 自动执行
- `vitest.config.ts`：Vitest workers pool 配置，注入测试 SETUP_TOKEN
- 测试覆盖：bootstrap 权限三态（无 token 拒绝 / 错误 token 拒绝 / 正确 token 放行）、未初始化读请求 fail-closed、错误 setup_token 403
- 备份导入：读取备份 JSON 追加合并导入（不删除现有笔记），逐条以当前密钥重新派生并加密，保留原 created_at/updated_at，含 BOM 剥离、JSON 校验、进度与失败统计
- PUT /api/note/:id 支持可选 `created_at`/`updated_at` 字段（服务端校验非空字符串 ≤64 字符，非法返回 400）
- `dev-temp.bat` + `scripts/dev-temp.mjs`：一键启动临时实例，数据落 `.wrangler/temp-<时间戳>`，退出即删（`--keep` 保留），自动选空闲端口；**每次运行随机生成**一次性 `SETUP_TOKEN`（48 位 hex，经 `--var` 注入，覆盖 `.dev.vars`），默认不打开浏览器（`--open` 才开）
- `scripts/check-docs.mjs`（`npm run check:docs`，CI 执行）：校验 README 的脚本名/接口/文件/错误码/锚点与代码一致
- `.dev.vars.example`（逐字段注释）、`.gitattributes`（强制 `*.bat` 为 CRLF）、`docs/README.md` 文档索引

### Changed

- **SHA-256/SHA-224 重写为标准 FIPS 180-4 实现**（根因：JS `>>> 32` 取模 32 导致长度高位错误）。⚠️ 破坏性变更：旧实现派生的密钥与旧保险箱不兼容，旧保险箱无法登录/解密（已确认接受）
- 密码最小长度从 4 提升至 10（初始化与文案同步）
- verification_token 改为服务端仅存 SHA-256 哈希；旧库明文 token 首次校验成功后自动回填哈希并清空明文
- GET /api/token 不再返回 verification_token，仅返回 salt 与 audit_public_key，并带 `Cache-Control: no-store`
- 登录流程改为本地计算 verification_token 后调用笔记接口验证密码（401 = 密码错误）
- kdf_version 语义明确：1 = 纯软件派生，2 = Argon2id WASM 混合派生（编号只表示派生强度，不表示 SHA 实现版本）
- README 文档全面同步当前 API 契约（错误码、认证头、数据流、项目结构）
- **界面（2026-11-21）**：按 §16 前端规则重做——去 1px 描边改明度分层、暗色字重统一降 40、焦点改双环、按钮热区 ≥44×44、内联样式清零、刻度字重 token 化；空态区分「首次为空 / 筛选无结果」；加载态改骨架屏；删除常驻假徽标
- **文档（2026-11-21）**：README 六处与实现不符的宣称（沙箱隔离、自动降级、读限流、三异构密钥、PWA/Service Worker、审计签名）改为实况；新增 `docs/review/2026-11-21-full-review.md`（28 条发现 + 修复状态 + 未验证缺口）
- **破坏性（2026-11-21）**：读令牌格式与 KDF 版本变化，已有保险箱需重置一次验证配置（见文末「升级注意」）；`POST /api/audit/log` 改为要求 operation_token；单条读接口过滤 `is_test`
- 列表对解不开的笔记显示 `[无法解密]`（原「数据损坏」）；顶部新增常驻横幅「有 N 条笔记用当前密码解不开」，给出两条出路与可复制的重置命令，全部解密后自动消失
- 客户端请求加 12s 超时：GET 自动重试一次，`finally` 释放 `pendingOps`，超时不再阻塞自动锁
- 服务端返回 0 条但本地有内容时保留原视图并静默重试，不再显示「保险箱是空的」
- 数据库读取失败返回 503 `db_unavailable`；`/api/init` 在「有笔记但无配置」时返回 409 `orphan_notes`（需 `force: true` 才允许覆盖）
- 验证：v2→v3 重加密循环端到端通过（真 v2 库 + 落盐 + 半量升级 + 重登录续做 + 内容逐篇核对，见审查报告附录 H）
- 文档：新增 `docs/MIGRATION.md`（旧版 → 当前的三条迁移路径、密码不一致的显式报错、换设备问题、故障对照表、回滚边界与检查清单），README 升级说明与 docs 索引同步

### Removed

- `src/cryptoSandboxHtml.ts` 与 `/crypto-sandbox` 路由（原先只承担一次 argon2id，却宣称「密钥不进主页面」）
- `/sw.js` 路由与 Service Worker 注册（原先只是 `fetch` 透传、首页 `no-store`，无离线能力）
- 右下角常驻徽标「AES-256-GCM | 3-Key Heterogeneous」（KC 已不存在）
- `PRIMARY_READ`（SQL 注释不会让 D1 读主库；启用读复制需 Sessions API）

### Fixed

- **CI 从未真正执行**：`.github/workflows/deploy.yml` 在三处 `if:` 里引用 `secrets`，GitHub 解析期即拒绝（`Unrecognized named-value: 'secrets'`），所有 run 都是 0 job 的失败（自 2026-08-20 起）。改为 `test`（push 跑门禁）与 `deploy`（`workflow_dispatch` 显式触发）两个作业，secrets 只出现在 `env` 中；`.gitattributes` 为 `*.yml` 指定 LF
- **安全（HIGH 12 项）**
  - deploy 脚本回滚范围限定为混淆器修改的两个源文件，不再 `git checkout -- src/` 整体回滚
  - obfuscate.mjs 混淆输出三重验证（非空 / 与输入不同 / node --check），失败即终止，不再静默降级
  - setup.mjs 的 D1 `database_id` 替换锚定 `d1_databases` 数组段，多绑定不会改错
  - deploy.yml 增加 job 级 `permissions: contents: read`
  - 沙箱 postMessage 回发改投 `e.source`，修复自身回环风暴；frameCall targetOrigin 改 `*`（opaque origin 不匹配）
  - 沙箱页补 COEP 响应头与 CSP `wasm-unsafe-eval`，修复 iframe 被 ERR_BLOCKED_BY_RESPONSE 阻止
  - argon2id WASM 真实调用（`_argon2_hash` 导出包装 + 超时 10s），不再恒返回 `argon2_not_loaded`
  - 沙箱入口增加 webcrypto 不可用守卫（非 argon2id 命令显式报错）
- **中等级（34 项精选）**
  - checkOperationToken / requireVerificationToken fail-closed（未初始化即 403/401；引导阶段凭 setup_token 放行）
  - CORS 精确解析 origin（protocol + hostname 比对），拒绝 `http://localhost.evil.com` 前缀绕过
  - 分页参数 `parseInt` → `Number.isFinite` 校验（notes/audit limit 上限与默认值）
  - 审计日志 localStorage 水合重建签名链（含旧条目 hash 重算），清除时同步清理
  - sha224 改用标准 FIPS 180-4 IV；沙箱 htb 输入严格校验
  - setup.mjs 重写为 `wrangler d1 list --json` 幂等查找，main() 无条件恢复占位符
  - notes 表 is_test/deleted 增加 CHECK 约束；索引 idx_notes_active
  - 前端 Escape 键、编辑器未保存提示、audit-clear 等交互修复
- **低等级与技术债（18 项）**
  - 新增 parseJsonBody 统一 8 处请求体解析；init 错误响应补 400 状态码
  - 解密失败占位符改用真实笔记 id；backupAll 分页拉取全部笔记
  - 删除死代码：BLAKE2b 全套、renderAudit、notesTotal、沙箱 ctx/ctxB/saltB；排序提取 compareByCreatedAt
  - obfuscate.mjs `</script>` 转义；restorePlaceholder 幂等化
  - worker-configuration.d.ts 类型收紧（waitUntil Promise<unknown>）
  - deploy.html `rel="noopener noreferrer"`、copyCmd 空值防护与剪贴板错误提示
  - migrations/0001_init.sql 末尾追加索引（新库生效，旧库由 ensureSchema 兜底）
- **D1 读一致性（2026-08-20）**
  - 全部关键读查询加 `/* d1_primary */` 主节点提示：登录验证 / 笔记列表 / 笔记详情 / init-check / token / 审计日志 / 限流状态——修复复制副本陈旧读导致的"登录正常但提示没有笔记"
- **部署流水线（2026-08-20）**
  - 修复 deploy 脚本运算符优先级 bug：`git diff --quiet ... || (...) && ...` 中 `&&` 先于 `||` 求值，工作区干净时整条部署链被短路，npm run deploy 从不真正部署；改为 scripts/check-clean.mjs 前置检查 + 纯 `&&` 链
  - wrangler.jsonc 写入真实 D1 database_id（s-qrypt-db）
- **2026-11-21 全面审查（28 项）**
  - `PUT /api/note/:id` 省略 `updated_at` 时不再把 SQL 字面量 `"datetime('now')"` 写进列
  - 备份导入不再在第 20 条左右触发 429 写锁（限流改为失败计数）
  - 锁屏清空详情/编辑器/列表 DOM；解密失败笔记照常显示并修正损坏行 id 映射
  - `scripts/setup.mjs` 结束时还原**运行前**的 `database_id`；`npm run deploy` 改用 try/finally，混淆失败也还原源码
  - 列表只派生 KA、KB 懒派生，降低登录后首屏主线程开销
  - 测试套件改为可重复运行（每轮清库 + 上调默认超时），修掉跨轮次串状态导致的偶发失败

### 升级注意

已有保险箱必须重置一次验证配置，且重初始化时**勾选「旧版本保险箱」**才能读回旧笔记；步骤见 README「升级说明」。
