# Changelog

本项目的所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 初始化保护：POST /api/init 新增 `setup_token` 校验（环境变量 `SETUP_TOKEN`）与按 IP 限流；未配置时返回 503 `setup_token_not_configured`
- 服务端新增 verification_token_hash 存储列（CREATE + ALTER 双路径，旧库自动迁移）
- `scripts/crypto-kat.mjs`：FIPS 180-4 已知答案测试（6 个 SHA-256/SHA-224 向量），通过 npm `pretest` 自动执行
- `vitest.config.ts`：Vitest workers pool 配置，注入测试 SETUP_TOKEN
- 测试覆盖：bootstrap 权限三态（无 token 拒绝 / 错误 token 拒绝 / 正确 token 放行）、未初始化读请求 fail-closed、错误 setup_token 403

### Changed

- **SHA-256/SHA-224 重写为标准 FIPS 180-4 实现**（根因：JS `>>> 32` 取模 32 导致长度高位错误）。⚠️ 破坏性变更：旧实现派生的密钥与旧保险箱不兼容，旧保险箱无法登录/解密（已确认接受）
- 密码最小长度从 4 提升至 10（初始化与文案同步）
- verification_token 改为服务端仅存 SHA-256 哈希；旧库明文 token 首次校验成功后自动回填哈希并清空明文
- GET /api/token 不再返回 verification_token，仅返回 salt 与 audit_public_key，并带 `Cache-Control: no-store`
- 登录流程改为本地计算 verification_token 后调用笔记接口验证密码（401 = 密码错误）
- kdf_version 语义明确：1 = 纯软件派生，2 = Argon2id WASM 混合派生（编号只表示派生强度，不表示 SHA 实现版本）
- README 文档全面同步当前 API 契约（错误码、认证头、数据流、项目结构）

### Fixed

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
- **部署流水线（2026-08-20）**
  - 修复 deploy 脚本运算符优先级 bug：`git diff --quiet ... || (...) && ...` 中 `&&` 先于 `||` 求值，工作区干净时整条部署链被短路，npm run deploy 从不真正部署；改为 scripts/check-clean.mjs 前置检查 + 纯 `&&` 链
  - wrangler.jsonc 写入真实 D1 database_id（s-qrypt-db）

### Security

- 修复验证令牌明文存储（改为 SHA-256 哈希）与 GET /api/token 凭证泄露
- 修复初始化接口无认证抢注（SETUP_TOKEN + 限流双重防护）
- 修复 CSRF 来源校验前缀绕过、写操作 fail-open、沙箱隔离失效等缺陷
- 全部修复经安全扫描复查：12 HIGH + 34 MEDIUM + 18 LOW 全部关闭
